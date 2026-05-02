
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
import TopNav from "./TopNav";
import DuoWeaknessCard from "./DuoWeaknessCard";
import WeaknessDetail from "./WeaknessDetail";
import GameReviewScreen from "./GameReviewScreen";
import Toast from "./Toast";
import { getMistakesByGameId } from "@/lib/db";

interface Props {
  mistakes: StoredMistake[];
  games: StoredGame[];
  username: string;
  totalGames: number;
  openingStats?: OpeningStats[];
  eloPrediction?: EloPrediction | null;
  onNavigate?: (tab: string) => void;
}

export default function WeaknessDashboard({
  mistakes,
  games,
  username,
  totalGames,
  openingStats = [],
  eloPrediction,
  onNavigate,
}: Props) {
  const [selectedMistake, setSelectedMistake] = useState<StoredMistake | null>(null);
  const [drillCluster, setDrillCluster] = useState<WeaknessCluster | null>(null);
  const [puzzleCluster, setPuzzleCluster] = useState<WeaknessCluster | null>(null);
  const [expandedCluster, setExpandedCluster] = useState<WeaknessCluster | null>(null);
  const [detailCluster, setDetailCluster] = useState<{ cluster: WeaknessCluster; rank: number } | null>(null);
  const [reviewGame, setReviewGame] = useState<{ game: StoredGame; mistakes: StoredMistake[] } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
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
            setToastMsg("Drill complete! 🔥 Keep it up.");
          }}
        />
      )}

      {puzzleCluster && (
        <PuzzleMode
          cluster={puzzleCluster}
          onClose={() => setPuzzleCluster(null)}
        />
      )}

      {reviewGame && (
        <GameReviewScreen
          game={reviewGame.game}
          mistakes={reviewGame.mistakes}
          onClose={() => setReviewGame(null)}
        />
      )}

      {detailCluster && (
        <WeaknessDetail
          cluster={detailCluster.cluster}
          rank={detailCluster.rank}
          onDrill={() => { setDetailCluster(null); setDrillCluster(detailCluster.cluster); }}
          onClose={() => setDetailCluster(null)}
        />
      )}

      {toastMsg && <Toast message={toastMsg} onDone={() => setToastMsg(null)} />}

      {/* Top nav */}
      <TopNav active="weaknesses" username={username} onNavigate={onNavigate} />

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

      {/* Weakness Cards — Duo style */}
      {clusters.length > 0 && (
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, margin: 0, color: "var(--ink)" }}>Your weaknesses, ranked</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {clusters.slice(0, 5).map((cluster, i) => (
              <DuoWeaknessCard
                key={cluster.id}
                cluster={cluster}
                rank={i + 1}
                onDrill={() => setDrillCluster(cluster)}
                onInspect={() => setDetailCluster({ cluster, rank: i + 1 })}
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

      {/* Recent Games */}
      {games.length > 0 && (
        <section>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, marginBottom: 14, color: "var(--ink)" }}>Recent games</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {games.slice(0, 8).map(g => {
              const gameMistakes = mistakes.filter(m => m.gameId === g.id);
              return (
                <div
                  key={g.id}
                  onClick={async () => {
                    const ms = await getMistakesByGameId(g.id);
                    setReviewGame({ game: g, mistakes: ms.length > 0 ? ms : gameMistakes });
                  }}
                  style={{
                    background: "white", border: "2px solid var(--line)", borderRadius: 14,
                    padding: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                    transition: "box-shadow 80ms",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 0 var(--ink)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: g.result === "win" ? "var(--green)" : g.result === "loss" ? "var(--red)" : "var(--bg-2)",
                    color: g.result === "draw" ? "var(--ink)" : "white",
                    display: "grid", placeItems: "center", fontWeight: 900, fontSize: 14,
                    boxShadow: g.result === "win" ? "0 3px 0 var(--green-dark)" : g.result === "loss" ? "0 3px 0 #A8281C" : "none",
                  }}>
                    {g.result === "win" ? "W" : g.result === "loss" ? "L" : "D"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>
                      vs {g.opponentElo} · {g.playerColor}
                    </div>
                    <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
                      {gameMistakes.length} mistakes · {g.moves.length} moves · {new Date(g.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}
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
