/* global React */
function GameReview() {
  const moves = [
    { n: 1, w: "e4", b: "c5", we: 0.3, be: 0.3 },
    { n: 2, w: "Nf3", b: "d6", we: 0.4, be: 0.4 },
    { n: 3, w: "d4", b: "cxd4", we: 0.4, be: 0.5 },
    { n: 4, w: "Nxd4", b: "Nf6", we: 0.5, be: 0.5 },
    { n: 5, w: "Nc3", b: "a6", we: 0.5, be: 0.4, theory: true },
    { n: 6, w: "Be3", b: "e5", we: 0.5, be: 0.4, theory: true },
    { n: 7, w: "Nb3", b: "Be7", we: 0.5, be: 0.2, mark: "?!" },
    { n: 8, w: "f3", b: "O-O", we: 0.6, be: 0.3 },
    { n: 9, w: "Qd2", b: "Be6", we: 0.6, be: 0.4 },
    { n: 10, w: "O-O-O", b: "Nbd7", we: 0.7, be: 0.5 },
    { n: 11, w: "g4", b: "b5", we: 0.7, be: 0.6 },
    { n: 12, w: "g5", b: "Nh5", we: 0.8, be: 0.5 },
    { n: 13, w: "Nd5", b: "Bxd5", we: 0.8, be: 0.4 },
    { n: 14, w: "exd5", b: "Nb6", we: 0.7, be: 0.4 },
    { n: 15, w: "Na5", b: "Rc8", we: 0.7, be: 0.5 },
    { n: 16, w: "Bd3", b: "Qd7", we: 0.6, be: 0.6 },
    { n: 17, w: "Kb1", b: "Nf4", we: 0.5, be: 0.7 },
    { n: 18, w: "Bxf4", b: "exf4", we: 0.4, be: 0.8 },
    { n: 19, w: "Qxf4", b: "Bd8", we: 0.4, be: 0.9 },
    { n: 20, w: "Rhg1", b: "Bxa5", we: 0.3, be: 1.1 },
    { n: 21, w: "Re1", b: "Bg4", we: 0.2, be: 1.2 },
    { n: 22, w: "h3", b: "Bh5", we: 0.3, be: 1.0 },
    { n: 23, w: "Bg5", b: "Nd7", we: 1.4, be: -2.4, mark: "??", current: true },
    { n: 24, w: "Bh6", b: "Bg6", we: 2.1, be: -3.0 },
    { n: 25, w: "Bxg7", b: "Kxg7", we: 2.0, be: -2.4 },
  ];

  return (
    <div style={{ width: 1280, height: 980, background: "var(--bg)", fontFamily: "var(--sans)", padding: "20px 32px", display: "grid", gridTemplateColumns: "1fr 380px", gap: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* game header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Game review · rapid 10+0 · Mar 14</div>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, margin: "4px 0 0" }}>magnus_fan_42 <span style={{ color: "var(--ink-3)" }}>vs</span> polarbear_77</h1>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ background: "white", border: "2px solid var(--line)", padding: "10px 16px", borderRadius: 12, fontWeight: 800, fontSize: 12, fontFamily: "var(--sans)", cursor: "pointer" }}>← prev game</button>
            <button style={{ background: "white", border: "2px solid var(--line)", padding: "10px 16px", borderRadius: 12, fontWeight: 800, fontSize: 12, fontFamily: "var(--sans)", cursor: "pointer" }}>next game →</button>
          </div>
        </div>

        {/* eval bar + board */}
        <div style={{ display: "grid", gridTemplateColumns: "32px 1fr", gap: 14 }}>
          <EvalBar moves={moves} />
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 18, boxShadow: "0 6px 0 var(--ink)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <PlayerStrip name="polarbear_77" elo={1873} time="0:42" black />
              <div style={{ display: "flex", gap: 6 }}>
                <Tag c="var(--orange)" t="blunder · move 23" />
              </div>
            </div>
            <ReviewBoard />
            <PlayerStrip name="magnus_fan_42" elo={1842} time="1:08" />

            {/* annotation */}
            <div style={{ marginTop: 14, padding: 14, background: "#FFF4E5", border: "2px solid var(--orange)", borderRadius: 12, display: "flex", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--orange)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 18, flexShrink: 0, boxShadow: "0 3px 0 var(--orange-dark)" }}>??</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 900, color: "var(--orange-dark)", letterSpacing: 0.3, textTransform: "uppercase" }}>Move 23 · Nd7 — blunder · cpl 243</div>
                <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5, fontWeight: 500 }}>
                  This is the centroid position of your <b style={{ color: "var(--orange-dark)" }}>"trapped pieces"</b> weakness. Engine wants <b>Bxf3</b> — trade the bishop, free your knight. Instead Nd7 walks into Bg5 and the knight has no squares.
                </div>
                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <SmallBtn>↻ Try this position</SmallBtn>
                  <SmallBtn>+ Add to drill set</SmallBtn>
                  <SmallBtn>📤 Share annotation</SmallBtn>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* move list */}
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 16, padding: 14, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>Moves · click to scrub</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, fontFamily: "var(--mono)", fontSize: 11 }}>
            {moves.map(m => (
              <div key={m.n} style={{ background: m.current ? "#FFE4D0" : "transparent", border: m.current ? "1.5px solid var(--orange)" : "1.5px solid transparent", borderRadius: 6, padding: "3px 6px", display: "flex", justifyContent: "space-between", cursor: "pointer" }}>
                <span style={{ color: "var(--ink-3)" }}>{m.n}.</span>
                <span style={{ fontWeight: 700, color: m.theory ? "var(--blue)" : "var(--ink)" }}>{m.w}</span>
                <span style={{ fontWeight: 700, color: m.mark === "??" ? "var(--orange-dark)" : m.mark === "?!" ? "var(--yellow-dark)" : m.theory ? "var(--blue)" : "var(--ink)" }}>{m.b}{m.mark || ""}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* right: timeline + concept overlay */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Eval over time</div>
          <EvalTimeline moves={moves} />
          <div style={{ display: "flex", gap: 4, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 4 }}>
            <span>opening</span><span style={{ flex: 1, borderTop: "1px dashed var(--line)", marginTop: 8 }} /><span>middlegame</span>
          </div>
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Mistakes in this game</div>
          <MistakeRow severity="blunder" move="23 ... Nd7" cpl={243} concept="trapped piece" color="var(--orange)" />
          <MistakeRow severity="inaccuracy" move="20 ... Bxa5" cpl={87} concept="piece coordination" color="var(--purple)" />
          <MistakeRow severity="inaccuracy" move="7 ... Be7" cpl={62} concept="opening theory" color="var(--blue)" />
        </div>

        <div style={{ background: "var(--ink)", color: "white", borderRadius: 18, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Concept activation · move 23</div>
          <MiniConceptList />
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Accuracy</div>
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>this game</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 6 }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: "var(--orange)", letterSpacing: -0.8 }}>71%</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase" }}>you</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 32, fontWeight: 900, color: "var(--green-dark)", letterSpacing: -0.8 }}>89%</div>
              <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase" }}>opponent</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlayerStrip({ name, elo, time, black }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: black ? "var(--ink)" : "white", border: "2px solid var(--ink)" }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 900 }}>{name}</div>
          <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{elo}</div>
        </div>
      </div>
      <div style={{ background: "var(--bg-2)", padding: "5px 10px", borderRadius: 8, fontSize: 14, fontFamily: "var(--mono)", fontWeight: 800 }}>{time}</div>
    </div>
  );
}
function Tag({ c, t }) { return <span style={{ background: c, color: "white", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>{t}</span>; }
function SmallBtn({ children }) { return <button style={{ background: "white", border: "2px solid var(--line)", padding: "6px 12px", borderRadius: 8, fontFamily: "var(--sans)", fontWeight: 800, fontSize: 11, cursor: "pointer" }}>{children}</button>; }

function EvalBar({ moves }) {
  // vertical eval bar showing current eval
  return (
    <div style={{ position: "relative", width: 32, background: "var(--ink)", border: "3px solid var(--ink)", borderRadius: 10, overflow: "hidden", height: 480 }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "78%", background: "white" }} />
      <div style={{ position: "absolute", top: "78%", left: 0, right: 0, height: 2, background: "var(--orange)" }} />
      <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "var(--ink-3)", opacity: 0.3 }} />
      <div style={{ position: "absolute", bottom: 6, left: 0, right: 0, color: "white", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 800, textAlign: "center" }}>−2.4</div>
      <div style={{ position: "absolute", top: 6, left: 0, right: 0, color: "var(--ink)", fontSize: 10, fontFamily: "var(--mono)", fontWeight: 800, textAlign: "center" }}>+0.4</div>
    </div>
  );
}

