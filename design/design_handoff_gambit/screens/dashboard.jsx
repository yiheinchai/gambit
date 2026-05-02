/* global React */
const { useState: useStateD } = React;

function Dashboard() {
  const clusters = [
    { rank: 1, name: "Trapped pieces in the middlegame", concepts: ["trapped piece", "piece activity", "knight mobility"], freq: 18, games: 14, severity: 168, eloLoss: 47, color: "var(--orange)", icon: "🪤", desc: "Your knights wander into squares with no escape. You consistently miss prophylactic retreats one move before the trap closes.", board: "trapped" },
    { rank: 2, name: "Premature kingside attacks", concepts: ["king safety", "h-file weakness", "attack timing"], freq: 13, games: 11, severity: 142, eloLoss: 38, color: "var(--red)", icon: "🔥", desc: "You launch h-pawn pushes before completing development. Sacrifices that 'feel right' are unsound 71% of the time.", board: "attack" },
    { rank: 3, name: "Bishop endgame technique", concepts: ["good vs bad bishop", "pawn breaks", "opposition"], freq: 9, games: 8, severity: 121, eloLoss: 29, color: "var(--purple)", icon: "♝", desc: "In opposite-colored bishop endings you trade incorrectly. You don't recognize fortress-prone structures.", board: "endgame" },
    { rank: 4, name: "Najdorf English Attack moveorders", concepts: ["opening theory", "f3-g4 plans", "queenside castling"], freq: 11, games: 9, severity: 89, eloLoss: 22, color: "var(--blue)", icon: "📖", desc: "After 6.Be3 e5 you keep playing 7…Be7 instead of 7…Be6. This costs 2-3 tempi every time.", board: "najdorf" },
  ];

  return (
    <div style={{ width: 1280, height: 1240, background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px 40px" }}>
      <TopNav active="dashboard" />

      {/* hero header */}
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <div style={{ background: "linear-gradient(135deg, #58CC02 0%, #45A302 100%)", borderRadius: 24, padding: 28, color: "white", border: "3px solid var(--green-dark)", boxShadow: "0 6px 0 var(--green-dark)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: -20, top: -20, opacity: 0.12, fontSize: 200 }}>♞</div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", opacity: 0.85 }}>Day 14 · 11-game streak</div>
          <h1 style={{ fontSize: 38, fontWeight: 900, letterSpacing: -1, margin: "10px 0 4px", lineHeight: 1.05 }}>4 weaknesses are<br />costing you ~136 Elo.</h1>
          <p style={{ fontSize: 15, opacity: 0.92, fontWeight: 500, maxWidth: 520, margin: "8px 0 18px" }}>We analyzed 100 games (7,432 positions). Drilling the top one for 20 minutes a day predicts <b>+47 Elo in 30 days</b>.</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={btnDuo("white", "var(--green-dark)", "var(--green)")}>Drill #1 now</button>
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
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>187 dims · 4 clusters</div>
          </div>
          <Radar />
        </div>
      </div>

      {/* metric strip */}
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <Metric label="Games analyzed" v="100" sub="last 60 days" />
        <Metric label="Mistakes flagged" v="312" sub="3.1 / game" />
        <Metric label="Blunder rate" v="1.4%" sub="↓ 0.6 vs prev" trend="down" />
        <Metric label="Accuracy" v="84.2" sub="↑ 2.1 this week" trend="up" />
        <Metric label="Drill streak" v="11" sub="🔥 keep going" highlight />
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
          <h2 style={{ fontSize: 18, fontWeight: 900, margin: 0 }}>Mistake timeline · last 100 games</h2>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>each tick = 1 game · color = top concept</div>
        </div>
        <Timeline />
      </div>
    </div>
  );
}

function btnDuo(bg, dark, txt) {
  return { background: bg, color: txt, border: "none", padding: "14px 22px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: `0 4px 0 ${dark}`, cursor: "pointer" };
}
function btnDuoGhost() {
  return { background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.4)", padding: "12px 22px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 800, fontSize: 14, letterSpacing: 0.5, textTransform: "uppercase", cursor: "pointer" };
}

function TopNav({ active }) {
  const items = [
    { id: "dashboard", label: "Weaknesses" },
    { id: "drill", label: "Drill" },
    { id: "progress", label: "Progress" },
    { id: "library", label: "Concept library" },
  ];
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green)", display: "grid", placeItems: "center", color: "white", fontWeight: 900, fontSize: 18, boxShadow: "0 3px 0 var(--green-dark)" }}>♞</div>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>gambit</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: "white", border: "2px solid var(--line)", padding: 4, borderRadius: 14 }}>
          {items.map(i => (
            <div key={i.id} style={{ padding: "8px 16px", fontSize: 14, fontWeight: 800, borderRadius: 10, background: i.id === active ? "var(--green)" : "transparent", color: i.id === active ? "white" : "var(--ink-2)", cursor: "pointer", boxShadow: i.id === active ? "0 2px 0 var(--green-dark)" : "none" }}>{i.label}</div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "white", border: "2px solid var(--line)", borderRadius: 12 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontFamily: "var(--mono)", fontWeight: 900, fontSize: 14 }}>11</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 14px", background: "white", border: "2px solid var(--line)", borderRadius: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>magnus_fan_42</span>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--orange)", color: "white", fontWeight: 900, fontSize: 12, display: "grid", placeItems: "center" }}>M</div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, v, sub, trend, highlight }) {
  return (
    <div style={{ background: highlight ? "#FFF7DB" : "white", border: `2px solid ${highlight ? "var(--yellow)" : "var(--line)"}`, borderRadius: 16, padding: 16, boxShadow: highlight ? "0 4px 0 var(--yellow-dark)" : "none" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: -1, marginTop: 2, color: "var(--ink)" }}>{v}</div>
      <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: trend === "down" ? "var(--green-dark)" : trend === "up" ? "var(--green-dark)" : "var(--ink-3)", marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function Pill({ children, active }) {
  return <div style={{ padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 800, background: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink-2)", border: "2px solid " + (active ? "var(--ink)" : "var(--line)"), cursor: "pointer" }}>{children}</div>;
}

function WeaknessCard({ rank, name, concepts, freq, games, severity, eloLoss, color, icon, desc, board }) {
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
        <button style={{ background: color, color: "white", border: "none", padding: "14px 16px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: `0 4px 0 ${color === "var(--orange)" ? "var(--orange-dark)" : color === "var(--red)" ? "#A8281C" : color === "var(--purple)" ? "#5C2E91" : "#1E3A8A"}`, cursor: "pointer" }}>Drill this</button>
        <button style={{ background: "white", color: "var(--ink)", border: "2px solid var(--line)", padding: "10px 16px", borderRadius: 12, fontFamily: "var(--sans)", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>Inspect</button>
      </div>
    </div>
  );
}

function StatRow({ label, value, mono, accent }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderBottom: "1px dashed var(--line)", paddingBottom: 4 }}>
      <span style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.4 }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 900, fontFamily: mono ? "var(--mono)" : "var(--sans)", color: accent || "var(--ink)" }}>{value}</span>
    </div>
  );
}

