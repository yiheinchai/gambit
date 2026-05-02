
import { useState, useMemo } from "react";
import type { StoredMistake, StoredGame } from "@/lib/db";
import type { OpeningStats } from "@/lib/openings";
import type { EloPrediction } from "@/lib/elo-prediction";
import { aggregateMistakeStats } from "@/lib/analysis";
import { clusterMistakes, type WeaknessCluster } from "@/lib/clustering";
import { buildExport, downloadJson } from "@/lib/export";
import MistakeCard from "./MistakeCard";
import GameReview from "./GameReview";
import WeaknessClusterCard from "./WeaknessClusterCard";
import DrillMode from "./DrillMode";
import ConceptRadar from "./ConceptRadar";
import DrillSchedule from "./DrillSchedule";
import PuzzleMode from "./PuzzleMode";
import DashboardHero from "./DashboardHero";

interface Props {
  mistakes: StoredMistake[];
  games: StoredGame[];
  username: string;
  totalGames: number;
  openingStats?: OpeningStats[];
  eloPrediction?: EloPrediction | null;
}

export default function WeaknessDashboard({
  mistakes,
  games,
  username,
  totalGames,
  openingStats = [],
  eloPrediction,
}: Props) {
  const [selectedMistake, setSelectedMistake] = useState<StoredMistake | null>(null);
  const [drillCluster, setDrillCluster] = useState<WeaknessCluster | null>(null);
  const [puzzleCluster, setPuzzleCluster] = useState<WeaknessCluster | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<WeaknessCluster | null>(null);
  const [scheduleKey, setScheduleKey] = useState(0);

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
          onClose={() => {
            setDrillCluster(null);
            setScheduleKey((k) => k + 1);
          }}
        />
      )}

      {puzzleCluster && (
        <PuzzleMode
          cluster={puzzleCluster}
          onClose={() => setPuzzleCluster(null)}
        />
      )}

      {/* Hero banner + metrics */}
      <DashboardHero
        username={username}
        totalGames={totalGames}
        totalMistakes={stats.total}
        eloPrediction={eloPrediction}
        topCluster={clusters[0]}
        onDrillTop={() => clusters[0] && setDrillCluster(clusters[0])}
      />

      {/* Cold start */}
      {totalGames > 0 && totalGames < 10 && (
        <div style={{
          background: "#E8F8E5", border: "2px solid var(--green)", borderRadius: 16,
          padding: 16, textAlign: "center",
        }}>
          <p style={{ color: "var(--green-dark)", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>
            Limited data ({totalGames} games)
          </p>
          <p style={{ color: "var(--ink-2)", fontSize: 13 }}>
            Patterns improve with 20+ games. Individual mistakes below are still useful.
          </p>
        </div>
      )}

      {/* Concept Radar */}
      <ConceptRadar mistakes={mistakes} />

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
                onPuzzle={setPuzzleCluster}
                onExpand={setExpandedCluster}
              />
            ))}
          </div>
        </section>
      )}

      {/* Drill Schedule */}
      {clusters.length > 0 && (
        <DrillSchedule
          key={scheduleKey}
          clusters={clusters}
          username={username}
          onDrill={setDrillCluster}
        />
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

      {/* Export */}
      <div className="text-center pt-4">
        <button
          onClick={() => {
            const data = buildExport(
              username,
              games,
              mistakes,
              clusters,
              openingStats,
              eloPrediction ?? null
            );
            downloadJson(data);
          }}
          className="text-zinc-600 hover:text-zinc-400 text-sm transition-colors"
        >
          Export analysis as JSON
        </button>
      </div>
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
