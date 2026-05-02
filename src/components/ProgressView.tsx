
import type { ProgressData } from "@/lib/progress";
import type { OpeningStats as OpeningStatsType } from "@/lib/openings";
import type { EloPrediction } from "@/lib/elo-prediction";
import { LineChart, BarChart } from "./Charts";
import OpeningStats from "./OpeningStats";

interface Props {
  progress: ProgressData;
  username: string;
  openingStats?: OpeningStatsType[];
  eloPrediction?: EloPrediction;
  onRefresh?: () => void;
}

function formatDate(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ProgressView({
  progress,
  username,
  openingStats,
  eloPrediction,
  onRefresh,
}: Props) {
  const { overallStats, eloHistory, mistakeRateTrend, blunderRateTrend, phaseBreakdown } =
    progress;

  const eloChange =
    eloHistory.length >= 2
      ? eloHistory[eloHistory.length - 1].elo - eloHistory[0].elo
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">{username} — Progress</h2>
          <p className="text-zinc-500 text-sm">{overallStats.totalGames} games analyzed</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-sm rounded-lg transition-colors"
          >
            Add New Games
          </button>
        )}
      </div>

      {/* Elo prediction */}
      {eloPrediction && eloPrediction.potentialGain > 0 && (
        <div className="bg-gradient-to-r from-amber-900/20 to-zinc-800 border border-amber-700/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-amber-400">
              +{eloPrediction.potentialGain}
            </span>
            <span className="text-zinc-400 text-sm">estimated Elo gain potential</span>
          </div>
          <div className="space-y-1.5">
            {eloPrediction.topImprovements.map((imp, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">{imp.label}</span>
                <span className="text-green-400 font-medium">+{imp.eloGain} Elo</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MiniStat
          label="Win Rate"
          value={`${Math.round(overallStats.winRate * 100)}%`}
          color={overallStats.winRate > 0.5 ? "text-green-400" : "text-zinc-300"}
        />
        <MiniStat
          label="Avg Mistakes/Game"
          value={overallStats.avgMistakesPerGame.toFixed(1)}
        />
        <MiniStat
          label="Avg Blunders/Game"
          value={overallStats.avgBlundersPerGame.toFixed(1)}
          color={overallStats.avgBlundersPerGame > 2 ? "text-red-400" : "text-zinc-300"}
        />
        <MiniStat
          label="Avg CP Loss"
          value={Math.round(overallStats.avgCpLoss).toString()}
          suffix="cp"
        />
        <MiniStat
          label="Elo Change"
          value={`${eloChange >= 0 ? "+" : ""}${eloChange}`}
          color={eloChange >= 0 ? "text-green-400" : "text-red-400"}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <LineChart
          title="Rating Over Time"
          data={eloHistory.map((p) => ({
            label: formatDate(p.date),
            value: p.elo,
          }))}
          color="#60a5fa"
        />
        <LineChart
          title="Mistakes Per Game (Rolling Avg)"
          data={mistakeRateTrend.map((p) => ({
            label: formatDate(p.date),
            value: p.rate,
          }))}
          color="#f59e0b"
          valueFormat={(v) => v.toFixed(1)}
        />
        <LineChart
          title="Blunders Per Game (Rolling Avg)"
          data={blunderRateTrend.map((p) => ({
            label: formatDate(p.date),
            value: p.rate,
          }))}
          color="#ef4444"
          valueFormat={(v) => v.toFixed(1)}
        />
        <BarChart
          title="Mistakes by Game Phase"
          data={[
            { label: "Opening", value: phaseBreakdown.opening, color: "#60a5fa" },
            { label: "Middle", value: phaseBreakdown.middlegame, color: "#f59e0b" },
            { label: "Endgame", value: phaseBreakdown.endgame, color: "#a78bfa" },
          ]}
        />
      </div>

      {/* Opening stats */}
      {openingStats && openingStats.length > 0 && (
        <OpeningStats stats={openingStats} />
      )}

      {/* Recent results */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
        <p className="text-zinc-400 text-sm mb-3">Recent Games</p>
        <div className="flex gap-1 flex-wrap">
          {progress.games.slice(-50).map((g, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded text-xs flex items-center justify-center font-medium ${
                g.result === "win"
                  ? "bg-green-600/30 text-green-400"
                  : g.result === "loss"
                    ? "bg-red-600/30 text-red-400"
                    : "bg-zinc-700 text-zinc-400"
              }`}
              title={`${g.result} vs ${g.opponentElo} (${g.mistakeCount} mistakes)`}
            >
              {g.result === "win" ? "W" : g.result === "loss" ? "L" : "D"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  suffix,
  color = "text-white",
}: {
  label: string;
  value: string;
  suffix?: string;
  color?: string;
}) {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>
        {value}
        {suffix && <span className="text-sm text-zinc-500 ml-1">{suffix}</span>}
      </p>
      <p className="text-zinc-500 text-xs mt-0.5">{label}</p>
    </div>
  );
}
