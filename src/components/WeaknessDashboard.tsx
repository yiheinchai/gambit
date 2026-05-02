"use client";

import { useState, useMemo } from "react";
import type { StoredMistake } from "@/lib/db";
import { aggregateMistakeStats } from "@/lib/analysis";
import { clusterMistakes, type WeaknessCluster } from "@/lib/clustering";
import MistakeCard from "./MistakeCard";
import GameReview from "./GameReview";
import WeaknessClusterCard from "./WeaknessClusterCard";
import DrillMode from "./DrillMode";

interface Props {
  mistakes: StoredMistake[];
  username: string;
  totalGames: number;
}

export default function WeaknessDashboard({
  mistakes,
  username,
  totalGames,
}: Props) {
  const [selectedMistake, setSelectedMistake] = useState<StoredMistake | null>(null);
  const [drillCluster, setDrillCluster] = useState<WeaknessCluster | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<WeaknessCluster | null>(null);

  const stats = aggregateMistakeStats(mistakes);
  const clusters = useMemo(() => clusterMistakes(mistakes), [mistakes]);

  const blunders = mistakes
    .filter((m) => m.severity === "blunder")
    .sort((a, b) => b.centipawnLoss - a.centipawnLoss);

  return (
    <div className="space-y-8">
      {selectedMistake && (
        <GameReview
          mistake={selectedMistake}
          onClose={() => setSelectedMistake(null)}
        />
      )}

      {drillCluster && (
        <DrillMode
          cluster={drillCluster}
          onClose={() => setDrillCluster(null)}
        />
      )}

      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-1">{username}</h2>
        <p className="text-zinc-400">{totalGames} games analyzed</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Mistakes" value={stats.total} />
        <StatCard
          label="Avg CP Loss"
          value={Math.round(stats.avgCpLoss)}
          suffix="cp"
        />
        <StatCard
          label="Blunders"
          value={stats.bySeverity.blunder}
          color="text-red-400"
        />
        <StatCard
          label="Mistakes"
          value={stats.bySeverity.mistake}
          color="text-orange-400"
        />
      </div>

      {/* Phase breakdown */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <PhaseCard label="Opening" count={stats.byPhase.opening} total={stats.total} />
        <PhaseCard label="Middlegame" count={stats.byPhase.middlegame} total={stats.total} />
        <PhaseCard label="Endgame" count={stats.byPhase.endgame} total={stats.total} />
      </div>

      {/* Weakness Clusters */}
      {clusters.length > 0 && (
        <section>
          <h3 className="text-xl font-semibold text-white mb-2">
            Your Weakness Patterns
          </h3>
          <p className="text-zinc-500 text-sm mb-4">
            Recurring mistake patterns across your games, ranked by impact.
          </p>
          <div className="space-y-4">
            {clusters.slice(0, 5).map((cluster) => (
              <WeaknessClusterCard
                key={cluster.id}
                cluster={cluster}
                onDrill={setDrillCluster}
                onExpand={setExpandedCluster}
              />
            ))}
          </div>
        </section>
      )}

      {/* Expanded cluster view */}
      {expandedCluster && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">
              {expandedCluster.label} — All Positions
            </h3>
            <button
              onClick={() => setExpandedCluster(null)}
              className="text-zinc-500 hover:text-zinc-300 text-sm"
            >
              Collapse
            </button>
          </div>
          <div className="space-y-3">
            {expandedCluster.mistakes.map((m) => (
              <MistakeCard
                key={m.id}
                mistake={m}
                onClick={() => setSelectedMistake(m)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Worst individual blunders */}
      {blunders.length > 0 && !expandedCluster && (
        <section>
          <h3 className="text-xl font-semibold text-white mb-4">
            Worst Blunders
          </h3>
          <div className="space-y-3">
            {blunders.slice(0, 5).map((m) => (
              <MistakeCard
                key={m.id}
                mistake={m}
                onClick={() => setSelectedMistake(m)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  color = "text-white",
}: {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>
        {value}
        {suffix && <span className="text-sm text-zinc-500 ml-1">{suffix}</span>}
      </p>
      <p className="text-zinc-500 text-sm mt-1">{label}</p>
    </div>
  );
}

function PhaseCard({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <p className="text-zinc-400 text-sm mb-2">{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-xl font-bold text-white">{count}</span>
        <span className="text-zinc-500 text-sm mb-0.5">{percent}%</span>
      </div>
      <div className="w-full bg-zinc-700 rounded-full h-1.5 mt-2">
        <div
          className="bg-amber-500 h-1.5 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
