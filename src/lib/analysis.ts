import type { ParsedGame } from "./chesscom-api";
import { getEngine, getPool } from "./stockfish";
import {
  saveGame,
  saveMistake,
  markGameAnalyzed,
  type StoredGame,
  type StoredMistake,
} from "./db";
import { isModelAvailable, computeConceptDiff } from "./concept-classifier";

export interface AnalysisProgress {
  phase: "fetching" | "analyzing" | "clustering" | "done";
  currentGame: number;
  totalGames: number;
  currentMove: number;
  totalMoves: number;
  mistakesFound: number;
}

export type ProgressCallback = (progress: AnalysisProgress) => void;

export async function analyzeAndStoreGame(
  game: ParsedGame,
  username: string,
  onProgress?: (current: number, total: number) => void,
  depth: number = 14
): Promise<StoredMistake[]> {
  const engine = getEngine();
  await engine.init();

  const mistakes = await engine.analyzeGame(
    game.fens,
    game.moves,
    game.playerColor,
    depth,
    onProgress
  );

  const storedGame: StoredGame = {
    id: game.id,
    username: username.toLowerCase(),
    pgn: game.pgn,
    date: game.date,
    timeControl: game.timeControl,
    playerColor: game.playerColor,
    result: game.result,
    playerElo: game.playerElo,
    opponentElo: game.opponentElo,
    moves: game.moves,
    fens: game.fens,
    analyzedAt: null,
  };

  await saveGame(storedGame);

  const hasModel = await isModelAvailable();
  const storedMistakes: StoredMistake[] = [];

  for (const mistake of mistakes) {
    let conceptVector: number[] | null = null;
    let conceptDiff: number[] | null = null;

    if (hasModel) {
      try {
        const diff = await computeConceptDiff(
          mistake.fen,
          mistake.movePlayed,
          mistake.bestMove
        );
        conceptDiff = Array.from(diff.diff);
      } catch {
        // model inference failed — continue without concepts
      }
    }

    const stored: StoredMistake = {
      gameId: game.id,
      username: username.toLowerCase(),
      moveNumber: mistake.moveNumber,
      fen: mistake.fen,
      movePlayed: mistake.movePlayed,
      bestMove: mistake.bestMove,
      evalBefore: mistake.evalBefore,
      evalAfter: mistake.evalAfter,
      centipawnLoss: mistake.centipawnLoss,
      severity: mistake.severity,
      gamePhase: mistake.gamePhase,
      conceptVector,
      conceptDiff,
    };

    const id = await saveMistake(stored);
    stored.id = id;
    storedMistakes.push(stored);
  }

  await markGameAnalyzed(game.id);
  return storedMistakes;
}

export async function analyzeBatch(
  games: ParsedGame[],
  username: string,
  depth: number = 14,
  concurrency: number = 2,
  onGameComplete?: (gameIndex: number, mistakes: StoredMistake[]) => void,
  cancelled?: { current: boolean }
): Promise<StoredMistake[]> {
  const pool = getPool(concurrency);
  await pool.init();

  const hasModel = await isModelAvailable();
  const allMistakes: StoredMistake[] = [];
  let nextIndex = 0;
  const inFlight = new Set<Promise<void>>();

  async function processGame(game: ParsedGame, index: number) {
    const mistakes = await pool.analyzeGame(
      game.fens,
      game.moves,
      game.playerColor,
      depth
    );

    const storedGame: StoredGame = {
      id: game.id,
      username: username.toLowerCase(),
      pgn: game.pgn,
      date: game.date,
      timeControl: game.timeControl,
      playerColor: game.playerColor,
      result: game.result,
      playerElo: game.playerElo,
      opponentElo: game.opponentElo,
      moves: game.moves,
      fens: game.fens,
      analyzedAt: null,
    };
    await saveGame(storedGame);

    const storedMistakes: StoredMistake[] = [];
    for (const mistake of mistakes) {
      let conceptDiff: number[] | null = null;
      if (hasModel) {
        try {
          const diff = await computeConceptDiff(mistake.fen, mistake.movePlayed, mistake.bestMove);
          conceptDiff = Array.from(diff.diff);
        } catch { /* continue without concepts */ }
      }

      const stored: StoredMistake = {
        gameId: game.id,
        username: username.toLowerCase(),
        moveNumber: mistake.moveNumber,
        fen: mistake.fen,
        movePlayed: mistake.movePlayed,
        bestMove: mistake.bestMove,
        evalBefore: mistake.evalBefore,
        evalAfter: mistake.evalAfter,
        centipawnLoss: mistake.centipawnLoss,
        severity: mistake.severity,
        gamePhase: mistake.gamePhase,
        conceptVector: null,
        conceptDiff,
      };
      const id = await saveMistake(stored);
      stored.id = id;
      storedMistakes.push(stored);
    }

    await markGameAnalyzed(game.id);
    allMistakes.push(...storedMistakes);
    onGameComplete?.(index, storedMistakes);
  }

  while (nextIndex < games.length) {
    if (cancelled?.current) break;

    while (inFlight.size < concurrency && nextIndex < games.length) {
      if (cancelled?.current) break;
      const idx = nextIndex++;
      const promise = processGame(games[idx], idx).then(() => {
        inFlight.delete(promise);
      });
      inFlight.add(promise);
    }

    if (inFlight.size > 0) {
      await Promise.race(inFlight);
    }
  }

  // Wait for remaining
  await Promise.all(inFlight);
  return allMistakes;
}

export function aggregateMistakeStats(mistakes: StoredMistake[]) {
  const total = mistakes.length;
  const bySeverity = {
    inaccuracy: mistakes.filter((m) => m.severity === "inaccuracy").length,
    mistake: mistakes.filter((m) => m.severity === "mistake").length,
    blunder: mistakes.filter((m) => m.severity === "blunder").length,
  };
  const byPhase = {
    opening: mistakes.filter((m) => m.gamePhase === "opening").length,
    middlegame: mistakes.filter((m) => m.gamePhase === "middlegame").length,
    endgame: mistakes.filter((m) => m.gamePhase === "endgame").length,
  };
  const avgCpLoss =
    total > 0
      ? mistakes.reduce((sum, m) => sum + m.centipawnLoss, 0) / total
      : 0;

  return { total, bySeverity, byPhase, avgCpLoss };
}
