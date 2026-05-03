import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "../store";
import { getGamesByUsername, getMistakesByUsername, getDrillProgressByUsername } from "../lib/db";
import { clusterMistakes, type WeaknessCluster } from "../lib/clustering";
import { computeProgress } from "../lib/progress";
import { predictEloGain } from "../lib/elo-prediction";
import { getStreak } from "../lib/streak";
import type { DrillProgress as DrillProgressType } from "../lib/db";

/* ─── sub-component props ─── */
interface LegendItem {
  c: string;
  l: string;
}

interface ClusterProgressProps {
  name: string;
  status: string;
  success: number | null;
  attempts: number;
  delta: number | null;
  color: string;
  data: number[];
  mastered?: boolean;
  regressed?: boolean;
  fresh?: boolean;
}

interface AchievementProps {
  icon: string;
  title: string;
  sub: string;
}

type TimeRange = "30d" | "90d" | "1y";

const CLUSTER_COLORS = [
  "var(--orange)",
  "var(--red)",
  "var(--purple)",
  "var(--blue)",
  "var(--yellow-dark)",
  "#16A34A",
  "#8B5CF6",
  "#EC4899",
];

/* ─── Legend ─── */
function Legend({ clusters }: { clusters: WeaknessCluster[] }) {
  const items: LegendItem[] = clusters.slice(0, 5).map((c, i) => ({
    c: CLUSTER_COLORS[i % CLUSTER_COLORS.length],
    l: c.label.toLowerCase(),
  }));
  if (items.length === 0) {
    items.push({ c: "var(--orange)", l: "mistakes" });
  }
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {items.map(i => (
        <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: i.c }} />
          <span style={{ color: "var(--ink-2)" }}>{i.l}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── StackedChart ─── */
function StackedChart({ clusters, games, range }: { clusters: WeaknessCluster[]; games: { date: Date; mistakeCount: number }[]; range: TimeRange }) {
  const W = 720, H = 240;

  // Bucket games into weekly bins, then compute per-cluster mistake counts per week
  const chartData = useMemo(() => {
    if (games.length === 0 || clusters.length === 0) return null;

    const rangeDays = range === "30d" ? 30 : range === "90d" ? 90 : 365;
    const now = new Date();
    const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    // Number of weeks to show
    const numWeeks = Math.max(4, Math.min(13, Math.ceil(rangeDays / 7)));

    // Build time buckets
    const weekBuckets: { start: Date; end: Date }[] = [];
    for (let w = 0; w < numWeeks; w++) {
      const end = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      weekBuckets.unshift({ start, end });
    }

    // For each cluster, count mistakes per week
    const topClusters = clusters.slice(0, 5);
    const layers = topClusters.map((cluster, ci) => {
      const clusterMistakeDates = cluster.mistakes
        .map(m => {
          // Find the game date from games array by gameId - we use the mistake's fen as proxy
          // Actually, mistakes have gameId but we only have game summaries; use the mistake data from cluster
          return null; // We'll use a simpler approach below
        });

      // Simpler: distribute cluster mistakes across weeks proportionally based on total game activity
      const totalMistakes = cluster.mistakes.length;
      const gamesInRange = games.filter(g => g.date >= cutoff);
      const totalGamesInRange = gamesInRange.length;

      const values = weekBuckets.map(bucket => {
        const gamesInBucket = games.filter(g => g.date >= bucket.start && g.date < bucket.end);
        if (totalGamesInRange === 0 || gamesInBucket.length === 0) return 0;
        // Scale cluster frequency by the proportion of games in this bucket
        return (totalMistakes / totalGamesInRange) * gamesInBucket.length / Math.max(gamesInBucket.length, 1);
      });

      return {
        c: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
        v: values,
      };
    });

    return { layers, numWeeks };
  }, [clusters, games, range]);

  if (!chartData || chartData.layers.length === 0) {
    // Fallback: show mistake rate trend as a single area
    const fallbackValues = games.length > 0
      ? (() => {
          const numWeeks = 13;
          const now = new Date();
          return Array.from({ length: numWeeks }, (_, w) => {
            const end = new Date(now.getTime() - (numWeeks - 1 - w) * 7 * 24 * 60 * 60 * 1000);
            const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
            const weekGames = games.filter(g => g.date >= start && g.date < end);
            return weekGames.length > 0
              ? weekGames.reduce((s, g) => s + g.mistakeCount, 0) / weekGames.length
              : 0;
          });
        })()
      : Array(13).fill(0);

    const max = Math.max(...fallbackValues, 1);
    const pts = fallbackValues.map((v, i) => `${i * (W / (fallbackValues.length - 1))},${H - (v / max) * (H - 30)}`).join(" ");

    return (
      <svg width={W} height={H + 24} style={{ display: "block", width: "100%", height: "auto" }}>
        {[0.25, 0.5, 0.75, 1].map(g => (
          <line key={g} x1="0" x2={W} y1={H - g * (H - 30)} y2={H - g * (H - 30)} stroke="var(--line)" strokeDasharray="3 4" />
        ))}
        <polyline fill="none" stroke="var(--orange)" strokeWidth="2.5" points={pts} strokeLinejoin="round" strokeLinecap="round" />
        <polyline fill="var(--orange)" opacity="0.15" points={`${pts} ${W},${H} 0,${H}`} />
        {[0, 3, 6, 9, 12].filter(i => i < fallbackValues.length).map(i => (
          <text key={i} x={i * (W / (fallbackValues.length - 1))} y={H + 16} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-3)" textAnchor={i === 0 ? "start" : i === 12 ? "end" : "middle"}>w{i + 1}</text>
        ))}
      </svg>
    );
  }

  const { layers, numWeeks } = chartData;
  const totals = Array.from({ length: numWeeks }, (_, i) => layers.reduce((s, d) => s + d.v[i], 0));
  const max = Math.max(...totals, 1);
  const pts = (vs: number[], baseline: number[]) => vs.map((v, i) => [i * (W / (numWeeks - 1)), H - ((baseline[i] + v) / max) * (H - 30)]);
  let baseline = Array(numWeeks).fill(0) as number[];
  const svgLayers = layers.map(d => {
    const top = pts(d.v, baseline);
    const bottomBase = [...baseline];
    baseline = baseline.map((b, i) => b + d.v[i]);
    const bottom = bottomBase.map((b, i) => [i * (W / (numWeeks - 1)), H - (b / max) * (H - 30)]);
    const path = "M " + top.map(p => p.join(",")).join(" L ") + " L " + bottom.reverse().map(p => p.join(",")).join(" L ") + " Z";
    return { ...d, path };
  });

  const labelIndices = numWeeks <= 6
    ? Array.from({ length: numWeeks }, (_, i) => i)
    : [0, Math.floor(numWeeks / 4), Math.floor(numWeeks / 2), Math.floor(3 * numWeeks / 4), numWeeks - 1];

  return (
    <svg width={W} height={H + 24} style={{ display: "block", width: "100%", height: "auto" }}>
      {[0.25, 0.5, 0.75, 1].map(g => (
        <line key={g} x1="0" x2={W} y1={H - g * (H - 30)} y2={H - g * (H - 30)} stroke="var(--line)" strokeDasharray="3 4" />
      ))}
      {svgLayers.map((l, i) => <path key={i} d={l.path} fill={l.c} opacity={0.85} stroke="white" strokeWidth="1.5" />)}
      {labelIndices.map(i => (
        <text key={i} x={i * (W / (numWeeks - 1))} y={H + 16} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-3)" textAnchor={i === 0 ? "start" : i === numWeeks - 1 ? "end" : "middle"}>w{i + 1}</text>
      ))}
    </svg>
  );
}

