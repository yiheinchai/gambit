import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "../routes/drill";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { useApp } from "../store";
import {
  createDrillSession,
  evaluateMove,
  getSessionStats,
  computeNextInterval,
  type DrillSession,
  type DrillAttempt,
} from "../lib/drill-engine";
import {
  saveDrillProgress,
  getDrillProgressByCluster,
  getDrillProgressByUsername,
  type DrillProgress,
} from "../lib/db";
import { recordDrillCompletion } from "../lib/streak";
import { CONCEPT_NAMES } from "../lib/concept-classifier";
import { Link } from "@tanstack/react-router";

/* ---------- sub-components (visual, unchanged) ---------- */

interface KPIProps {
  v: string;
  l: string;
  color?: string;
}

function KPI({ v, l, color }: KPIProps) {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: color || "var(--ink)", letterSpacing: -0.5 }}>{v}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>{l}</div>
    </div>
  );
}

interface ModeBtnProps {
  icon: string;
  title: string;
  sub: string;
  active?: boolean;
}

function ModeBtn({ icon, title, sub, active }: ModeBtnProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, background: active ? "#E8F8E5" : "transparent", border: active ? "2px solid var(--green)" : "2px solid transparent", marginBottom: 6, cursor: "pointer" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: active ? "var(--green)" : "var(--bg-2)", color: active ? "white" : "var(--ink-2)", display: "grid", placeItems: "center", fontSize: 16 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{sub}</div>
      </div>
    </div>
  );
}

function iconBtn(): React.CSSProperties {
  return { width: 36, height: 36, borderRadius: 10, border: "2px solid var(--line)", background: "white", fontSize: 14, cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 800 };
}

interface ConceptTrackProps {
  label: string;
  before: number;
  after: number;
  good?: boolean;
}

function ConceptTrack({ label, before, after, good }: ConceptTrackProps) {
  const dir = after - before;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 800 }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: good ? "var(--green-dark)" : "var(--ink-3)", fontWeight: 800 }}>{dir > 0 ? "+" : ""}{dir.toFixed(2)}</span>
      </div>
      <div style={{ position: "relative", height: 10, background: "var(--bg-2)", borderRadius: 5, border: "1.5px solid var(--line)" }}>
        <div style={{ position: "absolute", left: `${before * 100}%`, top: -2, width: 3, height: 14, background: "var(--ink-3)", borderRadius: 1.5 }} />
        <div style={{ position: "absolute", left: `${Math.min(before, after) * 100}%`, width: `${Math.abs(dir) * 100}%`, top: 0, height: "100%", background: good ? "var(--green)" : "var(--orange)", opacity: 0.5 }} />
        <div style={{ position: "absolute", left: `${after * 100}%`, top: -3, width: 8, height: 16, background: good ? "var(--green)" : "var(--orange)", borderRadius: 2, border: "2px solid white" }} />
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function formatDueLabel(nextDue: Date): { text: string; color: string } {
  const now = Date.now();
  const diff = nextDue.getTime() - now;
  if (diff <= 0) return { text: "now", color: "#FFD23F" };
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days <= 3) return { text: `${days}d`, color: "#A8D88A" };
  return { text: `${days}d`, color: "#9CA3AF" };
}

/* ---------- main component ---------- */

