/* global React */
const { useState, useEffect } = React;

function Landing() {
  const [username, setUsername] = useState("");
  const [hover, setHover] = useState(false);
  return (
    <div style={{ width: 1280, height: 820, background: "var(--bg)", position: "relative", overflow: "hidden", fontFamily: "var(--sans)" }}>
      {/* nav */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 68, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={36} />
          <span style={{ fontWeight: 800, fontSize: 22, color: "var(--ink)", letterSpacing: -0.5 }}>gambit</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <a style={{ color: "var(--ink-2)", fontWeight: 700, fontSize: 14 }}>How it works</a>
          <a style={{ color: "var(--ink-2)", fontWeight: 700, fontSize: 14 }}>Concepts</a>
          <a style={{ color: "var(--ink-2)", fontWeight: 700, fontSize: 14 }}>Sign in</a>
        </div>
      </div>

      {/* hero */}
      <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "1.05fr 1fr", padding: "100px 64px 0 64px", gap: 48 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#E8F8E5", border: "1.5px solid var(--green)", borderRadius: 999, color: "var(--green-dark)", fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--green)" }} />
            Powered by LC0 concept distillation
          </div>
          <h1 style={{ fontSize: 76, fontWeight: 900, lineHeight: 0.96, letterSpacing: -2.5, margin: "20px 0 0", color: "var(--ink)" }}>
            Stop losing to the<br />
            <span style={{ color: "var(--green)" }}>same mistake.</span>
          </h1>
          <p style={{ fontSize: 19, lineHeight: 1.5, color: "var(--ink-2)", margin: "22px 0 32px", maxWidth: 520, fontWeight: 500 }}>
            Gambit reads your last 500 Chess.com games, finds the recurring patterns behind your blunders, and drills them out — one concept at a time.
          </p>

          {/* input */}
          <div style={{ display: "flex", gap: 10, alignItems: "stretch", maxWidth: 540 }}>
            <div style={{ flex: 1, background: "white", border: "2px solid var(--line)", borderRadius: 16, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <ChessComMark />
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="chess.com username"
                style={{ border: "none", outline: "none", fontSize: 18, fontWeight: 600, fontFamily: "var(--sans)", background: "transparent", flex: 1, color: "var(--ink)" }}
              />
            </div>
            <button
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{
                background: "var(--green)", color: "white", border: "none", fontFamily: "var(--sans)",
                padding: "0 26px", borderRadius: 16, fontWeight: 800, fontSize: 16, letterSpacing: 0.4,
                textTransform: "uppercase", cursor: "pointer", boxShadow: hover ? "0 2px 0 var(--green-dark)" : "0 4px 0 var(--green-dark)",
                transform: hover ? "translateY(2px)" : "translateY(0)", transition: "transform 80ms, box-shadow 80ms"
              }}
            >
              Analyze
            </button>
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }}>
            Free · No account · Runs in your browser · ~3 minutes for 100 games
          </div>

          {/* social proof */}
          <div style={{ marginTop: 56, display: "flex", gap: 40 }}>
            <Stat n="2.4M" l="positions analyzed" />
            <Stat n="187" l="concepts tracked" />
            <Stat n="+142" l="avg Elo gain at 90d" color="var(--green)" />
          </div>
        </div>

        {/* board+mascot */}
        <div style={{ position: "relative" }}>
          <Mascot style={{ position: "absolute", top: -10, right: -10, zIndex: 3 }} />
          <SpeechBubble style={{ position: "absolute", top: 22, right: 130, zIndex: 4 }}>
            You hung your knight on f5 again.
          </SpeechBubble>
          <FloatingBoard />
          <ConceptChip style={{ position: "absolute", left: -24, top: 90, zIndex: 5 }} color="var(--orange)" label="trapped piece" pct={87} />
          <ConceptChip style={{ position: "absolute", right: -10, bottom: 140, zIndex: 5 }} color="var(--purple)" label="weak f-file" pct={72} />
          <ConceptChip style={{ position: "absolute", left: 60, bottom: 40, zIndex: 5 }} color="var(--blue)" label="king safety" pct={64} />
        </div>
      </div>

      {/* bottom strip */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 64, background: "var(--ink)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 56, fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
          <span style={{ opacity: 0.5 }}>Pull games</span>
          <Arrow />
          <span style={{ opacity: 0.5 }}>Stockfish flags mistakes</span>
          <Arrow />
          <span style={{ opacity: 0.5 }}>LC0 concept probe</span>
          <Arrow />
          <span style={{ color: "var(--green-2)" }}>Drills tailored to you</span>
      </div>
    </div>
  );
}

function Stat({ n, l, color }) {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 900, color: color || "var(--ink)", letterSpacing: -1 }}>{n}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", letterSpacing: 0.5, textTransform: "uppercase" }}>{l}</div>
    </div>
  );
}

function Logo({ size = 32 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "var(--green)", display: "grid", placeItems: "center", boxShadow: "0 3px 0 var(--green-dark)" }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="white">
        <path d="M12 2 L14 6 L18 6 L18 9 L16 11 L17 18 L7 18 L8 11 L6 9 L6 6 L10 6 Z" />
        <rect x="5" y="19" width="14" height="3" rx="1" />
      </svg>
    </div>
  );
}

function ChessComMark() {
  return (
    <div style={{ width: 28, height: 28, borderRadius: 8, background: "#7FA650", display: "grid", placeItems: "center", color: "white", fontWeight: 900, fontSize: 14 }}>♞</div>
  );
}

function Arrow() {
  return <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" opacity="0.4" /></svg>;
}