function ReviewBoard() {
  const sq = 50;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const pieces = {a8:"♜",d8:"♛",e8:"♚",h8:"♜",a7:"♟",f7:"♟",g7:"♟",h7:"♟",c6:"♞",d6:"♟",e5:"♟",d7:"♞",c4:"♙",c3:"♘",f3:"♘",a2:"♙",b2:"♙",f2:"♙",g2:"♙",h2:"♙",a1:"♖",c1:"♗",d1:"♕",e1:"♔",f1:"♗",g5:"♗",h1:"♖"};
  const files=["a","b","c","d","e","f","g","h"]; const ranks=[8,7,6,5,4,3,2,1];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 8, overflow: "hidden", border: "2px solid var(--ink)", margin: "10px auto", width: sq*8 }}>
      {ranks.map(r => files.map(f => {
        const isDark = (files.indexOf(f) + r) % 2 === 0;
        const k = f+r;
        const last = k === "g5" || k === "g1";
        const blunder = k === "d7";
        return (
          <div key={k} style={{ width: sq, height: sq, background: blunder ? "rgba(255,86,48,0.55)" : last ? "rgba(255,210,63,0.45)" : (isDark?dark:light), display:"grid", placeItems:"center", fontSize: 36, color: ["♟","♜","♞","♛","♚","♝"].includes(pieces[k])?"var(--ink)":"white", position: "relative" }}>
            {pieces[k]||""}
            {blunder && <div style={{ position: "absolute", top: 2, right: 3, fontSize: 9, fontWeight: 900, color: "white", background: "var(--orange-dark)", padding: "1px 4px", borderRadius: 3, fontFamily: "var(--mono)" }}>??</div>}
          </div>
        );
      }))}
    </div>
  );
}

