import type { EloPrediction } from "@/lib/elo-prediction";
import type { WeaknessCluster } from "@/lib/clustering";
import { getStreak } from "@/lib/streak";

interface Props {
  username: string;
  totalGames: number;
  totalMistakes: number;
  eloPrediction?: EloPrediction | null;
  topCluster?: WeaknessCluster;
  onDrillTop?: () => void;
}

export default function DashboardHero({
  username,
  totalGames,
  totalMistakes,
  eloPrediction,
  topCluster,
  onDrillTop,
}: Props) {
  const potentialGain = eloPrediction?.potentialGain || 0;
  const streak = getStreak();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24, marginBottom: 24 }}>
      {/* Green hero banner */}
      <div style={{
        background: "linear-gradient(135deg, #58CC02 0%, #45A302 100%)",
        borderRadius: 24, padding: 28, color: "white",
        border: "3px solid var(--green-dark)", boxShadow: "0 6px 0 var(--green-dark)",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -20, top: -20, opacity: 0.12, fontSize: 200, lineHeight: 1 }}>♞</div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 }}>
          {streak.currentStreak > 0 ? `🔥 ${streak.currentStreak}-day streak · ` : ""}{username} · {totalGames} games
        </div>
        <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: -1, margin: "10px 0 4px", lineHeight: 1.1 }}>
          {potentialGain > 0 ? (
            <>Your weaknesses are costing you ~{potentialGain} Elo.</>
          ) : (
            <>{totalMistakes} mistakes found across {totalGames} games.</>
          )}
        </h1>
        {topCluster && (
          <p style={{ fontSize: 15, opacity: 0.92, fontWeight: 500, maxWidth: 520, margin: "8px 0 18px" }}>
            Your biggest weakness: <b>{topCluster.label}</b> ({topCluster.frequency} occurrences).
            {potentialGain > 10 && <> Drilling this pattern could gain you <b>+{Math.round(potentialGain * 0.4)} Elo</b>.</>}
          </p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          {topCluster && (
            <button
              onClick={onDrillTop}
              className="btn-duo"
              style={{
                background: "white", color: "var(--green-dark)",
                padding: "12px 24px", borderRadius: 14, fontSize: 14,
                boxShadow: "0 4px 0 rgba(0,0,0,0.15)",
              }}
            >
              Drill #1 now
            </button>
          )}
        </div>
      </div>

      {/* Metric strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <MetricCard label="Games" value={totalGames.toString()} />
        <MetricCard label="Mistakes" value={totalMistakes.toString()} sub={`${(totalMistakes / Math.max(totalGames, 1)).toFixed(1)} / game`} />
        <MetricCard label="Blunders" value={String(0)} color="var(--red)" />
        {potentialGain > 0 && (
          <MetricCard label="Elo potential" value={`+${potentialGain}`} color="var(--green)" />
        )}
        <MetricCard
          label="Drill streak"
          value={streak.currentStreak > 0 ? `🔥 ${streak.currentStreak}` : "0"}
          sub={streak.isDueToday ? "drill today!" : "keep going"}
          highlight={streak.currentStreak >= 3}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, highlight }: {
  label: string; value: string; sub?: string; color?: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: highlight ? "#FFF7DB" : "white",
      border: highlight ? "2px solid var(--yellow)" : "2px solid var(--line)",
      borderRadius: 16, padding: 16,
      boxShadow: highlight ? "0 4px 0 var(--yellow-dark)" : "none",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ink-3)" }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, color: color || "var(--ink)", marginTop: 4 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  );
}
