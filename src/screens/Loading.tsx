import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "../store";
import { fetchRecentGames, parseGame } from "../lib/chesscom-api";
import { analyzeBatch } from "../lib/analysis";
import { clusterMistakes } from "../lib/clustering";
import { computeProgress } from "../lib/progress";
import { computeOpeningStats } from "../lib/openings";
import { predictEloGain } from "../lib/elo-prediction";
import { getAnalyzedGameIds, getGamesByUsername, getMistakesByUsername, getDrillProgressByUsername } from "../lib/db";
import { CONCEPT_NAMES } from "../lib/concept-classifier";
import type { StoredMistake } from "../lib/db";

type StepId = "fetch" | "stockfish" | "concept" | "cluster";

export default function Loading() {
  const store = useApp();
  const navigate = useNavigate();
  const { username, phase, cancelledRef } = store;

  // Pipeline state
  const [stepsDone, setStepsDone] = useState<Set<StepId>>(new Set());
  const [currentStep, setCurrentStep] = useState<StepId>("fetch");
  const [analysisPct, setAnalysisPct] = useState(0);
  const [totalGames, setTotalGames] = useState(0);
  const [gamesCompleted, setGamesCompleted] = useState(0);
  const [fetchDetail, setFetchDetail] = useState("loading archives...");
  const [terminalLines, setTerminalLines] = useState<{ text: string; color?: string }[]>([
    { text: "$ initializing stockfish.wasm...", color: "#7FA650" },
  ]);
  const [latestMistake, setLatestMistake] = useState<StoredMistake | null>(null);
  const [playerElo, setPlayerElo] = useState<number | null>(null);

  // Time estimation
  const analysisStartRef = useRef<number>(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState<string | null>(null);

  const pipelineRan = useRef(false);

  // Redirect guard
  useEffect(() => {
    if (!username || phase !== "analyzing") {
      navigate({ to: "/" });
    }
  }, [username, phase, navigate]);

  const addTerminalLine = useCallback((text: string, color?: string) => {
    setTerminalLines(prev => {
      const next = [...prev, { text, color }];
      // Keep at most 30 lines
      return next.length > 30 ? next.slice(-30) : next;
    });
  }, []);

  const markDone = useCallback((step: StepId) => {
    setStepsDone(prev => new Set([...prev, step]));
  }, []);

  // Run the analysis pipeline
  useEffect(() => {
    if (!username || phase !== "analyzing" || pipelineRan.current) return;
    pipelineRan.current = true;

    (async () => {
      try {
        // ------- Step 1: Fetch games -------
        setCurrentStep("fetch");
        addTerminalLine("$ fetching games from chess.com...", "#7FA650");

        const rawGames = await fetchRecentGames(username, 100);
        setTotalGames(rawGames.length);
        setFetchDetail(`${rawGames.length} / ${rawGames.length} games loaded`);
        addTerminalLine(`fetched ${rawGames.length} games for ${username}`);

        // Parse all games
        const parsedGames = rawGames.map(g => parseGame(g, username));

        // Grab the player's latest elo
        if (parsedGames.length > 0) {
          setPlayerElo(parsedGames[0].playerElo);
        }

        // Filter out already-analyzed games
        const analyzedIds = await getAnalyzedGameIds(username);
        const newGames = parsedGames.filter(g => !analyzedIds.has(g.id));

        addTerminalLine(`${analyzedIds.size} games already analyzed, ${newGames.length} new`);
        markDone("fetch");

        if (cancelledRef.current) return;

        // ------- Step 2: Stockfish analysis + concept inference -------
        setCurrentStep("stockfish");
        analysisStartRef.current = Date.now();

        const totalToAnalyze = newGames.length;

        if (totalToAnalyze > 0) {
          addTerminalLine(`$ stockfish.wasm depth 14 · 2 workers`, "#7FA650");

          let completed = 0;

          await analyzeBatch(
            newGames,
            username,
            14,
            2,
            (gameIndex: number, gameMistakes: StoredMistake[]) => {
              completed++;
              setGamesCompleted(completed);
              const pct = Math.round((completed / totalToAnalyze) * 100);
              setAnalysisPct(pct);

              // Update estimated time remaining
              const elapsed = Date.now() - analysisStartRef.current;
              const msPerGame = elapsed / completed;
              const remaining = msPerGame * (totalToAnalyze - completed);
              const secs = Math.ceil(remaining / 1000);
              if (secs >= 60) {
                setEstimatedRemaining(`${Math.floor(secs / 60)}m ${secs % 60}s`);
              } else {
                setEstimatedRemaining(`${secs}s`);
              }

              // Add mistakes to store
              if (gameMistakes.length > 0) {
                store.addMistakes(gameMistakes);
              }

              // Terminal output for this game
              const gameId = newGames[gameIndex].id;
              for (const m of gameMistakes) {
                const severityLabel = m.severity.toUpperCase();
                addTerminalLine(
                  `game_${gameId}  move ${m.moveNumber}  ${m.movePlayed}  cpl=${m.centipawnLoss}  ${severityLabel}`,
                  undefined
                );

                // Show concept diffs if available
                if (m.conceptDiff) {
                  const topDiffs = m.conceptDiff
                    .map((v, i) => ({ name: CONCEPT_NAMES[i] || `f_${i}`, val: v }))
                    .filter(c => Math.abs(c.val) > 0.1)
                    .sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
                    .slice(0, 3);
                  if (topDiffs.length > 0) {
                    const parts = topDiffs.map(c => `${c.name}(${c.val > 0 ? "+" : ""}${c.val.toFixed(2)})`).join(", ");
                    addTerminalLine(`  concept_diff: ${parts}`, "#9CA3AF");
                  }
                }

                // Track latest mistake for live preview
                setLatestMistake(m);
              }

              if (gameMistakes.length === 0) {
                addTerminalLine(`game_${gameId}  ${newGames[gameIndex].moves.length} moves  no mistakes`);
              }
            },
            cancelledRef
          );

          addTerminalLine(`$ analysis complete · ${completed} games · ${store.mistakes.length} mistakes`, "#7FA650");
        } else {
          addTerminalLine("all games already analyzed, skipping stockfish");
          setAnalysisPct(100);
        }

        markDone("stockfish");
        markDone("concept"); // concept inference runs inside analyzeBatch

        if (cancelledRef.current) return;

        // ------- Step 3: Clustering -------
        setCurrentStep("cluster");
        addTerminalLine("$ clustering weakness patterns...", "#7FA650");

        // Reload all data from DB (existing + new)
        const allGamesFromDb = await getGamesByUsername(username.toLowerCase());
        const allMistakesFromDb = await getMistakesByUsername(username.toLowerCase());
        const drillProgress = await getDrillProgressByUsername(username.toLowerCase());

        store.setGames(allGamesFromDb);
        store.setMistakes(allMistakesFromDb);

        const clusters = clusterMistakes(allMistakesFromDb);
        store.setClusters(clusters);
        addTerminalLine(`found ${clusters.length} weakness clusters`);

        const progressData = computeProgress(allGamesFromDb, allMistakesFromDb);
        store.setProgressData(progressData);

        const openingStats = computeOpeningStats(allGamesFromDb, allMistakesFromDb);
        store.setOpeningStats(openingStats);

        const currentElo = parsedGames.length > 0 ? parsedGames[0].playerElo : 1500;
        const eloPrediction = predictEloGain(allMistakesFromDb, currentElo, allGamesFromDb.length);
        store.setEloPrediction(eloPrediction);

        store.setDrillProgress(drillProgress);

        markDone("cluster");
        addTerminalLine("$ done — redirecting to dashboard", "#7FA650");

        // ------- Navigate to results -------
        store.setPhase("results");
        navigate({ to: "/dashboard" });

      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        addTerminalLine(`ERROR: ${msg}`, "#FF6B6B");
        console.error("Analysis pipeline failed:", err);
      }
    })();
  }, [username, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build steps array from state
  const steps = [
    {
      label: "Fetching games",
      detail: stepsDone.has("fetch")
        ? fetchDetail
        : totalGames > 0
          ? fetchDetail
          : "loading archives...",
      done: stepsDone.has("fetch"),
      current: currentStep === "fetch" && !stepsDone.has("fetch"),
      pct: 0,
    },
    {
      label: "Stockfish analysis",
      detail: `depth 14 · 2 workers${gamesCompleted > 0 ? ` · ${gamesCompleted}/${totalGames > 0 ? Math.min(totalGames, 100) : "?"} games` : ""}`,
      done: stepsDone.has("stockfish"),
      current: currentStep === "stockfish" && !stepsDone.has("stockfish"),
      pct: currentStep === "stockfish" && !stepsDone.has("stockfish") ? analysisPct : stepsDone.has("stockfish") ? 100 : 0,
    },
    {
      label: "Concept inference",
      detail: `ONNX runtime · ${CONCEPT_NAMES.length || 27} concepts`,
      done: stepsDone.has("concept"),
      current: false, // runs inside stockfish step
      pct: 0,
    },
    {
      label: "Clustering weaknesses",
      detail: "k-means + silhouette",
      done: stepsDone.has("cluster"),
      current: currentStep === "cluster" && !stepsDone.has("cluster"),
      pct: 0,
    },
  ];

  // Build live preview from latest mistake
  const severityColor = latestMistake
    ? latestMistake.severity === "blunder" ? "var(--orange)"
      : latestMistake.severity === "mistake" ? "var(--red, #FF6B6B)"
      : "var(--yellow, #FFD23F)"
    : "var(--orange)";

  const topConceptDiffs = latestMistake?.conceptDiff
    ? latestMistake.conceptDiff
        .map((v, i) => ({ name: CONCEPT_NAMES[i] || `feature_${i}`, val: Math.abs(v) }))
        .sort((a, b) => b.val - a.val)
        .slice(0, 3)
    : [];

  const conceptBarColors = ["var(--orange)", "var(--purple)", "var(--blue)"];

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: 56, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green)", display: "grid", placeItems: "center", color: "white", fontWeight: 900, fontSize: 18, boxShadow: "0 3px 0 var(--green-dark)" }}>&#9822;</div>
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>missedtake</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 56, alignItems: "start", maxWidth: 1280 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>Analyzing</div>
          <h1 style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1.5, margin: "8px 0 24px", lineHeight: 1 }}>
            {username || "..."}<span style={{ color: "var(--ink-3)", fontWeight: 700 }}>{playerElo ? ` · ${playerElo} elo` : ""}</span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map((s, i) => (
              <Step key={i} {...s} />
            ))}
          </div>

          <div style={{ marginTop: 28, background: "var(--ink)", borderRadius: 16, padding: 18, fontFamily: "var(--mono)", fontSize: 12, color: "#A8D88A", lineHeight: 1.7, height: 180, overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {terminalLines.slice(-8).map((line, i) => {
              // Colorize severity keywords inline
              const text = line.text;
              if (text.includes("BLUNDER")) {
                const parts = text.split("BLUNDER");
                return <div key={i} style={{ color: line.color }}>{parts[0]}<span style={{ color: "#FF8B3D" }}>BLUNDER</span>{parts[1]}</div>;
              }
              if (text.includes("MISTAKE")) {
                const parts = text.split("MISTAKE");
                return <div key={i} style={{ color: line.color }}>{parts[0]}<span style={{ color: "#FF6B6B" }}>MISTAKE</span>{parts[1]}</div>;
              }
              if (text.includes("INACCURACY")) {
                const parts = text.split("INACCURACY");
                return <div key={i} style={{ color: line.color }}>{parts[0]}<span style={{ color: "#FFD23F" }}>INACCURACY</span>{parts[1]}</div>;
              }
              return <div key={i} style={{ color: line.color }}>{text}</div>;
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Live preview</div>
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)" }}>
            {latestMistake ? (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>game {gamesCompleted} / {totalGames || "?"}</div>
                  <Tag color={severityColor} text={latestMistake.severity} />
                </div>
                <MiniBoard fen={latestMistake.fen} highlight={latestMistake.movePlayed.slice(2, 4)} />
                <div style={{ marginTop: 14, fontSize: 13, fontFamily: "var(--mono)", color: "var(--ink-2)" }}>
                  {latestMistake.moveNumber}. {latestMistake.moveNumber % 2 === 0 ? "... " : ""}<b style={{ color: "var(--orange-dark, #c66a20)" }}>{latestMistake.movePlayed}?</b>  <span style={{ color: "var(--ink-3)" }}>(best: {latestMistake.bestMove})</span>
                </div>
                <div style={{ marginTop: 4, fontSize: 13, fontFamily: "var(--mono)", color: "var(--ink-2)" }}>
                  eval  <b>{formatEval(latestMistake.evalBefore)}</b>  →  <b style={{ color: "var(--orange-dark, #c66a20)" }}>{formatEval(latestMistake.evalAfter)}</b>
                </div>

                {topConceptDiffs.length > 0 && (
                  <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>What you missed</div>
                    {topConceptDiffs.map((c, i) => (
                      <ConceptBar key={i} label={c.name.replace(/_/g, " ")} v={Math.min(c.val, 1)} color={conceptBarColors[i] || "var(--green)"} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>waiting for first mistake...</div>
                </div>
                <MiniBoard fen="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" highlight="" />
                <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", borderRadius: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>What you missed</div>
                  <div style={{ fontSize: 12, color: "var(--ink-3)" }}>Concepts will appear here as mistakes are found</div>
                </div>
              </>
            )}
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)", fontWeight: 600, textAlign: "center" }}>
            {estimatedRemaining
              ? <>Estimated time remaining · <b style={{ color: "var(--ink)" }}>{estimatedRemaining}</b></>
              : stepsDone.has("cluster")
                ? <b style={{ color: "var(--green)" }}>Complete!</b>
                : "Calculating estimate..."
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function formatEval(cp: number): string {
  const pawns = cp / 100;
  return (pawns >= 0 ? "+" : "") + pawns.toFixed(1);
}

function Step({ label, detail, done, current, pct = 0 }: { label: string; detail: string; done: boolean; current: boolean; pct?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: current ? "white" : "transparent", border: current ? "2.5px solid var(--green)" : "2px solid var(--line)", borderRadius: 14, boxShadow: current ? "0 4px 0 var(--green-dark)" : "none" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: done ? "var(--green)" : current ? "#E8F8E5" : "var(--bg-2)", display: "grid", placeItems: "center", color: done ? "white" : "var(--ink-3)", fontWeight: 900, flexShrink: 0 }}>
        {done ? "✓" : current ? <Spinner /> : "•"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: done || current ? "var(--ink)" : "var(--ink-3)" }}>{label}</div>
        <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 2 }}>{detail}</div>
        {current && pct > 0 && (
          <div style={{ marginTop: 8, height: 8, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--green)" }} />
          </div>
        )}
      </div>
      {done && <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--green-dark)", fontWeight: 800 }}>done</div>}
      {current && pct > 0 && <div style={{ fontSize: 14, fontFamily: "var(--mono)", color: "var(--green-dark)", fontWeight: 900 }}>{pct}%</div>}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="7" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeDasharray="22 50" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 9 9" to="360 9 9" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function Tag({ color, text }: { color: string; text: string }) {
  return <span style={{ background: color, color: "white", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>{text}</span>;
}

function ConceptBar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: 130, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: "white", borderRadius: 4, overflow: "hidden", border: "1px solid var(--line)" }}>
        <div style={{ width: `${v*100}%`, height: "100%", background: color }} />
      </div>
      <div style={{ width: 32, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", textAlign: "right" }}>{v.toFixed(2)}</div>
    </div>
  );
}

function MiniBoard({ fen, highlight }: { fen: string; highlight: string }) {
  const sq = 38;
  const dark = "#7FA650"; const light = "#EFEFD0";

  // Parse FEN to get piece positions
  const pieces: Record<string, string> = {};
  const fenParts = fen.split(" ");
  const rows = fenParts[0].split("/");
  const files = ["a","b","c","d","e","f","g","h"];
  const pieceMap: Record<string, string> = {
    "r": "♜", "n": "♞", "b": "♝", "q": "♛", "k": "♚", "p": "♟",
    "R": "♖", "N": "♘", "B": "♗", "Q": "♕", "K": "♔", "P": "♙",
  };

  for (let rank = 0; rank < 8; rank++) {
    let file = 0;
    for (const ch of rows[rank]) {
      if (ch >= "1" && ch <= "8") {
        file += parseInt(ch);
      } else {
        const square = files[file] + (8 - rank);
        pieces[square] = pieceMap[ch] || "";
        file++;
      }
    }
  }

  const ranks = [8,7,6,5,4,3,2,1];
  const blackPieces = new Set(["♟","♜","♞","♝","♛","♚"]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 8, overflow: "hidden", border: "2px solid var(--ink)", width: sq*8 }}>
      {ranks.map(r => files.map(f => {
        const isDark = (files.indexOf(f) + r) % 2 === 0;
        const k = f+r; const hl = k===highlight;
        const piece = pieces[k] || "";
        return <div key={k} style={{ width: sq, height: sq, background: hl ? "#FF8B3D" : (isDark?dark:light), display:"grid", placeItems:"center", fontSize: 26, color: blackPieces.has(piece)?"var(--ink)":"white" }}>{piece}</div>;
      }))}
    </div>
  );
}
