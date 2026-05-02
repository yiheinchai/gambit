const STREAK_KEY = "missedtake_streak";
const LAST_DRILL_KEY = "missedtake_last_drill";

export interface StreakData {
  currentStreak: number;
  lastDrillDate: string | null;
  isDueToday: boolean;
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getStreak(): StreakData {
  const streak = parseInt(localStorage.getItem(STREAK_KEY) || "0");
  const lastDrill = localStorage.getItem(LAST_DRILL_KEY);
  const today = getToday();

  // Check if streak is still valid
  if (lastDrill === today) {
    return { currentStreak: streak, lastDrillDate: lastDrill, isDueToday: false };
  }
  if (lastDrill === getYesterday()) {
    return { currentStreak: streak, lastDrillDate: lastDrill, isDueToday: true };
  }
  // Streak broken (missed a day)
  if (lastDrill && lastDrill < getYesterday()) {
    return { currentStreak: 0, lastDrillDate: lastDrill, isDueToday: true };
  }
  return { currentStreak: streak, lastDrillDate: lastDrill, isDueToday: true };
}

export function recordDrillCompletion(): number {
  const today = getToday();
  const lastDrill = localStorage.getItem(LAST_DRILL_KEY);

  let streak = parseInt(localStorage.getItem(STREAK_KEY) || "0");

  if (lastDrill === today) {
    // Already drilled today — no streak change
    return streak;
  }

  if (lastDrill === getYesterday() || !lastDrill) {
    streak += 1;
  } else {
    // Streak was broken, start fresh
    streak = 1;
  }

  localStorage.setItem(STREAK_KEY, streak.toString());
  localStorage.setItem(LAST_DRILL_KEY, today);
  return streak;
}
