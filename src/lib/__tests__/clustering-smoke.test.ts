/**
 * Smoke test for clustering logic.
 * Run with: npx tsx src/lib/__tests__/clustering-smoke.test.ts
 */

import { clusterMistakes } from "../clustering";
import type { StoredMistake } from "../db";

function makeMistake(overrides: Partial<StoredMistake> = {}): StoredMistake {
  return {
    id: Math.floor(Math.random() * 10000),
    gameId: "g1",
    username: "test",
    moveNumber: 15,
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    movePlayed: "e4",
    bestMove: "d4",
    evalBefore: 0,
    evalAfter: -100,
    centipawnLoss: 100,
    severity: "mistake",
    gamePhase: "middlegame",
    conceptVector: null,
    conceptDiff: null,
    ...overrides,
  };
}

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.error(`  FAIL: ${label}`); failed++; }
}

console.log("Testing heuristic clustering (no concept vectors)...");

const mistakes: StoredMistake[] = [
  makeMistake({ severity: "blunder", gamePhase: "middlegame", centipawnLoss: 300 }),
  makeMistake({ severity: "blunder", gamePhase: "middlegame", centipawnLoss: 250 }),
  makeMistake({ severity: "blunder", gamePhase: "middlegame", centipawnLoss: 200 }),
  makeMistake({ severity: "mistake", gamePhase: "endgame", centipawnLoss: 120 }),
  makeMistake({ severity: "mistake", gamePhase: "endgame", centipawnLoss: 150 }),
  makeMistake({ severity: "mistake", gamePhase: "endgame", centipawnLoss: 110 }),
  makeMistake({ severity: "inaccuracy", gamePhase: "opening", centipawnLoss: 60 }),
];

const clusters = clusterMistakes(mistakes);
console.log(`  Got ${clusters.length} clusters`);

assert("at least 2 clusters from diverse mistakes", clusters.length >= 2);
assert("clusters are sorted by impact (freq * cpLoss)", clusters.length < 2 ||
  clusters[0].frequency * clusters[0].avgCpLoss >= clusters[1].frequency * clusters[1].avgCpLoss);
assert("cluster labels are non-empty", clusters.every(c => c.label.length > 0));
assert("cluster descriptions are non-empty", clusters.every(c => c.description.length > 0));
assert("middlegame blunders cluster has 3 mistakes",
  clusters.some(c => c.mistakes.length === 3 && c.mistakes[0].severity === "blunder"));

for (const c of clusters) {
  console.log(`    "${c.label}": ${c.frequency} mistakes, avg -${Math.round(c.avgCpLoss)}cp, ${c.severity}`);
}

console.log("\nTesting empty input...");
const emptyClusters = clusterMistakes([]);
assert("0 mistakes → 0 clusters", emptyClusters.length === 0);

console.log("\nTesting single mistake...");
const singleClusters = clusterMistakes([makeMistake()]);
assert("1 mistake → 0 clusters (min frequency = 2)", singleClusters.length === 0);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
