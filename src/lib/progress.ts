import type { StoredGame, StoredMistake } from "./db";

export interface GameSummary {
  date: Date;
  result: "win" | "loss" | "draw";
  playerElo: number;
  opponentElo: number;
  mistakeCount: number;
  blunderCount: number;
  avgCpLoss: number;
}

export interface ProgressData {
  games: GameSummary[];
  eloHistory: { date: Date; elo: number }[];
  mistakeRateTrend: { date: Date; rate: number }[];
  blunderRateTrend: { date: Date; rate: number }[];
  phaseBreakdown: { opening: number; middlegame: number; endgame: number };
  overallStats: {
    totalGames: number;
    winRate: number;
    avgMistakesPerGame: number;
    avgBlundersPerGame: number;
    avgCpLoss: number;
  };
}

export function computeProgress(
  games: StoredGame[],
  mistakes: StoredMistake[]
): ProgressData {
  const sortedGames = [...games].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const mistakesByGame = new Map<string, StoredMistake[]>();
  for (const m of mistakes) {
    const arr = mistakesByGame.get(m.gameId) || [];
    arr.push(m);
    mistakesByGame.set(m.gameId, arr);
  }

  const gameSummaries: GameSummary[] = sortedGames.map((g) => {
    const gameMistakes = mistakesByGame.get(g.id) || [];
    const blunders = gameMistakes.filter((m) => m.severity === "blunder");
    const avgCp =
      gameMistakes.length > 0
        ? gameMistakes.reduce((sum, m) => sum + m.centipawnLoss, 0) /
          gameMistakes.length
        : 0;

    return {
      date: new Date(g.date),
      result: g.result,
      playerElo: g.playerElo,
      opponentElo: g.opponentElo,
      mistakeCount: gameMistakes.length,
      blunderCount: blunders.length,
      avgCpLoss: avgCp,
    };
  });

  const eloHistory = gameSummaries.map((g) => ({
    date: g.date,
    elo: g.playerElo,
  }));

  // Compute rolling averages (window of 10 games)
  const windowSize = Math.min(10, Math.max(3, Math.floor(gameSummaries.length / 5)));
  const mistakeRateTrend = rollingAverage(
    gameSummaries.map((g) => ({ date: g.date, value: g.mistakeCount })),
    windowSize
  );
  const blunderRateTrend = rollingAverage(
    gameSummaries.map((g) => ({ date: g.date, value: g.blunderCount })),
    windowSize
  );

  const phaseBreakdown = { opening: 0, middlegame: 0, endgame: 0 };
  for (const m of mistakes) {
    phaseBreakdown[m.gamePhase]++;
  }

  const totalGames = games.length;
  const wins = games.filter((g) => g.result === "win").length;
  const totalMistakes = mistakes.length;
  const totalBlunders = mistakes.filter((m) => m.severity === "blunder").length;
  const totalCpLoss = mistakes.reduce((sum, m) => sum + m.centipawnLoss, 0);

  return {
    games: gameSummaries,
    eloHistory,
    mistakeRateTrend,
    blunderRateTrend,
    phaseBreakdown,
    overallStats: {
      totalGames,
      winRate: totalGames > 0 ? wins / totalGames : 0,
      avgMistakesPerGame: totalGames > 0 ? totalMistakes / totalGames : 0,
      avgBlundersPerGame: totalGames > 0 ? totalBlunders / totalGames : 0,
      avgCpLoss: totalMistakes > 0 ? totalCpLoss / totalMistakes : 0,
    },
  };
}

function rollingAverage(
  data: { date: Date; value: number }[],
  window: number
): { date: Date; rate: number }[] {
  if (data.length < window) {
    return data.map((d) => ({ date: d.date, rate: d.value }));
  }

  const result: { date: Date; rate: number }[] = [];
  for (let i = window - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += data[j].value;
    }
    result.push({ date: data[i].date, rate: sum / window });
  }
  return result;
}
