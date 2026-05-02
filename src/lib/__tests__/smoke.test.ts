/**
 * Smoke test: exercises Chess.com API → PGN parsing → analysis types.
 * Run with: npx tsx src/lib/__tests__/smoke.test.ts
 */

import { fetchRecentGames, parseGame } from "../chesscom-api";

async function main() {
  const username = "erik"; // Chess.com CEO, always has public games

  console.log(`Fetching games for "${username}"...`);
  const rawGames = await fetchRecentGames(username, 5);
  console.log(`Fetched ${rawGames.length} games`);

  if (rawGames.length === 0) {
    console.error("FAIL: No games returned");
    process.exit(1);
  }

  // Verify API field mapping
  const first = rawGames[0];
  const checks = [
    ["url", first.url],
    ["pgn", first.pgn?.slice(0, 30)],
    ["timeControl", first.timeControl],
    ["endTime", first.endTime],
    ["white.username", first.white?.username],
    ["white.rating", first.white?.rating],
    ["black.username", first.black?.username],
  ];

  let allOk = true;
  for (const [field, value] of checks) {
    if (value === undefined || value === null) {
      console.error(`FAIL: ${field} is ${value}`);
      allOk = false;
    } else {
      console.log(`  ${field}: ${typeof value === "string" ? value.slice(0, 60) : value}`);
    }
  }

  if (!allOk) {
    console.error("\nFAIL: Some API fields are missing. Check snake_case mapping.");
    process.exit(1);
  }

  // Parse games
  console.log("\nParsing games...");
  for (const raw of rawGames) {
    const parsed = parseGame(raw, username);
    const moveCount = parsed.moves.length;
    const fenCount = parsed.fens.length;

    if (fenCount !== moveCount + 1) {
      console.error(`FAIL: Game ${parsed.id} — ${fenCount} FENs for ${moveCount} moves (should be ${moveCount + 1})`);
      allOk = false;
    }

    if (parsed.date.getTime() <= 0 || isNaN(parsed.date.getTime())) {
      console.error(`FAIL: Game ${parsed.id} — invalid date from endTime=${raw.endTime}`);
      allOk = false;
    }

    console.log(
      `  Game ${parsed.id}: ${parsed.playerColor}, ${parsed.result}, ${moveCount} moves, ` +
      `${parsed.playerElo} vs ${parsed.opponentElo}, ${parsed.timeControl}`
    );
  }

  if (allOk) {
    console.log("\nPASS: All smoke tests passed.");
  } else {
    console.error("\nFAIL: Some tests failed.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
