/**
 * Smoke test for progress computation.
 * Run with: npx tsx src/lib/__tests__/progress-smoke.test.ts
 */

import { computeProgress } from "../progress";
import type { StoredGame, StoredMistake } from "../db";

function makeGame(i: number, result: "win" | "loss" | "draw"): StoredGame {
  return {
    id: `g${i}`,
    username: "test",
    pgn: "",
    date: new Date(2026, 0, i + 1),
    timeControl: "180",
    playerColor: "white",
    result,
    playerElo: 1200 + i * 5,
    opponentElo: 1200,
    moves: [],
    fens: [],
    analyzedAt: new Date(),
  };
}

function makeMistake(gameId: string, severity: "inaccuracy" | "mistake" | "blunder", phase: "opening" | "middlegame" | "endgame"): StoredMistake {
  return {
    id: Math.floor(Math.random() * 10000),
    gameId,
    username: "test",
    moveNumber: 15,
    fen: "start",
    movePlayed: "e4",
    bestMove: "d4",
    evalBefore: 0,
    evalAfter: -100,
    centipawnLoss: severity === "blunder" ? 250 : severity === "mistake" ? 130 : 60,
    severity,
    gamePhase: phase,
    conceptVector: null,
    conceptDiff: null,
  };
}

let passed = 0;
let failed = 0;
function assert(label: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

const games = [
  makeGame(0, "win"), makeGame(1, "win"), makeGame(2, "loss"),
  makeGame(3, "win"), makeGame(4, "draw"), makeGame(5, "loss"),
  makeGame(6, "win"), makeGame(7, "win"), makeGame(8, "loss"),
  makeGame(9, "win"),
];

const mistakes = [
  makeMistake("g0", "mistake", "opening"),
  makeMistake("g1", "blunder", "middlegame"),
  makeMistake("g1", "mistake", "middlegame"),
  makeMistake("g2", "blunder", "endgame"),
  makeMistake("g5", "inaccuracy", "opening"),
  makeMistake("g8", "blunder", "middlegame"),
  makeMistake("g8", "mistake", "endgame"),
];

console.log("Testing progress computation...");
const progress = computeProgress(games, mistakes);

assert("totalGames = 10", progress.overallStats.totalGames === 10);
assert("winRate = 0.6 (6 wins)", Math.abs(progress.overallStats.winRate - 0.6) < 0.01);
assert("avgMistakesPerGame = 0.7", Math.abs(progress.overallStats.avgMistakesPerGame - 0.7) < 0.01);
assert("eloHistory has 10 points", progress.eloHistory.length === 10);
assert("elo increases over time", progress.eloHistory[9].elo > progress.eloHistory[0].elo);
assert("phase breakdown sums to total mistakes",
  progress.phaseBreakdown.opening + progress.phaseBreakdown.middlegame + progress.phaseBreakdown.endgame === 7);
assert("games are chronological", progress.games[0].date < progress.games[9].date);

console.log(`\n  Stats: winRate=${progress.overallStats.winRate}, avgMistakes=${progress.overallStats.avgMistakesPerGame}, avgBlunders=${progress.overallStats.avgBlundersPerGame}`);
console.log(`  Phase: opening=${progress.phaseBreakdown.opening}, middle=${progress.phaseBreakdown.middlegame}, endgame=${progress.phaseBreakdown.endgame}`);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
