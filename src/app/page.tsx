"use client";

import { useState, useCallback } from "react";
import UsernameForm from "@/components/UsernameForm";
import AnalysisProgressComponent from "@/components/AnalysisProgress";
import WeaknessDashboard from "@/components/WeaknessDashboard";
import ProgressView from "@/components/ProgressView";
import {
  fetchRecentGames,
  parseGame,
  type ParsedGame,
} from "@/lib/chesscom-api";
import { analyzeAndStoreGame, type AnalysisProgress } from "@/lib/analysis";
import { computeProgress, type ProgressData } from "@/lib/progress";
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
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = useCallback(async (name: string) => {
    setUsername(name);
    setState("loading");
    setError(null);
    setMistakes([]);
    setGames([]);
    setTab("weaknesses");

    try {
      setProgress((p) => ({ ...p, phase: "fetching" }));

      // Load cached analysis from IndexedDB
      const analyzedIds = await getAnalyzedGameIds(name);
      const cachedGames = await getGamesByUsername(name.toLowerCase());
      const cachedMistakes = await getMistakesByUsername(name.toLowerCase());

      const rawGames = await fetchRecentGames(name, 50);
      if (rawGames.length === 0) {
        setError(`No games found for "${name}". Make sure the profile is public and has recent games.`);
        setState("idle");
        return;
      }
      const parsedGames: ParsedGame[] = rawGames
        .map((g) => parseGame(g, name))
        .filter((g) => g.moves.length > 4); // skip trivially short games

      // Split into already-analyzed and new games
      const newGames = parsedGames.filter((g) => !analyzedIds.has(g.id));
      const skippedCount = parsedGames.length - newGames.length;

      // Start with cached data
      const allMistakes: StoredMistake[] = [...cachedMistakes];
      const allGames: StoredGame[] = [...cachedGames];

      if (newGames.length === 0) {
        // All games already analyzed — jump to results
        setMistakes(allMistakes);
        setGames(allGames);
        setProgressData(computeProgress(allGames, allMistakes));
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

      for (let i = 0; i < newGames.length; i++) {
        setProgress((p) => ({
          ...p,
          currentGame: i + 1,
          totalMoves: newGames[i].moves.length,
          currentMove: 0,
        }));

        const gameMistakes = await analyzeAndStoreGame(
          newGames[i],
          name,
          (current, total) => {
            setProgress((p) => ({
              ...p,
              currentMove: current,
              totalMoves: total,
            }));
          }
        );

        allMistakes.push(...gameMistakes);

        const g = newGames[i];
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
        setProgress((p) => ({ ...p, mistakesFound: allMistakes.length }));
      }

      setProgressData(computeProgress(allGames, allMistakes));
      setProgress((p) => ({ ...p, phase: "done" }));
      setState("results");
    } catch (err) {
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
          <UsernameForm onSubmit={handleAnalyze} loading={false} />
        </div>
      )}

      {state === "loading" && (
        <div className="flex-1 flex items-center justify-center w-full">
          <div className="w-full max-w-lg">
            <AnalysisProgressComponent progress={progress} />
            {mistakes.length > 0 && (
              <div className="mt-8">
                <p className="text-zinc-500 text-sm mb-3">
                  Mistakes found so far:
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mistakes.slice(-5).map((m) => (
                    <div
                      key={m.id}
                      className="text-xs text-zinc-400 bg-zinc-800 rounded px-3 py-2"
                    >
                      Move {m.moveNumber}: played {m.movePlayed} instead of{" "}
                      {m.bestMove} (-{m.centipawnLoss}cp, {m.severity})
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
          {/* Tab bar */}
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
              username={username}
              totalGames={games.length}
            />
          )}

          {tab === "progress" && progressData && (
            <ProgressView progress={progressData} username={username} />
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
