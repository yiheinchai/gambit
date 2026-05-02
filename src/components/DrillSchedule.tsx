
import { useState, useEffect } from "react";
import type { WeaknessCluster } from "@/lib/clustering";
import type { DrillProgress } from "@/lib/db";
import { getDrillProgressByUsername } from "@/lib/db";

interface Props {
  clusters: WeaknessCluster[];
  username: string;
  onDrill: (cluster: WeaknessCluster) => void;
}

interface ScheduleItem {
  cluster: WeaknessCluster;
  progress: DrillProgress | null;
  isDue: boolean;
  status: "due" | "upcoming" | "new" | "mastered";
}

export default function DrillSchedule({ clusters, username, onDrill }: Props) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const allProgress = await getDrillProgressByUsername(username.toLowerCase());
      const progressMap = new Map(allProgress.map((p) => [p.clusterId, p]));

      const now = new Date();
      const schedule: ScheduleItem[] = clusters.map((cluster) => {
        const progress = progressMap.get(cluster.id) || null;

        if (!progress) {
          return { cluster, progress: null, isDue: true, status: "new" as const };
        }

        if (progress.successRate >= 0.9 && progress.totalAttempts >= 10) {
          const nextDue = new Date(progress.nextDue);
          return {
            cluster,
            progress,
            isDue: nextDue <= now,
            status: nextDue <= now ? "due" as const : "mastered" as const,
          };
        }

        const nextDue = new Date(progress.nextDue);
        return {
          cluster,
          progress,
          isDue: nextDue <= now,
          status: nextDue <= now ? "due" as const : "upcoming" as const,
        };
      });

      // Sort: due first, then new, then upcoming, then mastered
      const order = { due: 0, new: 1, upcoming: 2, mastered: 3 };
      schedule.sort((a, b) => order[a.status] - order[b.status]);

      setItems(schedule);
      setLoading(false);
    })();
  }, [clusters, username]);

  const dueCount = items.filter((i) => i.status === "due" || i.status === "new").length;

  if (loading) return null;

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, margin: 0, color: "var(--ink)" }}>Drill Schedule</h2>
          <p style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 600 }}>
            {dueCount > 0
              ? `${dueCount} drill${dueCount === 1 ? "" : "s"} due today`
              : "All caught up!"}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item) => {
          const statusColors = {
            due: { border: "var(--orange)", bg: "#FFF4E5" },
            new: { border: "var(--blue)", bg: "#EBF5FF" },
            mastered: { border: "var(--green)", bg: "#E8F8E5" },
            upcoming: { border: "var(--line)", bg: "white" },
          };
          const sc = statusColors[item.status];

          return (
            <div key={item.cluster.id} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: 14, borderRadius: 14, border: `2px solid ${sc.border}`, background: sc.bg,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StatusBadge status={item.status} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.cluster.label}
                  </span>
                </div>
                {item.progress && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", flexWrap: "wrap" }}>
                    <span>{item.progress.totalAttempts} attempts</span>
                    <span>{Math.round(item.progress.successRate * 100)}% accuracy</span>
                    {item.progress.novelAttempts != null && item.progress.novelAttempts > 0 && (
                      <span style={{ color: (item.progress.novelCorrect || 0) / item.progress.novelAttempts >= 0.7 ? "var(--green-dark)" : "var(--orange-dark)" }}>
                        {Math.round(((item.progress.novelCorrect || 0) / item.progress.novelAttempts) * 100)}% on new
                      </span>
                    )}
                    {item.status === "upcoming" && (
                      <span>Due {formatRelativeDate(new Date(item.progress.nextDue))}</span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => onDrill(item.cluster)}
                className="btn-duo"
                style={{
                  background: item.status === "due" || item.status === "new" ? "var(--orange)" : "white",
                  color: item.status === "due" || item.status === "new" ? "white" : "var(--ink-2)",
                  border: item.status === "due" || item.status === "new" ? "none" : "2px solid var(--line)",
                  padding: "10px 16px", borderRadius: 12, fontSize: 12, letterSpacing: 0.4, flexShrink: 0, marginLeft: 12,
                  boxShadow: item.status === "due" || item.status === "new" ? "0 3px 0 var(--orange-dark)" : "none",
                }}
              >
                {item.status === "new" ? "Start" : "Drill"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: ScheduleItem["status"] }) {
  const colors: Record<string, { bg: string; color: string; shadow: string }> = {
    due: { bg: "var(--orange)", color: "white", shadow: "var(--orange-dark)" },
    new: { bg: "var(--blue)", color: "white", shadow: "#1E3A8A" },
    upcoming: { bg: "var(--bg-2)", color: "var(--ink-3)", shadow: "none" },
    mastered: { bg: "var(--green)", color: "white", shadow: "var(--green-dark)" },
  };
  const labels = { due: "Due", new: "New", upcoming: "Scheduled", mastered: "Mastered" };
  const c = colors[status];

  return (
    <span style={{
      fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6,
      padding: "3px 8px", borderRadius: 6, background: c.bg, color: c.color,
      boxShadow: c.shadow !== "none" ? `0 2px 0 ${c.shadow}` : "none",
    }}>
      {labels[status]}
    </span>
  );
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 30) return `in ${Math.ceil(diffDays / 7)} weeks`;
  return `in ${Math.ceil(diffDays / 30)} months`;
}
