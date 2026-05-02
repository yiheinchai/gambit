
import { useState, useCallback, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { WeaknessCluster } from "@/lib/clustering";
import { getOfflinePuzzlesForConcepts } from "@/lib/puzzles";

interface Props {
  cluster: WeaknessCluster;
  onClose: () => void;
}

type PuzzleState = "thinking" | "correct" | "incorrect" | "complete";

interface Puzzle {
  fen: string;
  solution: string[];
  rating: number;
  theme: string;
}

export default function PuzzleMode({ cluster, onClose }: Props) {
  const conceptNames = cluster.topConcepts.map((c) => c.name);
  const [puzzles] = useState<Puzzle[]>(() =>
    getOfflinePuzzlesForConcepts(conceptNames, 10)
  );
  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [moveIdx, setMoveIdx] = useState(0);
  const [puzzleState, setPuzzleState] = useState<PuzzleState>("thinking");
  const [currentFen, setCurrentFen] = useState(puzzles[0]?.fen || "start");
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);

  const currentPuzzle = puzzles[puzzleIdx];

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        if (puzzleState === "correct" || puzzleState === "incorrect") {
          e.preventDefault();
          handleNextPuzzle();
        }
      }
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const handleNextPuzzle = useCallback(() => {
    const next = puzzleIdx + 1;
    if (next >= puzzles.length) {
      setPuzzleState("complete");
      return;
    }
    setPuzzleIdx(next);
    setMoveIdx(0);
    setCurrentFen(puzzles[next].fen);
    setPuzzleState("thinking");
  }, [puzzleIdx, puzzles]);

  const handleDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      piece: { isSparePiece: boolean; position: string; pieceType: string };
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (puzzleState !== "thinking" || !targetSquare || !currentPuzzle) return false;

      const chess = new Chess(currentFen);
      let move;
      try {
        move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      } catch {
        return false;
      }
      if (!move) return false;

      // Check against solution
      const expectedUci = currentPuzzle.solution[moveIdx];
      const playedUci = move.from + move.to + (move.promotion || "");

      if (playedUci === expectedUci || move.lan === expectedUci) {
        // Correct move
        setCurrentFen(chess.fen());
        const nextMoveIdx = moveIdx + 1;

        if (nextMoveIdx >= currentPuzzle.solution.length) {
          // Puzzle complete
          setCorrect((c) => c + 1);
          setTotal((t) => t + 1);
          setPuzzleState("correct");
        } else {
          // Play opponent's response automatically
          setMoveIdx(nextMoveIdx);

          const opponentMove = currentPuzzle.solution[nextMoveIdx];
          if (opponentMove) {
            const from = opponentMove.slice(0, 2);
            const to = opponentMove.slice(2, 4);
            const promotion = opponentMove[4];
            try {
              chess.move({ from, to, promotion });
              setCurrentFen(chess.fen());
              setMoveIdx(nextMoveIdx + 1);

              if (nextMoveIdx + 1 >= currentPuzzle.solution.length) {
                setCorrect((c) => c + 1);
                setTotal((t) => t + 1);
                setPuzzleState("correct");
              }
            } catch {
              // opponent move failed, puzzle done
              setCorrect((c) => c + 1);
              setTotal((t) => t + 1);
              setPuzzleState("correct");
            }
          }
        }
      } else {
        // Wrong move
        setTotal((t) => t + 1);
        setPuzzleState("incorrect");
        setCurrentFen(chess.fen());
      }

      return true;
    },
    [currentFen, currentPuzzle, moveIdx, puzzleState]
  );

  if (puzzles.length === 0) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(27,39,48,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 24, boxShadow: "0 8px 0 var(--ink)", maxWidth: 400, width: "100%", padding: 32, textAlign: "center" }}>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", marginBottom: 8 }}>No Puzzles Available</h2>
          <p style={{ color: "var(--ink-2)", fontSize: 14, marginBottom: 16 }}>
            No matching puzzles for this weakness pattern yet.
          </p>
          <button onClick={onClose} style={{ background: "var(--bg-2)", border: "2px solid var(--line)", padding: "10px 20px", borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)" }}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (puzzleState === "complete") {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(27,39,48,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 24, boxShadow: "0 8px 0 var(--ink)", maxWidth: 440, width: "100%", padding: 32, textAlign: "center" }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--ink)", marginBottom: 8 }}>Puzzles Complete</h2>
          <p style={{ color: "var(--ink-3)", fontSize: 14, fontWeight: 600, marginBottom: 24 }}>{cluster.label}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 32, fontWeight: 900, color: "var(--green)", letterSpacing: -1 }}>{correct}</p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Solved</p>
            </div>
            <div style={{ background: "var(--bg-2)", borderRadius: 14, padding: 14 }}>
              <p style={{ fontSize: 32, fontWeight: 900, color: "var(--orange)", letterSpacing: -1 }}>
                {total > 0 ? Math.round((correct / total) * 100) : 0}%
              </p>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>Accuracy</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-duo" style={{ background: "var(--green)", color: "white", padding: "16px 28px", borderRadius: 14, fontSize: 14, boxShadow: "0 4px 0 var(--green-dark)", width: "100%" }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 50, overflow: "auto", fontFamily: "var(--sans)" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "var(--ink)" }}>Practice Puzzles — {cluster.label}</h2>
            <p style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
              Puzzle {puzzleIdx + 1} of {puzzles.length}
              {currentPuzzle && (
                <span style={{ marginLeft: 8 }}>
                  Rating: {currentPuzzle.rating} | {currentPuzzle.theme}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "white", border: "2px solid var(--line)", padding: "8px 16px", borderRadius: 12, fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "var(--sans)", color: "var(--ink-2)" }}>Exit</button>
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 22, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            {puzzleState === "thinking" && (
              <p style={{ color: "var(--ink)", fontWeight: 700, fontSize: 15 }}>Find the best move.</p>
            )}
            {puzzleState === "correct" && (
              <p style={{ color: "var(--green-dark)", fontWeight: 900, fontSize: 15 }}>Correct!</p>
            )}
            {puzzleState === "incorrect" && (
              <p style={{ color: "var(--red)", fontWeight: 900, fontSize: 15 }}>
                Incorrect. Solution was {currentPuzzle?.solution[moveIdx]}.
              </p>
            )}
          </div>

          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <Chessboard
              options={{
                position: currentFen,
                allowDragging: puzzleState === "thinking",
                darkSquareStyle: { backgroundColor: "#779952" },
                lightSquareStyle: { backgroundColor: "#edeed1" },
                onPieceDrop: handleDrop,
              }}
            />
          </div>

          {(puzzleState === "correct" || puzzleState === "incorrect") && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 16 }}>
              <button
                onClick={handleNextPuzzle}
                className="btn-duo"
                style={{ background: "var(--green)", color: "white", padding: "14px 22px", borderRadius: 14, fontSize: 13, letterSpacing: 0.6, boxShadow: "0 4px 0 var(--green-dark)" }}
              >
                {puzzleIdx + 1 >= puzzles.length ? "Finish" : "Next Puzzle"}{" "}
                <kbd style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginLeft: 6 }}>Enter</kbd>
              </button>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 12, fontSize: 11, color: "var(--ink-3)" }}>
            <span>Solved: {correct}/{total}</span>
            <span>Esc to exit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