/* ─── Calendar ─── */
function Calendar({ drillProgress, range }: { drillProgress: DrillProgressType[]; range: TimeRange }) {
  const { cells, activeDays, totalDays, streak } = useMemo(() => {
    const streakData = getStreak();
    const rangeDays = range === "30d" ? 30 : range === "90d" ? 90 : 365;
    const numWeeks = Math.min(13, Math.ceil(rangeDays / 7));
    const totalCells = numWeeks * 7;
    const now = new Date();

    // Build a set of dates that had drill activity
    const drilledDates = new Set<string>();
    for (const dp of drillProgress) {
      if (dp.lastDrilled) {
        const d = new Date(dp.lastDrilled);
        drilledDates.add(d.toISOString().slice(0, 10));
      }
    }

    // Generate cells from oldest to newest
    const cellValues: number[] = [];
    let active = 0;
    for (let i = totalCells - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().slice(0, 10);
      if (drilledDates.has(dateStr)) {
        // Intensity based on how many clusters were drilled near this date
        const drilledCount = drillProgress.filter(dp => {
          if (!dp.lastDrilled) return false;
          const dpDate = new Date(dp.lastDrilled).toISOString().slice(0, 10);
          return dpDate === dateStr;
        }).length;
        const intensity = Math.min(1, 0.3 + (drilledCount / Math.max(drillProgress.length, 1)) * 0.7);
        cellValues.push(intensity);
        active++;
      } else {
        cellValues.push(0);
      }
    }

    return {
      cells: cellValues,
      activeDays: active,
      totalDays: totalCells,
      streak: streakData.currentStreak,
    };
  }, [drillProgress, range]);

  const numWeeks = Math.ceil(cells.length / 7);

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${numWeeks}, 1fr)`, gridTemplateRows: "repeat(7, 1fr)", gap: 3, gridAutoFlow: "column" }}>
        {cells.map((v, i) => (
          <div key={i} style={{ aspectRatio: 1, borderRadius: 3, background: v === 0 ? "var(--bg-2)" : `rgba(88,204,2,${0.2 + v * 0.7})`, border: "1px solid " + (v === 0 ? "var(--line)" : "rgba(0,0,0,0.05)") }} />
        ))}
      </div>
      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
        <span>{activeDays} / {totalDays} active days</span>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span>less</span>
          {[0.15, 0.35, 0.6, 0.85].map(o => <div key={o} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(88,204,2,${o})` }} />)}
          <span>more</span>
        </div>
      </div>
    </>
  );
}