export default function Drill() {
  const { username, clusters, drillProgress: _dp, setDrillProgress } = useApp();
  const navigate = useNavigate();
  const { clusterId: searchClusterId } = Route.useSearch();

  // Resolve which cluster to drill
  const targetCluster = React.useMemo(() => {
    if (!clusters.length) return null;
    if (searchClusterId !== undefined) {
      const found = clusters.find((c) => c.id === searchClusterId);
      if (found) return found;
    }
    return clusters[0]; // highest priority
  }, [clusters, searchClusterId]);

  // Session state
  const [session, setSession] = useState<DrillSession | null>(null);
  const [drillState, setDrillState] = useState<"thinking" | "evaluating" | "correct" | "incorrect" | "complete">("thinking");
  const [currentFen, setCurrentFen] = useState<string>("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [lastAttempt, setLastAttempt] = useState<DrillAttempt | null>(null);

  // Hearts & XP
  const [hearts, setHearts] = useState(5);
  const [xp, setXp] = useState(0);

  // Streak (live in session)
  const [streak, setStreak] = useState(0);

  // Next-review schedule
  const [reviewSchedule, setReviewSchedule] = useState<(DrillProgress & { label: string })[]>([]);

  // Timer
  const startedAtRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAtRef.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  // Create session on mount
  useEffect(() => {
    if (!targetCluster) return;
    const s = createDrillSession(targetCluster.mistakes, targetCluster.id);
    setSession(s);
    if (s.positions.length > 0) {
      setCurrentFen(s.positions[0].fen);
    }
    setDrillState("thinking");
    setHearts(5);
    setXp(0);
    setStreak(0);
    startedAtRef.current = Date.now();
  }, [targetCluster]);

  // Load review schedule
  useEffect(() => {
    if (!username) return;
    getDrillProgressByUsername(username).then((progs) => {
      const schedule = progs
        .filter((p) => p.nextDue)
        .map((p) => {
          const cluster = clusters.find((c) => c.id === p.clusterId);
          return { ...p, label: cluster?.label || `Cluster ${p.clusterId}` };
        })
        .sort((a, b) => new Date(a.nextDue).getTime() - new Date(b.nextDue).getTime());
      setReviewSchedule(schedule);
    });
  }, [username, clusters, drillState]);

  // Concept tracker data from current position's mistake
  const conceptTrackerData = React.useMemo(() => {
    if (!session || !targetCluster) return [];
    const pos = session.positions[session.currentIndex];
    if (!pos) return [];
    const mistake = targetCluster.mistakes.find((m) => m.id === pos.mistakeId);
    if (!mistake?.conceptDiff) return [];

    return mistake.conceptDiff
      .map((delta, i) => ({
        label: CONCEPT_NAMES[i] || `feature_${i}`,
        delta,
        absVal: Math.abs(delta),
      }))
      .filter((c) => c.absVal > 0.05)
      .sort((a, b) => b.absVal - a.absVal)
      .slice(0, 5);
  }, [session, session?.currentIndex, targetCluster]);

  const stats = session ? getSessionStats(session) : { total: 0, correct: 0, incorrect: 0, accuracy: 0, avgCpLoss: 0, remaining: 0 };
  const positionCount = session ? session.positions.length : 0;
  const currentIdx = session ? session.currentIndex + 1 : 0;
  const progressPct = positionCount > 0 ? Math.round((currentIdx / positionCount) * 100) : 0;

  // Handle piece drop
  const handlePieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { piece: any; sourceSquare: string; targetSquare: string | null }) => {
      if (!session || drillState !== "thinking" || !targetSquare) return false;

      const pos = session.positions[session.currentIndex];
      if (!pos) return false;

      // Validate move with chess.js
      const chess = new Chess(pos.fen);
      let move: ReturnType<typeof chess.move>;
      try {
        move = chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" });
      } catch {
        return false; // illegal move
      }

      if (!move) return false;

      const moveSan = move.san;
      setDrillState("evaluating");

      // Evaluate with Stockfish
      evaluateMove(pos.fen, moveSan).then((result) => {
        const attempt: DrillAttempt = {
          position: pos,
          movePlayed: moveSan,
          isCorrect: result.isCorrect,
          bestMove: result.bestMove,
          cpLoss: result.cpLoss,
        };

        setLastAttempt(attempt);

        const updatedSession = {
          ...session,
          attempts: [...session.attempts, attempt],
        };
        setSession(updatedSession);

        // Update after-move FEN on the board
        setCurrentFen(chess.fen());

        if (result.isCorrect) {
          setDrillState("correct");
          setStreak((s) => s + 1);
          setXp((x) => x + 15);
        } else {
          setDrillState("incorrect");
          setStreak(0);
          setXp((x) => x + 5);
          setHearts((h) => {
            const newH = h - 1;
            if (newH <= 0) {
              // End session due to hearts
              setTimeout(() => handleSessionComplete(updatedSession), 500);
            }
            return Math.max(0, newH);
          });
        }
      });

      return true;
    },
    [session, drillState]
  );

  // Advance to next position
  const handleNext = useCallback(() => {
    if (!session) return;
    const nextIndex = session.currentIndex + 1;

    if (nextIndex >= session.positions.length || hearts <= 0) {
      // Session complete
      const finalSession = { ...session, currentIndex: nextIndex };
      setSession(finalSession);
      handleSessionComplete(finalSession);
      return;
    }

    const updatedSession = { ...session, currentIndex: nextIndex };
    setSession(updatedSession);
    setCurrentFen(updatedSession.positions[nextIndex].fen);
    setDrillState("thinking");
    setLastAttempt(null);
  }, [session, hearts]);

  // Session completion handler
  const handleSessionComplete = useCallback(
    async (completedSession: DrillSession) => {
      setDrillState("complete");

      // Record streak
      recordDrillCompletion();

      if (!targetCluster || !username) return;

      const finalStats = getSessionStats(completedSession);

      // Load existing progress for this cluster
      const existingProgress = await getDrillProgressByCluster(targetCluster.id);

      const currentInterval = existingProgress?.interval || 1;
      const { interval: newInterval, nextDue } = computeNextInterval(
        currentInterval,
        finalStats.accuracy
      );

      const totalAttempts = (existingProgress?.totalAttempts || 0) + finalStats.total;
      const prevTotal = existingProgress?.totalAttempts || 0;
      const prevCorrect = prevTotal * (existingProgress?.successRate || 0);
      const newSuccessRate = totalAttempts > 0
        ? (prevCorrect + finalStats.correct) / totalAttempts
        : 0;

      const progress: DrillProgress = {
        ...(existingProgress?.id ? { id: existingProgress.id } : {}),
        clusterId: targetCluster.id,
        username,
        totalAttempts,
        successRate: newSuccessRate,
        lastDrilled: new Date(),
        nextDue,
        interval: newInterval,
      };

      await saveDrillProgress(progress);

      // Update app-level drill progress
      const allProgress = await getDrillProgressByUsername(username);
      setDrillProgress(allProgress);
    },
    [targetCluster, username, setDrillProgress]
  );

  // Hint handler
  const handleHint = useCallback(() => {
    if (!session || drillState !== "thinking") return;
    const pos = session.positions[session.currentIndex];
    if (!pos || !pos.bestMoves.length) return;
    // Show the best move's starting square by briefly highlighting it
    alert(`Hint: The best move starts with ${pos.bestMoves[0].slice(0, 2)}`);
  }, [session, drillState]);

  /* ---------- no clusters fallback ---------- */
  if (!clusters.length || !targetCluster) {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>&#9823;</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>No weaknesses to drill yet</h2>
          <p style={{ fontSize: 14, color: "var(--ink-2)", marginBottom: 20, maxWidth: 400 }}>
            Analyze some games first so we can identify your recurring weakness patterns and create targeted drills.
          </p>
          <Link to="/dashboard" style={{ textDecoration: "none" }}>
            <button style={{ background: "var(--orange)", color: "white", border: "none", padding: "14px 28px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--orange-dark)", cursor: "pointer" }}>
              Go to dashboard
            </button>
          </Link>
        </div>
      </div>
    );
  }

  /* ---------- current position info ---------- */
  const currentPosition = session?.positions[session.currentIndex];
  const playerColor = currentPosition?.playerColor || "white";
  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const elapsedStr = `${elapsedMin}m ${elapsedSec.toString().padStart(2, "0")}s`;

  /* ---------- feedback panel ---------- */
  const renderFeedback = () => {
    if (drillState === "thinking") {
      return (
        <div style={{ background: "var(--bg-2)", border: "2.5px solid var(--line)", borderRadius: 16, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--ink-3)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900 }}>?</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--ink)", letterSpacing: 0.4, textTransform: "uppercase" }}>Your turn — find the best move</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2, fontWeight: 500 }}>Drag a piece to make your move.</div>
          </div>
        </div>
      );
    }

    if (drillState === "evaluating") {
      return (
        <div style={{ background: "var(--bg-2)", border: "2.5px solid var(--line)", borderRadius: 16, padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--ink-3)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900 }}>...</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--ink)", letterSpacing: 0.4, textTransform: "uppercase" }}>Evaluating your move...</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 2, fontWeight: 500 }}>Stockfish is checking.</div>
          </div>
        </div>
      );
    }

    if (drillState === "correct" && lastAttempt) {
      return (
        <div style={{ background: "#E8F8E5", border: "2.5px solid var(--green)", borderRadius: 16, padding: 16, boxShadow: "0 4px 0 var(--green-dark)", display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900, boxShadow: "0 3px 0 var(--green-dark)" }}>&#10003;</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--green-dark)", letterSpacing: 0.4, textTransform: "uppercase" }}>
              {lastAttempt.cpLoss === 0 ? "Brilliant — engine's #1 move" : "Correct — within engine tolerance"}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2, fontWeight: 500 }}>
              You found <b>{lastAttempt.movePlayed}</b>.{" "}
              {lastAttempt.cpLoss > 0 && (
                <span style={{ color: "var(--ink-3)" }}>cp loss: {lastAttempt.cpLoss}</span>
              )}
            </div>
          </div>
          <button onClick={handleNext} style={{ background: "var(--green)", color: "white", border: "none", padding: "16px 22px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--green-dark)", cursor: "pointer", whiteSpace: "nowrap" }}>Next &#8594;</button>
        </div>
      );
    }

    if (drillState === "incorrect" && lastAttempt) {
      return (
        <div style={{ background: "#FFF0E5", border: "2.5px solid var(--orange)", borderRadius: 16, padding: 16, boxShadow: "0 4px 0 var(--orange-dark)", display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--orange)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900, boxShadow: "0 3px 0 var(--orange-dark)" }}>&#10007;</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--orange-dark)", letterSpacing: 0.4, textTransform: "uppercase" }}>Not quite — the engine disagrees</div>
            <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2, fontWeight: 500 }}>
              You played <b>{lastAttempt.movePlayed}</b>, but the best move was <b>{lastAttempt.bestMove}</b>.{" "}
              <span style={{ color: "var(--ink-3)" }}>cp loss: {lastAttempt.cpLoss}</span>
            </div>
          </div>
          <button onClick={handleNext} style={{ background: "var(--orange)", color: "white", border: "none", padding: "16px 22px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--orange-dark)", cursor: "pointer", whiteSpace: "nowrap" }}>Next &#8594;</button>
        </div>
      );
    }

    if (drillState === "complete") {
      return (
        <div style={{ background: "#E8F8E5", border: "2.5px solid var(--green)", borderRadius: 16, padding: 16, boxShadow: "0 4px 0 var(--green-dark)", display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900, boxShadow: "0 3px 0 var(--green-dark)" }}>&#9733;</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: "var(--green-dark)", letterSpacing: 0.4, textTransform: "uppercase" }}>
              {hearts <= 0 ? "Out of hearts!" : "Session complete!"}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2, fontWeight: 500 }}>
              {stats.correct}/{stats.total} correct ({Math.round(stats.accuracy * 100)}% accuracy).
              Avg cp loss: {Math.round(stats.avgCpLoss)}.
            </div>
          </div>
          <button onClick={() => navigate({ to: "/dashboard" })} style={{ background: "var(--green)", color: "white", border: "none", padding: "16px 22px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--green-dark)", cursor: "pointer", whiteSpace: "nowrap" }}>Dashboard</button>
        </div>
      );
    }

    return null;
  };

  /* ---------- render ---------- */
  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: "20px 40px", display: "grid", gridTemplateColumns: "260px 1fr 320px", gap: 20 }}>
      {/* left: session */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Drilling weakness</div>
          <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>{targetCluster.label}</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 4 }}>cluster c.{targetCluster.id.toString(16).padStart(4, "0")} · SM-2 due</div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", marginBottom: 4 }}>
              <span>Position {currentIdx} of {positionCount}</span><span>{progressPct}%</span>
            </div>
            <div style={{ height: 12, background: "var(--bg-2)", borderRadius: 6, overflow: "hidden", border: "1.5px solid var(--line)" }}>
              <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--orange)", boxShadow: "inset 0 -3px 0 var(--orange-dark)" }} />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <KPI v={streak.toString()} l="streak" color="var(--green)" />
            <KPI v={stats.total > 0 ? `${Math.round(stats.accuracy * 100)}%` : "--"} l="accuracy" />
            <KPI v={elapsedStr} l="elapsed" />
            <KPI v={`+${xp}`} l="xp" color="var(--green)" />
          </div>
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Mode</div>
          <ModeBtn active icon="&#127919;" title="Your positions" sub="replay your own mistakes" />
          <ModeBtn icon="&#129513;" title="Matched puzzles" sub="lichess · same concept" />
          <ModeBtn icon="&#129302;" title="vs Stockfish" sub="play out from position" />
        </div>

        <div style={{ background: "var(--ink)", color: "white", borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Next review</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7 }}>
            {reviewSchedule.length === 0 && (
              <div style={{ opacity: 0.5 }}>No scheduled reviews yet</div>
            )}
            {reviewSchedule.slice(0, 4).map((prog) => {
              const due = formatDueLabel(new Date(prog.nextDue));
              return (
                <div key={prog.clusterId} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ opacity: 0.6 }}>{prog.label}</span>
                  <span style={{ color: due.color }}>{due.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* center: board */}
      <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 22, padding: 22, boxShadow: "0 6px 0 var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--ink)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>{username || "player"}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>to move: {playerColor}</div>
            </div>
          </div>
          <div style={{ background: "var(--bg-2)", padding: "6px 12px", borderRadius: 10, fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700 }}>
            {drillState === "evaluating" ? "evaluating..." : drillState === "complete" ? "session complete" : `position ${currentIdx}/${positionCount}`}
          </div>
        </div>

        <div style={{ margin: "16px 0", borderRadius: 10, overflow: "hidden", border: "3px solid var(--ink)", boxShadow: "0 6px 0 var(--ink)" }}>
          <Chessboard
            options={{
              position: currentFen,
              boardOrientation: playerColor,
              allowDragging: drillState === "thinking",
              onPieceDrop: handlePieceDrop,
              boardStyle: { borderRadius: "10px" },
              darkSquareStyle: { backgroundColor: "#7FA650" },
              lightSquareStyle: { backgroundColor: "#EFEFD0" },
            }}
          />
        </div>

        <div style={{ width: "100%" }}>
          {renderFeedback()}

          {/* move strip */}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--mono)", fontSize: 12 }}>
              {lastAttempt && (
                <>
                  <span style={{ color: "var(--ink-3)" }}>move:</span>
                  <span style={{
                    background: lastAttempt.isCorrect ? "var(--green)" : "var(--orange)",
                    color: "white",
                    padding: "1px 6px",
                    borderRadius: 4,
                    fontWeight: 800,
                  }}>{lastAttempt.movePlayed}</span>
                  {!lastAttempt.isCorrect && (
                    <>
                      <span style={{ color: "var(--ink-3)" }}>best:</span>
                      <span style={{
                        background: "var(--green)",
                        color: "white",
                        padding: "1px 6px",
                        borderRadius: 4,
                        fontWeight: 800,
                      }}>{lastAttempt.bestMove}</span>
                    </>
                  )}
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={iconBtn()} onClick={handleHint} title="Hint">&#128161;</button>
              <button style={iconBtn()} title="Settings">&#9881;</button>
            </div>
          </div>
        </div>
      </div>

      {/* right: concept tracker + hearts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "var(--orange)", border: "3px solid var(--orange-dark)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--orange-dark)", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.85 }}>Hearts</span>
            <span style={{ fontSize: 11, fontFamily: "var(--mono)", opacity: 0.85 }}>{hearts}/5</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ fontSize: 28 }}>{i < hearts ? "❤️" : "🤍"}</div>
            ))}
          </div>
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Live concept tracker</div>
          {conceptTrackerData.length > 0 ? (
            conceptTrackerData.map((c) => (
              <ConceptTrack
                key={c.label}
                label={c.label}
                before={c.delta > 0 ? 0.5 : 0.5 + c.delta}
                after={c.delta > 0 ? 0.5 + c.delta : 0.5}
                good={c.delta > 0}
              />
            ))
          ) : (
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontStyle: "italic" }}>
              Make a move to see concept activations
            </div>
          )}
          {conceptTrackerData.length > 0 && (
            <div style={{ marginTop: 10, padding: 10, background: "var(--bg-2)", borderRadius: 10, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-2)", lineHeight: 1.5 }}>
              <span style={{ color: "var(--green-dark)", fontWeight: 800 }}>
                {"Δ"} {conceptTrackerData.reduce((s, c) => s + c.delta, 0).toFixed(2)}
              </span>{" "}
              · concept distance from centroid
            </div>
          )}
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Session XP</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: "var(--green)", letterSpacing: -1 }}>+{xp}</span>
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 700 }}>xp · {elapsedStr} elapsed</span>
          </div>
          <div style={{ marginTop: 10, height: 10, background: "var(--bg-2)", borderRadius: 5, overflow: "hidden", border: "1.5px solid var(--line)" }}>
            <div style={{ width: `${Math.min(100, xp % 100)}%`, height: "100%", background: "var(--green)" }} />
          </div>
          <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 6 }}>
            level {Math.floor(xp / 100)} · {100 - (xp % 100)} xp to next level
          </div>
        </div>
      </div>
    </div>
  );
}
