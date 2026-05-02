import { useState } from "react";
import type { AnalysisConfig } from "./UsernameForm";

interface Props {
  onSubmit: (config: AnalysisConfig) => void;
  lastUser?: string | null;
  onLoadCached?: (username: string) => void;
}

const PRESETS = [
  { label: "Quick", depth: 10, games: 20, time: "~5 min" },
  { label: "Standard", depth: 14, games: 50, time: "~15 min" },
  { label: "Deep", depth: 18, games: 100, time: "~45 min" },
] as const;

export default function LandingPage({ onSubmit, lastUser, onLoadCached }: Props) {
  const [username, setUsername] = useState("");
  const [preset, setPreset] = useState(1);
  const [hover, setHover] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    onSubmit({ username: trimmed, depth: PRESETS[preset].depth, gameCount: PRESETS[preset].games });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "hidden", fontFamily: "var(--sans)" }}>
      {/* Nav */}
      <div style={{ height: 68, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Logo size={36} />
          <span style={{ fontWeight: 800, fontSize: 22, color: "var(--ink)", letterSpacing: -0.5 }}>missedtake</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ color: "var(--ink-2)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>How it works</span>
          <span style={{ color: "var(--ink-2)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Concepts</span>
        </div>
      </div>

      {/* Hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", padding: "60px 64px 0 64px", gap: 48, maxWidth: 1280, margin: "0 auto" }}>
        <div>
          {/* Eyebrow */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#E8F8E5", border: "1.5px solid var(--green)", borderRadius: 999, color: "var(--green-dark)", fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: "uppercase" }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--green)" }} />
            Powered by emergent concept distillation
          </div>

          {/* H1 */}
          <h1 style={{ fontSize: 76, fontWeight: 900, lineHeight: 0.96, letterSpacing: -2.5, margin: "20px 0 0", color: "var(--ink)" }}>
            Stop losing to the<br />
            <span style={{ color: "var(--green)" }}>same mistake.</span>
          </h1>

          {/* Subhead */}
          <p style={{ fontSize: 19, lineHeight: 1.5, color: "var(--ink-2)", margin: "22px 0 32px", maxWidth: 520, fontWeight: 500 }}>
            missedtake reads your Chess.com games, finds the recurring patterns behind your blunders, and drills them out — one concept at a time.
          </p>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "stretch", maxWidth: 540 }}>
            <div style={{ flex: 1, background: "white", border: "2px solid var(--line)", borderRadius: 16, padding: "12px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "#7FA650", display: "grid", placeItems: "center", color: "white", fontWeight: 900, fontSize: 14 }}>♞</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="chess.com username"
                autoFocus
                style={{ border: "none", outline: "none", fontSize: 18, fontWeight: 600, fontFamily: "var(--sans)", background: "transparent", flex: 1, color: "var(--ink)" }}
              />
            </div>
            <button
              type="submit"
              disabled={!username.trim()}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{
                background: username.trim() ? "var(--green)" : "var(--bg-2)", color: username.trim() ? "white" : "var(--ink-3)",
                border: "none", fontFamily: "var(--sans)", padding: "0 26px", borderRadius: 16, fontWeight: 800, fontSize: 16,
                letterSpacing: 0.4, textTransform: "uppercase", cursor: username.trim() ? "pointer" : "default",
                boxShadow: hover && username.trim() ? "0 2px 0 var(--green-dark)" : username.trim() ? "0 4px 0 var(--green-dark)" : "none",
                transform: hover && username.trim() ? "translateY(2px)" : "translateY(0)", transition: "transform 80ms, box-shadow 80ms",
              }}
            >
              Analyze
            </button>
          </form>

          {/* Depth presets */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, maxWidth: 540 }}>
            {PRESETS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => setPreset(i)}
                style={{
                  padding: "6px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                  border: preset === i ? "2px solid var(--green)" : "2px solid var(--line)",
                  background: preset === i ? "#E8F8E5" : "white",
                  color: preset === i ? "var(--green-dark)" : "var(--ink-3)",
                  cursor: "pointer", fontFamily: "var(--sans)",
                }}
              >
                {p.label} · {p.time}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 14, fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }}>
            Free · No account · Runs in your browser · ~3 minutes for 100 games
          </div>

          {/* Continue as */}
          {lastUser && onLoadCached && (
            <button
              onClick={() => onLoadCached(lastUser)}
              style={{
                marginTop: 16, padding: "10px 18px", borderRadius: 12,
                border: "2px solid var(--line)", background: "white",
                fontSize: 14, fontWeight: 600, color: "var(--ink-2)",
                cursor: "pointer", fontFamily: "var(--sans)",
                boxShadow: "0 3px 0 var(--line)",
              }}
            >
              Continue as <span style={{ color: "var(--ink)", fontWeight: 800 }}>{lastUser}</span>
            </button>
          )}

          {/* Social proof stats */}
          <div style={{ marginTop: 56, display: "flex", gap: 40 }}>
            <Stat n="512" l="concepts tracked" />
            <Stat n="50K" l="positions analyzed" />
            <Stat n="+142" l="avg Elo gain at 90d" color="var(--green)" />
          </div>
        </div>

        {/* Right column: mascot + board + concept chips */}
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

      {/* Bottom strip */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: 64, background: "var(--ink)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 56, fontSize: 13, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
        <span style={{ opacity: 0.5 }}>Pull games</span>
        <Arrow />
        <span style={{ opacity: 0.5 }}>Stockfish flags mistakes</span>
        <Arrow />
        <span style={{ opacity: 0.5 }}>Concept probe</span>
        <Arrow />
        <span style={{ color: "var(--green-2)" }}>Drills tailored to you</span>
      </div>
    </div>
  );
}

