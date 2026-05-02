export interface LichessPuzzle {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

const CONCEPT_TO_LICHESS_THEMES: Record<string, string[]> = {
  fork_possible: ["fork", "knightFork", "doubleBishopMate"],
  pin_exists: ["pin", "skewer"],
  skewer_possible: ["skewer"],
  discovered_attack: ["discoveredAttack"],
  back_rank_threat: ["backRankMate", "mateIn1"],
  hanging_piece: ["hangingPiece"],
  overloaded_defender: ["overloading"],
  trapped_piece: ["trappedPiece"],
  passed_pawn: ["advancedPawn", "promotion", "queenRookEndgame"],
  king_exposed: ["kingsideAttack", "queensideAttack", "attackingF2F7"],
  material_up: ["advantage", "crushing"],
  material_down: ["equality", "defensiveMove"],
  is_opening: ["opening"],
  is_middlegame: ["middlegame", "short"],
  is_endgame: ["endgame", "rookEndgame", "pawnEndgame", "bishopEndgame", "knightEndgame"],
};

export function getThemesForConcepts(
  conceptNames: string[]
): string[] {
  const themes = new Set<string>();
  for (const name of conceptNames) {
    const mapped = CONCEPT_TO_LICHESS_THEMES[name];
    if (mapped) mapped.forEach((t) => themes.add(t));
  }
  return [...themes];
}

export async function fetchPuzzlesByTheme(
  themes: string[],
  playerRating: number,
  count: number = 10
): Promise<LichessPuzzle[]> {
  // Lichess doesn't have a "by theme" batch API, but we can use the
  // puzzle storm/activity endpoints and filter. As a practical approach,
  // fetch from the puzzle database API with rating range.
  const puzzles: LichessPuzzle[] = [];

  // Fetch multiple puzzles using the Lichess puzzle batch endpoint
  for (let i = 0; i < count && i < 20; i++) {
    try {
      const res = await fetch("https://lichess.org/api/puzzle/next", {
        headers: { Accept: "application/json" },
      });

      if (!res.ok) break;
      const data = await res.json();
      const puzzle = data.puzzle;
      if (!puzzle) continue;

      const puzzleThemes: string[] = puzzle.themes || [];
      const matchesTheme = themes.length === 0 ||
        puzzleThemes.some((t: string) => themes.includes(t));

      if (!matchesTheme) continue;

      // Extract FEN from game PGN - the puzzle position is at a specific ply
      const fen = puzzle.fen || extractFenFromGame(data.game, puzzle.initialPly);

      puzzles.push({
        id: puzzle.id,
        fen,
        moves: puzzle.solution || [],
        rating: puzzle.rating || 1500,
        themes: puzzleThemes,
      });
    } catch {
      break;
    }
  }

  return puzzles;
}

function extractFenFromGame(
  game: { pgn?: string } | undefined,
  _initialPly?: number
): string {
  if (!game?.pgn) return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  // The puzzle FEN should be provided directly; this is a fallback
  return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
}

// Alternative: use a curated subset of puzzles embedded in the app
// for offline use and faster loading. This can be populated from
// the Lichess puzzle CSV filtered by common themes.
export interface CuratedPuzzleSet {
  theme: string;
  puzzles: { fen: string; solution: string[]; rating: number }[];
}

// Common tactical themes with a few example puzzles each for offline fallback
export const OFFLINE_PUZZLES: CuratedPuzzleSet[] = [
  {
    theme: "fork",
    puzzles: [
      { fen: "r1bqkb1r/pppp1ppp/2n2n2/4N3/4P3/8/PPPP1PPP/RNBQKB1R b KQkq - 0 3", solution: ["d8a5"], rating: 800 },
      { fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", solution: ["f3g5"], rating: 1000 },
      { fen: "r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/5N2/PPPP1PPP/RNBQ1RK1 w kq - 2 5", solution: ["c4f7"], rating: 1200 },
    ],
  },
  {
    theme: "pin",
    puzzles: [
      { fen: "rnbqk2r/pppp1ppp/5n2/2b1p3/4P3/3B1N2/PPPP1PPP/RNBQK2R w KQkq - 4 4", solution: ["c1g5"], rating: 900 },
      { fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", solution: ["f1b5"], rating: 1000 },
    ],
  },
  {
    theme: "backRankMate",
    puzzles: [
      { fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1", solution: ["e1e8"], rating: 600 },
      { fen: "3r2k1/5ppp/8/8/8/8/5PPP/3RR1K1 w - - 0 1", solution: ["e1e8"], rating: 800 },
    ],
  },
  {
    theme: "hangingPiece",
    puzzles: [
      { fen: "rnb1kbnr/ppppqppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3", solution: ["d1h5"], rating: 900 },
    ],
  },
  {
    theme: "discoveredAttack",
    puzzles: [
      { fen: "rnbqkb1r/pppppppp/5n2/6B1/4P3/8/PPPP1PPP/RN1QKBNR b KQkq - 2 2", solution: ["f6e4"], rating: 1100 },
    ],
  },
];

export function getOfflinePuzzlesForConcepts(
  conceptNames: string[],
  maxPuzzles: number = 5
): { fen: string; solution: string[]; rating: number; theme: string }[] {
  const themes = getThemesForConcepts(conceptNames);
  const results: { fen: string; solution: string[]; rating: number; theme: string }[] = [];

  for (const set of OFFLINE_PUZZLES) {
    if (themes.includes(set.theme) || themes.length === 0) {
      for (const p of set.puzzles) {
        results.push({ ...p, theme: set.theme });
        if (results.length >= maxPuzzles) return results;
      }
    }
  }

  return results;
}
