import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Chessboard } from "react-chessboard";
import { useApp } from "../store";
import { getMistakesByGameId } from "../lib/db";
import { CONCEPT_NAMES } from "../lib/concept-classifier";
import type { StoredMistake, StoredGame } from "../lib/db";

interface Move {
  n: number;
  w: string;
  b: string;
  we: number;
  be: number;
  theory?: boolean;
  mark?: string;
  current?: boolean;
}

export default function Review() {
  const { games, mistakes, username } = useApp();
  const navigate = useNavigate();
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [gameMistakes, setGameMistakes] = useState<StoredMistake[]>([]);

  // Redirect if no data
  useEffect(() => {
    if (!username || games.length === 0) {
      navigate({ to: "/" });
    }
  }, [username, games.length, navigate]);

  const currentGame: StoredGame | undefined = games[currentGameIndex];

  // Load mistakes for the current game
  useEffect(() => {
    if (!currentGame) return;
    let cancelled = false;
    // First try from in-memory store (filtered by gameId)
    const fromStore = mistakes.filter(m => m.gameId === currentGame.id);
    if (fromStore.length > 0) {
      setGameMistakes(fromStore);
    } else {
      // Fallback: load from DB
      getMistakesByGameId(currentGame.id).then(dbMistakes => {
        if (!cancelled) setGameMistakes(dbMistakes);
      });
    }
    return () => { cancelled = true; };
  }, [currentGame?.id, mistakes]);

  // Reset move index when switching games
  useEffect(() => {
    setCurrentMoveIndex(0);
  }, [currentGameIndex]);

  // Build the moves array from real data
  const moves: Move[] = useMemo(() => {
    if (!currentGame) return [];
    const gameMoves = currentGame.moves;
    const result: Move[] = [];

    // Build a map of mistake move numbers for annotations
    const mistakeByMove = new Map<number, StoredMistake>();
    for (const m of gameMistakes) {
      mistakeByMove.set(m.moveNumber, m);
    }

    for (let i = 0; i < gameMoves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wMove = gameMoves[i] || "";
      const bMove = gameMoves[i + 1] || "";

      // Find eval data from mistakes near this move
      const wMistake = mistakeByMove.get(moveNum);
      const bMistake = mistakeByMove.get(moveNum);

      let mark: string | undefined;
      // Check if white or black move at this move number is a mistake
      const relevantMistake = gameMistakes.find(m => m.moveNumber === moveNum);
      if (relevantMistake) {
        if (relevantMistake.severity === "blunder") mark = "??";
        else if (relevantMistake.severity === "mistake") mark = "?";
        else if (relevantMistake.severity === "inaccuracy") mark = "?!";
      }

      // Determine which half-move index is current
      const wHalfIdx = i;
      const bHalfIdx = i + 1;
      const isCurrent = currentMoveIndex === wHalfIdx || currentMoveIndex === bHalfIdx;

      result.push({
        n: moveNum,
        w: wMove,
        b: bMove,
        we: relevantMistake ? relevantMistake.evalBefore / 100 : 0,
        be: relevantMistake ? relevantMistake.evalAfter / 100 : 0,
        mark,
        current: isCurrent,
      });
    }
    return result;
  }, [currentGame, gameMistakes, currentMoveIndex]);

  // Build eval timeline data from mistakes
  const evalTimeline: Move[] = useMemo(() => {
    if (!currentGame) return [];
    const totalHalfMoves = currentGame.moves.length;
    // Create a sparse eval map from mistakes
    const evalMap = new Map<number, { evalBefore: number; evalAfter: number }>();
    for (const m of gameMistakes) {
      // moveNumber is 1-based full move; figure out the half-move index
      // We don't know if the mistake was white or black move, but we can use playerColor
      const halfIdx = (m.moveNumber - 1) * 2 + (currentGame.playerColor === "black" ? 1 : 0);
      evalMap.set(halfIdx, { evalBefore: m.evalBefore, evalAfter: m.evalAfter });
    }

    // Build timeline entries - interpolate between known eval points
    const timeline: Move[] = [];
    let lastEval = 0.3; // default starting eval
    for (let i = 0; i < totalHalfMoves; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wHalf = i;
      const bHalf = i + 1;

      let we = lastEval;
      let be = lastEval;

      if (evalMap.has(wHalf)) {
        we = evalMap.get(wHalf)!.evalBefore / 100;
        be = evalMap.get(wHalf)!.evalAfter / 100;
        lastEval = be;
      } else if (evalMap.has(bHalf)) {
        we = evalMap.get(bHalf)!.evalBefore / 100;
        be = evalMap.get(bHalf)!.evalAfter / 100;
        lastEval = be;
      }

      const relevantMistake = gameMistakes.find(m => m.moveNumber === moveNum);
      let mark: string | undefined;
      if (relevantMistake) {
        if (relevantMistake.severity === "blunder") mark = "??";
        else if (relevantMistake.severity === "mistake") mark = "?";
        else if (relevantMistake.severity === "inaccuracy") mark = "?!";
      }

      timeline.push({
        n: moveNum,
        w: currentGame.moves[i] || "",
        b: currentGame.moves[i + 1] || "",
        we,
        be,
        mark,
      });
    }
    return timeline;
  }, [currentGame, gameMistakes]);

  // Find the current mistake (if the current move is a mistake position)
  const currentMistake: StoredMistake | null = useMemo(() => {
    if (!currentGame) return null;
    const moveNum = Math.floor(currentMoveIndex / 2) + 1;
    return gameMistakes.find(m => m.moveNumber === moveNum) || null;
  }, [currentGame, gameMistakes, currentMoveIndex]);

  // Concept diff for current mistake
  const conceptItems = useMemo(() => {
    if (!currentMistake?.conceptDiff) return [];
    const diff = currentMistake.conceptDiff;
    return diff
      .map((v, i) => ({
        l: CONCEPT_NAMES[i] || `feature_${i}`,
        v,
        hot: Math.abs(v) > 0.3,
      }))
      .filter(item => Math.abs(item.v) > 0.05)
      .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
      .slice(0, 8);
  }, [currentMistake]);

  // Game navigation
  const prevGame = useCallback(() => {
    if (currentGameIndex > 0) setCurrentGameIndex(i => i - 1);
  }, [currentGameIndex]);

  const nextGame = useCallback(() => {
    if (currentGameIndex < games.length - 1) setCurrentGameIndex(i => i + 1);
  }, [currentGameIndex, games.length]);

  // Move click handler
  const handleMoveClick = useCallback((moveNum: number, isBlack?: boolean) => {
    const halfIdx = (moveNum - 1) * 2 + (isBlack ? 1 : 0);
    if (currentGame && halfIdx < currentGame.fens.length) {
      setCurrentMoveIndex(halfIdx);
    }
  }, [currentGame]);

  if (!currentGame) return null;

  // Get current FEN
  const currentFen = currentGame.fens[currentMoveIndex] || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  // Format date
  const gameDate = currentGame.date instanceof Date
    ? currentGame.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : new Date(currentGame.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // Determine player/opponent names
  const playerName = currentGame.username;
  const opponentName = "opponent";

  // Severity colors for the worst mistake
  const worstMistake = gameMistakes.length > 0
    ? gameMistakes.reduce((worst, m) => m.centipawnLoss > worst.centipawnLoss ? m : worst, gameMistakes[0])
    : null;

  // Compute accuracy (percent of moves that are NOT mistakes)
  const totalMoves = currentGame.moves.length;
  const mistakeCount = gameMistakes.length;
  const playerAccuracy = totalMoves > 0 ? Math.round(((totalMoves - mistakeCount) / totalMoves) * 100) : 100;

  // Board orientation
  const boardOrientation = currentGame.playerColor === "black" ? "black" : "white";

  // Eval bar values
  const evalForBar = currentMistake
    ? currentMistake.evalAfter / 100
    : 0;
  const whitePercent = Math.max(5, Math.min(95, 50 + (evalForBar / 6) * 50));

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: "20px 32px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* game header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Game review · {currentGame.timeControl} · {gameDate}</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, margin: "4px 0 0" }}>
              {currentGame.playerColor === "white" ? playerName : opponentName}{" "}
              <span style={{ color: "var(--ink-3)" }}>vs</span>{" "}
              {currentGame.playerColor === "white" ? opponentName : playerName}
            </h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={prevGame}
              disabled={currentGameIndex === 0}
              style={{ background: "white", border: "2px solid var(--line)", padding: "10px 16px", borderRadius: 12, fontWeight: 800, fontSize: 12, fontFamily: "var(--sans)", cursor: currentGameIndex === 0 ? "default" : "pointer", opacity: currentGameIndex === 0 ? 0.4 : 1 }}
            >
              ← prev game
            </button>
            <button
              onClick={nextGame}
              disabled={currentGameIndex >= games.length - 1}
              style={{ background: "white", border: "2px solid var(--line)", padding: "10px 16px", borderRadius: 12, fontWeight: 800, fontSize: 12, fontFamily: "var(--sans)", cursor: currentGameIndex >= games.length - 1 ? "default" : "pointer", opacity: currentGameIndex >= games.length - 1 ? 0.4 : 1 }}
            >
              next game →
            </button>
          </div>
        </div>

        {/* eval bar + board */}
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 14 }}>
          <EvalBar whitePercent={whitePercent} evalValue={evalForBar} />
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 18, boxShadow: "0 6px 0 var(--ink)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <PlayerStrip
                name={currentGame.playerColor === "black" ? playerName : opponentName}
                elo={currentGame.playerColor === "black" ? currentGame.playerElo : currentGame.opponentElo}
                black
              />
              <div style={{ display: "flex", gap: 6 }}>
                {worstMistake && (
                  <Tag c="var(--orange)" t={`${worstMistake.severity} · move ${worstMistake.moveNumber}`} />
                )}
              </div>
            </div>

            <div style={{ margin: "10px auto", borderRadius: 8, overflow: "hidden", border: "2px solid var(--ink)", width: 400 }}>
              <Chessboard
                options={{
                  position: currentFen,
                  boardOrientation: boardOrientation,
                  allowDragging: false,
                  boardStyle: { borderRadius: "8px" },
                  darkSquareStyle: { backgroundColor: "#7FA650" },
                  lightSquareStyle: { backgroundColor: "#EFEFD0" },
                }}
              />
            </div>

            <PlayerStrip
              name={currentGame.playerColor === "white" ? playerName : opponentName}
              elo={currentGame.playerColor === "white" ? currentGame.playerElo : currentGame.opponentElo}
            />

            {/* annotation */}
            {currentMistake && (
              <div style={{ marginTop: 14, padding: 14, background: "#FFF4E5", border: "2px solid var(--orange)", borderRadius: 12, display: "flex", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--orange)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18, flexShrink: 0, boxShadow: "0 3px 0 var(--orange-dark)" }}>
                  {currentMistake.severity === "blunder" ? "??" : currentMistake.severity === "mistake" ? "?" : "?!"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "var(--orange-dark)", letterSpacing: 0.3, textTransform: "uppercase" }}>
                    Move {currentMistake.moveNumber} · {currentMistake.movePlayed} — {currentMistake.severity} · cpl {currentMistake.centipawnLoss}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5, fontWeight: 500 }}>
                    Best move was <b style={{ color: "var(--orange-dark)" }}>{currentMistake.bestMove}</b>. You played {currentMistake.movePlayed} ({currentMistake.gamePhase}).
                  </div>
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    <Link to="/drill" style={{ textDecoration: "none" }}><SmallBtn>↻ Try this position</SmallBtn></Link>
                    <SmallBtn>+ Add to drill set</SmallBtn>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* move list */}
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 16, padding: 14, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Moves · click to scrub · game {currentGameIndex + 1} of {games.length}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, fontFamily: "var(--mono)", fontSize: 11 }}>
            {moves.map(m => {
              const mistakeAtMove = gameMistakes.find(gm => gm.moveNumber === m.n);
              return (
                <div key={m.n} style={{ background: m.current ? "#FFE4D0" : "transparent", border: m.current ? "1.5px solid var(--orange)" : "1.5px solid transparent", borderRadius: 6, padding: "3px 6px", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                  <span style={{ color: "var(--ink-3)" }}>{m.n}.</span>
                  <span
                    onClick={() => handleMoveClick(m.n, false)}
                    style={{ fontWeight: 700, color: "var(--ink)", cursor: "pointer" }}
                  >
                    {m.w}
                  </span>
                  <span
                    onClick={() => handleMoveClick(m.n, true)}
                    style={{ fontWeight: 700, color: m.mark === "??" ? "var(--orange-dark)" : m.mark === "?" ? "var(--red)" : m.mark === "?!" ? "var(--yellow-dark)" : "var(--ink)", cursor: "pointer" }}
                  >
                    {m.b}{m.mark || ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* right: timeline + concept overlay */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Eval over time</div>
          <EvalTimeline moves={evalTimeline.length > 0 ? evalTimeline : moves} />
          <div style={{ display: "flex", gap: 4, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 4 }}>
            <span>opening</span><span style={{ flex: 1, borderTop: "1px dashed var(--line)", marginTop: 8 }} /><span>middlegame</span>
          </div>
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Mistakes in this game</div>
          {gameMistakes.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic", padding: "8px 0" }}>No mistakes found in this game.</div>
          )}
          {gameMistakes
            .sort((a, b) => b.centipawnLoss - a.centipawnLoss)
            .map((m, i) => {
              const sevColor: Record<string, string> = { blunder: "var(--orange)", mistake: "var(--red)", inaccuracy: "var(--purple)" };
              const conceptLabel = m.conceptDiff
                ? (() => {
                    const topIdx = m.conceptDiff.reduce((maxI, v, idx, arr) => Math.abs(v) > Math.abs(arr[maxI]) ? idx : maxI, 0);
                    return CONCEPT_NAMES[topIdx] || `feature_${topIdx}`;
                  })()
                : m.gamePhase;
              return (
                <MistakeRow
                  key={m.id || i}
                  severity={m.severity}
                  move={`${m.moveNumber} ... ${m.movePlayed}`}
                  cpl={m.centipawnLoss}
                  concept={conceptLabel}
                  color={sevColor[m.severity] || "var(--blue)"}
                  onClick={() => {
                    const halfIdx = (m.moveNumber - 1) * 2 + (currentGame.playerColor === "black" ? 1 : 0);
                    setCurrentMoveIndex(Math.min(halfIdx, currentGame.fens.length - 1));
                  }}
                />
              );
            })}
        </div>

        <div style={{ background: "var(--ink)", color: "white", borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
            Concept activation · {currentMistake ? `move ${currentMistake.moveNumber}` : "select a mistake"}
          </div>
          <MiniConceptList items={conceptItems} />
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Accuracy</div>
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>this game</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: playerAccuracy < 75 ? "var(--orange)" : "var(--green-dark)", letterSpacing: -0.8 }}>{playerAccuracy}%</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase" }}>you</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: "var(--ink-2)", letterSpacing: -0.8 }}>{currentGame.result}</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase" }}>result</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerStrip({ name, elo, black }: { name: string; elo: number; black?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: black ? "var(--ink)" : "white", border: "2px solid var(--ink)" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 900 }}>{name}</div>
          <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{elo}</div>
        </div>
      </div>
    </div>
  );
}

function Tag({ c, t }: { c: string; t: string }) {
  return <span style={{ background: c, color: "white", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>{t}</span>;
}

function SmallBtn({ children }: { children: React.ReactNode }) {
  return <button style={{ background: "white", border: "2px solid var(--line)", padding: "6px 12px", borderRadius: 8, fontFamily: "var(--sans)", fontWeight: 800, fontSize: 11, cursor: "pointer" }}>{children}</button>;
}

function EvalBar({ whitePercent, evalValue }: { whitePercent: number; evalValue: number }) {
  const displayEval = evalValue >= 0 ? `+${evalValue.toFixed(1)}` : evalValue.toFixed(1);
  return (
    <div style={{ position: "relative", width: 32, background: "var(--ink)", border: "3px solid var(--ink)", borderRadius: 10, overflow: "hidden", height: 480 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${whitePercent}%`, background: "white", transition: "height 0.3s ease" }} />
      <div style={{ position: "absolute", top: `${whitePercent}%`, left: 0, right: 0, height: 2, background: "var(--orange)" }} />
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--ink-3)", opacity: 0.3 }} />
      <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, color: "white", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 800, textAlign: "center" }}>{evalValue < 0 ? displayEval : ""}</div>
      <div style={{ position: "absolute", top: 6, left: 0, right: 0, color: "var(--ink)", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 800, textAlign: "center" }}>{evalValue >= 0 ? displayEval : ""}</div>
    </div>
  );
}

function EvalTimeline({ moves }: { moves: Move[] }) {
  const W = 320, H = 110;
  if (moves.length === 0) return <svg width={W} height={H} />;
  const max = 3, min = -3;
  const pts = moves.map((m, i) => {
    const v = (m.we - m.be);
    const y = H / 2 - (Math.max(min, Math.min(max, v)) / max) * (H / 2 - 6);
    const x = moves.length > 1 ? (i / (moves.length - 1)) * W : W / 2;
    return [x, y] as [number, number];
  });
  const path = "M " + pts.map(p => p.join(",")).join(" L ");
  const blunderIdx = moves.findIndex(m => m.mark === "??");
  return (
    <svg width={W} height={H} style={{ marginTop: 8 }}>
      <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="var(--line)" strokeDasharray="3 4" />
      <path d={path + ` L ${W},${H} L 0,${H} Z`} fill="rgba(27,39,48,0.08)" />
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
      {blunderIdx >= 0 && (
        <g>
          <circle cx={pts[blunderIdx][0]} cy={pts[blunderIdx][1]} r={6} fill="var(--orange)" stroke="white" strokeWidth="2.5" />
          <text x={pts[blunderIdx][0]} y={pts[blunderIdx][1] - 12} textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--orange-dark)" fontFamily="var(--mono)">??</text>
        </g>
      )}
    </svg>
  );
}

function MistakeRow({ severity, move, cpl, concept, color, onClick }: { severity: string; move: string; cpl: number; concept: string; color: string; onClick?: () => void }) {
  const sevColor: Record<string, string> = { blunder: "var(--orange)", mistake: "var(--red)", inaccuracy: "var(--yellow-dark)" };
  return (
    <div
      onClick={onClick}
      style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, padding: "8px 0", borderBottom: "1px dashed var(--line)", alignItems: "center", cursor: onClick ? "pointer" : "default" }}
    >
      <div style={{ background: sevColor[severity], color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>{severity[0]}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--mono)" }}>{move}</div>
        <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 700, marginTop: 1 }}><span style={{ color }}>●</span> {concept}</div>
      </div>
      <div style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 800, color: sevColor[severity] }}>{cpl}cpl</div>
    </div>
  );
}

function MiniConceptList({ items }: { items: { l: string; v: number; hot: boolean }[] }) {
  if (items.length === 0) {
    return (
      <div style={{ fontSize: 11, fontFamily: "var(--mono)", opacity: 0.5 }}>
        No concept data for this position.
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map(it => (
        <div key={it.l} style={{ display: "grid", gridTemplateColumns: "1fr 80px auto", gap: 8, alignItems: "center", fontFamily: "var(--mono)", fontSize: 11 }}>
          <span style={{ color: it.hot ? "white" : "rgba(255,255,255,0.6)" }}>{it.hot && <span style={{ color: "#FF8B3D" }}>● </span>}{it.l}</span>
          <div style={{ height: 5, background: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${Math.abs(it.v) * 100}%`, height: "100%", background: it.hot ? "var(--orange)" : "rgba(255,255,255,0.5)" }} />
          </div>
          <span style={{ color: it.hot ? "var(--orange)" : "rgba(255,255,255,0.5)" }}>{it.v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
