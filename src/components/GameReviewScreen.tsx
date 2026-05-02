import { useState, useEffect, useCallback } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { StoredGame, StoredMistake } from "@/lib/db";

interface Props {
  game: StoredGame;
  mistakes: StoredMistake[];
  onClose: () => void;
  onDrillMistake?: (mistake: StoredMistake) => void;
}

export default function GameReviewScreen({ game, mistakes, onClose, onDrillMistake }: Props) {
  const [moveIdx, setMoveIdx] = useState(0);
  const currentFen = game.fens[moveIdx] || game.fens[0];
  const currentMoveNumber = Math.floor(moveIdx / 2) + 1;
  const isWhiteMove = moveIdx % 2 === 1;

  const mistakeAtMove = mistakes.find(m => {
    const idx = (m.moveNumber - 1) * 2 + (game.playerColor === "black" ? 1 : 0);
    return Math.abs(idx - moveIdx) <= 1;
  });

  const goNext = useCallback(() => setMoveIdx(i => Math.min(game.fens.length - 1, i + 1)), [game.fens.length]);
  const goPrev = useCallback(() => setMoveIdx(i => Math.max(0, i - 1)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "l") goNext();
      if (e.key === "ArrowLeft" || e.key === "h") goPrev();
      if (e.key === "Home") setMoveIdx(0);
      if (e.key === "End") setMoveIdx(game.fens.length - 1);
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, game.fens.length, onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 50, overflow: "auto", fontFamily: "var(--sans)" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 32px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 18 }}>
        {/* Left: board + moves */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 4px" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Game review · {game.timeControl} · {new Date(game.date).toLocaleDateString()}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, margin: "4px 0 0", color: "var(--ink)" }}>
                {game.playerColor === "white" ? game.username : "opponent"}{" "}
                <span style={{ color: "var(--ink-3)" }}>vs</span>{" "}
                {game.playerColor === "black" ? game.username : "opponent"}
              </h1>
            </div>
            <button
              onClick={onClose}
              style={{ background: "white", border: "2px solid var(--line)", padding: "10px 16px", borderRadius: 12, fontWeight: 800, fontSize: 12, fontFamily: "var(--sans)", cursor: "pointer" }}
            >
              ← Back
            </button>
          </div>

          {/* Board */}
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 18, boxShadow: "0 6px 0 var(--ink)" }}>
            <div style={{ maxWidth: 480, margin: "0 auto" }}>
              <Chessboard options={{
                position: currentFen,
                allowDragging: false,
                boardOrientation: game.playerColor,
                darkSquareStyle: { backgroundColor: "#7FA650" },
                lightSquareStyle: { backgroundColor: "#EFEFD0" },
              }} />
            </div>

            {/* Mistake annotation */}
            {mistakeAtMove && (
              <div style={{ marginTop: 14, padding: 14, background: "#FFF4E5", border: "2px solid var(--orange)", borderRadius: 12, display: "flex", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: "var(--orange)",
                  color: "white", display: "grid", placeItems: "center", fontWeight: 900,
                  fontSize: 18, flexShrink: 0, boxShadow: "0 3px 0 var(--orange-dark)",
                }}>
                  {mistakeAtMove.severity === "blunder" ? "??" : "?!"}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "var(--orange-dark)", letterSpacing: 0.3, textTransform: "uppercase" }}>
                    Move {mistakeAtMove.moveNumber} · {mistakeAtMove.movePlayed} — {mistakeAtMove.severity} · cpl {mistakeAtMove.centipawnLoss}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5, fontWeight: 500 }}>
                    Engine wants <b style={{ color: "var(--green-dark)" }}>{mistakeAtMove.bestMove}</b> instead.
                  </div>
                  {onDrillMistake && (
                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={() => onDrillMistake(mistakeAtMove)}
                        style={{ background: "white", border: "2px solid var(--line)", padding: "6px 12px", borderRadius: 8, fontFamily: "var(--sans)", fontWeight: 800, fontSize: 11, cursor: "pointer" }}
                      >
                        ↻ Try this position
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Move list */}
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 16, padding: 14, boxShadow: "0 5px 0 var(--ink)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              Moves · click to scrub
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 4, fontFamily: "var(--mono)", fontSize: 11 }}>
              {Array.from({ length: Math.ceil(game.moves.length / 2) }).map((_, i) => {
                const wIdx = i * 2;
                const bIdx = i * 2 + 1;
                const wMistake = mistakes.find(m => m.moveNumber === i + 1 && game.playerColor === "white");
                const bMistake = mistakes.find(m => m.moveNumber === i + 1 && game.playerColor === "black");
                const isCurrentW = moveIdx === wIdx + 1;
                const isCurrentB = moveIdx === bIdx + 1;

                return (
                  <div key={i} style={{
                    display: "flex", justifyContent: "space-between", gap: 4,
                    background: isCurrentW || isCurrentB ? "#FFE4D0" : "transparent",
                    border: isCurrentW || isCurrentB ? "1.5px solid var(--orange)" : "1.5px solid transparent",
                    borderRadius: 6, padding: "3px 6px", cursor: "pointer",
                  }}>
                    <span style={{ color: "var(--ink-3)" }}>{i + 1}.</span>
                    <span
                      onClick={() => setMoveIdx(wIdx + 1)}
                      style={{ fontWeight: 700, color: wMistake ? "var(--orange-dark)" : "var(--ink)" }}
                    >
                      {game.moves[wIdx] || ""}{wMistake ? (wMistake.severity === "blunder" ? "??" : "?!") : ""}
                    </span>
                    {game.moves[bIdx] && (
                      <span
                        onClick={() => setMoveIdx(bIdx + 1)}
                        style={{ fontWeight: 700, color: bMistake ? "var(--orange-dark)" : "var(--ink)" }}
                      >
                        {game.moves[bIdx]}{bMistake ? (bMistake.severity === "blunder" ? "??" : "?!") : ""}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Navigation */}
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 12 }}>
              <button onClick={() => setMoveIdx(0)} style={navBtn}>⟨⟨</button>
              <button onClick={() => setMoveIdx(Math.max(0, moveIdx - 1))} style={navBtn}>‹</button>
              <button onClick={() => setMoveIdx(Math.min(game.fens.length - 1, moveIdx + 1))} style={navBtn}>›</button>
              <button onClick={() => setMoveIdx(game.fens.length - 1)} style={navBtn}>⟩⟩</button>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Mistakes in this game */}
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Mistakes in this game
            </div>
            {mistakes.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--ink-3)" }}>No mistakes detected.</p>
            )}
            {mistakes.map((m, i) => (
              <div
                key={i}
                onClick={() => {
                  const idx = (m.moveNumber - 1) * 2 + (game.playerColor === "black" ? 2 : 1);
                  setMoveIdx(Math.min(idx, game.fens.length - 1));
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                  borderRadius: 10, cursor: "pointer", marginBottom: 4,
                  background: mistakeAtMove?.id === m.id ? "#FFE4D0" : "transparent",
                  border: mistakeAtMove?.id === m.id ? "1.5px solid var(--orange)" : "1.5px solid transparent",
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                  background: m.severity === "blunder" ? "var(--orange)" : m.severity === "mistake" ? "var(--red)" : "var(--yellow)",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "var(--ink)" }}>
                    Move {m.moveNumber} · {m.movePlayed}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
                    {m.severity} · -{m.centipawnLoss}cp
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Accuracy */}
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--ink)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Game summary
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 10 }}>
              <div>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: game.result === "win" ? "var(--green)" : game.result === "loss" ? "var(--red)" : "var(--ink)" }}>
                  {game.result.toUpperCase()}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase" }}>
                  as {game.playerColor}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: -0.8, color: "var(--ink)" }}>
                  {mistakes.length}
                </div>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase" }}>
                  mistakes
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textAlign: "center" }}>
            {game.moves.length} moves · {game.playerElo} vs {game.opponentElo}
          </div>
        </div>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10, border: "2px solid var(--line)",
  background: "white", fontWeight: 900, fontSize: 14, cursor: "pointer",
  fontFamily: "var(--sans)", display: "grid", placeItems: "center",
};
