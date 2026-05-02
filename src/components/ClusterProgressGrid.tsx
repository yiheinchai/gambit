import { useState, useEffect } from "react";
import type { WeaknessCluster } from "@/lib/clustering";
import type { DrillProgress } from "@/lib/db";
import { getDrillProgressByUsername } from "@/lib/db";

interface Props {
  clusters: WeaknessCluster[];
  username: string;
}

const CLUSTER_COLORS = ["var(--orange)", "var(--red)", "var(--purple)", "var(--blue)", "var(--yellow)"];

export default function ClusterProgressGrid({ clusters, username }: Props) {
  const [progress, setProgress] = useState<Map<number, DrillProgress>>(new Map());

  useEffect(() => {
    getDrillProgressByUsername(username.toLowerCase()).then(all => {
      setProgress(new Map(all.map(p => [p.clusterId, p])));
    });
  }, [username]);

  if (clusters.length === 0) return null;

  return (
    <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 5px 0 var(--ink)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>
        Per-cluster progress
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {clusters.slice(0, 6).map((cluster, i) => {
          const dp = progress.get(cluster.id);
          const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];
          const successPct = dp ? Math.round(dp.successRate * 100) : 0;

          let status: { label: string; bg: string; color: string } | null = null;
          if (dp && dp.successRate >= 0.9 && dp.totalAttempts >= 10) {
            status = { label: "MASTERED", bg: "#E8F8E5", color: "var(--green-dark)" };
          } else if (dp && dp.totalAttempts > 0) {
            status = { label: `${successPct}%`, bg: "var(--bg-2)", color: "var(--ink)" };
          } else {
            status = { label: "NEW", bg: "#EBF5FF", color: "var(--blue)" };
          }

          return (
            <div key={cluster.id} style={{
              background: "var(--bg-2)", border: "2px solid var(--line)", borderRadius: 14, padding: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: color }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                    {cluster.label}
                  </span>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5,
                  padding: "2px 6px", borderRadius: 4,
                  background: status.bg, color: status.color,
                }}>
                  {status.label}
                </span>
              </div>

              {dp && dp.totalAttempts > 0 && (
                <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
                  <span>{successPct}% acc</span>
                  <span>{dp.totalAttempts} drills</span>
                  <span style={{ color: cluster.avgCpLoss > 200 ? "var(--orange-dark)" : "var(--ink-3)" }}>
                    -{Math.round(cluster.avgCpLoss)}cp avg
                  </span>
                </div>
              )}

              {/* Mini progress bar */}
              {dp && dp.totalAttempts > 0 && (
                <div style={{ marginTop: 6, height: 6, background: "white", borderRadius: 3, overflow: "hidden", border: "1px solid var(--line)" }}>
                  <div style={{ width: `${successPct}%`, height: "100%", background: color, borderRadius: 3 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
