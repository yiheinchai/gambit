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
  const [btnHover, setBtnHover] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) return;
    onSubmit({ username: trimmed, depth: PRESETS[preset].depth, gameCount: PRESETS[preset].games });
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
      {/* Nav */}
      <nav style={{ height: 68, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--green)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 3px 0 var(--green-dark)", fontSize: 20, color: "white"
          }}>
            ♞
          </div>
          <span style={{ fontWeight: 800, fontSize: 22, color: "var(--ink)", letterSpacing: -0.5 }}>gambit</span>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", padding: "60px 64px 0", gap: 48, maxWidth: 1280, margin: "0 auto" }}>
        <div>
          {/* Eyebrow */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", background: "#E8F8E5",
            border: "1.5px solid var(--green)", borderRadius: 999,
            color: "var(--green-dark)", fontSize: 12, fontWeight: 800,
            letterSpacing: 0.4, textTransform: "uppercase"
          }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--green)" }} />
            Powered by emergent concept discovery
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: 72, fontWeight: 900, lineHeight: 0.96,
            letterSpacing: -2.5, margin: "20px 0 0", color: "var(--ink)"
          }}>
            Stop losing to the<br />
            <span style={{ color: "var(--green)" }}>same mistake.</span>
          </h1>

          {/* Subhead */}
          <p style={{
            fontSize: 19, lineHeight: 1.5, color: "var(--ink-2)",
            margin: "22px 0 32px", maxWidth: 520, fontWeight: 500
          }}>
            Gambit reads your Chess.com games, finds the recurring patterns behind your blunders, and drills them out — one concept at a time.
          </p>

          {/* Input */}
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 10, alignItems: "stretch", maxWidth: 540 }}>
            <div style={{
              flex: 1, background: "white", border: "2px solid var(--line)",
              borderRadius: 16, padding: "12px 18px",
              display: "flex", alignItems: "center", gap: 12
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6, background: "var(--board-dark)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, color: "white"
              }}>♞</div>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="chess.com username"
                autoFocus
                style={{
                  border: "none", outline: "none", fontSize: 18, fontWeight: 600,
                  fontFamily: "var(--sans)", background: "transparent", flex: 1,
                  color: "var(--ink)"
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!username.trim()}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              className="btn-duo"
              style={{
                background: username.trim() ? "var(--green)" : "var(--bg-2)",
                color: username.trim() ? "white" : "var(--ink-3)",
                padding: "0 26px", borderRadius: 16, fontSize: 16,
                boxShadow: btnHover && username.trim() ? "0 2px 0 var(--green-dark)" : username.trim() ? "0 4px 0 var(--green-dark)" : "none",
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

          {/* Disclaimer */}
          <div style={{ marginTop: 10, fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }}>
            Free · No account · Runs in your browser
          </div>

          {/* Continue as */}
          {lastUser && onLoadCached && (
            <button
              onClick={() => onLoadCached(lastUser)}
              style={{
                marginTop: 16, padding: "8px 16px", borderRadius: 10,
                border: "2px solid var(--line)", background: "white",
                fontSize: 14, fontWeight: 600, color: "var(--ink-2)",
                cursor: "pointer", fontFamily: "var(--sans)",
              }}
            >
              Continue as <span style={{ color: "var(--ink)", fontWeight: 800 }}>{lastUser}</span>
            </button>
          )}

          {/* Stats */}
          <div style={{ marginTop: 48, display: "flex", gap: 40 }}>
            <StatItem n="512" label="emergent concepts" />
            <StatItem n="50K" label="positions analyzed" />
            <StatItem n="16" label="active per position" color="var(--green)" />
          </div>
        </div>

        {/* Right column — floating board preview */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{
            background: "white", border: "3px solid var(--ink)", borderRadius: 20,
            padding: 16, boxShadow: "0 10px 0 var(--ink)", transform: "rotate(-2deg)",
          }}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(8, 44px)", gridTemplateRows: "repeat(8, 44px)",
            }}>
              {Array.from({ length: 64 }).map((_, i) => {
                const row = Math.floor(i / 8);
                const col = i % 8;
                const isLight = (row + col) % 2 === 0;
                return (
                  <div key={i} style={{
                    background: isLight ? "var(--board-light)" : "var(--board-dark)",
                    width: 44, height: 44,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 28,
                  }}>
                    {row === 0 && col === 4 ? "♚" : ""}
                    {row === 0 && col === 0 ? "♜" : ""}
                    {row === 0 && col === 7 ? "♜" : ""}
                    {row === 1 && col < 6 ? "♟" : ""}
                    {row === 3 && col === 5 ? <span style={{ color: "var(--orange)" }}>♞</span> : ""}
                    {row === 7 && col === 4 ? "♔" : ""}
                    {row === 6 && col > 4 ? "♙" : ""}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Concept chips */}
          <div style={{
            position: "absolute", left: -20, top: 80,
            background: "white", border: "2px solid var(--orange)", borderRadius: 14,
            padding: "8px 14px", boxShadow: "0 4px 0 var(--orange-dark)",
            display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: "var(--orange)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 800,
            }}>87%</div>
            trapped piece
          </div>

          <div style={{
            position: "absolute", right: -10, bottom: 120,
            background: "white", border: "2px solid var(--purple)", borderRadius: 14,
            padding: "8px 14px", boxShadow: "0 4px 0 #6D28D9",
            display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: "var(--purple)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 800,
            }}>62%</div>
            king safety
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 56,
        background: "var(--ink)", display: "flex", alignItems: "center",
        justifyContent: "center", gap: 12,
        fontSize: 13, fontWeight: 700, letterSpacing: 0.6,
        textTransform: "uppercase", color: "white",
      }}>
        <span>Pull games</span>
        <span style={{ color: "var(--ink-3)" }}>→</span>
        <span>Stockfish flags mistakes</span>
        <span style={{ color: "var(--ink-3)" }}>→</span>
        <span>Emergent concept features</span>
        <span style={{ color: "var(--ink-3)" }}>→</span>
        <span style={{ color: "var(--green-2)" }}>Drills tailored to you</span>
      </div>
    </div>
  );
}

function StatItem({ n, label, color }: { n: string; label: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, color: color || "var(--ink)" }}>{n}</div>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "var(--ink-3)" }}>{label}</div>
    </div>
  );
}
