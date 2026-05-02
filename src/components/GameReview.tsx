"use client";

import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { StoredMistake } from "@/lib/db";

const CONCEPT_DISPLAY = [
  "Fork", "Pin", "Skewer", "Discovered attack", "Back rank",
  "Hanging piece", "Overloaded defender", "Trapped piece",
  "Passed pawn", "Isolated pawn", "Doubled pawn", "Backward pawn",
  "Open file rook", "Bishop pair", "Bad bishop", "Knight outpost",
  "Weak squares", "Space", "King safety", "Castling", "Pawn shield",
  "Material up", "Material down", "Imbalance",
  "Opening", "Middlegame", "Endgame",
];

interface Props {
  mistake: StoredMistake;
  onClose: () => void;
}

export default function GameReview({ mistake, onClose }: Props) {
  const [showBestMove, setShowBestMove] = useState(false);

  const chess = new Chess(mistake.fen);
  const sideToMove = chess.turn() === "w" ? "white" : "black";

  let bestMoveFen = mistake.fen;
  try {
    const bestChess = new Chess(mistake.fen);
    bestChess.move(mistake.bestMove);
    bestMoveFen = bestChess.fen();
  } catch {
    // bestMove might be in UCI format (e2e4), try converting
    try {
      const bestChess = new Chess(mistake.fen);
      const from = mistake.bestMove.slice(0, 2);
      const to = mistake.bestMove.slice(2, 4);
      const promotion = mistake.bestMove[4];
      bestChess.move({ from, to, promotion });
      bestMoveFen = bestChess.fen();
    } catch {
      // keep original fen
    }
  }

  let playedMoveFen = mistake.fen;
  try {
    const playedChess = new Chess(mistake.fen);
    playedChess.move(mistake.movePlayed);
    playedMoveFen = playedChess.fen();
  } catch {
    // keep original fen
  }

  const evalBar = Math.max(-500, Math.min(500, mistake.evalBefore));
  const evalPercent = ((evalBar + 500) / 1000) * 100;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-xl border border-zinc-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-zinc-700">
          <div>
            <span className="text-zinc-400 text-sm">Move {mistake.moveNumber}</span>
            <span className="mx-2 text-zinc-600">|</span>
            <span
              className={`text-sm font-medium ${
                mistake.severity === "blunder"
                  ? "text-red-400"
                  : mistake.severity === "mistake"
                  ? "text-orange-400"
                  : "text-yellow-400"
              }`}
            >
              {mistake.severity} (-{mistake.centipawnLoss}cp)
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white text-xl leading-none"
          >
            x
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Position before the mistake */}
            <div>
              <p className="text-zinc-400 text-sm mb-2 text-center">
                Position ({sideToMove} to move)
              </p>
              <div className="aspect-square max-w-sm mx-auto">
                <Chessboard
                  options={{
                    position: showBestMove ? bestMoveFen : mistake.fen,
                    allowDragging: false,
                    darkSquareStyle: { backgroundColor: "#779952" },
                    lightSquareStyle: { backgroundColor: "#edeed1" },
                  }}
                />
              </div>
            </div>

            {/* Analysis panel */}
            <div className="flex flex-col justify-center space-y-4">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
                  You played
                </p>
                <p className="text-red-400 font-mono text-lg">
                  {mistake.movePlayed}
                </p>
              </div>

              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
                  Best move
                </p>
                <p className="text-green-400 font-mono text-lg">
                  {mistake.bestMove}
                </p>
              </div>

              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1">
                  Evaluation shift
                </p>
                <div className="w-full bg-zinc-900 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-zinc-600 to-white transition-all"
                    style={{ width: `${evalPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-zinc-500 mt-1">
                  <span>Before: {(mistake.evalBefore / 100).toFixed(1)}</span>
                  <span>After: {(mistake.evalAfter / 100).toFixed(1)}</span>
                </div>
              </div>

              {/* Concept tags */}
              {mistake.conceptDiff && mistake.conceptDiff.length > 0 && (
                <div>
                  <p className="text-zinc-500 text-xs uppercase tracking-wider mb-1.5">
                    What you missed
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {mistake.conceptDiff
                      .map((val, idx) => ({ idx, val }))
                      .filter((c) => c.val > 0.2)
                      .sort((a, b) => b.val - a.val)
                      .slice(0, 4)
                      .map((c) => (
                        <span
                          key={c.idx}
                          className="px-2 py-1 bg-amber-900/30 border border-amber-700/30 text-amber-400 text-xs rounded"
                        >
                          {CONCEPT_DISPLAY[c.idx] || `concept_${c.idx}`}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowBestMove(false)}
                  className={`px-3 py-1.5 rounded text-sm ${
                    !showBestMove
                      ? "bg-zinc-600 text-white"
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Position
                </button>
                <button
                  onClick={() => setShowBestMove(true)}
                  className={`px-3 py-1.5 rounded text-sm ${
                    showBestMove
                      ? "bg-green-700 text-white"
                      : "bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  Show Best Move
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
