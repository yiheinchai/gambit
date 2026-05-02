import type { AnalysisProgress } from "@/lib/analysis";
import type { StoredMistake } from "@/lib/db";
import { CONCEPT_NAMES } from "@/lib/concept-classifier";

interface Props {
  progress: AnalysisProgress;
  username: string;
  mistakes: StoredMistake[];
  onStop: () => void;
  onViewPartial: () => void;
}

export default function DuoLoadingScreen({ progress, username, mistakes, onStop, onViewPartial }: Props) {
  const { phase, currentGame, totalGames, mistakesFound } = progress;
  const pct = totalGames > 0 ? Math.round((currentGame / totalGames) * 100) : 0;

  const steps = [
    { label: "Fetching games", detail: `from chess.com/${username}`, done: phase !== "fetching", current: phase === "fetching" },
    { label: "Stockfish analysis", detail: `depth 14 · 2 workers`, done: phase === "clustering" || phase === "done", current: phase === "analyzing", pct },
    { label: "Concept inference", detail: "ONNX runtime · 512 dims", done: phase === "done", current: phase === "clustering" },
    { label: "Clustering weaknesses", detail: "k-means", done: phase === "done", current: false },
  ];

  const lastMistakes = mistakes.slice(-6);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: 56 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--green)", display: "grid", placeItems: "center", color: "white", fontWeight: 900, fontSize: 18, boxShadow: "0 3px 0 var(--green-dark)" }}>♞</div>
        <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>missedtake</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 56, alignItems: "start", maxWidth: 1280 }}>
        {/* Left: steps */}
        <div>
          <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>Analyzing</div>
          <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, margin: "8px 0 24px", lineHeight: 1 }}>
            {username}
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {steps.map((s, i) => (
              <Step key={i} {...s} />
            ))}
          </div>

          {/* Live log */}
          <div style={{ marginTop: 28, background: "var(--ink)", borderRadius: 16, padding: 18, fontFamily: "var(--mono)", fontSize: 12, color: "#A8D88A", lineHeight: 1.7, height: 180, overflow: "hidden" }}>
            <div style={{ color: "#7FA650" }}>$ stockfish.wasm analyzing {username}</div>
            {lastMistakes.map((m, i) => (
              <div key={i}>
                move {m.moveNumber}  {m.movePlayed}→{m.bestMove}  cpl={m.centipawnLoss}  <span style={{ color: m.severity === "blunder" ? "#FF8B3D" : m.severity === "mistake" ? "#FF6B6B" : "#FFD23F" }}>
                  {m.severity.toUpperCase()}
                </span>
              </div>
            ))}
            {lastMistakes.length === 0 && phase === "fetching" && (
              <div style={{ color: "#9CA3AF" }}>waiting for games...</div>
            )}
            {phase === "analyzing" && (
              <div style={{ color: "#7FA650" }}>$ game {currentGame}/{totalGames} · {mistakesFound} mistakes found_</div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            {mistakes.length >= 3 && (
              <button
                onClick={onViewPartial}
                className="btn-duo"
                style={{
                  background: "var(--green)", color: "white", padding: "12px 20px",
                  borderRadius: 14, fontSize: 13, boxShadow: "0 4px 0 var(--green-dark)",
                }}
              >
                View results ({mistakesFound} mistakes)
              </button>
            )}
            <button
              onClick={onStop}
              style={{
                background: "white", color: "var(--ink-2)", border: "2px solid var(--line)",
                padding: "12px 20px", borderRadius: 14, fontSize: 13, fontWeight: 800,
                cursor: "pointer", fontFamily: "var(--sans)",
              }}
            >
              Stop
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        {mistakes.length > 0 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Live preview</div>
            <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>game {currentGame} / {totalGames}</div>
                {mistakes.length > 0 && (
                  <Tag color={
                    mistakes[mistakes.length - 1].severity === "blunder" ? "var(--orange)" :
                    mistakes[mistakes.length - 1].severity === "mistake" ? "var(--red)" :
                    "var(--yellow)"
                  } text={mistakes[mistakes.length - 1].severity} />
                )}
              </div>

              {/* Last mistake info */}
              {mistakes.length > 0 && (() => {
                const m = mistakes[mistakes.length - 1];
                return (
                  <>
                    <div style={{ marginTop: 14, fontSize: 13, fontFamily: "var(--mono)", color: "var(--ink-2)" }}>
                      Move {m.moveNumber}: <b style={{ color: "var(--orange-dark)" }}>{m.movePlayed}</b> <span style={{ color: "var(--ink-3)" }}>(best: {m.bestMove})</span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, fontFamily: "var(--mono)", color: "var(--ink-2)" }}>
                      eval <b>{(m.evalBefore / 100).toFixed(1)}</b> → <b style={{ color: "var(--orange-dark)" }}>{(m.evalAfter / 100).toFixed(1)}</b>
                    </div>
                  </>
                );
              })()}

              {/* Concept bars when available */}
              {mistakes.length > 0 && mistakes[mistakes.length - 1].conceptDiff && (() => {
                const m = mistakes[mistakes.length - 1];
                const topConcepts = (m.conceptDiff || [])
                  .map((val, i) => ({ name: CONCEPT_NAMES[i] || `feature_${i}`, val }))
                  .filter(c => c.val > 0.1 && !c.name.startsWith("feature_"))
                  .sort((a, b) => b.val - a.val)
                  .slice(0, 3);

                if (topConcepts.length === 0) return null;
                return (
                  <div style={{ marginTop: 16, padding: 14, background: "var(--bg-2)", borderRadius: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 10 }}>What you missed</div>
                    {topConcepts.map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 110, fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>{c.name.replace(/_/g, " ")}</div>
                        <div style={{ flex: 1, height: 8, background: "white", borderRadius: 4, overflow: "hidden", border: "1px solid var(--line)" }}>
                          <div style={{ width: `${Math.min(c.val * 100, 100)}%`, height: "100%", background: i === 0 ? "var(--orange)" : i === 1 ? "var(--purple)" : "var(--blue)" }} />
                        </div>
                        <div style={{ width: 32, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", textAlign: "right" }}>{c.val.toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              <div style={{ marginTop: 16, fontSize: 13, color: "var(--ink-3)", fontWeight: 600, textAlign: "center" }}>
                {mistakesFound} mistakes found so far
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step({ label, detail, done, current, pct = 0 }: {
  label: string; detail: string; done: boolean; current: boolean; pct?: number;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 16, padding: 16,
      background: current ? "white" : "transparent",
      border: current ? "2.5px solid var(--green)" : "2px solid var(--line)",
      borderRadius: 14,
      boxShadow: current ? "0 4px 0 var(--green-dark)" : "none",
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: done ? "var(--green)" : current ? "#E8F8E5" : "var(--bg-2)",
        display: "grid", placeItems: "center",
        color: done ? "white" : "var(--ink-3)", fontWeight: 900,
      }}>
        {done ? "✓" : current ? <Spinner /> : "•"}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: done || current ? "var(--ink)" : "var(--ink-3)" }}>{label}</div>
        <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 2 }}>{detail}</div>
        {current && pct > 0 && (
          <div style={{ marginTop: 8, height: 8, background: "var(--bg-2)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "var(--green)", transition: "width 300ms" }} />
          </div>
        )}
      </div>
      {done && <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--green-dark)", fontWeight: 800 }}>done</div>}
      {current && pct > 0 && <div style={{ fontSize: 14, fontFamily: "var(--mono)", color: "var(--green-dark)", fontWeight: 900 }}>{pct}%</div>}
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

function Tag({ color, text }: { color: string; text: string }) {
  return <span style={{ background: color, color: "white", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>{text}</span>;
}
