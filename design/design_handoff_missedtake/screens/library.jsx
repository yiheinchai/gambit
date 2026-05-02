/* global React */
function ConceptLibrary() {
  const families = [
    { name: "Tactical motifs", count: 32, color: "var(--orange)", concepts: [
      { name: "Knight fork", you: 0.72, mastery: "improving", drilled: 84, k: "fork" },
      { name: "Absolute pin", you: 0.81, mastery: "mastered", drilled: 62, k: "pin" },
      { name: "Skewer", you: 0.66, mastery: "improving", drilled: 41, k: "skewer" },
      { name: "Discovered attack", you: 0.43, mastery: "weak", drilled: 12, k: "disc" },
      { name: "Back-rank threat", you: 0.58, mastery: "improving", drilled: 28 },
      { name: "Overloaded defender", you: 0.39, mastery: "weak", drilled: 8 },
      { name: "Deflection", you: 0.51, mastery: "active", drilled: 19 },
      { name: "Zwischenzug", you: 0.34, mastery: "weak", drilled: 6 },
      { name: "Removal of the guard", you: 0.62, mastery: "improving", drilled: 22 },
      { name: "Trapped piece", you: 0.28, mastery: "weak", drilled: 4, hot: true },
      { name: "Hanging piece", you: 0.84, mastery: "mastered", drilled: 91 },
      { name: "Double check", you: 0.55, mastery: "active", drilled: 15 }
    ]},
    { name: "Strategic patterns", count: 31, color: "var(--purple)", concepts: [
      { name: "Outpost (knight)", you: 0.61, mastery: "active", drilled: 31 },
      { name: "Good vs bad bishop", you: 0.34, mastery: "weak", drilled: 9, hot: true },
      { name: "Open file control", you: 0.72, mastery: "improving", drilled: 44 },
      { name: "Weak square complex", you: 0.48, mastery: "active", drilled: 21 },
      { name: "Isolated pawn", you: 0.66, mastery: "improving", drilled: 38 },
      { name: "Passed pawn technique", you: 0.71, mastery: "improving", drilled: 27 },
      { name: "Space advantage", you: 0.55, mastery: "active", drilled: 18 },
      { name: "Minority attack", you: 0.42, mastery: "weak", drilled: 11 },
      { name: "Pawn break timing", you: 0.46, mastery: "active", drilled: 14 },
      { name: "Prophylaxis", you: 0.31, mastery: "weak", drilled: 7, hot: true }
    ]},
    { name: "Endgame technique", count: 19, color: "var(--blue)", concepts: [
      { name: "Lucena position", you: 0.78, mastery: "mastered", drilled: 24 },
      { name: "Philidor defense", you: 0.81, mastery: "mastered", drilled: 31 },
      { name: "Opposition (K+P)", you: 0.74, mastery: "improving", drilled: 42 },
      { name: "Key squares", you: 0.66, mastery: "improving", drilled: 28 },
      { name: "Active rook", you: 0.52, mastery: "active", drilled: 17 },
      { name: "Fortress recognition", you: 0.38, mastery: "weak", drilled: 6 },
      { name: "Zugzwang", you: 0.44, mastery: "active", drilled: 12 }
    ]},
    { name: "King safety", count: 14, color: "var(--red)", concepts: [
      { name: "Pawn shield integrity", you: 0.41, mastery: "weak", drilled: 9, hot: true },
      { name: "h-file vulnerability", you: 0.36, mastery: "weak", drilled: 5 },
      { name: "Castled vs uncastled", you: 0.68, mastery: "improving", drilled: 33 },
      { name: "Open diagonal threat", you: 0.55, mastery: "active", drilled: 19 },
      { name: "Greek gift sacrifice", you: 0.49, mastery: "active", drilled: 13 }
    ]},
  ];
  const [active, setActive] = React.useState("Trapped piece");

  return (
    <div style={{ width: 1280, height: 1100, background: "var(--bg)", fontFamily: "var(--sans)", padding: "20px 40px" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Concept library · 187 dimensions</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "6px 0 0", lineHeight: 1.05 }}>Every chess idea, mapped.</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SearchBox />
          <ChipBtn active>All</ChipBtn>
          <ChipBtn>Weak only</ChipBtn>
          <ChipBtn>Hot</ChipBtn>
        </div>
      </div>

      {/* mastery summary band */}
      <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 6px 0 var(--ink)", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 18, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Your mastery</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4, letterSpacing: -0.5 }}>62 / 187 concepts</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 4 }}>11 mastered · 24 improving · 19 active · 8 weak</div>
        </div>
        <div style={{ height: 28, borderRadius: 8, overflow: "hidden", display: "flex", border: "2px solid var(--ink)" }}>
          <div style={{ width: "11%", background: "var(--green)", display: "grid", placeItems: "center", color: "white", fontSize: 10, fontWeight: 900, letterSpacing: 0.5 }}>11</div>
          <div style={{ width: "24%", background: "#A8D88A", display: "grid", placeItems: "center", color: "var(--ink)", fontSize: 10, fontWeight: 900 }}>24</div>
          <div style={{ width: "19%", background: "var(--yellow)", display: "grid", placeItems: "center", color: "var(--ink)", fontSize: 10, fontWeight: 900 }}>19</div>
          <div style={{ width: "8%", background: "var(--orange)", display: "grid", placeItems: "center", color: "white", fontSize: 10, fontWeight: 900 }}>8</div>
          <div style={{ flex: 1, background: "var(--bg-2)", display: "grid", placeItems: "center", color: "var(--ink-3)", fontSize: 10, fontWeight: 900 }}>125 unseen</div>
        </div>
      </div>

      {/* main grid: families list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {families.map(fam => (
            <div key={fam.name} style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 18, boxShadow: "0 6px 0 var(--ink)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 4, background: fam.color }} />
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{fam.name}</div>
                  <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{fam.concepts.length}/{fam.count}</div>
                </div>
                <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>tap to expand</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                {fam.concepts.map(c => (
                  <ConceptTile key={c.name} c={c} color={fam.color} active={active === c.name} onClick={() => setActive(c.name)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* concept detail panel */}
        <div style={{ position: "sticky", top: 20, alignSelf: "start" }}>
          <ConceptDetail name={active} />
        </div>
      </div>
    </div>
  );
}

