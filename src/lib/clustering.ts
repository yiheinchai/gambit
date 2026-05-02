import type { StoredMistake } from "./db";
import { CONCEPT_NAMES } from "./concept-classifier";

export interface WeaknessCluster {
  id: number;
  label: string;
  description: string;
  topConcepts: { name: string; avgActivation: number }[];
  mistakes: StoredMistake[];
  frequency: number;
  avgCpLoss: number;
  severity: "critical" | "moderate" | "minor";
}

const CONCEPT_DISPLAY_NAMES: Record<string, string> = {
  fork_possible: "Missed Forks",
  pin_exists: "Pin Awareness",
  skewer_possible: "Skewer Opportunities",
  discovered_attack: "Discovered Attacks",
  back_rank_threat: "Back Rank Weakness",
  hanging_piece: "Hanging Pieces",
  overloaded_defender: "Overloaded Defenders",
  trapped_piece: "Trapped Pieces",
  passed_pawn: "Passed Pawn Play",
  isolated_pawn: "Isolated Pawn Handling",
  doubled_pawn: "Doubled Pawn Structures",
  backward_pawn: "Backward Pawns",
  open_file_rook: "Rook on Open Files",
  bishop_pair: "Bishop Pair Usage",
  bad_bishop: "Bad Bishop Recognition",
  knight_outpost: "Knight Outposts",
  weak_squares: "Weak Square Control",
  space_advantage: "Space Advantage",
  king_exposed: "King Safety",
  castled: "Castling Decisions",
  pawn_shield_broken: "Pawn Shield Integrity",
  material_up: "Converting Material Advantage",
  material_down: "Playing from Behind",
  material_imbalance: "Material Imbalances",
  is_opening: "Opening Play",
  is_middlegame: "Middlegame Decisions",
  is_endgame: "Endgame Technique",
};

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function centroid(vectors: number[][]): number[] {
  const dim = vectors[0].length;
  const result = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) result[i] += v[i];
  }
  for (let i = 0; i < dim; i++) result[i] /= vectors.length;
  return result;
}

function kmeans(
  vectors: number[][],
  k: number,
  maxIter: number = 50
): { assignments: number[]; centroids: number[][] } {
  const n = vectors.length;
  if (n <= k) {
    return {
      assignments: vectors.map((_, i) => i),
      centroids: vectors.map((v) => [...v]),
    };
  }

  // k-means++ initialization
  const centroids: number[][] = [vectors[Math.floor(Math.random() * n)]];
  for (let c = 1; c < k; c++) {
    const dists = vectors.map((v) => {
      let minDist = Infinity;
      for (const cent of centroids) {
        const sim = cosineSimilarity(v, cent);
        const dist = 1 - sim;
        minDist = Math.min(minDist, dist);
      }
      return minDist;
    });
    const totalDist = dists.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;
    for (let i = 0; i < n; i++) {
      r -= dists[i];
      if (r <= 0) {
        centroids.push([...vectors[i]]);
        break;
      }
    }
    if (centroids.length === c) centroids.push([...vectors[Math.floor(Math.random() * n)]]);
  }

  let assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    // Assign
    const newAssignments = vectors.map((v) => {
      let bestIdx = 0;
      let bestSim = -Infinity;
      for (let c = 0; c < k; c++) {
        const sim = cosineSimilarity(v, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestIdx = c;
        }
      }
      return bestIdx;
    });

    // Check convergence
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed) break;

    // Update centroids
    for (let c = 0; c < k; c++) {
      const members = vectors.filter((_, i) => assignments[i] === c);
      if (members.length > 0) {
        const newCentroid = centroid(members);
        for (let i = 0; i < newCentroid.length; i++) centroids[c][i] = newCentroid[i];
      }
    }
  }

  return { assignments, centroids };
}

