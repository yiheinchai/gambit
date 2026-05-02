import type { StoredGame, StoredMistake } from "./db";
import type { WeaknessCluster } from "./clustering";
import type { OpeningStats } from "./openings";
import type { EloPrediction } from "./elo-prediction";

export interface ExportData {
  exportedAt: string;
  username: string;
  summary: {
    totalGames: number;
    totalMistakes: number;
    blunders: number;
    avgCpLoss: number;
    eloPrediction: EloPrediction | null;
  };
  openings: OpeningStats[];
  clusters: {
    label: string;
    frequency: number;
    avgCpLoss: number;
    severity: string;
    topConcepts: { name: string; avgActivation: number }[];
    positions: { fen: string; movePlayed: string; bestMove: string; cpLoss: number }[];
  }[];
  mistakes: {
    gameId: string;
    moveNumber: number;
    fen: string;
    movePlayed: string;
    bestMove: string;
    cpLoss: number;
    severity: string;
    phase: string;
  }[];
}

export function buildExport(
  username: string,
  games: StoredGame[],
  mistakes: StoredMistake[],
  clusters: WeaknessCluster[],
  openings: OpeningStats[],
  eloPrediction: EloPrediction | null
): ExportData {
  const blunders = mistakes.filter((m) => m.severity === "blunder").length;
  const avgCp = mistakes.length > 0
    ? mistakes.reduce((s, m) => s + m.centipawnLoss, 0) / mistakes.length
    : 0;

  return {
    exportedAt: new Date().toISOString(),
    username,
    summary: {
      totalGames: games.length,
      totalMistakes: mistakes.length,
      blunders,
      avgCpLoss: Math.round(avgCp),
      eloPrediction,
    },
    openings,
    clusters: clusters.map((c) => ({
      label: c.label,
      frequency: c.frequency,
      avgCpLoss: Math.round(c.avgCpLoss),
      severity: c.severity,
      topConcepts: c.topConcepts,
      positions: c.mistakes.slice(0, 5).map((m) => ({
        fen: m.fen,
        movePlayed: m.movePlayed,
        bestMove: m.bestMove,
        cpLoss: m.centipawnLoss,
      })),
    })),
    mistakes: mistakes.map((m) => ({
      gameId: m.gameId,
      moveNumber: m.moveNumber,
      fen: m.fen,
      movePlayed: m.movePlayed,
      bestMove: m.bestMove,
      cpLoss: m.centipawnLoss,
      severity: m.severity,
      phase: m.gamePhase,
    })),
  };
}

export function downloadJson(data: ExportData) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gambit-${data.username}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