function EvalTimeline({ moves }) {
  const W = 320, H = 110;
  const max = 3, min = -3;
  const pts = moves.map((m,i) => {
    const v = (m.we - m.be); // approximation
    const y = H/2 - (Math.max(min, Math.min(max, v))/max) * (H/2 - 6);
    const x = (i/(moves.length-1)) * W;
    return [x,y];
  });
  const path = "M " + pts.map(p => p.join(",")).join(" L ");
  const blunderIdx = moves.findIndex(m => m.mark === "??");
  return (
    <svg width={W} height={H} style={{ marginTop: 8 }}>
      <line x1={0} x2={W} y1={H/2} y2={H/2} stroke="var(--line)" strokeDasharray="3 4" />
      <path d={path + ` L ${W},${H} L 0,${H} Z`} fill="rgba(27,39,48,0.08)" />
      <path d={path} fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinejoin="round" />
      {blunderIdx >= 0 && (
        <g>
          <circle cx={pts[blunderIdx][0]} cy={pts[blunderIdx][1]} r="6" fill="var(--orange)" stroke="white" strokeWidth="2.5" />
          <text x={pts[blunderIdx][0]} y={pts[blunderIdx][1] - 12} textAnchor="middle" fontSize="10" fontWeight="900" fill="var(--orange-dark)" fontFamily="var(--mono)">??</text>
        </g>
      )}
    </svg>
  );
}

function MistakeRow({ severity, move, cpl, concept, color }) {
  const sevColor = { blunder: "var(--orange)", mistake: "var(--red)", inaccuracy: "var(--yellow-dark)" }[severity];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 8, padding: "8px 0", borderBottom: "1px dashed var(--line)", alignItems: "center" }}>
      <div style={{ background: sevColor, color: "white", padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.5 }}>{severity[0]}</div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--mono)" }}>{move}</div>
        <div style={{ fontSize: 10, color: "var(--ink-3)", fontWeight: 700, marginTop: 1 }}><span style={{ color }}>●</span> {concept}</div>
      </div>
      <div style={{ fontSize: 12, fontFamily: "var(--mono)", fontWeight: 800, color: sevColor }}>{cpl}cpl</div>
    </div>
  );
}

function MiniConceptList() {
  const items = [
    { l: "trapped_piece", v: -0.81, hot: true },
    { l: "f3_bishop_pressure", v: -0.71, hot: true },
    { l: "tempo_initiative", v: -0.62, hot: true },
    { l: "knight_mobility", v: -0.51 },
    { l: "back_rank_motif", v: -0.39 },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map(it => (
        <div key={it.l} style={{ display: "grid", gridTemplateColumns: "1fr 80px auto", gap: 8, alignItems: "center", fontFamily: "var(--mono)", fontSize: 11 }}>
          <span style={{ color: it.hot ? "white" : "rgba(255,255,255,0.6)" }}>{it.hot && <span style={{ color: "#FF8B3D" }}>● </span>}{it.l}</span>
          <div style={{ height: 5, background: "rgba(255,255,255,0.15)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${Math.abs(it.v)*100}%`, height: "100%", background: it.hot ? "var(--orange)" : "rgba(255,255,255,0.5)" }} />
          </div>
          <span style={{ color: it.hot ? "var(--orange)" : "rgba(255,255,255,0.5)" }}>{it.v.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}

window.GameReview = GameReview;
