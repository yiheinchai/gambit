import { Chess } from "chess.js";
import type { StoredMistake } from "./db";
import { getEngine } from "./stockfish";

export interface DrillPosition {
  fen: string;
  bestMoves: string[];
  playerColor: "white" | "black";
  sourceGameId: string;
  moveNumber: number;
  mistakeId: number;
  hint?: string;
}

export interface DrillAttempt {
  position: DrillPosition;
  movePlayed: string;
  isCorrect: boolean;
  bestMove: string;
  cpLoss: number;
}

export interface DrillSession {
  clusterId: number;
  positions: DrillPosition[];
  currentIndex: number;
  attempts: DrillAttempt[];
  startedAt: Date;
}

export function createDrillSession(
  mistakes: StoredMistake[],
  clusterId: number
): DrillSession {
  const positions: DrillPosition[] = mistakes.map((m) => {
    const chess = new Chess(m.fen);
    const sideToMove = chess.turn() === "w" ? "white" : "black";

    return {
      fen: m.fen,
      bestMoves: [m.bestMove],
      playerColor: sideToMove as "white" | "black",
      sourceGameId: m.gameId,
      moveNumber: m.moveNumber,
      mistakeId: m.id!,
    };
  });

  // Shuffle positions
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  return {
    clusterId,
    positions,
    currentIndex: 0,
    attempts: [],
    startedAt: new Date(),
  };
}

export async function evaluateMove(
  fen: string,
  movePlayed: string
): Promise<{ isCorrect: boolean; bestMove: string; cpLoss: number }> {
  const engine = getEngine();
  await engine.init();

  const evalBefore = await engine.evaluate(fen, 16);

  const chess = new Chess(fen);
  const isBlack = chess.turn() === "b";

  try {
    chess.move(movePlayed);
  } catch {
    try {
      const from = movePlayed.slice(0, 2);
      const to = movePlayed.slice(2, 4);
      const promotion = movePlayed[4];
      chess.move({ from, to, promotion });
    } catch {
      return { isCorrect: false, bestMove: evalBefore.bestMove, cpLoss: 999 };
    }
  }

  const evalAfter = await engine.evaluate(chess.fen(), 16);

  const sign = isBlack ? -1 : 1;
  const scoreBefore = evalBefore.score * sign;
  const scoreAfter = evalAfter.score * sign;
  const cpLoss = scoreBefore - scoreAfter;

  return {
    isCorrect: cpLoss <= 30, // within 30cp of best = correct
    bestMove: evalBefore.bestMove,
    cpLoss: Math.max(0, cpLoss),
  };
}

export function getSessionStats(session: DrillSession) {
  const total = session.attempts.length;
  const correct = session.attempts.filter((a) => a.isCorrect).length;
  const avgCpLoss =
    total > 0
      ? session.attempts.reduce((sum, a) => sum + a.cpLoss, 0) / total
      : 0;

  return {
    total,
    correct,
    incorrect: total - correct,
    accuracy: total > 0 ? correct / total : 0,
    avgCpLoss,
    remaining: session.positions.length - session.currentIndex,
  };
}

// SM-2 spaced repetition
export function computeNextInterval(
  currentInterval: number,
  successRate: number
): { interval: number; nextDue: Date } {
  let multiplier: number;
  if (successRate >= 0.9) {
    multiplier = 2.5;
  } else if (successRate >= 0.7) {
    multiplier = 2.0;
  } else if (successRate >= 0.5) {
    multiplier = 1.5;
  } else {
    multiplier = 0.5; // reduce interval on failure
  }

  const newInterval = Math.max(1, Math.min(30, Math.round(currentInterval * multiplier)));
  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + newInterval);

  return { interval: newInterval, nextDue };
}
