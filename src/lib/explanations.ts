import { getCachedExplanation, cacheExplanation } from "./db";
import type { WeaknessCluster } from "./clustering";

function clusterKey(cluster: WeaknessCluster): string {
  const concepts = cluster.topConcepts.map((c) => c.name).sort().join(",");
  return `${concepts}|${cluster.frequency}|${Math.round(cluster.avgCpLoss)}`;
}

export async function fetchExplanation(cluster: WeaknessCluster): Promise<string> {
  const key = clusterKey(cluster);

  const cached = await getCachedExplanation(key);
  if (cached) return cached;

  const phases = cluster.mistakes.reduce(
    (acc, m) => {
      acc[m.gamePhase] = (acc[m.gamePhase] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  try {
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topConcepts: cluster.topConcepts,
        frequency: cluster.frequency,
        avgCpLoss: cluster.avgCpLoss,
        gamePhases: phases,
      }),
    });

    if (!res.ok) return cluster.description;

    const data = await res.json();
    const explanation = data.explanation || cluster.description;

    await cacheExplanation(key, explanation);
    return explanation;
  } catch {
    return cluster.description;
  }
}
