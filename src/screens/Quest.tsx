import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useApp } from "../store";
import { getStreak, type StreakData } from "../lib/streak";
import { getDrillProgressByUsername } from "../lib/db";
import type { DrillProgress } from "../lib/db";

function Path({ clusterLabel, onStart }: { clusterLabel: string; onStart: () => void }) {
  const nodes: PathNodeProps[] = [
    { y: 50, x: 0.45, status: "done", icon: "✓", label: "Warm-up · 5 puzzles" },
    { y: 160, x: 0.65, status: "done", icon: "✓", label: "Pattern recognition" },
    { y: 270, x: 0.45, status: "current", icon: "⚔", label: clusterLabel, desc: "Drill positions from your most common weakness pattern." },
    { y: 390, x: 0.25, status: "locked", icon: "🔒", label: "Theory: prophylaxis" },
    { y: 510, x: 0.5, status: "locked", icon: "🏆", label: "Boss · timed test", boss: true },
  ];
  return (
    <div style={{ position: "relative", height: 600 }}>
      {/* dashed connecting path */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <path d={`M ${0.45*420 + 50} 80 Q ${0.85*420 + 50} 110 ${0.65*420 + 80} 180 Q ${0.3*420 + 50} 220 ${0.45*420 + 50} 290 Q ${0.0*420 + 30} 330 ${0.25*420 + 50} 410 Q ${0.7*420 + 70} 450 ${0.5*420 + 60} 530`} fill="none" stroke="var(--line)" strokeWidth="6" strokeDasharray="2 12" strokeLinecap="round" />
      </svg>
      {nodes.map((n, i) => <PathNode key={i} {...n} onStart={onStart} />)}
    </div>
  );
}

interface PathNodeProps {
  y: number;
  x: number;
  status: "done" | "current" | "locked";
  icon: string;
  label?: string;
  desc?: string;
  boss?: boolean;
  onStart?: () => void;
}

function PathNode({ y, x, status, icon, label, desc, boss, onStart }: PathNodeProps) {
  const colors: Record<string, { bg: string; dark: string }> = {
    done: { bg: "var(--green)", dark: "var(--green-dark)" },
    current: { bg: "var(--orange)", dark: "var(--orange-dark)" },
    locked: { bg: "var(--bg-2)", dark: "var(--line)" }
  };
  const c = colors[status];
  const size = boss ? 100 : 78;
  return (
    <div style={{ position: "absolute", top: y - size/2, left: `calc(${x*100}% - ${size/2}px)`, width: size, height: size }}>
      <div style={{ width: size, height: size, borderRadius: boss ? 22 : "50%", background: c.bg, border: `4px solid ${c.dark}`, boxShadow: `0 6px 0 ${c.dark}`, display: "grid", placeItems: "center", color: status === "locked" ? "var(--ink-3)" : "white", fontSize: boss ? 38 : 30, fontWeight: 900, position: "relative" }}>
        {icon}
        {status === "current" && (
          <div style={{ position: "absolute", inset: -10, borderRadius: "50%", border: "3px dashed var(--orange)", animation: "spin 8s linear infinite" }} />
        )}
      </div>
      {label && (
        <div style={{ position: "absolute", left: size + 18, top: size/2 - 18, background: "white", border: "2.5px solid var(--ink)", borderRadius: 12, padding: "8px 12px", boxShadow: "0 4px 0 var(--ink)", whiteSpace: "nowrap", maxWidth: 280 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: "var(--ink)" }}>{label}</div>
          {desc && <div style={{ fontSize: 11, color: "var(--ink-2)", marginTop: 2, fontWeight: 600, whiteSpace: "normal" }}>{desc}</div>}
          {status === "current" && <button onClick={onStart} style={{ marginTop: 6, background: "var(--orange)", color: "white", border: "none", padding: "6px 12px", borderRadius: 8, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", boxShadow: "0 3px 0 var(--orange-dark)", cursor: "pointer" }}>Start →</button>}
        </div>
      )}
    </div>
  );
}

interface QuestItemProps {
  icon: string;
  title: string;
  sub: string;
  done: number;
  total: number;
  reward: string;
  complete?: boolean;
}

function QuestItem({ icon, title, sub, done, total, reward, complete }: QuestItemProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "44px 1fr auto", gap: 12, padding: "10px 0", borderBottom: "1px dashed var(--line)", alignItems: "center", opacity: complete ? 0.7 : 1 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: complete ? "var(--green)" : "var(--bg-2)", display: "grid", placeItems: "center", fontSize: 20, color: complete ? "white" : "var(--ink-2)", fontWeight: 900 }}>{complete ? "✓" : icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 900, textDecoration: complete ? "line-through" : "none" }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginBottom: 4 }}>{sub}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ flex: 1, height: 6, background: "var(--bg-2)", borderRadius: 3, overflow: "hidden", border: "1px solid var(--line)" }}>
            <div style={{ width: `${(done/total)*100}%`, height: "100%", background: complete ? "var(--green)" : "var(--orange)" }} />
          </div>
          <span style={{ fontSize: 10, fontFamily: "var(--mono)", fontWeight: 800, color: "var(--ink-3)" }}>{done}/{total}</span>
        </div>
      </div>
      <div style={{ background: complete ? "var(--green)" : "var(--yellow)", color: complete ? "white" : "var(--ink)", padding: "5px 9px", borderRadius: 7, fontSize: 11, fontWeight: 900, fontFamily: "var(--mono)" }}>{reward}</div>
    </div>
  );
}

