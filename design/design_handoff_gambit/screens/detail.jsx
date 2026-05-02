/* global React */
function Detail() {
  return (
    <div style={{ width: 1280, height: 920, background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px" }}>
      {/* breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: "var(--ink-3)" }}>
        <span>Weaknesses</span><span>›</span><span style={{ color: "var(--ink)" }}>#1 Trapped pieces in the middlegame</span>
      </div>

      {/* header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "end", marginTop: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ background: "var(--orange)", color: "white", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 3px 0 var(--orange-dark)" }}>weakness #1</div>
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>cluster_id: c.0a3f · last_updated: 2h ago</div>
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "8px 0 4px", lineHeight: 1.05 }}>Trapped pieces in the middlegame</h1>
          <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: 720, lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
            Across 18 of your last 100 games, your knights wander into squares with no escape squares. The pattern: you push for activity in positions that have already crystallized. The fix is prophylactic — count escape squares <i>before</i> you commit.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ background: "var(--orange)", color: "white", border: "none", padding: "16px 26px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--orange-dark)", cursor: "pointer" }}>Start drilling</button>
          <button style={{ background: "white", border: "2px solid var(--line)", padding: "14px 22px", borderRadius: 14, fontWeight: 800, fontSize: 13, fontFamily: "var(--sans)", cursor: "pointer" }}>Export PGN</button>
        </div>
      </div>

      {/* main grid */}
      <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
        {/* Featured position w/ heatmap */}
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Representative position · centroid</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>vs. PolarBear_77 · move 23 · Mar 14</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>1/5</span>
              <button style={navBtn()}>‹</button>
              <button style={navBtn()}>›</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18 }}>
            <BoardWithHeat />
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <Toggle active>Heatmap: trap risk</Toggle>
                <Toggle>Eval</Toggle>
                <Toggle>Mobility</Toggle>
              </div>
              <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: 14, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7 }}>
                <div style={{ color: "var(--ink-3)" }}># your move</div>
                <div>23. ... <b style={{ color: "var(--orange-dark)" }}>Nd7??</b>  <span style={{ color: "var(--ink-3)" }}>cpl 243</span></div>
                <div style={{ color: "var(--ink-3)", marginTop: 8 }}># engine line</div>
                <div>23. ... <b style={{ color: "var(--green-dark)" }}>Bxf3</b> 24. gxf3 Nh5 25. Kh1 Qg5</div>
                <div style={{ marginTop: 6 }}>eval +0.4 → −2.4</div>
              </div>

              <div style={{ marginTop: 14, padding: 14, background: "#FFF4E5", border: "2px solid var(--orange)", borderRadius: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--orange)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0 }}>!</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "var(--orange-dark)", letterSpacing: 0.4, textTransform: "uppercase" }}>What you missed</div>
                    <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 4, lineHeight: 1.5, fontWeight: 500 }}>The d7 square has only one escape (b8) covered by your own pieces. After 24.Bg5 your knight is trapped — Stockfish saw this 4 plies deep.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* concept activations — novel viz */}
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Concept activation diff</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2, marginBottom: 14 }}>What separates your move from the engine's</div>

          <ConceptDiffViz />

          <div style={{ marginTop: 14, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", lineHeight: 1.6 }}>
            distilled from LC0 BT4 · layer 11 · 187 dims<br />
            shown: top 8 dims by |Δactivation|
          </div>
        </div>
      </div>

      {/* gallery of all positions in cluster */}
      <div style={{ marginTop: 20, background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>All 18 positions in this cluster</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>Sorted by similarity to centroid</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Toggle active>Cluster view</Toggle>
            <Toggle>List</Toggle>
            <Toggle>UMAP</Toggle>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
          {Array.from({length: 6}).map((_,i) => <ClusterMember key={i} idx={i} />)}
        </div>
      </div>
    </div>
  );
}

function navBtn() {
  return { width: 32, height: 32, borderRadius: 10, border: "2px solid var(--line)", background: "white", fontWeight: 900, fontSize: 16, cursor: "pointer", fontFamily: "var(--sans)" };
}
function Toggle({ children, active }) {
  return <div style={{ padding: "6px 12px", borderRadius: 10, fontSize: 11, fontWeight: 800, background: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink-2)", border: "2px solid " + (active ? "var(--ink)" : "var(--line)"), cursor: "pointer", letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</div>;
}

function BoardWithHeat() {
  const sq = 44;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const pieces = {a8:"♜",d8:"♛",e8:"♚",h8:"♜",a7:"♟",f7:"♟",g7:"♟",h7:"♟",c6:"♞",d6:"♟",e5:"♟",d7:"♞",c4:"♙",c3:"♘",f3:"♘",a2:"♙",b2:"♙",f2:"♙",g2:"♙",h2:"♙",a1:"♖",c1:"♗",d1:"♕",e1:"♔",f1:"♗",h1:"♖"};
  // heat: trap risk per square (red = bad for player's knight at d7)
  const heat = { d7: 0.95, b8: 0.6, f6: 0.4, e5: 0.5, c5: 0.3, b6: 0.35, e7: 0.2 };
  const files=["a","b","c","d","e","f","g","h"]; const ranks=[8,7,6,5,4,3,2,1];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--mono)", marginBottom: 4, color: "var(--ink-3)" }}>
        <span>polarbear_77 (1873)</span><span>0:42</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 8, overflow: "hidden", border: "2px solid var(--ink)", width: sq*8, position: "relative" }}>
        {ranks.map(r => files.map(f => {
          const isDark = (files.indexOf(f) + r) % 2 === 0;
          const k = f+r; const h = heat[k] || 0;
          const isPiece = !!pieces[k];
          return (
            <div key={k} style={{ width: sq, height: sq, background: isDark?dark:light, display:"grid", placeItems:"center", fontSize: 28, color: ["♟","♜","♞","♛","♚","♝"].includes(pieces[k])?"var(--ink)":"white", position: "relative" }}>
              {h > 0 && <div style={{ position: "absolute", inset: 4, background: `rgba(255, 86, 48, ${h})`, borderRadius: 6, border: h > 0.7 ? "2px solid #B23A1C" : "none" }} />}
              <span style={{ position: "relative", zIndex: 1 }}>{pieces[k] || ""}</span>
              {k === "d7" && isPiece && <div style={{ position: "absolute", top: 2, right: 3, zIndex: 2, fontSize: 9, fontWeight: 900, color: "white", background: "#B23A1C", padding: "1px 4px", borderRadius: 4, fontFamily: "var(--mono)" }}>TRAP</div>}
            </div>
          );
        }))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--mono)", marginTop: 4, color: "var(--ink-3)" }}>
        <span>magnus_fan_42 (1842)</span><span>1:08</span>
      </div>
      {/* heat legend */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", textTransform: "uppercase" }}>trap risk</span>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: "linear-gradient(90deg, transparent, rgba(255,86,48,0.3), rgba(255,86,48,0.95))" }} />
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>0 → 1</span>
      </div>
    </div>
  );
}