function Stat({ n, l, color }: { n: string; l: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 900, color: color || "var(--ink)", letterSpacing: -1 }}>{n}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-3)", letterSpacing: 0.5, textTransform: "uppercase" }}>{l}</div>
    </div>
  );
}

function Logo({ size = 32 }: { size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "var(--green)", display: "grid", placeItems: "center", boxShadow: "0 3px 0 var(--green-dark)" }}>
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="white">
        <path d="M12 2 L14 6 L18 6 L18 9 L16 11 L17 18 L7 18 L8 11 L6 9 L6 6 L10 6 Z" />
        <rect x="5" y="19" width="14" height="3" rx="1" />
      </svg>
    </div>
  );
}

function Arrow() {
  return <svg width="14" height="10" viewBox="0 0 14 10" fill="none"><path d="M1 5h12M9 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" opacity="0.4" /></svg>;
}

function Mascot({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ ...style, width: 130, height: 130 }}>
      <svg viewBox="0 0 130 130">
        <ellipse cx="65" cy="118" rx="38" ry="6" fill="#000" opacity="0.08" />
        <path d="M30 70 Q30 28 65 28 Q100 28 100 70 L100 95 Q100 110 85 110 L45 110 Q30 110 30 95 Z" fill="var(--green)" />
        <path d="M30 70 Q30 28 65 28 Q100 28 100 70 L100 95 Q100 110 85 110 L45 110 Q30 110 30 95 Z" fill="none" stroke="var(--green-dark)" strokeWidth="3" />
        <ellipse cx="65" cy="80" rx="22" ry="20" fill="#E8F8E5" />
        <circle cx="52" cy="55" r="11" fill="white" stroke="var(--green-dark)" strokeWidth="2.5" />
        <circle cx="78" cy="55" r="11" fill="white" stroke="var(--green-dark)" strokeWidth="2.5" />
        <circle cx="54" cy="56" r="4.5" fill="var(--ink)" />
        <circle cx="80" cy="56" r="4.5" fill="var(--ink)" />
        <circle cx="55.5" cy="54.5" r="1.4" fill="white" />
        <circle cx="81.5" cy="54.5" r="1.4" fill="white" />
        <path d="M61 66 L65 73 L69 66 Z" fill="var(--orange)" stroke="var(--orange-dark)" strokeWidth="1.5" />
        <path d="M40 38 L36 26 L48 32 Z" fill="var(--green-dark)" />
        <path d="M90 38 L94 26 L82 32 Z" fill="var(--green-dark)" />
        <rect x="58" y="82" width="14" height="3" rx="1" fill="var(--green-dark)" opacity="0.4" />
      </svg>
    </div>
  );
}

function SpeechBubble({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ ...style, background: "white", border: "2px solid var(--ink)", padding: "10px 14px", borderRadius: 14, fontSize: 13, fontWeight: 700, color: "var(--ink)", maxWidth: 200, boxShadow: "0 4px 0 var(--ink)", position: "relative" as const }}>
      {children}
      <svg style={{ position: "absolute", right: -2, top: 18 }} width="14" height="14" viewBox="0 0 14 14"><path d="M0 2 L12 7 L0 12 Z" fill="white" stroke="var(--ink)" strokeWidth="2" /></svg>
    </div>
  );
}

function FloatingBoard() {
  const sq = 44;
  const pieces: Record<string, string> = {
    "a8":"♜","d8":"♛","e8":"♚","h8":"♜",
    "a7":"♟","f7":"♟","g7":"♟","h7":"♟",
    "c6":"♞","d6":"♟","f6":"♞",
    "e5":"♟",
    "c4":"♙",
    "c3":"♘","f3":"♘",
    "a2":"♙","b2":"♙","f2":"♙","g2":"♙","h2":"♙",
    "a1":"♖","c1":"♗","d1":"♕","e1":"♔","f1":"♗","h1":"♖",
  };
  const files = ["a","b","c","d","e","f","g","h"];
  const ranks = [8,7,6,5,4,3,2,1];
  const blackPieces = new Set(["♟","♜","♞","♝","♛","♚"]);

  return (
    <div style={{ padding: 12, background: "white", borderRadius: 24, border: "3px solid var(--ink)", boxShadow: "0 10px 0 var(--ink)", transform: "rotate(-2deg)", marginTop: 28 }}>
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
          const key = f + r;
          const piece = pieces[key] || "";
          const isHighlight = key === "f5";
          const isOutlined = key === "d6";
          return (
            <div key={key} style={{
              width: sq, height: sq,
              background: isHighlight ? "#FF8B3D" : isDark ? "var(--board-dark)" : "var(--board-light)",
              display: "grid", placeItems: "center", fontSize: 30, position: "relative",
              color: blackPieces.has(piece) ? "var(--ink)" : "white",
            }}>
              {piece}
              {isOutlined && <div style={{ position: "absolute", inset: 0, border: "3px solid var(--orange)", borderRadius: 4, boxSizing: "border-box" as const }} />}
            </div>
          );
        }))}
      </div>
    </div>
  );
}

function ConceptChip({ color, label, pct, style }: { color: string; label: string; pct: number; style?: React.CSSProperties }) {
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