export default function Quest() {
  const { username, clusters } = useApp();
  const navigate = useNavigate();
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, lastDrillDate: null, isDueToday: true });
  const [drillProgress, setDrillProgress] = useState<DrillProgress[]>([]);

  // Redirect if no username
  useEffect(() => {
    if (!username) navigate({ to: "/" });
  }, [username, navigate]);

  // Load real data
  useEffect(() => {
    setStreak(getStreak());
    if (username) {
      getDrillProgressByUsername(username).then(dp => setDrillProgress(dp));
    }
  }, [username]);

  // Derive quest stats from drill progress
  const totalAttempts = drillProgress.reduce((s, dp) => s + dp.totalAttempts, 0);
  const totalCorrect = drillProgress.reduce((s, dp) => s + Math.round(dp.totalAttempts * dp.successRate), 0);
  const puzzlesSolved = totalCorrect;
  const brilliantMoves = totalCorrect > 0 ? Math.min(1, Math.floor(totalCorrect / 5)) : 0;

  // First due cluster label (or fallback)
  const dueCluster = clusters.length > 0
    ? clusters.find((c) => {
        const dp = drillProgress.find(d => d.clusterId === c.id);
        return !dp || dp.successRate < 0.8 || new Date(dp.nextDue) <= new Date();
      }) || clusters[0]
    : null;
  const clusterLabel = dueCluster ? dueCluster.label : "Weakness Drills";
  const pathTitle = dueCluster
    ? `${dueCluster.label} · Lesson ${Math.min(drillProgress.find(d => d.clusterId === dueCluster.id)?.totalAttempts || 0, 9) + 1}`
    : "Weakness Drills · Lesson 1";

  const today = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dateLabel = `${dayNames[today.getDay()]} · ${monthNames[today.getMonth()]} ${today.getDate()}`;

  const handleStartDrill = () => navigate({ to: "/drill" });

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>{dateLabel}</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "4px 0 0", lineHeight: 1.05 }}>Daily quest</h1>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <div style={{ background: streak.isDueToday ? "var(--orange)" : "var(--green)", color: "white", padding: "10px 18px", borderRadius: 14, boxShadow: streak.isDueToday ? "0 4px 0 var(--orange-dark)" : "0 4px 0 var(--green-dark)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🔥</span>
            <div><div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{streak.currentStreak} day</div><div style={{ fontSize: 10, fontWeight: 800, opacity: 0.9, letterSpacing: 0.4, textTransform: "uppercase" }}>{streak.isDueToday ? "streak · due!" : "streak"}</div></div>
          </div>
          <div style={{ background: "var(--yellow)", color: "var(--ink)", padding: "10px 18px", borderRadius: 14, boxShadow: "0 4px 0 var(--yellow-dark)", display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>💎</span>
            <div><div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1 }}>3,420</div><div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>gems</div></div>
          </div>
        </div>
      </div>

      {/* path layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 22, padding: 28, boxShadow: "0 6px 0 var(--ink)", position: "relative", height: 720 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Today's path · 5 stops</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2, letterSpacing: -0.5 }}>{pathTitle}</div>
            </div>
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>~14 min · +180 xp</div>
          </div>

          <Path clusterLabel={clusterLabel} onStart={handleStartDrill} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* daily challenge */}
          <div style={{ background: "linear-gradient(135deg, #FF8B3D 0%, #C25A1B 100%)", color: "white", borderRadius: 20, padding: 22, border: "3px solid var(--orange-dark)", boxShadow: "0 6px 0 var(--orange-dark)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -10, top: -10, fontSize: 100, opacity: 0.15 }}>♛</div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.9 }}>⚡ daily challenge · resets in 6h 41m</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -0.7, margin: "8px 0 4px", lineHeight: 1.05 }}>Mate-in-3, blindfold</h2>
            <p style={{ fontSize: 13, opacity: 0.95, margin: "4px 0 14px", maxWidth: 320 }}>Read the position, find the forced mate, no board allowed. Today: 1,847 players solved.</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button style={{ background: "white", color: "var(--orange-dark)", border: "none", padding: "12px 18px", borderRadius: 12, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 rgba(0,0,0,0.2)", cursor: "pointer" }}>Start · +60 💎</button>
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", opacity: 0.85 }}>23% solve rate</span>
            </div>
          </div>

          {/* daily quests checklist */}
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 18, boxShadow: "0 5px 0 var(--ink)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Today's quests</div>
            <QuestItem icon="🎯" title="Solve 10 puzzles" sub="from your weak concepts" done={Math.min(puzzlesSolved, 10)} total={10} reward="40 💎" complete={puzzlesSolved >= 10} />
            <QuestItem icon="🦾" title="Find a brilliant move" sub="engine top-1 in any drill" done={brilliantMoves} total={1} reward="20 💎" complete={brilliantMoves >= 1} />
            <QuestItem icon="📖" title="Read 1 concept page" sub="Concept Library" done={0} total={1} reward="15 💎" />
            <QuestItem icon="⚔️" title="Win 1 ranked drill battle" sub="vs another user" done={0} total={1} reward="50 💎" />
          </div>

          {/* shop teaser */}
          <div style={{ background: "var(--ink)", borderRadius: 18, padding: 16, color: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>Streak freeze · 200 💎</div>
                <div style={{ fontSize: 14, fontWeight: 900, marginTop: 2 }}>Protect your {streak.currentStreak}-day streak</div>
              </div>
              <button style={{ background: "var(--green)", color: "white", border: "none", padding: "10px 16px", borderRadius: 10, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 11, letterSpacing: 0.5, textTransform: "uppercase", boxShadow: "0 3px 0 var(--green-dark)", cursor: "pointer" }}>Equip</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