function ConceptDiffViz() {
  // Novel viz: divergent bars showing where the played move OVER-activated vs UNDER-activated concepts
  // Center axis = 0; bars push left (your move emphasized) or right (engine move emphasized)
  const dims = [
    { name: "trapped_piece_risk",      you: -0.81, engine: +0.18, hot: true },
    { name: "knight_mobility",         you: -0.63, engine: +0.51 },
    { name: "central_pawn_tension",    you: +0.34, engine: -0.22 },
    { name: "f3-bishop_pressure",      you: -0.42, engine: +0.71, hot: true },
    { name: "kingside_pawn_storm_prep", you: +0.29, engine: -0.18 },
    { name: "back_rank_mating_net",    you: -0.39, engine: +0.44 },
    { name: "queenside_majority",      you: +0.18, engine: +0.21 },
    { name: "tempo_initiative",        you: -0.55, engine: +0.62, hot: true },
  ];
  const W = 360;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        <span style={{ color: "var(--orange-dark)" }}>← your move (Nd7)</span>
        <span>concept</span>
        <span style={{ color: "var(--green-dark)" }}>engine (Bxf3) →</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "var(--ink)", transform: "translateX(-1px)" }} />
        {dims.map((d,i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: `${W/2}px 1fr ${W/2}px`, alignItems: "center", height: 26, marginBottom: 4 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {d.you < 0 && (
                <div style={{ width: `${Math.abs(d.you)*100}%`, height: 14, background: d.hot ? "var(--orange)" : "rgba(255,139,61,0.5)", borderRadius: "4px 0 0 4px", border: d.hot ? "2px solid var(--orange-dark)" : "none", borderRight: "none" }} />
              )}
            </div>
            <div style={{ textAlign: "center", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, color: d.hot ? "var(--ink)" : "var(--ink-2)", padding: "0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {d.hot && <span style={{ color: "var(--orange-dark)", marginRight: 4 }}>●</span>}
              {d.name}
            </div>
            <div style={{ display: "flex" }}>
              {d.engine > 0 && (
                <div style={{ width: `${d.engine*100}%`, height: 14, background: d.hot ? "var(--green)" : "rgba(88,204,2,0.5)", borderRadius: "0 4px 4px 0", border: d.hot ? "2px solid var(--green-dark)" : "none", borderLeft: "none" }} />
              )}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, padding: 12, background: "var(--bg-2)", borderRadius: 10, fontSize: 12, color: "var(--ink-2)", fontWeight: 500, lineHeight: 1.5 }}>
        <b style={{ color: "var(--ink)" }}>Reading this:</b> the bigger the gap, the more the engine's move <i>activates</i> a concept your move ignored. Three "hot" dims dominate this position: trap risk, f3-bishop pressure, and tempo.
      </div>
    </div>
  );
}

function ClusterMember({ idx }) {
  const opps = ["polarbear_77","queens_gambit_dec","najdorf_jr","tactical_tim","endgame_eli","blitz_bandit"];
  const sq = 18;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const files=["a","b","c","d","e","f","g","h"]; const ranks=[8,7,6,5,4,3,2,1];
  const samplePieces = { c5: "♞", e7: "♚", g8: "♚", a3: "♙", b4: "♙", d6: "♟" };
  const hl = ["c5","b6","d6"];
  return (
    <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: 12, border: "2px solid var(--line)", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>vs {opps[idx]}</div>
        <div style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>sim {(0.96 - idx*0.04).toFixed(2)}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 4, overflow: "hidden", border: "1.5px solid var(--ink)", width: sq*8, margin: "0 auto" }}>
        {ranks.map(r => files.map(f => {
          const isDark = (files.indexOf(f) + r) % 2 === 0;
          const k = f+r; const h = hl.includes(k);
          return <div key={k} style={{ width: sq, height: sq, background: h ? "var(--orange)" : (isDark?dark:light), display:"grid", placeItems:"center", fontSize: 13, color: ["♟","♜","♞","♛","♚","♝"].includes(samplePieces[k])?"var(--ink)":"white" }}>{samplePieces[k] || ""}</div>;
        }))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, fontFamily: "var(--mono)" }}>
        <span style={{ color: "var(--orange-dark)", fontWeight: 800 }}>cpl {220 - idx*15}</span>
        <span style={{ color: "var(--ink-3)" }}>m{18 + idx*2}</span>
      </div>
    </div>
  );
}

window.Detail = Detail;
