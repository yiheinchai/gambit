
import type { ProgressData } from "@/lib/progress";
import type { OpeningStats as OpeningStatsType } from "@/lib/openings";
import type { EloPrediction } from "@/lib/elo-prediction";
import { LineChart, BarChart } from "./Charts";
import OpeningStats from "./OpeningStats";
import EloBanner from "./EloBanner";
import TopNav from "./TopNav";

interface Props {
  progress: ProgressData;
  username: string;
  openingStats?: OpeningStatsType[];
  eloPrediction?: EloPrediction;
  onRefresh?: () => void;
  onNavigate?: (tab: string) => void;
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
  onNavigate,
}: Props) {
  const { overallStats, eloHistory, mistakeRateTrend, blunderRateTrend, phaseBreakdown } =
    progress;

  const eloChange =
    eloHistory.length >= 2
      ? eloHistory[eloHistory.length - 1].elo - eloHistory[0].elo
      : 0;

  const currentElo = eloHistory.length > 0 ? eloHistory[eloHistory.length - 1].elo : undefined;

  return (
    <div style={{ fontFamily: "var(--sans)" }}>
      <TopNav active="progress" username={username} onNavigate={onNavigate} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Progress · last 90 days
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "6px 0 0", lineHeight: 1.05, color: "var(--ink)" }}>
            You&apos;re getting better.
          </h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="btn-duo"
              style={{
                background: "var(--green)", color: "white", padding: "12px 18px",
                borderRadius: 12, fontSize: 12, letterSpacing: 0.6,
                boxShadow: "0 4px 0 var(--green-dark)",
              }}
            >
              Pull new games
            </button>
          )}
        </div>
      </div>

      {/* Elo prediction banner */}
      <EloBanner currentElo={currentElo} prediction={eloPrediction} />

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginTop: 18 }}>
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
      <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Recent Games</p>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {progress.games.slice(-50).map((g, i) => (
            <div
              key={i}
              title={`${g.result} vs ${g.opponentElo} (${g.mistakeCount} mistakes)`}
              style={{
                width: 24, height: 24, borderRadius: 6, fontSize: 10, fontWeight: 900,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: g.result === "win" ? "var(--green)" : g.result === "loss" ? "var(--red)" : "var(--bg-2)",
                color: g.result === "draw" ? "var(--ink-3)" : "white",
              }}
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
    <div style={{ background: "white", border: "2px solid var(--line)", borderRadius: 16, padding: 12, textAlign: "center" }}>
      <p style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, color: color?.includes("green") ? "var(--green)" : color?.includes("red") ? "var(--red)" : "var(--ink)" }}>
        {value}
        {suffix && <span style={{ fontSize: 12, color: "var(--ink-3)", marginLeft: 4 }}>{suffix}</span>}
      </p>
      <p style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 2 }}>{label}</p>
    </div>
  );
}