function Mascot({ style }) {
  return (
    <div style={{ ...style, width: 130, height: 130 }}>
      <svg viewBox="0 0 130 130">
        <ellipse cx="65" cy="118" rx="38" ry="6" fill="#000" opacity="0.08" />
        {/* body — owl-shaped knight */}
        <path d="M30 70 Q30 28 65 28 Q100 28 100 70 L100 95 Q100 110 85 110 L45 110 Q30 110 30 95 Z" fill="var(--green)" />
        <path d="M30 70 Q30 28 65 28 Q100 28 100 70 L100 95 Q100 110 85 110 L45 110 Q30 110 30 95 Z" fill="none" stroke="var(--green-dark)" strokeWidth="3" />
        {/* belly */}
        <ellipse cx="65" cy="80" rx="22" ry="20" fill="#E8F8E5" />
        {/* eyes */}
        <circle cx="52" cy="55" r="11" fill="white" stroke="var(--green-dark)" strokeWidth="2.5" />
        <circle cx="78" cy="55" r="11" fill="white" stroke="var(--green-dark)" strokeWidth="2.5" />
        <circle cx="54" cy="56" r="4.5" fill="var(--ink)" />
        <circle cx="80" cy="56" r="4.5" fill="var(--ink)" />
        <circle cx="55.5" cy="54.5" r="1.4" fill="white" />
        <circle cx="81.5" cy="54.5" r="1.4" fill="white" />
        {/* beak */}
        <path d="M61 66 L65 73 L69 66 Z" fill="var(--orange)" stroke="var(--orange-dark)" strokeWidth="1.5" />
        {/* tufts/ears */}
        <path d="M40 38 L36 26 L48 32 Z" fill="var(--green-dark)" />
        <path d="M90 38 L94 26 L82 32 Z" fill="var(--green-dark)" />
        {/* knight crown hint */}
        <rect x="58" y="82" width="14" height="3" rx="1" fill="var(--green-dark)" opacity="0.4" />
      </svg>
    </div>
  );
}

function SpeechBubble({ children, style }) {
  return (
    <div style={{ ...style, background: "white", border: "2px solid var(--ink)", padding: "10px 14px", borderRadius: 14, fontSize: 13, fontWeight: 700, color: "var(--ink)", maxWidth: 200, boxShadow: "0 4px 0 var(--ink)" }}>
      {children}
      <svg style={{ position: "absolute", right: -2, top: 18 }} width="14" height="14" viewBox="0 0 14 14"><path d="M0 2 L12 7 L0 12 Z" fill="white" stroke="var(--ink)" strokeWidth="2" /></svg>
    </div>
  );
}

function FloatingBoard() {
  // mini 8x8 with some pieces, tilted card style
  const sq = 44;
  const dark = "#7FA650";
  const light = "#EFEFD0";
  const pieces = {
    "a8":"♜","b8":"","c8":"","d8":"♛","e8":"♚","f8":"","g8":"","h8":"♜",
    "a7":"♟","b7":"","c7":"","d7":"","e7":"","f7":"♟","g7":"♟","h7":"♟",
    "a6":"","b6":"","c6":"♞","d6":"♟","e6":"","f6":"♞","g6":"","h6":"",
    "a5":"","b5":"","c5":"","d5":"","e5":"♟","f5":"","g5":"","h5":"",
    "a4":"","b4":"","c4":"♙","d4":"","e4":"","f4":"","g4":"","h4":"",
    "a3":"","b3":"","c3":"♘","d3":"","e3":"","f3":"♘","g3":"","h3":"",
    "a2":"♙","b2":"♙","c2":"","d2":"","e2":"","f2":"♙","g2":"♙","h2":"♙",
    "a1":"♖","b1":"","c1":"♗","d1":"♕","e1":"♔","f1":"♗","g1":"","h1":"♖"
  };
  const files = ["a","b","c","d","e","f","g","h"];
  const ranks = [8,7,6,5,4,3,2,1];
  return (
    <div style={{ width: sq*8 + 24, padding: 12, background: "white", borderRadius: 24, border: "3px solid var(--ink)", boxShadow: "0 10px 0 var(--ink)", transform: "rotate(-2deg)", marginTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px 10px" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: "var(--ink)" }} />
          <span style={{ fontSize: 12, fontWeight: 800 }}>magnus_fan_42</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>move 23 · -1.4</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 8, overflow: "hidden", border: "2px solid var(--ink)" }}>
        {ranks.map(r => files.map(f => {
          const isDark = (files.indexOf(f) + r) % 2 === 0;
          const key = f+r;
          const highlight = key === "f5";
          const arrow = key === "d6";
          return (
            <div key={key} style={{ width: sq, height: sq, background: highlight ? "#FF8B3D" : (isDark ? dark : light), display: "grid", placeItems: "center", fontSize: 30, position: "relative", color: ["♟","♜","♞","♛","♚","♝"].includes(pieces[key]) ? "var(--ink)" : "white" }}>
              {pieces[key]}
              {arrow && <div style={{ position: "absolute", inset: 0, border: "3px solid var(--orange)", borderRadius: 4, boxSizing: "border-box" }} />}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

function ConceptChip({ color, label, pct, style }) {
  return (
    <div style={{ ...style, background: "white", border: `2px solid ${color}`, borderRadius: 14, padding: "8px 12px", boxShadow: `0 4px 0 ${color}`, display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: color, color: "white", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 11, fontFamily: "var(--mono)" }}>{pct}</div>
      <div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>concept</div>
        <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ink)" }}>{label}</div>
      </div>
    </div>
  );
}

window.Landing = Landing;
