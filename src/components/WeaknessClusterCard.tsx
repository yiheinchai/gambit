"use client";

import { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import type { WeaknessCluster } from "@/lib/clustering";
import { fetchExplanation } from "@/lib/explanations";

interface Props {
  cluster: WeaknessCluster;
  onDrill: (cluster: WeaknessCluster) => void;
  onExpand: (cluster: WeaknessCluster) => void;
}

const severityColors = {
  critical: "border-red-500/40 bg-red-500/5",
  moderate: "border-orange-500/40 bg-orange-500/5",
  minor: "border-yellow-500/40 bg-yellow-500/5",
};

const severityBadge = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  moderate: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  minor: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
};

export default function WeaknessClusterCard({ cluster, onDrill, onExpand }: Props) {
  const previewMistake = cluster.mistakes[0];
  const [explanation, setExplanation] = useState(cluster.description);

  useEffect(() => {
    let cancelled = false;
    fetchExplanation(cluster).then((text) => {
      if (!cancelled) setExplanation(text);
    });
    return () => { cancelled = true; };
  }, [cluster]);

  return (
    <div
      className={`border rounded-xl p-5 ${severityColors[cluster.severity]} cursor-pointer hover:border-zinc-500 transition-colors`}
      onClick={() => onExpand(cluster)}
    >
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
        {previewMistake && (
          <div className="w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-lg overflow-hidden">
            <Chessboard
              options={{
                position: previewMistake.fen,
                allowDragging: false,
                showNotation: false,
                darkSquareStyle: { backgroundColor: "#779952" },
                lightSquareStyle: { backgroundColor: "#edeed1" },
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-white font-semibold text-lg">{cluster.label}</h3>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded border ${severityBadge[cluster.severity]}`}
            >
              {cluster.severity}
            </span>
          </div>

          <p className="text-zinc-400 text-sm mb-3 line-clamp-2">
            {explanation}
          </p>

          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span>{cluster.frequency} occurrences</span>
            <span>Avg -{Math.round(cluster.avgCpLoss)}cp</span>
            {cluster.topConcepts.length > 0 && (
              <div className="flex gap-1">
                {cluster.topConcepts.slice(0, 2).map((c) => (
                  <span
                    key={c.name}
                    className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400"
                  >
                    {c.name.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDrill(cluster);
          }}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Drill This
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onExpand(cluster);
          }}
          className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
        >
          View All ({cluster.mistakes.length})
        </button>
      </div>
    </div>
  );
}