function chooseBestK(vectors: number[][], maxK: number = 8): number {
  if (vectors.length <= 3) return 1;

  let bestK = 2;
  let bestScore = -Infinity;

  for (let k = 2; k <= Math.min(maxK, Math.floor(vectors.length / 3)); k++) {
    const { assignments, centroids } = kmeans(vectors, k);

    // Silhouette-like score
    let totalScore = 0;
    for (let i = 0; i < vectors.length; i++) {
      const clusterIdx = assignments[i];
      const sameCluster = vectors.filter((_, j) => assignments[j] === clusterIdx && j !== i);
      const otherClusters = [...new Set(assignments)].filter((c) => c !== clusterIdx);

      if (sameCluster.length === 0 || otherClusters.length === 0) continue;

      const avgIntra =
        sameCluster.reduce((sum, v) => sum + (1 - cosineSimilarity(vectors[i], v)), 0) /
        sameCluster.length;

      let minInter = Infinity;
      for (const c of otherClusters) {
        const members = vectors.filter((_, j) => assignments[j] === c);
        const avgDist =
          members.reduce((sum, v) => sum + (1 - cosineSimilarity(vectors[i], v)), 0) /
          members.length;
        minInter = Math.min(minInter, avgDist);
      }

      totalScore += (minInter - avgIntra) / Math.max(minInter, avgIntra);
    }
    totalScore /= vectors.length;

    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestK = k;
    }
  }

  return bestK;
}

export function clusterMistakes(mistakes: StoredMistake[]): WeaknessCluster[] {
  const withConcepts = mistakes.filter((m) => m.conceptDiff && m.conceptDiff.length > 0);

  if (withConcepts.length === 0) {
    return clusterByHeuristic(mistakes);
  }

  const vectors = withConcepts.map((m) => Array.from(m.conceptDiff!));
  const k = chooseBestK(vectors);
  const { assignments } = kmeans(vectors, k);

  const clusters: WeaknessCluster[] = [];

  for (let c = 0; c < k; c++) {
    const clusterMistakes = withConcepts.filter((_, i) => assignments[i] === c);
    if (clusterMistakes.length === 0) continue;

    const clusterVectors = vectors.filter((_, i) => assignments[i] === c);
    const cent = centroid(clusterVectors);

    const topConceptIndices = cent
      .map((val, idx) => ({ idx, val: Math.abs(val) }))
      .sort((a, b) => b.val - a.val)
      .slice(0, 3);

    const topConcepts = topConceptIndices.map((tc) => ({
      name: CONCEPT_NAMES[tc.idx],
      avgActivation: tc.val,
    }));

    const avgCpLoss =
      clusterMistakes.reduce((sum, m) => sum + m.centipawnLoss, 0) / clusterMistakes.length;

    const topConceptName = CONCEPT_DISPLAY_NAMES[topConcepts[0]?.name] || "Pattern";

    clusters.push({
      id: c,
      label: topConceptName,
      description: generateClusterDescription(topConcepts, clusterMistakes),
      topConcepts,
      mistakes: clusterMistakes,
      frequency: clusterMistakes.length,
      avgCpLoss,
      severity: avgCpLoss >= 200 ? "critical" : avgCpLoss >= 100 ? "moderate" : "minor",
    });
  }

  return clusters.sort((a, b) => b.frequency * b.avgCpLoss - a.frequency * a.avgCpLoss);
}

function classifyMistakeType(m: StoredMistake): string {
  const cpLoss = m.centipawnLoss;

  // Huge eval swing = likely hung a piece or missed a tactic
  if (cpLoss >= 500) return "hung_piece";
  if (cpLoss >= 300) return "tactical_miss";

  // Analyze the FEN to detect patterns
  const fen = m.fen;
  const pieces = fen.split(" ")[0];
  const totalPieces = pieces.replace(/[^a-zA-Z]/g, "").replace(/[kKpP]/g, "").length;

  // Endgame with few pieces
  if (totalPieces <= 6) return "endgame_technique";

  // Check if it's a pawn structure issue (low cp loss, middlegame)
  if (cpLoss < 100 && m.gamePhase === "middlegame") return "positional_error";

  // Opening mistakes
  if (m.gamePhase === "opening") {
    if (cpLoss >= 200) return "opening_trap";
    return "opening_inaccuracy";
  }

  // Medium mistakes in middlegame — likely calculation
  if (m.gamePhase === "middlegame" && cpLoss >= 100) return "calculation_error";

  return "other";
}

