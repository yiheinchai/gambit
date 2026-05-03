import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import type { AnalysisProgress } from "./lib/analysis";
import type { StoredMistake, StoredGame, DrillProgress } from "./lib/db";
import type { WeaknessCluster } from "./lib/clustering";
import type { ProgressData } from "./lib/progress";
import type { OpeningStats } from "./lib/openings";
import type { EloPrediction } from "./lib/elo-prediction";

export type AppPhase = "idle" | "analyzing" | "results";

export interface AppStore {
  phase: AppPhase;
  username: string | null;
  analysisProgress: AnalysisProgress | null;
  games: StoredGame[];
  mistakes: StoredMistake[];
  clusters: WeaknessCluster[];
  progressData: ProgressData | null;
  openingStats: OpeningStats[];
  eloPrediction: EloPrediction | null;
  drillProgress: DrillProgress[];

  setPhase: (p: AppPhase) => void;
  setUsername: (u: string) => void;
  setAnalysisProgress: (p: AnalysisProgress | null) => void;
  setGames: (g: StoredGame[]) => void;
  setMistakes: (m: StoredMistake[]) => void;
  addMistakes: (m: StoredMistake[]) => void;
  addGame: (g: StoredGame) => void;
  setClusters: (c: WeaknessCluster[]) => void;
  setProgressData: (p: ProgressData | null) => void;
  setOpeningStats: (o: OpeningStats[]) => void;
  setEloPrediction: (e: EloPrediction | null) => void;
  setDrillProgress: (d: DrillProgress[]) => void;
  cancelledRef: React.MutableRefObject<boolean>;
  cancelAnalysis: () => void;
  reset: () => void;
}

const Ctx = createContext<AppStore | null>(null);

const USERNAME_KEY = "missedtake_username";

export function AppProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [username, _setUsername] = useState<string | null>(() => localStorage.getItem(USERNAME_KEY));
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [games, setGames] = useState<StoredGame[]>([]);
  const [mistakes, setMistakes] = useState<StoredMistake[]>([]);
  const [clusters, setClusters] = useState<WeaknessCluster[]>([]);
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [openingStats, setOpeningStats] = useState<OpeningStats[]>([]);
  const [eloPrediction, setEloPrediction] = useState<EloPrediction | null>(null);
  const [drillProgress, setDrillProgress] = useState<DrillProgress[]>([]);
  const cancelledRef = useRef(false);

  const setUsername = useCallback((u: string) => {
    localStorage.setItem(USERNAME_KEY, u);
    _setUsername(u);
  }, []);

  const addMistakes = useCallback((m: StoredMistake[]) => {
    setMistakes(prev => [...prev, ...m]);
  }, []);

  const addGame = useCallback((g: StoredGame) => {
    setGames(prev => [...prev, g]);
  }, []);

  const cancelAnalysis = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  const reset = useCallback(() => {
    setPhase("idle");
    setAnalysisProgress(null);
    setGames([]);
    setMistakes([]);
    setClusters([]);
    setProgressData(null);
    setOpeningStats([]);
    setEloPrediction(null);
    setDrillProgress([]);
    cancelledRef.current = false;
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
  }, [phase]);

  const store: AppStore = {
    phase, username, analysisProgress, games, mistakes, clusters,
    progressData, openingStats, eloPrediction, drillProgress,
    setPhase, setUsername, setAnalysisProgress, setGames, setMistakes,
    addMistakes, addGame, setClusters, setProgressData, setOpeningStats,
    setEloPrediction, setDrillProgress, cancelledRef, cancelAnalysis, reset,
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useApp(): AppStore {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
