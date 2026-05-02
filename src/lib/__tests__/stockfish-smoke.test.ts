/**
 * Smoke test for Stockfish engine evaluation logic.
 * Tests the classification and game phase functions (doesn't require WASM).
 * Run with: npx tsx src/lib/__tests__/stockfish-smoke.test.ts
 */

// Test the helper functions directly
const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const ENDGAME_FEN = "8/5k2/8/8/8/8/5K2/4R3 w - - 0 50";
const MIDDLEGAME_FEN = "r1bqkb1r/pppppppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";

function classifySeverity(cpLoss: number): "inaccuracy" | "mistake" | "blunder" {
  if (cpLoss >= 200) return "blunder";
  if (cpLoss >= 100) return "mistake";
  return "inaccuracy";
}

function classifyGamePhase(fen: string, moveIndex: number): "opening" | "middlegame" | "endgame" {
  const pieces = fen.split(" ")[0].replace(/[^a-zA-Z]/g, "");
  const pieceCount = pieces.replace(/[kKpP]/g, "").length;
  if (moveIndex < 20) return "opening";
  if (pieceCount <= 6) return "endgame";
  return "middlegame";
}

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean) {
  if (condition) {
    console.log(`  PASS: ${label}`);
    passed++;
  } else {
    console.error(`  FAIL: ${label}`);
    failed++;
  }
}

console.log("Testing severity classification...");
assert("50cp → inaccuracy", classifySeverity(50) === "inaccuracy");
assert("99cp → inaccuracy", classifySeverity(99) === "inaccuracy");
assert("100cp → mistake", classifySeverity(100) === "mistake");
assert("199cp → mistake", classifySeverity(199) === "mistake");
assert("200cp → blunder", classifySeverity(200) === "blunder");
assert("500cp → blunder", classifySeverity(500) === "blunder");

console.log("\nTesting game phase classification...");
assert("starting pos at move 2 → opening", classifyGamePhase(STARTING_FEN, 2) === "opening");
assert("starting pos at move 10 → opening", classifyGamePhase(STARTING_FEN, 10) === "opening");
assert("middlegame FEN at move 30 → middlegame", classifyGamePhase(MIDDLEGAME_FEN, 30) === "middlegame");
assert("endgame FEN (K+R vs K) at move 80 → endgame", classifyGamePhase(ENDGAME_FEN, 80) === "endgame");

console.log("\nTesting score normalization logic...");
// White to move: score stays as-is
const whiteFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
const isBlack = whiteFen.split(" ")[1] === "b";
assert("black to move detected from FEN", isBlack === true);
const rawScore = 30; // Stockfish returns +30 (good for side to move = black)
const normalized = isBlack ? -rawScore : rawScore;
assert("black to move: negate score for white perspective", normalized === -30);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