function SearchBox() {
  return (
    <div style={{ background: "white", border: "2px solid var(--line)", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, width: 220 }}>
      <span style={{ color: "var(--ink-3)", fontSize: 14 }}>⌕</span>
      <input placeholder="search concepts" style={{ border: "none", outline: "none", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, flex: 1, background: "transparent" }} />
      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", padding: "1px 5px", border: "1px solid var(--line)", borderRadius: 4 }}>⌘K</span>
    </div>
  );
}
function ChipBtn({ children, active }) {
  return <div style={{ padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 800, background: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink-2)", border: "2px solid " + (active ? "var(--ink)" : "var(--line)"), cursor: "pointer" }}>{children}</div>;
}

function ConceptTile({ c, color, active, onClick }) {
  const masteryBg = { mastered: "var(--green)", improving: "#A8D88A", active: "var(--yellow)", weak: "var(--orange)" }[c.mastery];
  const isHot = c.hot;
  return (
    <div onClick={onClick} style={{ background: active ? "var(--bg-2)" : "white", border: active ? `2.5px solid ${color}` : isHot ? `2px dashed ${color}` : "2px solid var(--line)", borderRadius: 10, padding: 10, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, position: "relative", boxShadow: active ? `0 3px 0 ${color}` : "none" }}>
      {isHot && <div style={{ position: "absolute", top: -7, right: -7, background: "var(--orange)", color: "white", padding: "1px 6px", fontSize: 9, fontWeight: 900, borderRadius: 5, boxShadow: "0 2px 0 var(--orange-dark)", textTransform: "uppercase", letterSpacing: 0.4 }}>hot</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>{c.name}</div>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: masteryBg, flexShrink: 0 }} />
      </div>
      <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${c.you*100}%`, height: "100%", background: color, opacity: 0.7 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
        <span>{(c.you).toFixed(2)}</span>
        <span>{c.drilled}×</span>
      </div>
    </div>
  );
}

function ConceptDetail({ name }) {
  return (
    <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ background: "var(--orange)", color: "white", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase" }}>weak · hot</div>
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>concept #14 · tactical</div>
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, margin: "10px 0 4px", lineHeight: 1.1 }}>{name}</h2>
      <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "4px 0 14px", lineHeight: 1.5, fontWeight: 500 }}>
        A piece is "trapped" when it has no escape squares not controlled by enemy pieces. The signature in your games: knights walking into outposts that look strong but lack retreat options.
      </p>

      {/* example board */}
      <MiniBoardLib />

      {/* probe panel */}
      <div style={{ marginTop: 14, padding: 12, background: "var(--bg-2)", borderRadius: 12, fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.7 }}>
        <div style={{ color: "var(--ink-3)" }}># probe definition</div>
        <div>activates when escape_squares(piece) ≤ 1</div>
        <div>weighted by attacker_count(piece)</div>
        <div style={{ color: "var(--ink-3)", marginTop: 6 }}># layers</div>
        <div>LC0 BT4 · L11(.84) · L14(.71)</div>
        <div style={{ color: "var(--ink-3)", marginTop: 6 }}># co-activates with</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
          <CoChip label="piece_mobility" v={0.81} />
          <CoChip label="outpost_quality" v={0.62} />
          <CoChip label="prophylaxis_need" v={0.58} />
        </div>
      </div>

      {/* your stats */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <Mini label="your activation" v="0.28" sub="bottom 18%" />
        <Mini label="cohort avg" v="0.66" sub="1800 elo" />
        <Mini label="appearances" v="18" sub="last 100 games" accent />
      </div>

      <button style={{ marginTop: 14, width: "100%", background: "var(--orange)", color: "white", border: "none", padding: "14px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--orange-dark)", cursor: "pointer" }}>Drill this concept · 12 puzzles</button>
    </div>
  );
}

function CoChip({ label, v }) {
  return <span style={{ padding: "2px 6px", background: "white", borderRadius: 5, color: "var(--ink-2)", fontWeight: 700, border: "1px solid var(--line)" }}>{label} <span style={{ color: "var(--orange-dark)" }}>{v}</span></span>;
}
function Mini({ label, v, sub, accent }) {
  return (
    <div style={{ background: accent ? "#FFF4E5" : "var(--bg-2)", border: "2px solid " + (accent ? "var(--orange)" : "var(--line)"), borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent ? "var(--orange-dark)" : "var(--ink)", letterSpacing: -0.3 }}>{v}</div>
      <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{sub}</div>
    </div>
  );
}
function MiniBoardLib() {
  const sq = 32;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const pieces = {a8:"♜",e8:"♚",h8:"♜",a7:"♟",f7:"♟",g7:"♟",h7:"♟",d7:"♞",c6:"♞",d6:"♟",e5:"♟",c3:"♘",a2:"♙",b2:"♙",f2:"♙",g2:"♙",h2:"♙",a1:"♖",e1:"♔",h1:"♖"};
  const heat = { d7: 0.92, b8: 0.5, f6: 0.3 };
  const files=["a","b","c","d","e","f","g","h"]; const ranks=[8,7,6,5,4,3,2,1];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 6, overflow: "hidden", border: "2px solid var(--ink)", width: sq*8, margin: "0 auto" }}>
      {ranks.map(r => files.map(f => {
        const isDark = (files.indexOf(f) + r) % 2 === 0;
        const k = f+r; const h = heat[k]||0;
        return (
          <div key={k} style={{ width: sq, height: sq, background: isDark?dark:light, display:"grid", placeItems:"center", fontSize: 22, color: ["♟","♜","♞","♛","♚","♝"].includes(pieces[k])?"var(--ink)":"white", position: "relative" }}>
            {h > 0 && <div style={{ position: "absolute", inset: 2, background: `rgba(255,86,48,${h})`, borderRadius: 4 }} />}
            <span style={{ position: "relative", zIndex: 1 }}>{pieces[k]||""}</span>
          </div>
        );
      }))}
    </div>
  );
}
window.ConceptLibrary = ConceptLibrary;
