import { Chessboard } from "react-chessboard";
import type { StoredMistake } from "@/lib/db";

interface Props {
  mistake: StoredMistake;
  onClick?: () => void;
}

const severityStyles: Record<string, { bg: string; border: string; color: string; shadow: string }> = {
  inaccuracy: { bg: "var(--yellow)", border: "var(--yellow-dark)", color: "white", shadow: "var(--yellow-dark)" },
  mistake: { bg: "var(--red)", border: "#A8281C", color: "white", shadow: "#A8281C" },
  blunder: { bg: "var(--orange)", border: "var(--orange-dark)", color: "white", shadow: "var(--orange-dark)" },
};

export default function MistakeCard({ mistake, onClick }: Props) {
  const sev = severityStyles[mistake.severity] || severityStyles.mistake;

  return (
    <div
      onClick={onClick}
      style={{
        background: "white", border: "2px solid var(--line)", borderRadius: 16,
        padding: 14, cursor: "pointer", display: "flex", gap: 14, alignItems: "center",
        transition: "box-shadow 80ms, transform 80ms",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 0 var(--ink)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
    >
      <div style={{ width: 80, height: 80, flexShrink: 0, borderRadius: 8, overflow: "hidden", border: "2px solid var(--ink)" }}>
        <Chessboard
          options={{
            position: mistake.fen,
            allowDragging: false,
            showNotation: false,
            darkSquareStyle: { backgroundColor: "#7FA650" },
            lightSquareStyle: { backgroundColor: "#EFEFD0" },
          }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            background: sev.bg, color: sev.color, padding: "2px 8px", borderRadius: 6,
            fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6,
            boxShadow: `0 2px 0 ${sev.shadow}`,
          }}>
            {mistake.severity}
          </span>
          <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
            move {mistake.moveNumber} · {mistake.gamePhase}
          </span>
        </div>
        <p style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
          Played <b style={{ color: "var(--orange-dark)", fontFamily: "var(--mono)" }}>{mistake.movePlayed}</b> instead of <b style={{ color: "var(--green-dark)", fontFamily: "var(--mono)" }}>{mistake.bestMove}</b>
        </p>
        <p style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 2 }}>
          -{mistake.centipawnLoss}cp
        </p>
      </div>
    </div>
  );
}
