
import { useState, useCallback, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { WeaknessCluster } from "@/lib/clustering";
import {
  createDrillSession,
  evaluateMove,
  getSessionStats,
  computeNextInterval,
  type DrillSession,
  type DrillAttempt,
} from "@/lib/drill-engine";
import { saveDrillProgress, getDrillProgressByCluster } from "@/lib/db";

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

  // Persist drill progress on completion
  useEffect(() => {
    if (drillState !== "complete") return;
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
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Drill Complete</h2>
          <p className="text-zinc-400 mb-6">{cluster.label}</p>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-zinc-500 text-sm">Positions</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-400">{stats.correct}</p>
              <p className="text-zinc-500 text-sm">Correct</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400">
                {Math.round(stats.accuracy * 100)}%
              </p>
              <p className="text-zinc-500 text-sm">Accuracy</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-xl border border-zinc-700 max-w-4xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <div>
            <h2 className="text-white font-semibold">{cluster.label}</h2>
            <p className="text-zinc-500 text-sm">
              Position {positionIndex + 1} of {session.positions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-zinc-400">
              {stats.correct}/{stats.total} correct
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white text-xl leading-none"
            >
              x
            </button>
          </div>
        </div>

        {/* Board + Info */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 sm:gap-6">
            <div>
              {/* Instruction */}
              <div className="mb-3 text-center">
                {drillState === "thinking" && (
                  <p className="text-zinc-300">
                    Find the best move.
                    <span className="text-zinc-500 text-sm ml-2">
                      (Move {currentPosition?.moveNumber} from your game)
                    </span>
                  </p>
                )}
                {drillState === "evaluating" && (
                  <p className="text-zinc-400">Evaluating your move...</p>
                )}
                {drillState === "correct" && (
                  <p className="text-green-400 font-medium">
                    Correct! You played {lastAttempt?.movePlayed}
                  </p>
                )}
                {drillState === "incorrect" && (
                  <p className="text-red-400 font-medium">
                    Not quite. You played {lastAttempt?.movePlayed} (-
                    {lastAttempt?.cpLoss}cp). Best was {lastAttempt?.bestMove}.
                  </p>
                )}
              </div>

              {/* Board */}
              <div className="aspect-square max-w-lg mx-auto">
                <Chessboard
                  options={{
                    position: currentFen,
                    allowDragging: drillState === "thinking",
                    boardOrientation: currentPosition?.playerColor || "white",
                    darkSquareStyle: { backgroundColor: "#779952" },
                    lightSquareStyle: { backgroundColor: "#edeed1" },
                    onPieceDrop: handleDrop,
                  }}
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-col items-center gap-2 mt-4">
                {(drillState === "correct" || drillState === "incorrect") && (
                  <>
                    <div className="flex gap-3">
                      {drillState === "incorrect" && (
                        <button
                          onClick={handleRetry}
                          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
                        >
                          Retry <kbd className="ml-1 text-xs text-zinc-500">R</kbd>
                        </button>
                      )}
                      <button
                        onClick={handleNext}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {positionIndex + 1 >= session.positions.length
                          ? "Finish"
                          : "Next"}{" "}
                        <kbd className="ml-1 text-xs text-amber-300/60">Enter</kbd>
                      </button>
                    </div>
                    <p className="text-zinc-600 text-xs">Esc to exit</p>
                  </>
                )}
              </div>
            </div>

            {/* Side panel */}
            <div className="space-y-4">
              <div className="bg-zinc-900 rounded-lg p-4">
                <h4 className="text-zinc-400 text-xs uppercase tracking-wider mb-2">
                  Session Progress
                </h4>
                <div className="w-full bg-zinc-700 rounded-full h-2 mb-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${((positionIndex + (drillState !== "thinking" ? 1 : 0)) / session.positions.length) * 100}%`,
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-green-400 font-medium">{stats.correct}</span>
                    <span className="text-zinc-500 ml-1">correct</span>
                  </div>
                  <div>
                    <span className="text-red-400 font-medium">{stats.incorrect}</span>
                    <span className="text-zinc-500 ml-1">incorrect</span>
                  </div>
                </div>
              </div>

              {/* Recent attempts */}
              {attempts.length > 0 && (
                <div className="bg-zinc-900 rounded-lg p-4">
                  <h4 className="text-zinc-400 text-xs uppercase tracking-wider mb-2">
                    Recent Attempts
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {[...attempts].reverse().slice(0, 8).map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-xs"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${a.isCorrect ? "bg-green-400" : "bg-red-400"}`}
                        />
                        <span className="text-zinc-400 font-mono">
                          {a.movePlayed}
                        </span>
                        {!a.isCorrect && (
                          <span className="text-zinc-600">
                            (best: {a.bestMove})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
