/* global React */
function Drill() {
  return (
    <div style={{ width: 1280, height: 880, background: "var(--bg)", fontFamily: "var(--sans)", padding: "20px 40px", display: "grid", gridTemplateColumns: "260px 1fr 320px", gap: 20 }}>
      {/* left: session */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Drilling weakness</div>
          <div style={{ fontSize: 16, fontWeight: 900, marginTop: 2 }}>Trapped pieces</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 4 }}>cluster c.0a3f · SM-2 due</div>

          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", marginBottom: 4 }}>
              <span>Position 4 of 12</span><span>33%</span>
            </div>
            <div style={{ height: 12, background: "var(--bg-2)", borderRadius: 6, overflow: "hidden", border: "1.5px solid var(--line)" }}>
              <div style={{ width: "33%", height: "100%", background: "var(--orange)", boxShadow: "inset 0 -3px 0 var(--orange-dark)" }} />
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <KPI v="3" l="streak" color="var(--green)" />
            <KPI v="75%" l="accuracy" />
            <KPI v="11s" l="avg time" />
            <KPI v="+24" l="rating" color="var(--green)" />
          </div>
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Mode</div>
          <ModeBtn active icon="🎯" title="Your positions" sub="replay your own mistakes" />
          <ModeBtn icon="🧩" title="Matched puzzles" sub="lichess · same concept" />
          <ModeBtn icon="🤖" title="vs Stockfish" sub="play out from position" />
        </div>

        <div style={{ background: "var(--ink)", color: "white", borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Next review</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Trapped pieces</span><span style={{ color: "#FFD23F" }}>now</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Kingside attacks</span><span style={{ color: "#A8D88A" }}>3d</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Bishop endgames</span><span style={{ color: "#A8D88A" }}>5d</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.6 }}>Najdorf theory</span><span style={{ color: "#9CA3AF" }}>13d</span></div>
          </div>
        </div>
      </div>

      {/* center: board */}
      <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 22, padding: 22, boxShadow: "0 6px 0 var(--ink)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--ink)" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 900 }}>polarbear_77</div>
              <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>1873 · to move: black</div>
            </div>
          </div>
          <div style={{ background: "var(--bg-2)", padding: "6px 12px", borderRadius: 10, fontSize: 12, fontFamily: "var(--mono)", fontWeight: 700 }}>
            evaluation +0.4
          </div>
        </div>

        <DrillBoard />

        <div style={{ width: "100%" }}>
          {/* feedback */}
          <div style={{ background: "#E8F8E5", border: "2.5px solid var(--green)", borderRadius: 16, padding: 16, boxShadow: "0 4px 0 var(--green-dark)", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--green)", color: "white", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900, boxShadow: "0 3px 0 var(--green-dark)" }}>✓</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 900, color: "var(--green-dark)", letterSpacing: 0.4, textTransform: "uppercase" }}>Brilliant — engine's #1 move</div>
              <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2, fontWeight: 500 }}>You found <b>Bxf3</b>. By trading the bishop you reduce f3-pressure and free your knight to retreat. <span style={{ color: "var(--ink-3)" }}>Concept activation: trap_risk ↓0.81, mobility ↑0.51.</span></div>
            </div>
            <button style={{ background: "var(--green)", color: "white", border: "none", padding: "16px 22px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--green-dark)", cursor: "pointer", whiteSpace: "nowrap" }}>Next →</button>
          </div>

          {/* move strip */}
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontFamily: "var(--mono)", fontSize: 12 }}>
              <span style={{ color: "var(--ink-3)" }}>21.</span><span>Re1</span>
              <span style={{ color: "var(--ink-3)" }}>Bg4</span>
              <span style={{ color: "var(--ink-3)" }}>22.</span><span>h3</span>
              <span style={{ color: "var(--ink-3)" }}>Bh5</span>
              <span style={{ color: "var(--ink-3)" }}>23.</span><span>Bg5</span>
              <span style={{ background: "var(--green)", color: "white", padding: "1px 6px", borderRadius: 4, fontWeight: 800 }}>Bxf3</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button style={iconBtn()}>↶</button>
              <button style={iconBtn()}>💡</button>
              <button style={iconBtn()}>⚙</button>
            </div>
          </div>
        </div>
      </div>

      {/* right: concept tracker + heart */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: "var(--orange)", border: "3px solid var(--orange-dark)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--orange-dark)", color: "white" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.85 }}>Hearts</span>
            <span style={{ fontSize: 11, fontFamily: "var(--mono)", opacity: 0.85 }}>refill 8m</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {[1,1,1,1,0].map((h,i) => <div key={i} style={{ fontSize: 28 }}>{h ? "❤️" : "🤍"}</div>)}
          </div>
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Live concept tracker</div>
          <ConceptTrack label="trap risk" before={0.81} after={0.12} good />
          <ConceptTrack label="mobility" before={0.18} after={0.69} good />
          <ConceptTrack label="tempo" before={0.32} after={0.74} good />
          <ConceptTrack label="king safety" before={0.66} after={0.61} />
          <ConceptTrack label="pawn structure" before={0.55} after={0.51} />
          <div style={{ marginTop: 10, padding: 10, background: "var(--bg-2)", borderRadius: 10, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-2)", lineHeight: 1.5 }}>
            <span style={{ color: "var(--green-dark)", fontWeight: 800 }}>Δ +1.85</span> · concept distance from centroid decreased
          </div>
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Session XP</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <span style={{ fontSize: 36, fontWeight: 900, color: "var(--green)", letterSpacing: -1 }}>+62</span>
            <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 700 }}>xp · 7m elapsed</span>
          </div>
          <div style={{ marginTop: 10, height: 10, background: "var(--bg-2)", borderRadius: 5, overflow: "hidden", border: "1.5px solid var(--line)" }}>
            <div style={{ width: "62%", height: "100%", background: "var(--green)" }} />
          </div>
          <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 6 }}>level 14 · 38 xp to level 15</div>
        </div>
      </div>
    </div>
  );
}