const MISTAKE_TYPE_LABELS: Record<string, { label: string; desc: string }> = {
  hung_piece: {
    label: "Hanging Pieces",
    desc: "Leaving pieces undefended or missing simple captures. These are large material losses (500+ centipawns) that often come from one-move oversights.",
  },
  tactical_miss: {
    label: "Missed Tactics",
    desc: "Failing to see tactical opportunities or threats. These 300-500cp swings typically involve forks, pins, skewers, or discovered attacks.",
  },
  endgame_technique: {
    label: "Endgame Technique",
    desc: "Errors in simplified positions with few pieces. Endgame mistakes often involve king activity, pawn promotion, or piece coordination.",
  },
  positional_error: {
    label: "Positional Inaccuracies",
    desc: "Subtle strategic mistakes — wrong piece placement, premature trades, or weak pawn structure decisions.",
  },
  opening_trap: {
    label: "Opening Traps",
    desc: "Falling into opening traps or making serious opening mistakes. Study your opening lines to avoid these recurring blunders.",
  },
  opening_inaccuracy: {
    label: "Opening Inaccuracies",
    desc: "Minor opening deviations from best play. These add up over time and can give your opponent an early advantage.",
  },
  calculation_error: {
    label: "Calculation Errors",
    desc: "Middlegame mistakes from miscalculating tactical sequences. Practice visualizing 2-3 moves ahead.",
  },
  other: {
    label: "Other Mistakes",
    desc: "Miscellaneous errors that don't fit a clear pattern.",
  },
};

function clusterByHeuristic(mistakes: StoredMistake[]): WeaknessCluster[] {
  const groups: Record<string, StoredMistake[]> = {};

  for (const m of mistakes) {
    const type = classifyMistakeType(m);
    if (!groups[type]) groups[type] = [];
    groups[type].push(m);
  }

  return Object.entries(groups)
    .map(([type, groupMistakes], idx) => {
      const avgCpLoss =
        groupMistakes.reduce((sum, m) => sum + m.centipawnLoss, 0) / groupMistakes.length;
      const info = MISTAKE_TYPE_LABELS[type] || MISTAKE_TYPE_LABELS.other;

      return {
        id: idx,
        label: info.label,
        description: `${groupMistakes.length} occurrences, averaging ${Math.round(avgCpLoss)}cp loss. ${info.desc}`,
        topConcepts: [],
        mistakes: groupMistakes,
        frequency: groupMistakes.length,
        avgCpLoss,
        severity: (avgCpLoss >= 200 ? "critical" : avgCpLoss >= 100 ? "moderate" : "minor") as
          | "critical"
          | "moderate"
          | "minor",
      };
    })
    .filter((c) => c.frequency >= 2)
    .sort((a, b) => b.frequency * b.avgCpLoss - a.frequency * a.avgCpLoss);
}

function generateClusterDescription(
  topConcepts: { name: string; avgActivation: number }[],
  mistakes: StoredMistake[]
): string {
  const phases = mistakes.reduce(
    (acc, m) => {
      acc[m.gamePhase] = (acc[m.gamePhase] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const dominantPhase = Object.entries(phases).sort((a, b) => b[1] - a[1])[0]?.[0] || "middlegame";

  const conceptLabels = topConcepts
    .slice(0, 2)
    .map((c) => CONCEPT_DISPLAY_NAMES[c.name] || c.name)
    .join(" and ");

  const avgCp = Math.round(
    mistakes.reduce((sum, m) => sum + m.centipawnLoss, 0) / mistakes.length
  );

  const blunderCount = mistakes.filter(m => m.severity === "blunder").length;
  const blunderPct = Math.round((blunderCount / mistakes.length) * 100);

  let advice = "";
  if (avgCp > 300) {
    advice = " These are severe — fixing this pattern will have the biggest impact on your rating.";
  } else if (avgCp > 150) {
    advice = " Drill these positions until you recognize the pattern instinctively.";
  } else {
    advice = " These are subtle but add up over many games.";
  }

  if (dominantPhase === "endgame") {
    advice += " Practice endgame technique separately — these positions reward precision.";
  } else if (dominantPhase === "opening") {
    advice += " Review your opening preparation in these lines.";
  }

  return `Found ${mistakes.length} times in the ${dominantPhase} (${blunderPct}% blunders), averaging ${avgCp}cp loss.${advice}`;
}
