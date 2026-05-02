"use client";

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
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">No Puzzles Available</h2>
          <p className="text-zinc-400 mb-4">
            No matching puzzles for this weakness pattern yet.
          </p>
          <button onClick={onClose} className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg">
            Back
          </button>
        </div>
      </div>
    );
  }

  if (puzzleState === "complete") {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
        <div className="bg-zinc-800 rounded-xl border border-zinc-700 max-w-md w-full p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Puzzles Complete</h2>
          <p className="text-zinc-400 mb-6">{cluster.label}</p>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-3xl font-bold text-green-400">{correct}</p>
              <p className="text-zinc-500 text-sm">Solved</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-amber-400">
                {total > 0 ? Math.round((correct / total) * 100) : 0}%
              </p>
              <p className="text-zinc-500 text-sm">Accuracy</p>
            </div>
          </div>
          <button onClick={onClose} className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-xl border border-zinc-700 max-w-3xl w-full max-h-[95vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <div>
            <h2 className="text-white font-semibold">Practice Puzzles — {cluster.label}</h2>
            <p className="text-zinc-500 text-sm">
              Puzzle {puzzleIdx + 1} of {puzzles.length}
              {currentPuzzle && (
                <span className="ml-2 text-zinc-600">
                  Rating: {currentPuzzle.rating} | {currentPuzzle.theme}
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">x</button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-3 text-center">
            {puzzleState === "thinking" && (
              <p className="text-zinc-300">Find the best move.</p>
            )}
            {puzzleState === "correct" && (
              <p className="text-green-400 font-medium">Correct!</p>
            )}
            {puzzleState === "incorrect" && (
              <p className="text-red-400 font-medium">
                Incorrect. Solution was {currentPuzzle?.solution[moveIdx]}.
              </p>
            )}
          </div>

          <div className="aspect-square max-w-lg mx-auto">
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
            <div className="flex justify-center mt-4">
              <button
                onClick={handleNextPuzzle}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg"
              >
                {puzzleIdx + 1 >= puzzles.length ? "Finish" : "Next Puzzle"}{" "}
                <kbd className="ml-1 text-xs text-amber-300/60">Enter</kbd>
              </button>
            </div>
          )}

          <div className="flex justify-center gap-4 mt-3 text-xs text-zinc-500">
            <span>Solved: {correct}/{total}</span>
            <span>Esc to exit</span>
          </div>
        </div>
      </div>
    </div>
  );
}
