import type { StoredMistake } from "./db";

export interface EloPrediction {
  currentEstimate: number;
  potentialGain: number;
  topImprovements: { label: string; eloGain: number }[];
}

// Rough heuristic: each blunder costs ~25 Elo, each mistake ~10, each inaccuracy ~3.
// If a player eliminates half their blunders, they gain (blunderCount * 25 * 0.5) / totalGames Elo per game,
// scaled by games played for significance.
const ELO_COST = {
  blunder: 25,
  mistake: 10,
  inaccuracy: 3,
};

export function predictEloGain(
  mistakes: StoredMistake[],
  currentElo: number,
  totalGames: number
): EloPrediction {
  if (totalGames === 0 || mistakes.length === 0) {
    return { currentEstimate: currentElo, potentialGain: 0, topImprovements: [] };
  }

  const blunders = mistakes.filter((m) => m.severity === "blunder");
  const mistakeList = mistakes.filter((m) => m.severity === "mistake");

  // Estimate Elo gain from reducing each error type by 50%
  const blunderGain = Math.round((blunders.length * ELO_COST.blunder * 0.5) / totalGames);
  const mistakeGain = Math.round((mistakeList.length * ELO_COST.mistake * 0.5) / totalGames);

  // Phase-specific gains
  const phaseGains: { label: string; eloGain: number }[] = [];
  const phases = ["opening", "middlegame", "endgame"] as const;

  for (const phase of phases) {
    const phaseMistakes = mistakes.filter((m) => m.gamePhase === phase);
    const phaseBlunders = phaseMistakes.filter((m) => m.severity === "blunder");
    const cpTotal = phaseMistakes.reduce((sum, m) => sum + m.centipawnLoss, 0);
    const gain = Math.round(
      ((phaseBlunders.length * ELO_COST.blunder + (phaseMistakes.length - phaseBlunders.length) * ELO_COST.mistake) * 0.3) / totalGames
    );
    if (gain > 0) {
      const label = phase.charAt(0).toUpperCase() + phase.slice(1);
      phaseGains.push({ label: `Fix ${label} errors`, eloGain: gain });
    }
  }

  const totalGain = blunderGain + mistakeGain;

  const topImprovements = [
    { label: "Eliminate half your blunders", eloGain: blunderGain },
    { label: "Reduce mistakes by 50%", eloGain: mistakeGain },
    ...phaseGains,
  ]
    .filter((i) => i.eloGain > 0)
    .sort((a, b) => b.eloGain - a.eloGain)
    .slice(0, 4);

  return {
    currentEstimate: currentElo,
    potentialGain: totalGain,
    topImprovements,
  };
}
