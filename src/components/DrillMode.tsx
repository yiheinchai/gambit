
import { useState, useCallback, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { WeaknessCluster } from "@/lib/clustering";
import { CONCEPT_NAMES } from "@/lib/concept-classifier";
import {
  createDrillSession,
  evaluateMove,
  getSessionStats,
  computeNextInterval,
  type DrillSession,
  type DrillAttempt,
} from "@/lib/drill-engine";
import { saveDrillProgress, getDrillProgressByCluster } from "@/lib/db";
import { recordDrillCompletion } from "@/lib/streak";

interface Props {
  cluster: WeaknessCluster;
  onClose: () => void;
}

type DrillState = "thinking" | "evaluating" | "correct" | "incorrect" | "complete";

export default function DrillMode({ cluster, onClose }: Props) {
  const [session] = useState<DrillSession>(() =>
    createDrillSession(cluster.mistakes, cluster.id)
  );
  const [drillState, setDrillState] = useState<DrillState>("thinking");
  const [currentFen, setCurrentFen] = useState(session.positions[0]?.fen || "start");
  const [lastAttempt, setLastAttempt] = useState<DrillAttempt | null>(null);
  const [positionIndex, setPositionIndex] = useState(0);
  const [attempts, setAttempts] = useState<DrillAttempt[]>([]);

  const currentPosition = session.positions[positionIndex];
  const chess = new Chess(currentFen);

  const handleDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      piece: { isSparePiece: boolean; position: string; pieceType: string };
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (drillState !== "thinking" || !targetSquare) return false;

      const testChess = new Chess(currentFen);
      let move;
      try {
        move = testChess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      } catch {
        return false;
      }

      if (!move) return false;

      setDrillState("evaluating");
      setCurrentFen(testChess.fen());

      const moveSan = move.san;

      // Fire-and-forget async eval
      (async () => {
        try {
          const result = await evaluateMove(currentPosition.fen, moveSan);

          const attempt: DrillAttempt = {
            position: currentPosition,
            movePlayed: moveSan,
            isCorrect: result.isCorrect,
            bestMove: result.bestMove,
            cpLoss: result.cpLoss,
          };

          setLastAttempt(attempt);
          setAttempts((prev) => [...prev, attempt]);
          session.attempts.push(attempt);

          setDrillState(result.isCorrect ? "correct" : "incorrect");
        } catch {
          setDrillState("thinking");
          setCurrentFen(currentPosition.fen);
        }
      })();

      return true;
    },
    [currentFen, currentPosition, drillState, session]
  );

  const handleNext = useCallback(() => {
    const nextIdx = positionIndex + 1;
    if (nextIdx >= session.positions.length) {
      setDrillState("complete");
      return;
    }
    setPositionIndex(nextIdx);
    setCurrentFen(session.positions[nextIdx].fen);
    setDrillState("thinking");
    setLastAttempt(null);
  }, [positionIndex, session.positions]);

  const handleRetry = useCallback(() => {
    setCurrentFen(currentPosition.fen);
    setDrillState("thinking");
    setLastAttempt(null);
  }, [currentPosition]);

  const stats = getSessionStats({ ...session, attempts, currentIndex: positionIndex });

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (drillState === "correct" || drillState === "incorrect") {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNext();
        }
        if (e.key === "r" && drillState === "incorrect") {
          e.preventDefault();
          handleRetry();
        }
      }
      if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drillState, handleNext, handleRetry, onClose]);

  // Persist drill progress + streak on completion
  useEffect(() => {
    if (drillState !== "complete") return;
    recordDrillCompletion();
    (async () => {
      const existing = await getDrillProgressByCluster(cluster.id);
      const prevAttempts = existing?.totalAttempts || 0;
      const prevCorrect = prevAttempts * (existing?.successRate || 0);
      const newTotal = prevAttempts + stats.total;
      const newCorrect = prevCorrect + stats.correct;
      const newRate = newTotal > 0 ? newCorrect / newTotal : 0;
      const prevInterval = existing?.interval || 1;
      const { interval, nextDue } = computeNextInterval(prevInterval, stats.accuracy);

      // Track novel vs repeated positions
      const prevFens = new Set(existing?.drilledPositionFens || []);
      const sessionFens = attempts.map((a) => a.position.fen);
      const novelInSession = attempts.filter((a) => !prevFens.has(a.position.fen));
      const novelCorrectCount = novelInSession.filter((a) => a.isCorrect).length;
      const allFens = [...prevFens, ...sessionFens];

      await saveDrillProgress({
        id: existing?.id,
        clusterId: cluster.id,
        username: "",
        totalAttempts: newTotal,
        successRate: newRate,
        lastDrilled: new Date(),
        nextDue,
        interval,
        drilledPositionFens: [...new Set(allFens)],
        novelAttempts: (existing?.novelAttempts || 0) + novelInSession.length,
        novelCorrect: (existing?.novelCorrect || 0) + novelCorrectCount,
      });
    })();
  }, [drillState, cluster.id, stats.total, stats.correct, stats.accuracy, attempts]);

  if (drillState === "complete") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(27,39,48,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 24, boxShadow: "0 8px 0 var(--ink)", maxWidth: 440, width: "100%", padding: 32, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--green)", color: "white", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 900, boxShadow: "0 4px 0 var(--green-dark)", margin: "0 auto 16px" }}>✓</div>
          <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, color: "var(--ink)" }}>Drill Complete</h2>
          <p style={{ color: "var(--ink-3)", fontSize: 14, fontWeight: 600, marginTop: 4 }}>{cluster.label}</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, margin: "24px 0" }}>
            <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: "var(--ink)" }}>{stats.total}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Positions</p>
            </div>
            <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: "var(--green)" }}>{stats.correct}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Correct</p>
            </div>
            <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: "var(--orange)" }}>{Math.round(stats.accuracy * 100)}%</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Accuracy</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-duo"
            style={{ background: "var(--green)", color: "white", padding: "16px 28px", borderRadius: 14, fontSize: 14, boxShadow: "0 4px 0 var(--green-dark)", width: "100%" }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 50, overflow: "auto", fontFamily: "var(--sans)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 40px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green)", display: "grid", placeItems: "center", color: "white", fontWeight: 900, fontSize: 18, boxShadow: "0 3px 0 var(--green-dark)" }}>♞</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "var(--ink)" }}>{cluster.label}</div>
              <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
                Position {positionIndex + 1} of {session.positions.length} · {stats.correct}/{stats.total} correct
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "white", border: "2px solid var(--line)", padding: "8px 16px", borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)", color: "var(--ink-2)" }}
          >
            Exit
          </button>
        </div>

        {/* Board area — Duo style */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 22, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
            {/* Instruction */}
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              {drillState === "thinking" && (
                <>
                  <p style={{ color: "var(--ink)", fontWeight: 700, fontSize: 15 }}>
                    Find the best move.
                    <span style={{ color: "var(--ink-3)", fontSize: 12, marginLeft: 8, fontFamily: "var(--mono)" }}>
                      move {currentPosition?.moveNumber}
                    </span>
                  </p>
                  {currentPosition && (
                    <p style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
                      You originally played <b style={{ color: "var(--orange-dark)", fontFamily: "var(--mono)" }}>
                        {cluster.mistakes.find(m => m.id === currentPosition.mistakeId)?.movePlayed || "?"}
                      </b> here — can you find something better?
                    </p>
                  )}
                </>
              )}
              {drillState === "evaluating" && (
                <p style={{ color: "var(--ink-3)", fontWeight: 600 }}>Evaluating your move...</p>
              )}
            </div>

            {/* Board */}
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              <Chessboard
                options={{
                  position: currentFen,
                  allowDragging: drillState === "thinking",
                  boardOrientation: currentPosition?.playerColor || "white",
                  darkSquareStyle: { backgroundColor: "#7FA650" },
                  lightSquareStyle: { backgroundColor: "#EFEFD0" },
                  onPieceDrop: handleDrop,
                }}
              />
            </div>

            {/* Feedback */}
            {(drillState === "correct" || drillState === "incorrect") && (
              <div style={{ marginTop: 16 }}>
                <DrillFeedbackBanner
                  type={drillState}
                  movePlayed={lastAttempt?.movePlayed}
                  bestMove={lastAttempt?.bestMove}
                  conceptDiff={currentPosition ? cluster.mistakes.find(m => m.id === currentPosition.mistakeId)?.conceptDiff : undefined}
                  onNext={handleNext}
                  onRetry={handleRetry}
                />
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div style={{ background: "white", border: "2px solid var(--line)", borderRadius: 14, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", marginBottom: 6 }}>
              <span>Position {positionIndex + 1} of {session.positions.length}</span>
              <span>{Math.round(((positionIndex + (drillState !== "thinking" ? 1 : 0)) / session.positions.length) * 100)}%</span>
            </div>
            <div style={{ height: 12, background: "var(--bg-2)", borderRadius: 6, overflow: "hidden", border: "1.5px solid var(--line)" }}>
              <div style={{
                width: `${((positionIndex + (drillState !== "thinking" ? 1 : 0)) / session.positions.length) * 100}%`,
                height: "100%", background: "var(--orange)", boxShadow: "inset 0 -3px 0 var(--orange-dark)",
                transition: "width 300ms",
              }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              <div style={{ background: "var(--bg-2)", borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--green)", letterSpacing: -0.5 }}>{stats.correct}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>correct</div>
              </div>
              <div style={{ background: "var(--bg-2)", borderRadius: 10, padding: 10 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--red)", letterSpacing: -0.5 }}>{stats.incorrect}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>incorrect</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrillFeedbackBanner({ type, movePlayed, bestMove, conceptDiff, onNext, onRetry }: {
  type: "correct" | "incorrect"; movePlayed?: string; bestMove?: string; conceptDiff?: number[] | null; onNext: () => void; onRetry: () => void;
}) {
  // CONCEPT_NAMES imported at top of file
  const topConcepts = conceptDiff
    ? Array.from(conceptDiff)
        .map((val, i) => ({ name: (CONCEPT_NAMES[i] || `feature_${i}`).replace(/_/g, " "), val }))
        .filter(c => c.val > 0.1 && !c.name.startsWith("feature "))
        .sort((a, b) => b.val - a.val)
        .slice(0, 2)
    : [];
  if (type === "correct") {
    return (
      <div style={{ background: "#E8F8E5", border: "2.5px solid var(--green)", borderRadius: 16, padding: 16, boxShadow: "0 4px 0 var(--green-dark)", display: "flex", gap: 14, alignItems: "center" }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900, boxShadow: "0 3px 0 var(--green-dark)", flexShrink: 0 }}>✓</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "var(--green-dark)", letterSpacing: 0.4, textTransform: "uppercase" }}>Correct!</div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2, fontWeight: 500 }}>
            You found <b>{movePlayed}</b>.
            {topConcepts.length > 0 && (
              <span style={{ color: "var(--ink-3)" }}> Key concepts: {topConcepts.map(c => c.name).join(", ")}.</span>
            )}
          </div>
        </div>
        <button onClick={onNext} className="btn-duo" style={{ background: "var(--green)", color: "white", padding: "16px 22px", borderRadius: 14, fontSize: 13, letterSpacing: 0.6, boxShadow: "0 4px 0 var(--green-dark)", whiteSpace: "nowrap" }}>Next →</button>
      </div>
    );
  }
  return (
    <div style={{ background: "#FEECEC", border: "2.5px solid var(--red)", borderRadius: 16, padding: 16, boxShadow: "0 4px 0 #A8281C", display: "flex", gap: 14, alignItems: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--red)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900, boxShadow: "0 3px 0 #A8281C", flexShrink: 0 }}>✗</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 900, color: "#A8281C", letterSpacing: 0.4, textTransform: "uppercase" }}>Not quite</div>
        <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2, fontWeight: 500 }}>
          You played <b>{movePlayed}</b>. Best: <b style={{ color: "var(--green-dark)" }}>{bestMove}</b>
          {topConcepts.length > 0 && (
            <span style={{ color: "var(--ink-3)" }}> — the engine's move addresses: {topConcepts.map(c => c.name).join(", ")}.</span>
          )}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button onClick={onRetry} style={{ background: "white", color: "var(--ink)", border: "2px solid var(--line)", padding: "10px 16px", borderRadius: 12, fontFamily: "var(--sans)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Retry</button>
        <button onClick={onNext} className="btn-duo" style={{ background: "var(--red)", color: "white", padding: "10px 16px", borderRadius: 12, fontSize: 12, letterSpacing: 0.4, boxShadow: "0 3px 0 #A8281C" }}>Next</button>
      </div>
    </div>
  );
}
