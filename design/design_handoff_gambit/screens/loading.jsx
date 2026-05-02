/* global React */
const { useState: useStateL, useEffect: useEffectL } = React;

function LoadingScreen() {
  const steps = [
    { label: "Fetching games", detail: "100 / 100 games loaded", done: true },
    { label: "Stockfish analysis", detail: "depth 18 · 6 workers", pct: 78, current: true },
    { label: "Concept inference", detail: "ONNX runtime · 187 dims", pct: 0 },
    { label: "Clustering weaknesses", detail: "HDBSCAN", pct: 0 },
  ];
  return (
    <div style={{ width: 1280, height: 820, background: "var(--bg)", fontFamily: "var(--sans)", padding: 56, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green)", display: "grid", placeItems: "center", color: "white", fontWeight: 900, fontSize: 18, boxShadow: "0 3px 0 var(--green-dark)" }}>♞</div>
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>gambit</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 56, alignItems: "start" }}>
        {/* left: steps */}
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>Analyzing</div>
          <h1 style={{ fontSize: 56, fontWeight: 900, letterSpacing: -1.5, margin: "8px 0 24px", lineHeight: 1 }}>
            magnus_fan_42<span style={{ color: "var(--ink-3)", fontWeight: 700 }}> · 1842 elo</span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map((s, i) => (
              <Step key={i} {...s} />
            ))}
          </div>

          {/* live log */}
          <div style={{ marginTop: 28, background: "var(--ink)", borderRadius: 16, padding: 18, fontFamily: "var(--mono)", fontSize: 12, color: "#A8D88A", lineHeight: 1.7, height: 180, overflow: "hidden" }}>
            <div style={{ color: "#7FA650" }}>$ stockfish.wasm worker[3]</div>
            <div>game_78.pgn  move 14  Nf6→Nd7  cpl=243  <span style={{ color: "#FF8B3D" }}>BLUNDER</span></div>
            <div>game_78.pgn  move 22  Bc4→Bb3  cpl=87   <span style={{ color: "#FFD23F" }}>inaccuracy</span></div>
            <div>game_79.pgn  move 11  e4→e5    cpl=12   ok</div>
            <div>game_79.pgn  move 19  Qd2→Qe2  cpl=158  <span style={{ color: "#FF6B6B" }}>mistake</span></div>
            <div style={{ color: "#9CA3AF" }}>↳ concept_diff: trapped_piece(+0.81), king_safety(-0.12)…</div>
            <div>game_80.pgn  move 8   c4→c3    cpl=34   ok</div>
            <div style={{ color: "#7FA650" }}>$ batch 78–82 done · 23s · 4 mistakes flagged_</div>
          </div>
        </div>

        {/* right: live preview */}
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Live preview</div>
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>game 78 / 100</div>
              <div style={{ display: "flex", gap: 6 }}>
                <Tag color="var(--orange)" text="blunder" />
              </div>
            </div>
            <MiniBoard highlight="d7" arrow="f6→d7" />
            <div style={{ marginTop: 14, fontSize: 13, fontFamily: "var(--mono)", color: "var(--ink-2)" }}>
              23. … <b style={{ color: "var(--orange-dark)" }}>Nd7?</b>  <span style={{ color: "var(--ink-3)" }}>(best: Bxf3)</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 13, fontFamily: "var(--mono)", color: "var(--ink-2)" }}>
              eval  <b>+0.4</b>  →  <b style={{ color: "var(--orange-dark)" }}>−2.4</b>
            </div>

            {/* concept dots */}
            <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", borderRadius: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>What you missed</div>
              <ConceptBar label="trapped piece" v={0.81} color="var(--orange)" />
              <ConceptBar label="bishop activity" v={0.63} color="var(--purple)" />
              <ConceptBar label="weak dark squares" v={0.41} color="var(--blue)" />
            </div>
          </div>

          <div style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)", fontWeight: 600, textAlign: "center" }}>
            Estimated time remaining · <b style={{ color: "var(--ink)" }}>1m 42s</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({ label, detail, done, current, pct = 0 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: 16, background: current ? "white" : "transparent", border: current ? "2.5px solid var(--green)" : "2px solid var(--line)", borderRadius: 14, boxShadow: current ? "0 4px 0 var(--green-dark)" : "none" }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: done ? "var(--green)" : current ? "#E8F8E5" : "var(--bg-2)", display: "grid", placeItems: "center", color: done ? "white" : "var(--ink-3)", fontWeight: 900, flexShrink: 0 }}>
        {done ? "✓" : current ? <Spinner /> : "•"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: done || current ? "var(--ink)" : "var(--ink-3)" }}>{label}</div>
        <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 2 }}>{detail}</div>
        {current && (
          <div style={{ marginTop: 8, height: 8, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--green)" }} />
          </div>
        )}
      </div>
      {done && <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--green-dark)", fontWeight: 800 }}>done</div>}
      {current && <div style={{ fontSize: 14, fontFamily: "var(--mono)", color: "var(--green-dark)", fontWeight: 900 }}>{pct}%</div>}
    </div>
  );
}

function Spinner() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <circle cx="9" cy="9" r="7" fill="none" stroke="var(--green)" strokeWidth="2.5" strokeDasharray="22 50" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 9 9" to="360 9 9" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function Tag({ color, text }) {
  return <span style={{ background: color, color: "white", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>{text}</span>;
}

function ConceptBar({ label, v, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ width: 130, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{label}</div>
      <div style={{ flex: 1, height: 8, background: "white", borderRadius: 4, overflow: "hidden", border: "1px solid var(--line)" }}>
        <div style={{ width: `${v*100}%`, height: "100%", background: color }} />
      </div>
      <div style={{ width: 32, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", textAlign: "right" }}>{v.toFixed(2)}</div>
    </div>
  );
}

function MiniBoard({ highlight, arrow }) {
  const sq = 38;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const pieces = {a8:"♜",b8:"",c8:"",d8:"♛",e8:"♚",f8:"",g8:"",h8:"♜",a7:"♟",b7:"",c7:"",d7:"♞",e7:"",f7:"♟",g7:"♟",h7:"♟",a6:"",b6:"",c6:"♞",d6:"♟",e6:"",f6:"",g6:"",h6:"",a5:"",b5:"",c5:"",d5:"",e5:"♟",f5:"♝",g5:"",h5:"",a4:"",b4:"",c4:"♙",d4:"",e4:"",f4:"",g4:"",h4:"",a3:"",b3:"",c3:"♘",d3:"",e3:"",f3:"♘",g3:"",h3:"",a2:"♙",b2:"♙",c2:"",d2:"",e2:"",f2:"♙",g2:"♙",h2:"♙",a1:"♖",b1:"",c1:"♗",d1:"♕",e1:"♔",f1:"♗",g1:"",h1:"♖"};
  const files=["a","b","c","d","e","f","g","h"]; const ranks=[8,7,6,5,4,3,2,1];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 8, overflow: "hidden", border: "2px solid var(--ink)", width: sq*8 }}>
      {ranks.map(r => files.map(f => {
        const isDark = (files.indexOf(f) + r) % 2 === 0;
        const k = f+r; const hl = k===highlight;
        return <div key={k} style={{ width: sq, height: sq, background: hl ? "#FF8B3D" : (isDark?dark:light), display:"grid", placeItems:"center", fontSize: 26, color: ["♟","♜","♞","♛","♚","♝"].includes(pieces[k])?"var(--ink)":"white" }}>{pieces[k]}</div>;
      }))}
    </div>
  );
}

window.LoadingScreen = LoadingScreen;
