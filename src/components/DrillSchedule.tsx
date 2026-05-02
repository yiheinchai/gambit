
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">Drill Schedule</h3>
          <p className="text-zinc-500 text-sm">
            {dueCount > 0
              ? `${dueCount} drill${dueCount === 1 ? "" : "s"} due today`
              : "All caught up!"}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.cluster.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              item.status === "due"
                ? "border-amber-600/40 bg-amber-600/5"
                : item.status === "new"
                  ? "border-blue-600/40 bg-blue-600/5"
                  : item.status === "mastered"
                    ? "border-green-600/30 bg-green-600/5"
                    : "border-zinc-700 bg-zinc-800/50"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <StatusBadge status={item.status} />
                <span className="text-white text-sm font-medium truncate">
                  {item.cluster.label}
                </span>
              </div>
              {item.progress && (
                <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500 flex-wrap">
                  <span>{item.progress.totalAttempts} attempts</span>
                  <span>{Math.round(item.progress.successRate * 100)}% accuracy</span>
                  {item.progress.novelAttempts != null && item.progress.novelAttempts > 0 && (
                    <span className={
                      (item.progress.novelCorrect || 0) / item.progress.novelAttempts >= 0.7
                        ? "text-green-500"
                        : "text-amber-500"
                    }>
                      {Math.round(((item.progress.novelCorrect || 0) / item.progress.novelAttempts) * 100)}% on new positions
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
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors flex-shrink-0 ml-3 ${
                item.status === "due" || item.status === "new"
                  ? "bg-amber-600 hover:bg-amber-500 text-white font-medium"
                  : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
              }`}
            >
              {item.status === "new" ? "Start" : "Drill"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: ScheduleItem["status"] }) {
  const styles = {
    due: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    upcoming: "bg-zinc-700 text-zinc-400 border-zinc-600",
    mastered: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  const labels = { due: "Due", new: "New", upcoming: "Scheduled", mastered: "Mastered" };

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border ${styles[status]}`}>
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
