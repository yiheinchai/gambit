import type { WeaknessCluster } from "@/lib/clustering";
import { Chessboard } from "react-chessboard";

interface Props {
  cluster: WeaknessCluster;
  rank: number;
  onDrill: () => void;
  onInspect: () => void;
}

const CLUSTER_COLORS = [
  { bg: "var(--orange)", shadow: "var(--orange-dark)" },
  { bg: "var(--red)", shadow: "#A8281C" },
  { bg: "var(--purple)", shadow: "#5C2E91" },
  { bg: "var(--blue)", shadow: "#1E3A8A" },
  { bg: "var(--yellow)", shadow: "var(--yellow-dark)" },
];

export default function DuoWeaknessCard({ cluster, rank, onDrill, onInspect }: Props) {
  const colors = CLUSTER_COLORS[(rank - 1) % CLUSTER_COLORS.length];
  const previewMistake = cluster.mistakes[0];

  return (
    <div style={{
      background: "white", border: "3px solid var(--ink)", borderRadius: 20,
      padding: 20, boxShadow: "0 6px 0 var(--ink)",
      display: "grid", gridTemplateColumns: "60px 140px 1fr 200px 140px",
      gap: 20, alignItems: "center",
    }}>
      {/* Rank chip */}
      <div style={{
        width: 60, height: 60, borderRadius: 14, background: colors.bg,
        color: "white", fontWeight: 900, fontSize: 28,
        display: "grid", placeItems: "center",
        boxShadow: `0 4px 0 ${colors.shadow}`,
      }}>
        #{rank}
      </div>

      {/* Board thumbnail */}
      <div style={{ width: 128, height: 128, borderRadius: 6, overflow: "hidden", border: "2px solid var(--ink)" }}>
        {previewMistake && (
          <Chessboard
            options={{
              position: previewMistake.fen,
              allowDragging: false,
              showNotation: false,
              darkSquareStyle: { backgroundColor: "#7FA650" },
              lightSquareStyle: { backgroundColor: "#EFEFD0" },
            }}
          />
        )}
      </div>

      {/* Title block */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
          cluster · {cluster.topConcepts.length} concepts
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, margin: "4px 0 6px", color: "var(--ink)" }}>
          {cluster.label}
        </div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45, marginBottom: 8 }}>
          {cluster.description.slice(0, 120)}{cluster.description.length > 120 ? "..." : ""}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {cluster.topConcepts.slice(0, 3).map(c => (
            <span key={c.name} style={{
              fontSize: 11, fontFamily: "var(--mono)", padding: "3px 8px",
              background: "var(--bg-2)", borderRadius: 6, color: "var(--ink-2)", fontWeight: 700,
            }}>
              #{c.name.replace(/ /g, "_")}
            </span>
          ))}
        </div>
      </div>

      {/* Stats column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <StatRow label="frequency" value={`${cluster.frequency}× in games`} />
        <StatRow label="avg cpl" value={`${Math.round(cluster.avgCpLoss)}`} mono />
        <StatRow label="severity" value={cluster.severity} mono accent={
          cluster.severity === "critical" ? "var(--orange-dark)" : "var(--ink)"
        } />
      </div>

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button
          onClick={onDrill}
          className="btn-duo"
          style={{
            background: colors.bg, color: "white", padding: "14px 16px",
            borderRadius: 14, fontSize: 13, letterSpacing: 0.6,
            boxShadow: `0 4px 0 ${colors.shadow}`,
          }}
        >
          Drill this
        </button>
        <button
          onClick={onInspect}
          style={{
            background: "white", color: "var(--ink)", border: "2px solid var(--line)",
            padding: "10px 16px", borderRadius: 12, fontFamily: "var(--sans)",
            fontWeight: 800, fontSize: 12, cursor: "pointer",
          }}
        >
          Inspect
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, mono, accent }: {
  label: string; value: string; mono?: boolean; accent?: string;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "baseline",
      borderBottom: "1px dashed var(--line)", paddingBottom: 4,
    }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.4 }}>
        {label}
      </span>
      <span style={{
        fontSize: 14, fontWeight: 900,
        fontFamily: mono ? "var(--mono)" : "var(--sans)",
        color: accent || "var(--ink)",
      }}>
        {value}
      </span>
    </div>
  );
}
