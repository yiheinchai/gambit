"use client";

import { useState, useEffect, useRef } from "react";
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
  const startTimeRef = useRef<number | null>(null);
  const [eta, setEta] = useState<string>("");

  useEffect(() => {
    if (phase === "analyzing" && currentGame === 1 && currentMove === 0) {
      startTimeRef.current = Date.now();
    }
  }, [phase, currentGame, currentMove]);

  useEffect(() => {
    if (phase !== "analyzing" || !startTimeRef.current || currentGame < 2) {
      setEta("");
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const gamesCompleted = currentGame - 1;
    if (gamesCompleted <= 0) return;

    const msPerGame = elapsed / gamesCompleted;
    const remaining = totalGames - currentGame + 1;
    const etaMs = remaining * msPerGame;

    if (etaMs < 60000) {
      setEta(`~${Math.ceil(etaMs / 1000)}s remaining`);
    } else {
      setEta(`~${Math.ceil(etaMs / 60000)}min remaining`);
    }
  }, [phase, currentGame, totalGames]);

  const gamePercent = totalGames > 0 ? (currentGame / totalGames) * 100 : 0;
  const movePercent = totalMoves > 0 ? (currentMove / totalMoves) * 100 : 0;

  return (
    <div className="w-full max-w-lg mx-auto space-y-5">
      <div className="text-center">
        <p className="text-zinc-300 text-lg font-medium">
          {phaseLabels[phase]}
        </p>
        {eta && (
          <p className="text-zinc-600 text-sm mt-1">{eta}</p>
        )}
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
            <div className="w-full bg-zinc-800 rounded-full h-2.5">
              <div
                className="bg-amber-500 h-2.5 rounded-full transition-all duration-300"
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

      {phase === "analyzing" && typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent) && (
        <p className="text-center text-xs text-zinc-600 mt-2">
          Analysis is CPU-intensive and may be slower on mobile devices. For best results, use a desktop browser.
        </p>
      )}
    </div>
  );
}
