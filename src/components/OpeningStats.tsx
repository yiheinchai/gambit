"use client";

import type { OpeningStats as OpeningStatsType } from "@/lib/openings";

interface Props {
  stats: OpeningStatsType[];
}

export default function OpeningStats({ stats }: Props) {
  if (stats.length === 0) return null;

  const maxGames = Math.max(...stats.map((s) => s.gamesPlayed));

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <h4 className="text-zinc-400 text-sm mb-4">Opening Repertoire</h4>
      <div className="space-y-3">
        {stats.slice(0, 8).map((opening) => {
          const winPct = Math.round(opening.winRate * 100);
          const barWidth = (opening.gamesPlayed / maxGames) * 100;

          return (
            <div key={opening.name}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-white text-sm font-medium truncate">
                    {opening.name}
                  </span>
                  {opening.eco && (
                    <span className="text-zinc-600 text-xs flex-shrink-0">{opening.eco}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs flex-shrink-0 ml-2">
                  <span className="text-zinc-500">{opening.gamesPlayed}g</span>
                  <span
                    className={
                      winPct >= 55
                        ? "text-green-400"
                        : winPct <= 40
                          ? "text-red-400"
                          : "text-zinc-400"
                    }
                  >
                    {winPct}%
                  </span>
                </div>
              </div>

              {/* Win/draw/loss bar */}
              <div className="flex h-2 rounded-full overflow-hidden" style={{ width: `${barWidth}%`, minWidth: 40 }}>
                {opening.wins > 0 && (
                  <div
                    className="bg-green-500"
                    style={{ width: `${(opening.wins / opening.gamesPlayed) * 100}%` }}
                  />
                )}
                {opening.draws > 0 && (
                  <div
                    className="bg-zinc-500"
                    style={{ width: `${(opening.draws / opening.gamesPlayed) * 100}%` }}
                  />
                )}
                {opening.losses > 0 && (
                  <div
                    className="bg-red-500"
                    style={{ width: `${(opening.losses / opening.gamesPlayed) * 100}%` }}
                  />
                )}
              </div>

              {opening.avgMistakes > 2 && (
                <p className="text-xs text-orange-400/70 mt-0.5">
                  {opening.avgMistakes.toFixed(1)} mistakes/game
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-zinc-700 text-xs text-zinc-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Win</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-500" />Draw</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Loss</span>
      </div>
    </div>
  );
}