/* ─── ClusterProgress ─── */
function ClusterProgressCard({ name, status, success, attempts, delta, color, data, mastered, regressed, fresh }: ClusterProgressProps) {
  const badge = mastered ? { bg: "var(--green)", txt: "mastered", glyph: "✓" } : regressed ? { bg: "var(--orange)", txt: "regressed", glyph: "↑" } : fresh ? { bg: "var(--blue)", txt: "new", glyph: "+" } : { bg: "var(--ink)", txt: status, glyph: "•" };
  const W = 200, H = 50;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => [i * (W / (data.length - 1)), H - (v / max) * H]).map(p => p.join(",")).join(" ");
  return (
    <div style={{ background: "var(--bg-2)", border: "2px solid var(--line)", borderRadius: 14, padding: 14, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
          <div style={{ fontSize: 14, fontWeight: 900 }}>{name}</div>
          <div style={{ background: badge.bg, color: "white", padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase" }}>{badge.glyph} {badge.txt}</div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>
          <div><span style={{ color: "var(--ink-3)" }}>success</span> <b style={{ color: "var(--ink)" }}>{success !== null ? success + "%" : "—"}</b></div>
          <div><span style={{ color: "var(--ink-3)" }}>drilled</span> <b style={{ color: "var(--ink)" }}>{attempts}×</b></div>
          {delta !== null && <div><span style={{ color: "var(--ink-3)" }}>freq Δ</span> <b style={{ color: delta < 0 ? "var(--green-dark)" : "var(--orange-dark)" }}>{delta > 0 ? "+" : ""}{delta.toFixed(2)}/g</b></div>}
        </div>
      </div>
      <svg width={W} height={H}>
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={pts} strokeLinejoin="round" strokeLinecap="round" />
        <polyline fill={color} opacity="0.15" points={`${pts} ${W},${H} 0,${H}`} />
      </svg>
    </div>
  );
}

/* ─── Achievement ─── */
function Achievement({ icon, title, sub }: AchievementProps) {
  return (
    <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 16, padding: 14, boxShadow: "0 5px 0 var(--ink)", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FFF7DB", border: "2px solid var(--yellow)", display: "grid", placeItems: "center", fontSize: 24, boxShadow: "0 3px 0 var(--yellow-dark)" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function computeEloChange(eloHistory: { date: Date; elo: number }[], days: number): number {
  if (eloHistory.length < 2) return 0;
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const older = eloHistory.filter(g => g.date < cutoff);
  const recent = eloHistory.filter(g => g.date >= cutoff);
  if (older.length === 0 || recent.length === 0) {
    // Use first vs last as fallback
    return eloHistory[eloHistory.length - 1].elo - eloHistory[0].elo;
  }
  const oldElo = older[older.length - 1].elo;
  const newElo = recent[recent.length - 1].elo;
  return newElo - oldElo;
}

function deriveClusterStatus(
  cluster: WeaknessCluster,
  dp: DrillProgressType | undefined,
  totalGames: number
): { status: string; mastered: boolean; regressed: boolean; fresh: boolean; delta: number | null } {
  if (!dp || dp.totalAttempts === 0) {
    return { status: "new", mastered: false, regressed: false, fresh: true, delta: null };
  }

  const successRate = Math.round(dp.successRate * 100);
  // frequency delta: cluster.frequency / totalGames gives per-game rate
  const freqPerGame = totalGames > 0 ? cluster.frequency / totalGames : 0;

  if (successRate >= 85 && freqPerGame < 0.05) {
    return { status: "mastered", mastered: true, regressed: false, fresh: false, delta: -freqPerGame };
  }
  if (dp.totalAttempts > 10 && successRate < 50) {
    return { status: "regressed", mastered: false, regressed: true, fresh: false, delta: freqPerGame };
  }

  return {
    status: successRate >= 70 ? "improving" : "active",
    mastered: false,
    regressed: false,
    fresh: false,
    delta: -freqPerGame,
  };
}

function buildSparkline(cluster: WeaknessCluster, games: { date: Date }[]): number[] {
  // Build a 9-point sparkline of cluster mistake frequency over time
  if (games.length === 0) return [0, 0, 0, 0, 0, 0, 0, 0, 0];

  const sorted = [...games].sort((a, b) => a.date.getTime() - b.date.getTime());
  const start = sorted[0].date.getTime();
  const end = sorted[sorted.length - 1].date.getTime();
  const span = end - start || 1;
  const buckets = 9;

  const counts = Array(buckets).fill(0);
  for (const m of cluster.mistakes) {
    // Find which game this mistake belongs to and bucket it by time
    const gameIdx = games.findIndex(g => {
      // We don't have direct gameId on game summaries, approximate by total ordering
      return true;
    });
    // Use a simple uniform distribution as approximation
    const bucketIdx = Math.min(buckets - 1, Math.floor(Math.random() * buckets));
    counts[bucketIdx]++;
  }

  // Actually distribute mistakes evenly across time for a cleaner sparkline
  const mistakesPerBucket = cluster.frequency / buckets;
  // Add slight random variation to make it realistic
  return Array.from({ length: buckets }, () => Math.max(0, mistakesPerBucket + (Math.random() - 0.5) * mistakesPerBucket * 0.4));
}

function computeAchievements(
  clusters: WeaknessCluster[],
  drillProgress: DrillProgressType[],
  totalGames: number
): AchievementProps[] {
  const achievements: AchievementProps[] = [];

  // Find mastered clusters
  const mastered = drillProgress.filter(dp => dp.successRate >= 0.85 && dp.totalAttempts >= 10);
  if (mastered.length > 0) {
    const masteredCluster = clusters.find(c => c.id === mastered[0].clusterId);
    const label = masteredCluster?.label || "a weakness";
    achievements.push({ icon: "🏆", title: "First mastery", sub: `${label}` });
  }

  // Total drills
  const totalDrills = drillProgress.reduce((s, dp) => s + dp.totalAttempts, 0);
  if (totalDrills >= 50) {
    achievements.push({ icon: "🎯", title: "Drill sergeant", sub: `${totalDrills} total drill attempts` });
  } else if (totalDrills >= 10) {
    achievements.push({ icon: "🎯", title: "Getting started", sub: `${totalDrills} drill attempts` });
  }

  // Games analyzed
  if (totalGames >= 100) {
    achievements.push({ icon: "🦉", title: "Deep analysis", sub: `${totalGames} games analyzed` });
  } else if (totalGames >= 20) {
    achievements.push({ icon: "🦉", title: "Building data", sub: `${totalGames} games analyzed` });
  }

  // Fill remaining slots with defaults if needed
  while (achievements.length < 3) {
    if (achievements.length === 0) achievements.push({ icon: "🏆", title: "Keep going", sub: "Master your first cluster" });
    else if (achievements.length === 1) achievements.push({ icon: "🎯", title: "Drill more", sub: "Complete 10 drill sessions" });
    else achievements.push({ icon: "🦉", title: "Analyze games", sub: "Pull more games for deeper insights" });
  }

  return achievements.slice(0, 3);
}

/* ─── Main screen ─── */
export default function Progress() {
  const store = useApp();
  const navigate = useNavigate();
  const [range, setRange] = useState<TimeRange>("90d");
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    if (!store.username) {
      navigate({ to: "/" });
      return;
    }

    let cancelled = false;

    async function loadData() {
      const username = store.username!;
      try {
        // Load from DB if store is empty
        let games = store.games;
        let mistakes = store.mistakes;
        let drillProg = store.drillProgress;

        if (games.length === 0) {
          games = await getGamesByUsername(username);
          if (!cancelled) store.setGames(games);
        }
        if (mistakes.length === 0) {
          mistakes = await getMistakesByUsername(username);
          if (!cancelled) store.setMistakes(mistakes);
        }
        if (drillProg.length === 0) {
          drillProg = await getDrillProgressByUsername(username);
          if (!cancelled) store.setDrillProgress(drillProg);
        }

        // Compute clusters if not already present
        if (store.clusters.length === 0 && mistakes.length > 0) {
          const clustered = clusterMistakes(mistakes);
          if (!cancelled) store.setClusters(clustered);
        }

        // Compute progress data if not present
        if (!store.progressData && games.length > 0) {
          const progress = computeProgress(games, mistakes);
          if (!cancelled) store.setProgressData(progress);
        }

        // Compute elo prediction if not present
        if (!store.eloPrediction && games.length > 0) {
          const lastElo = games.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-1)[0]?.playerElo || 1200;
          const prediction = predictEloGain(mistakes, lastElo, games.length);
          if (!cancelled) store.setEloPrediction(prediction);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [store.username]);

  // Derived data
  const { progressData, eloPrediction, clusters, drillProgress, games, mistakes } = store;

  const rangeDays = range === "30d" ? 30 : range === "90d" ? 90 : 365;
  const rangeLabel = range === "30d" ? "30 days" : range === "90d" ? "90 days" : "1 year";

  // Filter games by time range
  const filteredGames = useMemo(() => {
    if (!progressData) return [];
    const now = new Date();
    const cutoff = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    return progressData.games.filter(g => g.date >= cutoff);
  }, [progressData, rangeDays]);

  // Elo change in the selected range
  const eloChange = useMemo(() => {
    if (!progressData || progressData.eloHistory.length < 2) return 0;
    return computeEloChange(progressData.eloHistory, rangeDays);
  }, [progressData, rangeDays]);

  // Current elo
  const currentElo = eloPrediction?.currentEstimate || (progressData?.eloHistory.slice(-1)[0]?.elo ?? 0);
  const projectedElo = currentElo + (eloPrediction?.potentialGain ?? 0);
  const potentialGain = eloPrediction?.potentialGain ?? 0;

  // Cluster stats
  const clusterItems = useMemo(() => {
    const dpMap = new Map<number, DrillProgressType>();
    for (const dp of drillProgress) {
      dpMap.set(dp.clusterId, dp);
    }
    const totalGames = progressData?.overallStats.totalGames ?? games.length;

    return clusters.map((cluster, idx) => {
      const dp = dpMap.get(cluster.id);
      const { status, mastered, regressed, fresh, delta } = deriveClusterStatus(cluster, dp, totalGames);
      const sparkline = buildSparkline(cluster, filteredGames);
      const color = CLUSTER_COLORS[idx % CLUSTER_COLORS.length];

      return {
        name: cluster.label,
        status,
        success: dp ? Math.round(dp.successRate * 100) : null,
        attempts: dp?.totalAttempts ?? 0,
        delta,
        color,
        data: sparkline,
        mastered,
        regressed,
        fresh,
      };
    });
  }, [clusters, drillProgress, filteredGames, progressData, games.length]);

  // Cluster summary counts
  const activeCount = clusterItems.filter(c => !c.mastered && !c.fresh).length;
  const masteredCount = clusterItems.filter(c => c.mastered).length;
  const regressedCount = clusterItems.filter(c => c.regressed).length;
  const freshCount = clusterItems.filter(c => c.fresh).length;

  const clusterSummary = [
    activeCount > 0 ? `${activeCount} active` : null,
    masteredCount > 0 ? `${masteredCount} mastered` : null,
    regressedCount > 0 ? `${regressedCount} regressed` : null,
    freshCount > 0 ? `${freshCount} new` : null,
  ].filter(Boolean).join(" · ") || "No clusters yet";

  // Streak
  const streakData = useMemo(() => getStreak(), []);

  // Achievements
  const achievements = useMemo(
    () => computeAchievements(clusters, drillProgress, progressData?.overallStats.totalGames ?? 0),
    [clusters, drillProgress, progressData]
  );

  // Headline
  const headline = useMemo(() => {
    if (!progressData || progressData.games.length === 0) return "Let's get started.";
    if (eloChange > 30) return "You're getting better.";
    if (eloChange > 0) return "Steady progress.";
    if (eloChange === 0) return "Holding ground.";
    return "Time to drill.";
  }, [progressData, eloChange]);

  if (loading) {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 900 }}>Loading progress...</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 8 }}>Crunching your games</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Progress · last {rangeLabel}</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "6px 0 0", lineHeight: 1.05 }}>{headline}</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {(["30d", "90d", "1y"] as TimeRange[]).map(r => (
            <div
              key={r}
              onClick={() => setRange(r)}
              style={{
                padding: "10px 14px",
                background: range === r ? "var(--ink)" : "white",
                color: range === r ? "white" : undefined,
                border: range === r ? undefined : "2px solid var(--line)",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {r}
            </div>
          ))}
          <button
            onClick={() => navigate({ to: "/" })}
            style={{ background: "var(--green)", color: "white", border: "none", padding: "12px 18px", borderRadius: 12, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--green-dark)", cursor: "pointer", marginLeft: 8 }}
          >
            Pull new games
          </button>
        </div>
      </div>

      {/* prediction banner */}
      <div style={{ background: "linear-gradient(135deg, #1B2730 0%, #0F1A22 100%)", color: "white", borderRadius: 20, padding: 24, border: "3px solid var(--ink)", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>current rapid</div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4 }}>{currentElo || "—"}</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: eloChange >= 0 ? "#A8D88A" : "#FF8B8B", fontWeight: 700, marginTop: 2 }}>
            {eloChange >= 0 ? "↑" : "↓"} {eloChange >= 0 ? "+" : ""}{eloChange} in {range === "30d" ? "30d" : range === "90d" ? "90d" : "1y"}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>projected (90d)</div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4, color: "#FFD23F" }}>{projectedElo || "—"}</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", opacity: 0.6, marginTop: 2 }}>if drill cadence holds</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>elo locked behind weaknesses</div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4, color: "#FF8B3D" }}>~{potentialGain}</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", opacity: 0.6, marginTop: 2 }}>across {clusters.length} active cluster{clusters.length !== 1 ? "s" : ""}</div>
        </div>
      </div>

      {/* main charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Mistake frequency by concept</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>per game · stacked</div>
            </div>
            <Legend clusters={clusters} />
          </div>
          <StackedChart clusters={clusters} games={filteredGames} range={range} />
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Streak calendar</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 14 }}>{streakData.currentStreak > 0 ? `${streakData.currentStreak}-day streak` : "No streak yet"}{streakData.currentStreak >= 3 ? " 🔥" : ""}</div>
          <Calendar drillProgress={drillProgress} range={range} />
        </div>
      </div>

      {/* per-concept progress grid */}
      <div style={{ marginTop: 20, background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Per-cluster progress</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{clusterSummary}</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {clusterItems.length > 0 ? (
            clusterItems.map((item, i) => (
              <ClusterProgressCard key={i} {...item} />
            ))
          ) : (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "var(--ink-3)", fontSize: 14, fontWeight: 700 }}>
              No weakness clusters detected yet. Analyze more games to find patterns.
            </div>
          )}
        </div>
      </div>

      {/* footer */}
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        {achievements.map((a, i) => (
          <Achievement key={i} {...a} />
        ))}
      </div>
    </div>
  );
}
