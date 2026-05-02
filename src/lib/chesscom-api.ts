import { Chess } from "chess.js";

interface ChessComApiGame {
  url: string;
  pgn: string;
  time_control: string;
  end_time: number;
  rated: boolean;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
}

export interface ChessComGame {
  url: string;
  pgn: string;
  timeControl: string;
  endTime: number;
  rated: boolean;
  white: { username: string; rating: number; result: string };
  black: { username: string; rating: number; result: string };
}

export interface ParsedGame {
  id: string;
  pgn: string;
  date: Date;
  timeControl: string;
  playerColor: "white" | "black";
  result: "win" | "loss" | "draw";
  playerElo: number;
  opponentElo: number;
  moves: string[];
  fens: string[];
}

const BASE_URL = "https://api.chess.com/pub";

function mapApiGame(raw: ChessComApiGame): ChessComGame {
  return {
    url: raw.url,
    pgn: raw.pgn,
    timeControl: raw.time_control,
    endTime: raw.end_time,
    rated: raw.rated,
    white: raw.white,
    black: raw.black,
  };
}

export async function fetchPlayerArchives(
  username: string
): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/player/${username}/games/archives`);
  if (!res.ok) throw new Error(`Player "${username}" not found`);
  const data = await res.json();
  return data.archives as string[];
}

export async function fetchGamesFromArchive(
  archiveUrl: string
): Promise<ChessComGame[]> {
  const res = await fetch(archiveUrl);
  if (!res.ok) throw new Error(`Failed to fetch archive: ${archiveUrl}`);
  const data = await res.json();
  return (data.games as ChessComApiGame[]).map(mapApiGame);
}

export async function fetchRecentGames(
  username: string,
  maxGames: number = 100
): Promise<ChessComGame[]> {
  const archives = await fetchPlayerArchives(username);
  const games: ChessComGame[] = [];

  // Fetch from most recent archive backwards
  for (let i = archives.length - 1; i >= 0 && games.length < maxGames; i--) {
    const batch = await fetchGamesFromArchive(archives[i]);
    // Within each archive, games are chronological — reverse to get newest first
    games.push(...batch.reverse());
  }

  // Take only the requested count, already newest-first
  return games.slice(0, maxGames);
}

function extractGameId(url: string): string {
  const parts = url.split("/");
  return parts[parts.length - 1];
}

function determineResult(
  game: ChessComGame,
  playerColor: "white" | "black"
): "win" | "loss" | "draw" {
  const playerResult = game[playerColor].result;
  if (playerResult === "win") return "win";
  if (
    playerResult === "checkmated" ||
    playerResult === "timeout" ||
    playerResult === "resigned" ||
    playerResult === "abandoned"
  )
    return "loss";
  return "draw";
}

export function parseGame(
  game: ChessComGame,
  username: string
): ParsedGame {
  const playerColor =
    game.white.username.toLowerCase() === username.toLowerCase()
      ? "white"
      : "black";

  const chess = new Chess();
  const moves: string[] = [];
  const fens: string[] = [];

  try {
    chess.loadPgn(game.pgn);
  } catch {
    // fallback: some PGNs from Chess.com may have edge cases
  }

  const history = chess.history();

  chess.reset();
  fens.push(chess.fen());
  for (const san of history) {
    chess.move(san);
    moves.push(san);
    fens.push(chess.fen());
  }

  return {
    id: extractGameId(game.url),
    pgn: game.pgn,
    date: new Date(game.endTime * 1000),
    timeControl: game.timeControl,
    playerColor,
    result: determineResult(game, playerColor),
    playerElo: game[playerColor].rating,
    opponentElo: game[playerColor === "white" ? "black" : "white"].rating,
    moves,
    fens,
  };
}
