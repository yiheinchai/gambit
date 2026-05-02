import type { StoredGame, StoredMistake } from "./db";

export interface OpeningStats {
  name: string;
  eco: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  avgMistakes: number;
  avgBlunders: number;
  totalCpLoss: number;
}

const ECO_OPENINGS: [string[], string, string][] = [
  [["e4", "e5", "Nf3", "Nc6", "Bb5"], "Ruy Lopez", "C60"],
  [["e4", "e5", "Nf3", "Nc6", "Bc4"], "Italian Game", "C50"],
  [["e4", "e5", "Nf3", "Nf6"], "Petrov Defense", "C42"],
  [["e4", "e5", "Nf3", "d6"], "Philidor Defense", "C41"],
  [["e4", "e5", "f4"], "King's Gambit", "C30"],
  [["e4", "e5", "Nf3", "Nc6", "d4"], "Scotch Game", "C45"],
  [["e4", "c5"], "Sicilian Defense", "B20"],
  [["e4", "c5", "Nf3", "d6"], "Sicilian Najdorf/Dragon", "B50"],
  [["e4", "c5", "Nf3", "Nc6"], "Sicilian Classical", "B30"],
  [["e4", "e6"], "French Defense", "C00"],
  [["e4", "c6"], "Caro-Kann Defense", "B10"],
  [["e4", "d5"], "Scandinavian Defense", "B01"],
  [["e4", "d6"], "Pirc Defense", "B07"],
  [["e4", "g6"], "Modern Defense", "B06"],
  [["e4", "Nf6"], "Alekhine Defense", "B02"],
  [["d4", "d5", "c4"], "Queen's Gambit", "D06"],
  [["d4", "d5", "c4", "e6"], "QGD", "D30"],
  [["d4", "d5", "c4", "c6"], "Slav Defense", "D10"],
  [["d4", "d5", "c4", "dxc4"], "QGA", "D20"],
  [["d4", "Nf6", "c4", "g6"], "King's Indian", "E60"],
  [["d4", "Nf6", "c4", "e6", "Nc3", "Bb4"], "Nimzo-Indian", "E20"],
  [["d4", "Nf6", "c4", "e6", "Nf3", "b6"], "Queen's Indian", "E12"],
  [["d4", "Nf6", "c4", "c5"], "Benoni Defense", "A56"],
  [["d4", "f5"], "Dutch Defense", "A80"],
  [["c4"], "English Opening", "A10"],
  [["Nf3"], "Reti Opening", "A04"],
  [["d4", "d5"], "Queen's Pawn Game", "D00"],
  [["d4", "Nf6"], "Indian Defense", "A45"],
  [["e4", "e5"], "Open Game", "C20"],
  [["e4"], "King's Pawn", "B00"],
  [["d4"], "Queen's Pawn", "A40"],
];

function detectOpening(moves: string[]): { name: string; eco: string } {
  if (moves.length === 0) return { name: "Unknown", eco: "" };

  let bestMatch = { name: "Unknown", eco: "", length: 0 };

  for (const [sequence, name, eco] of ECO_OPENINGS) {
    if (sequence.length > moves.length) continue;

    let matches = true;
    for (let i = 0; i < sequence.length; i++) {
      if (moves[i] !== sequence[i]) {
        matches = false;
        break;
      }
    }

    if (matches && sequence.length > bestMatch.length) {
      bestMatch = { name, eco, length: sequence.length };
    }
  }

  return { name: bestMatch.name, eco: bestMatch.eco };
}

export function computeOpeningStats(
  games: StoredGame[],
  mistakes: StoredMistake[]
): OpeningStats[] {
  const mistakesByGame = new Map<string, StoredMistake[]>();
  for (const m of mistakes) {
    const arr = mistakesByGame.get(m.gameId) || [];
    arr.push(m);
    mistakesByGame.set(m.gameId, arr);
  }

  const byOpening = new Map<string, {
    name: string;
    eco: string;
    games: StoredGame[];
    mistakes: StoredMistake[];
  }>();

  for (const game of games) {
    const { name, eco } = detectOpening(game.moves);
    const key = name;

    if (!byOpening.has(key)) {
      byOpening.set(key, { name, eco, games: [], mistakes: [] });
    }
    const entry = byOpening.get(key)!;
    entry.games.push(game);
    entry.mistakes.push(...(mistakesByGame.get(game.id) || []));
  }

  const stats: OpeningStats[] = [];

  for (const [, entry] of byOpening) {
    if (entry.games.length < 2) continue;

    const wins = entry.games.filter((g) => g.result === "win").length;
    const losses = entry.games.filter((g) => g.result === "loss").length;
    const draws = entry.games.filter((g) => g.result === "draw").length;
    const blunders = entry.mistakes.filter((m) => m.severity === "blunder").length;
    const totalCp = entry.mistakes.reduce((sum, m) => sum + m.centipawnLoss, 0);

    stats.push({
      name: entry.name,
      eco: entry.eco,
      gamesPlayed: entry.games.length,
      wins,
      losses,
      draws,
      winRate: entry.games.length > 0 ? wins / entry.games.length : 0,
      avgMistakes: entry.games.length > 0 ? entry.mistakes.length / entry.games.length : 0,
      avgBlunders: entry.games.length > 0 ? blunders / entry.games.length : 0,
      totalCpLoss: totalCp,
    });
  }

  return stats.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
}