function KPI({ v, l, color }) {
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: color || "var(--ink)", letterSpacing: -0.5 }}>{v}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>{l}</div>
    </div>
  );
}

function ModeBtn({ icon, title, sub, active }) {
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

function iconBtn() {
  return { width: 36, height: 36, borderRadius: 10, border: "2px solid var(--line)", background: "white", fontSize: 14, cursor: "pointer", fontFamily: "var(--sans)", fontWeight: 800 };
}

function DrillBoard() {
  const sq = 60;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const pieces = {a8:"♜",d8:"♛",e8:"♚",h8:"♜",a7:"♟",f7:"♟",g7:"♟",h7:"♟",c6:"♞",d6:"♟",e5:"♟",g4:"♝",c4:"♙",c3:"♘",f3:"♘",a2:"♙",b2:"♙",f2:"♙",g2:"♙",h2:"♙",a1:"♖",c1:"♗",d1:"♕",e1:"♔",f1:"♗",h1:"♖"};
  const lastMove = ["g4","f3"]; // bishop took knight
  const files=["a","b","c","d","e","f","g","h"]; const ranks=[8,7,6,5,4,3,2,1];
  return (
    <div style={{ position: "relative", margin: "16px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 10, overflow: "hidden", border: "3px solid var(--ink)", boxShadow: "0 6px 0 var(--ink)" }}>
        {ranks.map(r => files.map(f => {
          const isDark = (files.indexOf(f) + r) % 2 === 0;
          const k = f+r;
          const isLast = lastMove.includes(k);
          let p = pieces[k];
          if (k === "f3") p = "♝"; // simulate capture
          if (k === "g4") p = "";
          return (
            <div key={k} style={{ width: sq, height: sq, background: isLast ? "rgba(88,204,2,0.5)" : (isDark?dark:light), display:"grid", placeItems:"center", fontSize: 42, color: ["♟","♜","♞","♛","♚","♝"].includes(p)?"var(--ink)":"white", position: "relative" }}>
              {p}
              {files.indexOf(f) === 0 && <span style={{ position: "absolute", top: 2, left: 3, fontSize: 9, fontFamily: "var(--mono)", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)", fontWeight: 700 }}>{r}</span>}
              {r === 1 && <span style={{ position: "absolute", bottom: 2, right: 4, fontSize: 9, fontFamily: "var(--mono)", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.4)", fontWeight: 700 }}>{f}</span>}
            </div>
          );
        }))}
      </div>
      {/* arrow overlay */}
      <svg style={{ position: "absolute", left: 3, top: 3, pointerEvents: "none" }} width={sq*8} height={sq*8}>
        <defs>
          <marker id="arrhead" markerWidth="10" markerHeight="10" refX="6" refY="5" orient="auto">
            <path d="M0,0 L8,5 L0,10 Z" fill="rgba(255,139,61,0.85)" />
          </marker>
        </defs>
        <line x1={sq*6 + sq/2} y1={sq*4 + sq/2} x2={sq*5 + sq/2} y2={sq*5 + sq/2} stroke="rgba(255,139,61,0.85)" strokeWidth="8" markerEnd="url(#arrhead)" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function ConceptTrack({ label, before, after, good }) {
  const dir = after - before;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 800 }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: good ? "var(--green-dark)" : "var(--ink-3)", fontWeight: 800 }}>{dir > 0 ? "+" : ""}{dir.toFixed(2)}</span>
      </div>
      <div style={{ position: "relative", height: 10, background: "var(--bg-2)", borderRadius: 5, border: "1.5px solid var(--line)" }}>
        <div style={{ position: "absolute", left: `${before*100}%`, top: -2, width: 3, height: 14, background: "var(--ink-3)", borderRadius: 1.5 }} />
        <div style={{ position: "absolute", left: `${Math.min(before, after)*100}%`, width: `${Math.abs(dir)*100}%`, top: 0, height: "100%", background: good ? "var(--green)" : "var(--orange)", opacity: 0.5 }} />
        <div style={{ position: "absolute", left: `${after*100}%`, top: -3, width: 8, height: 16, background: good ? "var(--green)" : "var(--orange)", borderRadius: 2, border: "2px solid white" }} />
      </div>
    </div>
  );
}

window.Drill = Drill;
