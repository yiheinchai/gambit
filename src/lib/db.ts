import { openDB, type IDBPDatabase } from "idb";

export interface StoredGame {
  id: string;
  username: string;
  pgn: string;
  date: Date;
  timeControl: string;
  playerColor: "white" | "black";
  result: "win" | "loss" | "draw";
  playerElo: number;
  opponentElo: number;
  moves: string[];
  fens: string[];
  analyzedAt: Date | null;
}

export interface StoredMistake {
  id?: number;
  gameId: string;
  username: string;
  moveNumber: number;
  fen: string;
  movePlayed: string;
  bestMove: string;
  evalBefore: number;
  evalAfter: number;
  centipawnLoss: number;
  severity: "inaccuracy" | "mistake" | "blunder";
  gamePhase: "opening" | "middlegame" | "endgame";
  conceptVector: number[] | null;
  conceptDiff: number[] | null;
}

export interface StoredCluster {
  id?: number;
  username: string;
  computedAt: Date;
  centroid: number[];
  topConcepts: string[];
  mistakeIds: number[];
  frequency: number;
  avgSeverity: number;
  explanation: string;
}

export interface DrillProgress {
  id?: number;
  clusterId: number;
  username: string;
  totalAttempts: number;
  successRate: number;
  lastDrilled: Date;
  nextDue: Date;
  interval: number;
}

export interface CachedExplanation {
  clusterKey: string;
  explanation: string;
  createdAt: Date;
}

const DB_NAME = "gambit";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const gameStore = db.createObjectStore("games", { keyPath: "id" });
          gameStore.createIndex("username", "username");
          gameStore.createIndex("date", "date");

          const mistakeStore = db.createObjectStore("mistakes", {
            keyPath: "id",
            autoIncrement: true,
          });
          mistakeStore.createIndex("gameId", "gameId");
          mistakeStore.createIndex("username", "username");
          mistakeStore.createIndex("severity", "severity");

          const clusterStore = db.createObjectStore("clusters", {
            keyPath: "id",
            autoIncrement: true,
          });
          clusterStore.createIndex("username", "username");

          const drillStore = db.createObjectStore("drillProgress", {
            keyPath: "id",
            autoIncrement: true,
          });
          drillStore.createIndex("clusterId", "clusterId");
          drillStore.createIndex("username", "username");
        }

        if (oldVersion < 2) {
          db.createObjectStore("explanationCache", { keyPath: "clusterKey" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveGame(game: StoredGame): Promise<void> {
  const db = await getDB();
  await db.put("games", game);
}

export async function getGamesByUsername(
  username: string
): Promise<StoredGame[]> {
  const db = await getDB();
  return db.getAllFromIndex("games", "username", username);
}

export async function saveMistake(mistake: StoredMistake): Promise<number> {
  const db = await getDB();
  return (await db.add("mistakes", mistake)) as number;
}

export async function getMistakesByUsername(
  username: string
): Promise<StoredMistake[]> {
  const db = await getDB();
  return db.getAllFromIndex("mistakes", "username", username);
}

export async function getMistakesByGameId(
  gameId: string
): Promise<StoredMistake[]> {
  const db = await getDB();
  return db.getAllFromIndex("mistakes", "gameId", gameId);
}

export async function saveClusters(
  clusters: StoredCluster[]
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("clusters", "readwrite");
  for (const cluster of clusters) {
    await tx.store.add(cluster);
  }
  await tx.done;
}

export async function getClustersByUsername(
  username: string
): Promise<StoredCluster[]> {
  const db = await getDB();
  return db.getAllFromIndex("clusters", "username", username);
}

export async function markGameAnalyzed(gameId: string): Promise<void> {
  const db = await getDB();
  const game = await db.get("games", gameId);
  if (game) {
    game.analyzedAt = new Date();
    await db.put("games", game);
  }
}

// Drill progress persistence

export async function saveDrillProgress(progress: DrillProgress): Promise<number> {
  const db = await getDB();
  if (progress.id) {
    await db.put("drillProgress", progress);
    return progress.id;
  }
  return (await db.add("drillProgress", progress)) as number;
}

export async function getDrillProgressByUsername(
  username: string
): Promise<DrillProgress[]> {
  const db = await getDB();
  return db.getAllFromIndex("drillProgress", "username", username);
}

export async function getDrillProgressByCluster(
  clusterId: number
): Promise<DrillProgress | undefined> {
  const db = await getDB();
  const all = await db.getAllFromIndex("drillProgress", "clusterId", clusterId);
  return all[0];
}

// Explanation cache

export async function getCachedExplanation(
  clusterKey: string
): Promise<string | null> {
  const db = await getDB();
  const cached = await db.get("explanationCache", clusterKey);
  if (!cached) return null;
  // Expire after 7 days
  const age = Date.now() - new Date(cached.createdAt).getTime();
  if (age > 7 * 24 * 60 * 60 * 1000) return null;
  return cached.explanation;
}

export async function cacheExplanation(
  clusterKey: string,
  explanation: string
): Promise<void> {
  const db = await getDB();
  await db.put("explanationCache", {
    clusterKey,
    explanation,
    createdAt: new Date(),
  });
}

// Load cached analysis for a user (skip re-analysis)

export async function hasAnalyzedGames(username: string): Promise<boolean> {
  const db = await getDB();
  const games = await db.getAllFromIndex("games", "username", username.toLowerCase());
  return games.some((g: StoredGame) => g.analyzedAt !== null);
}

export async function getAnalyzedGameIds(username: string): Promise<Set<string>> {
  const db = await getDB();
  const games = await db.getAllFromIndex("games", "username", username.toLowerCase());
  return new Set(
    games.filter((g: StoredGame) => g.analyzedAt !== null).map((g: StoredGame) => g.id)
  );
}
