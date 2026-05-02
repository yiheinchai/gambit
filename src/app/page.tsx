
import { useState, useCallback, useRef, useEffect } from "react";
import UsernameForm, { type AnalysisConfig } from "@/components/UsernameForm";
import AnalysisProgressComponent from "@/components/AnalysisProgress";
import WeaknessDashboard from "@/components/WeaknessDashboard";
import ProgressView from "@/components/ProgressView";
import {
  fetchRecentGames,
  parseGame,
  type ParsedGame,
} from "@/lib/chesscom-api";
import { analyzeBatch, type AnalysisProgress } from "@/lib/analysis";
import { computeProgress, type ProgressData } from "@/lib/progress";
import { computeOpeningStats, type OpeningStats } from "@/lib/openings";
import { predictEloGain, type EloPrediction } from "@/lib/elo-prediction";
import type { StoredMistake, StoredGame } from "@/lib/db";
import {
  getAnalyzedGameIds,
  getGamesByUsername,
  getMistakesByUsername,
} from "@/lib/db";

type AppState = "idle" | "loading" | "results";
type Tab = "weaknesses" | "progress";

export default function Home() {
  const [state, setState] = useState<AppState>("idle");
  const [tab, setTab] = useState<Tab>("weaknesses");
  const [username, setUsername] = useState("");
  const [progress, setProgress] = useState<AnalysisProgress>({
    phase: "fetching",
    currentGame: 0,
    totalGames: 0,
    currentMove: 0,
    totalMoves: 0,
    mistakesFound: 0,
  });
  const [mistakes, setMistakes] = useState<StoredMistake[]>([]);
  const [games, setGames] = useState<StoredGame[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [openingStats, setOpeningStats] = useState<OpeningStats[]>([]);
  const [eloPrediction, setEloPrediction] = useState<EloPrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const [lastUser, setLastUser] = useState<string | null>(null);

  // Check for previously analyzed user on mount
  useEffect(() => {
    const saved = localStorage.getItem("gambit_last_user");
    if (saved) setLastUser(saved);
  }, []);

  const computeDerivedData = useCallback((g: StoredGame[], m: StoredMistake[]) => {
    setProgressData(computeProgress(g, m));
    setOpeningStats(computeOpeningStats(g, m));
    const latestElo = g.length > 0
      ? [...g].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].playerElo
      : 1200;
    setEloPrediction(predictEloGain(m, latestElo, g.length));
  }, []);

  const loadCachedUser = useCallback(async (name: string) => {
    const cachedGames = await getGamesByUsername(name.toLowerCase());
    const cachedMistakes = await getMistakesByUsername(name.toLowerCase());
    if (cachedGames.length === 0) return;

    setUsername(name);
    setGames(cachedGames);
    setMistakes(cachedMistakes);
    computeDerivedData(cachedGames, cachedMistakes);
    setState("results");
  }, [computeDerivedData]);

  const showResults = useCallback(() => {
    if (mistakes.length > 0 && games.length > 0) {
      computeDerivedData(games, mistakes);
      setState("results");
    }
  }, [mistakes, games, computeDerivedData]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    showResults();
  }, [showResults]);

  const handleAnalyze = useCallback(async (config: AnalysisConfig) => {
    const { username: name, depth, gameCount } = config;
    setUsername(name);
    setState("loading");
    setError(null);
    setMistakes([]);
    setGames([]);
    setTab("weaknesses");
    cancelledRef.current = false;
    localStorage.setItem("gambit_last_user", name);

    try {
      setProgress((p) => ({ ...p, phase: "fetching" }));

      const analyzedIds = await getAnalyzedGameIds(name);
      const cachedGames = await getGamesByUsername(name.toLowerCase());
      const cachedMistakes = await getMistakesByUsername(name.toLowerCase());

      const rawGames = await fetchRecentGames(name, gameCount);
      if (rawGames.length === 0) {
        setError(`No games found for "${name}". Make sure the profile is public and has recent games.`);
        setState("idle");
        return;
      }
      const parsedGames: ParsedGame[] = rawGames
        .map((g) => parseGame(g, name))
        .filter((g) => g.moves.length > 4);

      const newGames = parsedGames.filter((g) => !analyzedIds.has(g.id));

      const allMistakes: StoredMistake[] = [...cachedMistakes];
      const allGames: StoredGame[] = [...cachedGames];

      if (newGames.length === 0) {
        setMistakes(allMistakes);
        setGames(allGames);
        computeDerivedData(allGames, allMistakes);
        setProgress((p) => ({ ...p, phase: "done" }));
        setState("results");
        return;
      }

      setProgress((p) => ({
        ...p,
        phase: "analyzing",
        totalGames: newGames.length,
        mistakesFound: cachedMistakes.length,
      }));

      let gamesCompleted = 0;

      await analyzeBatch(
        newGames,
        name,
        depth,
        2, // concurrency: 2 parallel Stockfish workers
        (gameIndex, gameMistakes) => {
          gamesCompleted++;
          allMistakes.push(...gameMistakes);

          const g = newGames[gameIndex];
          allGames.push({
            id: g.id,
            username: name.toLowerCase(),
            pgn: g.pgn,
            date: g.date,
            timeControl: g.timeControl,
            playerColor: g.playerColor,
            result: g.result,
            playerElo: g.playerElo,
            opponentElo: g.opponentElo,
            moves: g.moves,
            fens: g.fens,
            analyzedAt: new Date(),
          });

          setMistakes([...allMistakes]);
          setGames([...allGames]);
          setProgress((p) => ({
            ...p,
            currentGame: gamesCompleted,
            mistakesFound: allMistakes.length,
          }));
        },
        cancelledRef
      );

      if (!cancelledRef.current) {
        computeDerivedData(allGames, allMistakes);
        setProgress((p) => ({ ...p, phase: "done" }));
        setState("results");
      }
    } catch (err) {
      if (cancelledRef.current) return;
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.includes("not found")) {
        setError(`Player "${name}" not found on Chess.com. Check the username and try again.`);
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError("Network error. Check your connection and try again.");
      } else {
        setError(msg);
      }
      setState("idle");
    }
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center px-4 py-12">
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm max-w-md text-center">
          {error}
        </div>
      )}

      {state === "idle" && (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="flex flex-col items-center gap-4">
            <UsernameForm onSubmit={handleAnalyze} loading={false} />
            {lastUser && (
              <button
                onClick={() => loadCachedUser(lastUser)}
                className="text-zinc-500 hover:text-amber-400 text-sm transition-colors"
              >
                Continue as <span className="font-medium text-zinc-300">{lastUser}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {state === "loading" && (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-lg">
            <AnalysisProgressComponent progress={progress} />

            {/* Action buttons during analysis */}
            <div className="flex justify-center gap-3 mt-6">
              {mistakes.length >= 3 && (
                <button
                  onClick={showResults}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  View Results So Far ({mistakes.length} mistakes)
                </button>
              )}
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
              >
                Stop Analysis
              </button>
            </div>

            {mistakes.length > 0 && (
              <div className="mt-6">
                <p className="text-zinc-500 text-sm mb-3">
                  Recent finds:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {mistakes.slice(-5).map((m) => (
                    <div
                      key={m.id}
                      className="text-xs text-zinc-400 bg-zinc-800 rounded px-3 py-2 flex justify-between"
                    >
                      <span>
                        Move {m.moveNumber}: {m.movePlayed} instead of {m.bestMove}
                      </span>
                      <span className={
                        m.severity === "blunder" ? "text-red-400" :
                        m.severity === "mistake" ? "text-orange-400" :
                        "text-yellow-400"
                      }>
                        -{m.centipawnLoss}cp
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {state === "results" && (
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex gap-1 mb-6 bg-zinc-800 rounded-lg p-1 max-w-xs mx-auto">
            <TabButton
              label="Weaknesses"
              active={tab === "weaknesses"}
              onClick={() => setTab("weaknesses")}
            />
            <TabButton
              label="Progress"
              active={tab === "progress"}
              onClick={() => setTab("progress")}
            />
          </div>

          {tab === "weaknesses" && (
            <WeaknessDashboard
              mistakes={mistakes}
              games={games}
              username={username}
              totalGames={games.length}
              openingStats={openingStats}
              eloPrediction={eloPrediction}
            />
          )}

          {tab === "progress" && progressData && (
            <ProgressView
              progress={progressData}
              username={username}
              openingStats={openingStats}
              eloPrediction={eloPrediction || undefined}
              onRefresh={() => handleAnalyze({ username, depth: 14, gameCount: 50 })}
            />
          )}

          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setState("idle");
                setMistakes([]);
                setGames([]);
                setProgressData(null);
              }}
              className="text-zinc-500 hover:text-zinc-300 text-sm underline"
            >
              Analyze a different player
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-700 text-white"
          : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}
