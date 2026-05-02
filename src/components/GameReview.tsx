
import { useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import type { StoredMistake } from "@/lib/db";

const CONCEPT_DISPLAY = [
  "Fork", "Pin", "Skewer", "Discovered attack", "Back rank",
  "Hanging piece", "Overloaded defender", "Trapped piece",
  "Passed pawn", "Isolated pawn", "Doubled pawn", "Backward pawn",
  "Open file rook", "Bishop pair", "Bad bishop", "Knight outpost",
  "Weak squares", "Space", "King safety", "Castling", "Pawn shield",
  "Material up", "Material down", "Imbalance",
  "Opening", "Middlegame", "Endgame",
];

interface Props {
  mistake: StoredMistake;
  onClose: () => void;
}

export default function GameReview({ mistake, onClose }: Props) {
  const [showBestMove, setShowBestMove] = useState(false);

  const chess = new Chess(mistake.fen);
  const sideToMove = chess.turn() === "w" ? "white" : "black";

  let bestMoveFen = mistake.fen;
  try {
    const bestChess = new Chess(mistake.fen);
    bestChess.move(mistake.bestMove);
    bestMoveFen = bestChess.fen();
  } catch {
    // bestMove might be in UCI format (e2e4), try converting
    try {
      const bestChess = new Chess(mistake.fen);
      const from = mistake.bestMove.slice(0, 2);
      const to = mistake.bestMove.slice(2, 4);
      const promotion = mistake.bestMove[4];
      bestChess.move({ from, to, promotion });
      bestMoveFen = bestChess.fen();
    } catch {
      // keep original fen
    }
  }

  let playedMoveFen = mistake.fen;
  try {
    const playedChess = new Chess(mistake.fen);
    playedChess.move(mistake.movePlayed);
    playedMoveFen = playedChess.fen();
  } catch {
    // keep original fen
  }

  const evalBar = Math.max(-500, Math.min(500, mistake.evalBefore));
  const evalPercent = ((evalBar + 500) / 1000) * 100;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(27,39,48,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 16 }}>
      <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 24, boxShadow: "0 8px 0 var(--ink)", maxWidth: 720, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "2px solid var(--line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 700 }}>Move {mistake.moveNumber}</span>
            <span style={{
              background: mistake.severity === "blunder" ? "var(--orange)" : mistake.severity === "mistake" ? "var(--red)" : "var(--yellow)",
              color: "white", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6,
            }}>
              {mistake.severity} (-{mistake.centipawnLoss}cp)
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "var(--bg-2)", border: "2px solid var(--line)", borderRadius: 10, width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer", fontWeight: 900, fontSize: 16, fontFamily: "var(--sans)", color: "var(--ink-2)" }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: "16px 24px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Position before the mistake */}
            <div>
              <p style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 8, textAlign: "center", fontWeight: 600 }}>
                Position ({sideToMove} to move)
              </p>
              <div style={{ maxWidth: 320 }}>
                <Chessboard
                  options={{
                    position: showBestMove ? bestMoveFen : mistake.fen,
                    allowDragging: false,
                    darkSquareStyle: { backgroundColor: "#7FA650" },
                    lightSquareStyle: { backgroundColor: "#EFEFD0" },
                  }}
                />
              </div>
            </div>

            {/* Analysis panel */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  You played
                </p>
                <p style={{ fontSize: 20, fontFamily: "var(--mono)", fontWeight: 900, color: "var(--orange-dark)" }}>
                  {mistake.movePlayed}
                </p>
              </div>

              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Best move
                </p>
                <p style={{ fontSize: 20, fontFamily: "var(--mono)", fontWeight: 900, color: "var(--green-dark)" }}>
                  {mistake.bestMove}
                </p>
              </div>

              <div>
                <p style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
                  Evaluation shift
                </p>
                <div style={{ width: "100%", height: 16, background: "var(--bg-2)", borderRadius: 8, overflow: "hidden", border: "1.5px solid var(--line)" }}>
                  <div style={{ width: `${evalPercent}%`, height: "100%", background: "var(--ink)", borderRadius: 8, transition: "width 300ms" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 4 }}>
                  <span>Before: {(mistake.evalBefore / 100).toFixed(1)}</span>
                  <span>After: {(mistake.evalAfter / 100).toFixed(1)}</span>
                </div>
              </div>

              {/* Concept tags */}
              {mistake.conceptDiff && mistake.conceptDiff.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
                    What you missed
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {mistake.conceptDiff
                      .map((val, idx) => ({ idx, val }))
                      .filter((c) => c.val > 0.1)
                      .sort((a, b) => b.val - a.val)
                      .slice(0, 4)
                      .map((c) => (
                        <span key={c.idx} style={{
                          padding: "3px 8px", background: "#FFF4E5", border: "1.5px solid var(--orange)",
                          borderRadius: 6, fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, color: "var(--orange-dark)",
                        }}>
                          {CONCEPT_DISPLAY[c.idx] || `feature_${c.idx}`}
                        </span>
                      ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
                <button
                  onClick={() => setShowBestMove(false)}
                  style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer",
                    background: !showBestMove ? "var(--ink)" : "white",
                    color: !showBestMove ? "white" : "var(--ink-2)",
                    border: !showBestMove ? "2px solid var(--ink)" : "2px solid var(--line)",
                    fontFamily: "var(--sans)",
                  }}
                >
                  Position
                </button>
                <button
                  onClick={() => setShowBestMove(true)}
                  style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer",
                    background: showBestMove ? "var(--green)" : "white",
                    color: showBestMove ? "white" : "var(--ink-2)",
                    border: showBestMove ? "2px solid var(--green-dark)" : "2px solid var(--line)",
                    boxShadow: showBestMove ? "0 2px 0 var(--green-dark)" : "none",
                    fontFamily: "var(--sans)",
                  }}
                >
                  Show Best Move
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
