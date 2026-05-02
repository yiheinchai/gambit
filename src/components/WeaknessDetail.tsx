import { useState } from "react";
import { Chessboard } from "react-chessboard";
import type { WeaknessCluster } from "@/lib/clustering";
import type { StoredMistake } from "@/lib/db";
import ConceptDiffViz from "./ConceptDiffViz";
import { CONCEPT_NAMES } from "@/lib/concept-classifier";

interface Props {
  cluster: WeaknessCluster;
  rank: number;
  onDrill: () => void;
  onClose: () => void;
}

const CLUSTER_COLORS = ["var(--orange)", "var(--red)", "var(--purple)", "var(--blue)", "var(--yellow)"];
const CLUSTER_SHADOWS = ["var(--orange-dark)", "#A8281C", "#5C2E91", "#1E3A8A", "var(--yellow-dark)"];

export default function WeaknessDetail({ cluster, rank, onDrill, onClose }: Props) {
  const [posIdx, setPosIdx] = useState(0);
  const color = CLUSTER_COLORS[(rank - 1) % CLUSTER_COLORS.length];
  const shadow = CLUSTER_SHADOWS[(rank - 1) % CLUSTER_SHADOWS.length];
  const mistake = cluster.mistakes[posIdx];

  const conceptDiffs = mistake?.conceptDiff
    ? Array.from(mistake.conceptDiff)
        .map((val, i) => ({ name: CONCEPT_NAMES[i] || `feature_${i}`, delta: val }))
        .filter(c => Math.abs(c.delta) > 0.05)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 8)
        .map(c => ({
          name: c.name.replace(/_/g, " "),
          yourMove: Math.max(0, -c.delta),
          engineMove: Math.max(0, c.delta),
        }))
    : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 50, overflow: "auto", fontFamily: "var(--sans)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 40px" }}>
        {/* Breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: "var(--ink-3)" }}>
          <span onClick={onClose} style={{ cursor: "pointer" }}>Weaknesses</span>
          <span>›</span>
          <span style={{ color: "var(--ink)" }}>#{rank} {cluster.label}</span>
        </div>

        {/* Header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "end", marginTop: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                background: color, color: "white", padding: "5px 10px", borderRadius: 8,
                fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase",
                boxShadow: `0 3px 0 ${shadow}`,
              }}>
                weakness #{rank}
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
                {cluster.frequency} occurrences · {cluster.severity}
              </div>
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "8px 0 4px", lineHeight: 1.05, color: "var(--ink)" }}>
              {cluster.label}
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: 720, lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
              {cluster.description}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={onDrill}
              className="btn-duo"
              style={{
                background: color, color: "white", padding: "16px 26px", borderRadius: 14,
                fontSize: 14, letterSpacing: 0.6, boxShadow: `0 4px 0 ${shadow}`,
              }}
            >
              Start drilling
            </button>
            <button
              onClick={onClose}
              style={{
                background: "white", border: "2px solid var(--line)", padding: "14px 22px",
                borderRadius: 14, fontWeight: 800, fontSize: 13, fontFamily: "var(--sans)", cursor: "pointer",
              }}
            >
              Back
            </button>
          </div>
        </div>

        {/* Main grid */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: conceptDiffs.length > 0 ? "1.4fr 1fr" : "1fr", gap: 20 }}>
          {/* Featured position */}
          <div style={{
            background: "white", border: "3px solid var(--ink)", borderRadius: 20,
            padding: 20, boxShadow: "0 6px 0 var(--ink)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Representative position
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>
                  Move {mistake?.moveNumber || "?"} · -{mistake?.centipawnLoss || 0}cp
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
                  {posIdx + 1}/{cluster.mistakes.length}
                </span>
                <button onClick={() => setPosIdx(Math.max(0, posIdx - 1))} style={navBtnStyle}>‹</button>
                <button onClick={() => setPosIdx(Math.min(cluster.mistakes.length - 1, posIdx + 1))} style={navBtnStyle}>›</button>
              </div>
            </div>

            {mistake && (
              <>
                <div style={{ maxWidth: 360 }}>
                  <Chessboard options={{
                    position: mistake.fen,
                    allowDragging: false,
                    darkSquareStyle: { backgroundColor: "#7FA650" },
                    lightSquareStyle: { backgroundColor: "#EFEFD0" },
                  }} />
                </div>

                <div style={{ marginTop: 14, background: "var(--bg-2)", borderRadius: 12, padding: 14, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7 }}>
                  <div style={{ color: "var(--ink-3)" }}># your move</div>
                  <div>
                    {mistake.moveNumber}. ... <b style={{ color: "var(--orange-dark)" }}>{mistake.movePlayed}</b>
                    <span style={{ color: "var(--ink-3)" }}> cpl {mistake.centipawnLoss}</span>
                  </div>
                  <div style={{ color: "var(--ink-3)", marginTop: 8 }}># engine</div>
                  <div>
                    {mistake.moveNumber}. ... <b style={{ color: "var(--green-dark)" }}>{mistake.bestMove}</b>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    eval {(mistake.evalBefore / 100).toFixed(1)} → <span style={{ color: "var(--orange-dark)" }}>{(mistake.evalAfter / 100).toFixed(1)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Concept diff */}
          {conceptDiffs.length > 0 && (
            <ConceptDiffViz
              concepts={conceptDiffs}
              yourMoveLabel={mistake?.movePlayed || "Your move"}
              engineMoveLabel={mistake?.bestMove || "Engine"}
            />
          )}
        </div>

        {/* Cluster gallery */}
        <div style={{
          marginTop: 20, background: "white", border: "3px solid var(--ink)",
          borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                All {cluster.mistakes.length} positions in this cluster
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>Sorted by severity</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
            {cluster.mistakes.slice(0, 12).map((m, i) => (
              <div
                key={m.id}
                onClick={() => setPosIdx(i)}
                style={{
                  background: posIdx === i ? "#E8F8E5" : "var(--bg-2)",
                  border: posIdx === i ? "2px solid var(--green)" : "2px solid var(--line)",
                  borderRadius: 12, padding: 10, cursor: "pointer",
                }}
              >
                <div style={{ width: "100%", aspectRatio: "1", borderRadius: 6, overflow: "hidden", border: "1.5px solid var(--ink)", marginBottom: 6 }}>
                  <Chessboard options={{
                    position: m.fen,
                    allowDragging: false,
                    showNotation: false,
                    darkSquareStyle: { backgroundColor: "#7FA650" },
                    lightSquareStyle: { backgroundColor: "#EFEFD0" },
                  }} />
                </div>
                <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
                  move {m.moveNumber} · -{m.centipawnLoss}cp
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 10, border: "2px solid var(--line)",
  background: "white", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "var(--sans)",
};
