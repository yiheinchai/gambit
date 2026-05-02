"use client";

import type { AnalysisProgress as AnalysisProgressType } from "@/lib/analysis";

interface Props {
  progress: AnalysisProgressType;
}

const phaseLabels: Record<AnalysisProgressType["phase"], string> = {
  fetching: "Fetching games from Chess.com",
  analyzing: "Analyzing positions with Stockfish",
  clustering: "Identifying weakness patterns",
  done: "Analysis complete",
};

export default function AnalysisProgress({ progress }: Props) {
  const { phase, currentGame, totalGames, currentMove, totalMoves, mistakesFound } = progress;

  const gamePercent = totalGames > 0 ? (currentGame / totalGames) * 100 : 0;
  const movePercent = totalMoves > 0 ? (currentMove / totalMoves) * 100 : 0;

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <p className="text-zinc-300 text-lg font-medium">
          {phaseLabels[phase]}
        </p>
      </div>

      {phase === "analyzing" && (
        <>
          <div>
            <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>
                Game {currentGame} of {totalGames}
              </span>
              <span>{Math.round(gamePercent)}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${gamePercent}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm text-zinc-400 mb-1">
              <span>
                Move {currentMove} of {totalMoves}
              </span>
              <span>{Math.round(movePercent)}%</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div
                className="bg-amber-700 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${movePercent}%` }}
              />
            </div>
          </div>
        </>
      )}

      {phase === "fetching" && (
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="text-center text-sm text-zinc-500">
        {mistakesFound} mistakes found so far
      </div>
    </div>
  );
}
