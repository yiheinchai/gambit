import type { WeaknessCluster } from "./clustering";

export async function fetchExplanation(cluster: WeaknessCluster): Promise<string> {
  return cluster.description;
}