function BoardThumb({ kind, accent }) {
  const sq = 16;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const setups = {
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
        return <div key={k} style={{ width: sq, height: sq, background: hl ? accent : (isDark?dark:light), display:"grid", placeItems:"center", fontSize: 12, color: ["♟","♜","♞","♛","♚","♝"].includes(s.pieces[k])?"var(--ink)":"white" }}>{s.pieces[k] || ""}</div>;
      }))}
    </div>
  );
}

function Radar() {
  const cx = 200, cy = 170, r = 130;
  const concepts = [
    { name: "tactics", you: 0.62, peer: 0.78 },
    { name: "endgame", you: 0.48, peer: 0.71 },
    { name: "openings", you: 0.81, peer: 0.74 },
    { name: "king safety", you: 0.45, peer: 0.69 },
    { name: "calculation", you: 0.66, peer: 0.72 },
    { name: "structure", you: 0.71, peer: 0.68 },
    { name: "piece play", you: 0.39, peer: 0.70 },
    { name: "prophylaxis", you: 0.44, peer: 0.67 },
  ];
  const N = concepts.length;
  const pt = (i, v) => {
    const a = -Math.PI/2 + (2*Math.PI*i)/N;
    return [cx + Math.cos(a)*r*v, cy + Math.sin(a)*r*v];
  };
  const youPath = "M " + concepts.map((c,i) => pt(i, c.you).join(",")).join(" L ") + " Z";
  const peerPath = "M " + concepts.map((c,i) => pt(i, c.peer).join(",")).join(" L ") + " Z";
  return (
    <svg width="400" height="340" style={{ display: "block", margin: "8px auto 0" }}>
      {[0.25, 0.5, 0.75, 1].map(v => (
        <polygon key={v} points={concepts.map((_,i) => pt(i,v).join(",")).join(" ")} fill="none" stroke="var(--line)" strokeWidth="1.5" />
      ))}
      {concepts.map((c,i) => {
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

function Timeline() {
  const games = 100;
  const conceptColors = ["var(--orange)", "var(--red)", "var(--purple)", "var(--blue)", "var(--yellow)"];
  const data = Array.from({length: games}, (_, i) => ({
    mistakes: Math.max(0, Math.round(2 + Math.sin(i/8) + (Math.random() - 0.3) * 2)),
    color: conceptColors[Math.floor(Math.random() * conceptColors.length)]
  }));
  const max = 6;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80 }}>
        {data.map((d,i) => (
          <div key={i} title={`game ${i+1} · ${d.mistakes} mistakes`} style={{ flex: 1, height: `${(d.mistakes/max)*100}%`, background: d.color, borderRadius: "2px 2px 0 0", minHeight: 2, opacity: 0.85 }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
        <span>Feb 8</span><span>Feb 28</span><span>Mar 19</span><span>Apr 12</span><span>today</span>
      </div>
    </div>
  );
}

window.Dashboard = Dashboard;
