"use client";

import { Chessboard } from "react-chessboard";
import type { StoredMistake } from "@/lib/db";

interface Props {
  mistake: StoredMistake;
  onClick?: () => void;
}

const severityColors = {
  inaccuracy: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30",
  mistake: "text-orange-400 bg-orange-400/10 border-orange-400/30",
  blunder: "text-red-400 bg-red-400/10 border-red-400/30",
};

export default function MistakeCard({ mistake, onClick }: Props) {
  return (
    <div
      className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 cursor-pointer hover:border-zinc-500 transition-colors"
      onClick={onClick}
    >
      <div className="flex gap-4">
        <div className="w-36 h-36 flex-shrink-0">
          <Chessboard
            options={{
              position: mistake.fen,
              allowDragging: false,
              showNotation: false,
              darkSquareStyle: { backgroundColor: "#779952" },
              lightSquareStyle: { backgroundColor: "#edeed1" },
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded border ${severityColors[mistake.severity]}`}
            >
              {mistake.severity}
            </span>
            <span className="text-zinc-500 text-xs">
              Move {mistake.moveNumber}
            </span>
            <span className="text-zinc-500 text-xs">
              {mistake.gamePhase}
            </span>
          </div>
          <p className="text-zinc-300 text-sm">
            Played{" "}
            <span className="text-red-400 font-mono font-medium">
              {mistake.movePlayed}
            </span>{" "}
            instead of{" "}
            <span className="text-green-400 font-mono font-medium">
              {mistake.bestMove}
            </span>
          </p>
          <p className="text-zinc-500 text-xs mt-1">
            -{mistake.centipawnLoss} centipawns
          </p>
        </div>
      </div>
    </div>
  );
}
