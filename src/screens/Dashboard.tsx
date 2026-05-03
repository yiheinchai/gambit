import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../store";
import { getMistakesByUsername, getGamesByUsername, getDrillProgressByUsername } from "../lib/db";
import { clusterMistakes, type WeaknessCluster } from "../lib/clustering";
import { aggregateMistakeStats } from "../lib/analysis";
import { computeProgress } from "../lib/progress";
import { predictEloGain } from "../lib/elo-prediction";
import { getStreak } from "../lib/streak";
import { CONCEPT_NAMES } from "../lib/concept-classifier";
import type { StoredMistake, StoredGame } from "../lib/db";

interface ClusterData {
  rank: number;
  clusterId: number;
  name: string;
  concepts: string[];
  freq: number;
  games: number;
  severity: number;
  eloLoss: number;
  color: string;
  icon: string;
  desc: string;
  board: string;
}

export default function Dashboard() {
  const store = useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [localMistakes, setLocalMistakes] = useState<StoredMistake[]>([]);
  const [localGames, setLocalGames] = useState<StoredGame[]>([]);
  const [localClusters, setLocalClusters] = useState<WeaknessCluster[]>([]);

  useEffect(() => {
    async function loadData() {
      // If store already has results, use them
      if (store.phase === "results" && store.mistakes.length > 0) {
        setLocalMistakes(store.mistakes);
        setLocalGames(store.games);
        setLocalClusters(store.clusters.length > 0 ? store.clusters : clusterMistakes(store.mistakes));
        if (!store.eloPrediction && store.games.length > 0) {
          const avgElo = store.games.reduce((s, g) => s + g.playerElo, 0) / store.games.length;
          store.setEloPrediction(predictEloGain(store.mistakes, avgElo, store.games.length));
        }
        setLoading(false);
        return;
      }

      // Try loading from DB
      const username = store.username;
      if (!username) {
        navigate({ to: "/" });
        return;
      }

      const [dbMistakes, dbGames, dbDrillProgress] = await Promise.all([
        getMistakesByUsername(username),
        getGamesByUsername(username),
        getDrillProgressByUsername(username),
      ]);

      if (dbMistakes.length === 0 && dbGames.length === 0) {
        navigate({ to: "/" });
        return;
      }

      const computedClusters = clusterMistakes(dbMistakes);
      const avgElo = dbGames.length > 0 ? dbGames.reduce((s, g) => s + g.playerElo, 0) / dbGames.length : 1500;
      const eloPred = predictEloGain(dbMistakes, avgElo, dbGames.length);

      // Hydrate the store
      store.setGames(dbGames);
      store.setMistakes(dbMistakes);
      store.setClusters(computedClusters);
      store.setEloPrediction(eloPred);
      store.setDrillProgress(dbDrillProgress);
      if (dbGames.length > 0 && dbMistakes.length > 0) {
        store.setProgressData(computeProgress(dbGames, dbMistakes));
      }
      store.setPhase("results");

      setLocalMistakes(dbMistakes);
      setLocalGames(dbGames);
      setLocalClusters(computedClusters);
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = useMemo(() => aggregateMistakeStats(localMistakes), [localMistakes]);
  const streak = useMemo(() => getStreak(), []);
  const eloPrediction = store.eloPrediction;

  const PALETTE = ["var(--orange)", "var(--red)", "var(--purple)", "var(--blue)", "var(--yellow)", "var(--green)"];
  const BOARD_KINDS = ["trapped", "attack", "endgame", "najdorf"];

  const clusters: ClusterData[] = localClusters.map((c, i) => {
    const uniqueGameIds = new Set(c.mistakes.map(m => m.gameId));
    const perClusterEloLoss = eloPrediction
      ? Math.round((c.avgCpLoss * c.frequency) / (localGames.length || 1) * 0.5)
      : 0;
    return {
      rank: i + 1,
      clusterId: c.id,
      name: c.label,
      concepts: c.topConcepts.map(tc => tc.name),
      freq: c.frequency,
      games: uniqueGameIds.size,
      severity: Math.round(c.avgCpLoss),
      eloLoss: perClusterEloLoss,
      color: PALETTE[i % PALETTE.length],
      icon: ["🪤", "🔥", "♝", "📖", "⚡", "🎯"][i % 6],
      desc: c.description,
      board: BOARD_KINDS[i % BOARD_KINDS.length],
    };
  });

  const gamesCount = localGames.length;
  const mistakesPerGame = gamesCount > 0 ? (stats.total / gamesCount).toFixed(1) : "0";
  const blunderRate = gamesCount > 0 ? ((stats.bySeverity.blunder / gamesCount) * 100).toFixed(1) : "0";
  const totalMoves = localGames.reduce((sum, g) => sum + (g.moves?.length || 0), 0);
  const accuracy = totalMoves > 0 ? ((1 - stats.total / totalMoves) * 100).toFixed(1) : "—";
  const clusterCount = localClusters.length;
  const potentialGain = eloPrediction?.potentialGain ?? 0;
  const username = store.username || "player";

  if (loading) {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", fontFamily: "var(--sans)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>♞</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>Loading your dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <TopNav active="dashboard" username={username} streak={streak.currentStreak} />

        {/* hero header */}
        <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
          <div style={{ background: "linear-gradient(135deg, #58CC02 0%, #45A302 100%)", borderRadius: 24, padding: 28, color: "white", border: "3px solid var(--green-dark)", boxShadow: "0 6px 0 var(--green-dark)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -20, top: -20, opacity: 0.12, fontSize: 200 }}>♞</div>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 }}>{streak.currentStreak > 0 ? `${streak.currentStreak}-day streak` : "Start drilling today"}</div>
            <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1, margin: "10px 0 4px", lineHeight: 1.05 }}>{clusterCount} weakness{clusterCount !== 1 ? "es are" : " is"}<br />costing you ~{potentialGain} Elo.</h1>
            <p style={{ fontSize: 15, opacity: 0.92, fontWeight: 500, maxWidth: 520, margin: "8px 0 18px" }}>We analyzed {gamesCount} game{gamesCount !== 1 ? "s" : ""} ({totalMoves.toLocaleString()} positions).{clusters.length > 0 && eloPrediction ? <> Drilling the top one for 20 minutes a day predicts <b>+{clusters[0].eloLoss} Elo in 30 days</b>.</> : " Start drilling to improve."}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/drill" style={{ textDecoration: "none" }}><button style={btnDuo("white", "var(--green-dark)", "var(--green)")}>Drill #1 now</button></Link>
              <button style={btnDuoGhost()}>See full report</button>
            </div>
          </div>

          {/* radar / fingerprint */}
          <div style={{ background: "white", borderRadius: 24, padding: 22, border: "3px solid var(--ink)", boxShadow: "0 6px 0 var(--ink)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Concept fingerprint</div>
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>vs. 1800 cohort</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{CONCEPT_NAMES.length || 27} dims · {clusterCount} clusters</div>
            </div>
            <Radar mistakes={localMistakes} />
          </div>
        </div>

        {/* metric strip */}
        <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          <Metric label="Games analyzed" v={String(gamesCount)} sub="last 60 days" />
          <Metric label="Mistakes flagged" v={String(stats.total)} sub={`${mistakesPerGame} / game`} />
          <Metric label="Blunder rate" v={`${blunderRate}%`} sub={`${stats.bySeverity.blunder} blunders total`} />
          <Metric label="Accuracy" v={accuracy} sub={`${stats.bySeverity.inaccuracy} inaccuracies`} />
          <Metric label="Drill streak" v={String(streak.currentStreak)} sub={streak.currentStreak > 0 ? "keep going" : "start today"} highlight />
        </div>

        {/* weakness cards */}
        <div style={{ marginTop: 28 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, margin: 0 }}>Your weaknesses, ranked</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <Pill active>By cost</Pill>
              <Pill>By frequency</Pill>
              <Pill>By recency</Pill>
              <Pill>By phase</Pill>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {clusters.map(c => <WeaknessCard key={c.rank} {...c} />)}
          </div>
        </div>

        {/* timeline */}
        <div style={{ marginTop: 28, background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Mistake timeline · last {gamesCount} games</h2>
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>each tick = 1 game · color = top concept</div>
          </div>
          <Timeline games={localGames} mistakes={localMistakes} />
        </div>
      </div>
    </div>
  );
}

function btnDuo(bg: string, dark: string, txt: string): React.CSSProperties {
  return { background: bg, color: txt, border: "none", padding: "14px 22px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: `0 4px 0 ${dark}`, cursor: "pointer" };
}
function btnDuoGhost(): React.CSSProperties {
  return { background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.4)", padding: "12px 22px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 800, fontSize: 14, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer" };
}

function TopNav({ active, username = "player", streak = 0 }: { active: string; username?: string; streak?: number }) {
  const items: { id: string; label: string; to: "/" | "/dashboard" | "/drill" | "/progress" | "/library" }[] = [
    { id: "dashboard", label: "Weaknesses", to: "/dashboard" },
    { id: "drill", label: "Drill", to: "/drill" },
    { id: "progress", label: "Progress", to: "/progress" },
    { id: "library", label: "Concept library", to: "/library" },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green)", display: "grid", placeItems: "center", color: "white", fontWeight: 900, fontSize: 18, boxShadow: "0 3px 0 var(--green-dark)" }}>♞</div>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>missedtake</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: "white", border: "2px solid var(--line)", padding: 4, borderRadius: 14 }}>
          {items.map(i => (
            <Link key={i.id} to={i.to} style={{ textDecoration: "none" }}>
              <div style={{ padding: "8px 16px", fontSize: 14, fontWeight: 800, borderRadius: 10, background: i.id === active ? "var(--green)" : "transparent", color: i.id === active ? "white" : "var(--ink-2)", cursor: "pointer", boxShadow: i.id === active ? "0 2px 0 var(--green-dark)" : "none" }}>{i.label}</div>
            </Link>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "white", border: "2px solid var(--line)", borderRadius: 12 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontFamily: "var(--mono)", fontWeight: 900, fontSize: 14 }}>{streak}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 14px", background: "white", border: "2px solid var(--line)", borderRadius: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{username}</span>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--orange)", color: "white", fontWeight: 900, fontSize: 12, display: "grid", placeItems: "center" }}>{username.charAt(0).toUpperCase()}</div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, v, sub, trend, highlight }: { label: string; v: string; sub: string; trend?: string; highlight?: boolean }) {
  return (
    <div style={{ background: highlight ? "#FFF7DB" : "white", border: `2px solid ${highlight ? "var(--yellow)" : "var(--line)"}`, borderRadius: 16, padding: 16, boxShadow: highlight ? "0 4px 0 var(--yellow-dark)" : "none" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, marginTop: 2, color: "var(--ink)" }}>{v}</div>
      <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: trend === "down" ? "var(--green-dark)" : trend === "up" ? "var(--green-dark)" : "var(--ink-3)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Pill({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return <div style={{ padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800, background: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink-2)", border: "2px solid " + (active ? "var(--ink)" : "var(--line)"), cursor: "pointer" }}>{children}</div>;
}

function WeaknessCard({ rank, clusterId, name, concepts, freq, games, severity, eloLoss, color, icon, desc, board }: ClusterData) {
  return (
    <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)", display: "grid", gridTemplateColumns: "60px 140px 1fr 240px 160px", gap: 20, alignItems: "center" }}>
      <div style={{ width: 60, height: 60, borderRadius: 14, background: color, color: "white", fontWeight: 900, fontSize: 28, display: "grid", placeItems: "center", boxShadow: `0 4px 0 ${color === "var(--orange)" ? "var(--orange-dark)" : color === "var(--red)" ? "#A8281C" : color === "var(--purple)" ? "#5C2E91" : "#1E3A8A"}` }}>
        #{rank}
      </div>

      <BoardThumb kind={board} accent={color} />

      <div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>cluster · {concepts.length} concepts</div>
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5, margin: "4px 0 6px" }}>{name}</div>
        <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45, marginBottom: 8 }}>{desc}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {concepts.map(c => (
            <span key={c} style={{ fontSize: 11, fontFamily: "var(--mono)", padding: "3px 8px", background: "var(--bg-2)", borderRadius: 6, color: "var(--ink-2)", fontWeight: 700 }}>#{c.replace(/ /g, "_")}</span>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <StatRow label="frequency" value={`${freq}× in ${games} games`} />
        <StatRow label="avg cpl" value={`${severity}`} mono />
        <StatRow label="elo cost" value={`~${eloLoss}`} mono accent="var(--orange-dark)" />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Link to="/drill" search={{ clusterId }} style={{ textDecoration: "none" }}><button style={{ background: color, color: "white", border: "none", padding: "14px 16px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: `0 4px 0 ${color === "var(--orange)" ? "var(--orange-dark)" : color === "var(--red)" ? "#A8281C" : color === "var(--purple)" ? "#5C2E91" : "#1E3A8A"}`, cursor: "pointer" }}>Drill this</button></Link>
        <Link to="/detail" search={{ clusterId }} style={{ textDecoration: "none" }}><button style={{ background: "white", color: "var(--ink)", border: "2px solid var(--line)", padding: "10px 16px", borderRadius: 12, fontFamily: "var(--sans)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Inspect</button></Link>
      </div>
    </div>
  );
}

function StatRow({ label, value, mono, accent }: { label: string; value: string; mono?: boolean; accent?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px dashed var(--line)", paddingBottom: 4 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900, fontFamily: mono ? "var(--mono)" : "var(--sans)", color: accent || "var(--ink)" }}>{value}</span>
    </div>
  );
}

function BoardThumb({ kind, accent }: { kind: string; accent: string }) {
  const sq = 16;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const setups: Record<string, { hl: string[]; pieces: Record<string, string> }> = {
    trapped: { hl: ["a5","b5"], pieces: { c5: "♞", a5: "♟", b5: "♟", e7: "♚", g8: "♚", a3: "♙", b4: "♙" } },
    attack: { hl: ["h7","g7"], pieces: { h5: "♕", g6: "♘", h7: "♟", g7: "♟", g8: "♚", e1: "♔" } },
    endgame: { hl: ["c4","f5"], pieces: { c4: "♗", f5: "♝", e4: "♔", d6: "♚", a4: "♙", h5: "♟" } },
    najdorf: { hl: ["e5","f3"], pieces: { e4: "♙", e5: "♟", c3: "♘", f6: "♞", d2: "♕", a6: "♟" } }
  };
  const s = setups[kind] || setups.trapped;
  const files=["a","b","c","d","e","f","g","h"]; const ranks=[8,7,6,5,4,3,2,1];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 6, overflow: "hidden", border: "2px solid var(--ink)", width: sq*8 }}>
      {ranks.map(r => files.map(f => {
        const isDark = (files.indexOf(f) + r) % 2 === 0;
        const k = f+r; const hl = s.hl.includes(k);
        return <div key={k} style={{ width: sq, height: sq, background: hl ? accent : (isDark?dark:light), display:"grid", placeItems:"center", fontSize: 12, color: ["♟","♜","♞","♛","♚","♝"].includes(s.pieces[k] || "")?"var(--ink)":"white" }}>{s.pieces[k] || ""}</div>;
      }))}
    </div>
  );
}

function Radar({ mistakes }: { mistakes: StoredMistake[] }) {
  const cx = 200, cy = 170, r = 130;

  const fallbackConcepts = [
    { name: "tactics", you: 0.62, peer: 0.78 },
    { name: "endgame", you: 0.48, peer: 0.71 },
    { name: "openings", you: 0.81, peer: 0.74 },
    { name: "king safety", you: 0.45, peer: 0.69 },
    { name: "calculation", you: 0.66, peer: 0.72 },
    { name: "structure", you: 0.71, peer: 0.68 },
    { name: "piece play", you: 0.39, peer: 0.70 },
    { name: "prophylaxis", you: 0.44, peer: 0.67 },
  ];

  const concepts = useMemo(() => {
    const withDiff = mistakes.filter(m => m.conceptDiff && m.conceptDiff.length > 0);
    if (withDiff.length === 0 || CONCEPT_NAMES.length === 0) return fallbackConcepts;

    // Average concept activations across all mistakes
    const dim = withDiff[0].conceptDiff!.length;
    const avg = new Array(dim).fill(0);
    for (const m of withDiff) {
      for (let i = 0; i < dim; i++) avg[i] += Math.abs(m.conceptDiff![i]);
    }
    for (let i = 0; i < dim; i++) avg[i] /= withDiff.length;

    // Pick top 8 most activated concepts
    const indexed = avg.map((v, i) => ({ idx: i, val: v }));
    indexed.sort((a, b) => b.val - a.val);
    const top8 = indexed.slice(0, 8);
    const maxVal = top8[0]?.val || 1;

    return top8.map(({ idx, val }) => ({
      name: CONCEPT_NAMES[idx] || `dim_${idx}`,
      you: Math.min(1, val / maxVal),
      peer: 0.65 + Math.random() * 0.15, // placeholder peer cohort
    }));
  }, [mistakes]);
  const N = concepts.length;
  const pt = (i: number, v: number): [number, number] => {
    const a = -Math.PI/2 + (2*Math.PI*i)/N;
    return [cx + Math.cos(a)*r*v, cy + Math.sin(a)*r*v];
  };
  const youPath = "M " + concepts.map((_c,i) => pt(i, _c.you).join(",")).join(" L ") + " Z";
  const peerPath = "M " + concepts.map((_c,i) => pt(i, _c.peer).join(",")).join(" L ") + " Z";
  return (
    <svg width="400" height="340" style={{ display: "block", margin: "8px auto 0" }}>
      {[0.25, 0.5, 0.75, 1].map(v => (
        <polygon key={v} points={concepts.map((_,i) => pt(i,v).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth="1.5" />
      ))}
      {concepts.map((_c,i) => {
        const [x,y] = pt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" strokeWidth="1" />;
      })}
      <path d={peerPath} fill="rgba(99,102,241,0.15)" stroke="var(--blue)" strokeWidth="2" strokeDasharray="4 4" />
      <path d={youPath} fill="rgba(255,139,61,0.25)" stroke="var(--orange)" strokeWidth="2.5" />
      {concepts.map((c,i) => {
        const [x,y] = pt(i, 1.18);
        return <text key={i} x={x} y={y} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--ink-2)" fontFamily="var(--sans)" dy="3">{c.name}</text>;
      })}
      {concepts.map((c,i) => {
        const [x,y] = pt(i, c.you);
        return <circle key={i} cx={x} cy={y} r="4" fill="var(--orange)" stroke="white" strokeWidth="2" />;
      })}
      <g transform="translate(20, 320)">
        <circle cx="6" cy="-3" r="5" fill="var(--orange)" />
        <text x="16" y="0" fontSize="11" fontWeight="800" fill="var(--ink)" fontFamily="var(--sans)">you</text>
        <circle cx="60" cy="-3" r="5" fill="var(--blue)" opacity="0.4" />
        <text x="70" y="0" fontSize="11" fontWeight="800" fill="var(--ink-2)" fontFamily="var(--sans)">1800 cohort</text>
      </g>
    </svg>
  );
}

function Timeline({ games: gameList, mistakes }: { games: StoredGame[]; mistakes: StoredMistake[] }) {
  const conceptColors = ["var(--orange)", "var(--red)", "var(--purple)", "var(--blue)", "var(--yellow)"];

  const data = useMemo(() => {
    if (gameList.length === 0) {
      // Fallback mock data
      return Array.from({length: 50}, (_, i) => ({
        mistakes: Math.max(0, Math.round(2 + Math.sin(i/8) + (Math.random() - 0.3) * 2)),
        color: conceptColors[Math.floor(Math.random() * conceptColors.length)],
        date: new Date(),
      }));
    }

    const sorted = [...gameList].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const mistakesByGame = new Map<string, StoredMistake[]>();
    for (const m of mistakes) {
      const arr = mistakesByGame.get(m.gameId) || [];
      arr.push(m);
      mistakesByGame.set(m.gameId, arr);
    }

    return sorted.map((g, i) => {
      const gameMistakes = mistakesByGame.get(g.id) || [];
      const hasBlunder = gameMistakes.some(m => m.severity === "blunder");
      const hasMistake = gameMistakes.some(m => m.severity === "mistake");
      const color = hasBlunder ? "var(--red)" : hasMistake ? "var(--orange)" : gameMistakes.length > 0 ? "var(--yellow)" : "var(--green)";
      return {
        mistakes: gameMistakes.length,
        color,
        date: new Date(g.date),
      };
    });
  }, [gameList, mistakes]);

  const max = Math.max(6, ...data.map(d => d.mistakes));

  const dateLabels = useMemo(() => {
    if (data.length === 0) return [];
    const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (data.length <= 2) return [fmt(data[0].date), fmt(data[data.length - 1].date)];
    const step = Math.floor(data.length / 4);
    return [
      fmt(data[0].date),
      fmt(data[step].date),
      fmt(data[step * 2].date),
      fmt(data[step * 3].date),
      "today",
    ];
  }, [data]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
        {data.map((d,i) => (
          <div key={i} title={`game ${i+1} · ${d.mistakes} mistakes`} style={{ flex: 1, height: `${(d.mistakes/max)*100}%`, background: d.color, borderRadius: "2px 2px 0 0", minHeight: 2, opacity: 0.85 }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
        {dateLabels.map((label, i) => <span key={i}>{label}</span>)}
      </div>
    </div>
  );
}
