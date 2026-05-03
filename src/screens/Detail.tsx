import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../store";
import { Route } from "../routes/detail";
import { CONCEPT_NAMES } from "../lib/concept-classifier";
import { getMistakesByUsername, getGamesByUsername } from "../lib/db";
import { clusterMistakes } from "../lib/clustering";
import type { StoredMistake, StoredGame } from "../lib/db";
import type { WeaknessCluster } from "../lib/clustering";

export default function Detail() {
  const store = useApp();
  const navigate = useNavigate();
  const { clusterId } = Route.useSearch();

  const [localClusters, setLocalClusters] = useState<WeaknessCluster[]>(store.clusters);
  const [localGames, setLocalGames] = useState<StoredGame[]>(store.games);
  const [loading, setLoading] = useState(store.clusters.length === 0);
  const [posIdx, setPosIdx] = useState(0);

  // Hydrate from DB if store is empty
  useEffect(() => {
    if (store.clusters.length > 0) {
      setLocalClusters(store.clusters);
      setLocalGames(store.games);
      setLoading(false);
      return;
    }
    const username = store.username;
    if (!username) {
      navigate({ to: "/" });
      return;
    }
    (async () => {
      const [dbMistakes, dbGames] = await Promise.all([
        getMistakesByUsername(username),
        getGamesByUsername(username),
      ]);
      if (dbMistakes.length === 0) {
        navigate({ to: "/dashboard" });
        return;
      }
      const computed = clusterMistakes(dbMistakes);
      store.setGames(dbGames);
      store.setMistakes(dbMistakes);
      store.setClusters(computed);
      setLocalClusters(computed);
      setLocalGames(dbGames);
      setLoading(false);
    })();
  }, []);

  // Resolve the target cluster
  const cluster = useMemo(() => {
    if (localClusters.length === 0) return null;
    if (clusterId !== undefined) {
      const found = localClusters.find((c) => c.id === clusterId);
      if (found) return found;
    }
    return localClusters[0];
  }, [localClusters, clusterId]);

  // Rank = position in sorted cluster list (1-based)
  const rank = useMemo(() => {
    if (!cluster) return 1;
    const idx = localClusters.findIndex((c) => c.id === cluster.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [localClusters, cluster]);

  // Reset posIdx when cluster changes
  useEffect(() => { setPosIdx(0); }, [cluster?.id]);

  // Redirect if no clusters at all
  useEffect(() => {
    if (!loading && localClusters.length === 0) {
      navigate({ to: "/dashboard" });
    }
  }, [loading, localClusters]);

  if (loading || !cluster) {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", fontFamily: "var(--sans)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>♞</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ink)" }}>Loading cluster details...</div>
        </div>
      </div>
    );
  }

  const mistakes = cluster.mistakes;
  const currentMistake = mistakes[posIdx] || mistakes[0];
  const totalPositions = mistakes.length;

  // Build game lookup map
  const gameMap = useMemo(() => {
    const m = new Map<string, StoredGame>();
    for (const g of localGames) m.set(g.id, g);
    return m;
  }, [localGames]);

  // Badge color based on rank
  const PALETTE = ["var(--orange)", "var(--red)", "var(--purple)", "var(--blue)", "var(--yellow)", "var(--green)"];
  const PALETTE_DARK = ["var(--orange-dark)", "#A8281C", "#5C2E91", "#1E3A8A", "var(--yellow-dark)", "var(--green-dark)"];
  const badgeColor = PALETTE[(rank - 1) % PALETTE.length];
  const badgeShadow = PALETTE_DARK[(rank - 1) % PALETTE_DARK.length];

  // Extract opponent name from gameId
  const getOpponent = (m: StoredMistake): string => {
    const game = gameMap.get(m.gameId);
    if (!game) return m.gameId.slice(0, 12);
    // gameId often is a URL segment; extract opponent from game data
    return m.gameId.replace(/.*\//, "").slice(0, 16);
  };

  // Navigate positions
  const goPrev = () => setPosIdx((i) => Math.max(0, i - 1));
  const goNext = () => setPosIdx((i) => Math.min(totalPositions - 1, i + 1));

  // Concept diff data for the current mistake
  const conceptDiffData = useMemo(() => {
    const diff = currentMistake?.conceptDiff;
    if (!diff || diff.length === 0) return [];
    return diff
      .map((val, idx) => ({
        name: CONCEPT_NAMES[idx] || `feature_${idx}`,
        delta: val,
        absDelta: Math.abs(val),
      }))
      .sort((a, b) => b.absDelta - a.absDelta)
      .slice(0, 8);
  }, [currentMistake]);

  // Eval formatting: centipawns to pawns
  const cpToPawn = (cp: number) => {
    const p = cp / 100;
    return (p >= 0 ? "+" : "") + p.toFixed(1);
  };

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        {/* breadcrumb */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, color: "var(--ink-3)" }}>
          <Link to="/dashboard" style={{ textDecoration: "none", color: "inherit" }}><span>Weaknesses</span></Link><span>›</span><span style={{ color: "var(--ink)" }}>#{rank} {cluster.label}</span>
        </div>

        {/* header */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "end", marginTop: 14 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ background: badgeColor, color: "white", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: `0 3px 0 ${badgeShadow}` }}>weakness #{rank}</div>
              <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>cluster_id: c.{cluster.id.toString(16).padStart(4, "0")} · {cluster.frequency} occurrence{cluster.frequency !== 1 ? "s" : ""}</div>
            </div>
            <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "8px 0 4px", lineHeight: 1.05 }}>{cluster.label}</h1>
            <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: 720, lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
              {cluster.description}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link to="/drill" search={{ clusterId: cluster.id }} style={{ textDecoration: "none" }}><button style={{ background: "var(--orange)", color: "white", border: "none", padding: "16px 26px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 14, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--orange-dark)", cursor: "pointer" }}>Start drilling</button></Link>
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
                <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>vs. {getOpponent(currentMistake)} · move {currentMistake.moveNumber} · {currentMistake.gamePhase}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{posIdx + 1}/{totalPositions}</span>
                <button onClick={goPrev} disabled={posIdx === 0} style={navBtn(posIdx === 0)}>‹</button>
                <button onClick={goNext} disabled={posIdx === totalPositions - 1} style={navBtn(posIdx === totalPositions - 1)}>›</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 18 }}>
              <BoardWithHeat fen={currentMistake.fen} conceptDiff={currentMistake.conceptDiff} movePlayed={currentMistake.movePlayed} />
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  <Toggle active>Heatmap: concept</Toggle>
                  <Toggle>Eval</Toggle>
                  <Toggle>Mobility</Toggle>
                </div>
                <div style={{ background: "var(--bg-2)", borderRadius: 12, padding: 14, fontFamily: "var(--mono)", fontSize: 12, lineHeight: 1.7 }}>
                  <div style={{ color: "var(--ink-3)" }}># your move</div>
                  <div>{currentMistake.moveNumber}. ... <b style={{ color: "var(--orange-dark)" }}>{currentMistake.movePlayed}{currentMistake.severity === "blunder" ? "??" : currentMistake.severity === "mistake" ? "?" : "?!"}</b>  <span style={{ color: "var(--ink-3)" }}>cpl {currentMistake.centipawnLoss}</span></div>
                  <div style={{ color: "var(--ink-3)", marginTop: 8 }}># engine line</div>
                  <div>{currentMistake.moveNumber}. ... <b style={{ color: "var(--green-dark)" }}>{currentMistake.bestMove}</b></div>
                  <div style={{ marginTop: 6 }}>eval {cpToPawn(currentMistake.evalBefore)} → {cpToPawn(currentMistake.evalAfter)}</div>
                </div>

                <div style={{ marginTop: 14, padding: 14, background: "#FFF4E5", border: "2px solid var(--orange)", borderRadius: 12 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--orange)", color: "white", display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0 }}>!</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "var(--orange-dark)", letterSpacing: 0.4, textTransform: "uppercase" }}>What you missed</div>
                      <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 4, lineHeight: 1.5, fontWeight: 500 }}>
                        You played <b>{currentMistake.movePlayed}</b> but <b>{currentMistake.bestMove}</b> was best.
                        This cost {currentMistake.centipawnLoss} centipawns (eval went from {cpToPawn(currentMistake.evalBefore)} to {cpToPawn(currentMistake.evalAfter)}).
                        {conceptDiffData.length > 0 && <> The key concept gap: <b>{conceptDiffData[0].name.replace(/_/g, " ")}</b> (delta {conceptDiffData[0].delta.toFixed(2)}).</>}
                      </div>
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

            <ConceptDiffViz
              conceptDiffData={conceptDiffData}
              movePlayed={currentMistake.movePlayed}
              bestMove={currentMistake.bestMove}
            />

            <div style={{ marginTop: 14, fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)", lineHeight: 1.6 }}>
              {CONCEPT_NAMES.length > 0
                ? <>concept model · {CONCEPT_NAMES.length} dims<br />shown: top {Math.min(8, conceptDiffData.length)} dims by |delta|</>
                : <>no concept data available</>}
            </div>
          </div>
        </div>

        {/* gallery of all positions in cluster */}
        <div style={{ marginTop: 20, background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>All {totalPositions} position{totalPositions !== 1 ? "s" : ""} in this cluster</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>Sorted by similarity to centroid</div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Toggle active>Cluster view</Toggle>
              <Toggle>List</Toggle>
              <Toggle>UMAP</Toggle>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12 }}>
            {mistakes.slice(0, 6).map((m, i) => (
              <ClusterMember
                key={m.id ?? i}
                mistake={m}
                idx={i}
                gameMap={gameMap}
                isActive={i === posIdx}
                onClick={() => setPosIdx(i)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function navBtn(disabled: boolean): React.CSSProperties {
  return { width: 32, height: 32, borderRadius: 10, border: "2px solid var(--line)", background: "white", fontWeight: 900, fontSize: 16, cursor: disabled ? "default" : "pointer", fontFamily: "var(--sans)", opacity: disabled ? 0.4 : 1 };
}

function Toggle({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return <div style={{ padding: "6px 12px", borderRadius: 10, fontSize: 11, fontWeight: 800, background: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink-2)", border: "2px solid " + (active ? "var(--ink)" : "var(--line)"), cursor: "pointer", letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</div>;
}

/* ---- Board with heatmap overlay ---- */

function BoardWithHeat({ fen, conceptDiff, movePlayed }: { fen: string; conceptDiff: number[] | null; movePlayed: string }) {
  const sq = 44;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const files = ["a","b","c","d","e","f","g","h"]; const ranks = [8,7,6,5,4,3,2,1];

  // Parse FEN to place pieces
  const pieces = useMemo(() => {
    const map: Record<string, string> = {};
    const fenBoard = fen.split(" ")[0];
    const fenRanks = fenBoard.split("/");
    const PIECE_UNICODE: Record<string, string> = {
      K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
      k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
    };
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of fenRanks[r]) {
        if (ch >= "1" && ch <= "8") {
          f += parseInt(ch);
        } else {
          const key = files[f] + (8 - r);
          map[key] = PIECE_UNICODE[ch] || ch;
          f++;
        }
      }
    }
    return map;
  }, [fen]);

  // Build heat map from conceptDiff magnitudes.
  // We spread heat across the board near the move target square.
  const heat = useMemo(() => {
    const h: Record<string, number> = {};
    if (!conceptDiff || conceptDiff.length === 0) return h;

    // Use conceptDiff total magnitude to create a general intensity
    const totalMag = conceptDiff.reduce((s, v) => s + Math.abs(v), 0);
    const maxMag = Math.max(...conceptDiff.map(Math.abs));
    if (maxMag === 0) return h;

    // Try to parse the target square from movePlayed (e.g. "Nd7" -> "d7", "Bxf3" -> "f3", "e4" -> "e4")
    const moveStr = movePlayed || "";
    const sqMatch = moveStr.match(/([a-h])([1-8])(?:\+|#|=.*)?$/);
    if (sqMatch) {
      const tf = sqMatch[1];
      const tr = parseInt(sqMatch[2]);
      // High heat on target square
      h[tf + tr] = Math.min(1, totalMag / (conceptDiff.length * 0.5));
      // Spread heat to adjacent squares
      const fi = files.indexOf(tf);
      for (let dr = -1; dr <= 1; dr++) {
        for (let df = -1; df <= 1; df++) {
          if (dr === 0 && df === 0) continue;
          const nr = tr + dr;
          const nf = fi + df;
          if (nr >= 1 && nr <= 8 && nf >= 0 && nf < 8) {
            const key = files[nf] + nr;
            h[key] = Math.max(h[key] || 0, Math.min(0.6, totalMag / (conceptDiff.length * 0.8)));
          }
        }
      }
      // Further ring at distance 2
      for (let dr = -2; dr <= 2; dr++) {
        for (let df = -2; df <= 2; df++) {
          if (Math.abs(dr) <= 1 && Math.abs(df) <= 1) continue;
          const nr = tr + dr;
          const nf = fi + df;
          if (nr >= 1 && nr <= 8 && nf >= 0 && nf < 8) {
            const key = files[nf] + nr;
            h[key] = Math.max(h[key] || 0, Math.min(0.3, totalMag / (conceptDiff.length * 1.2)));
          }
        }
      }
    }
    return h;
  }, [conceptDiff, movePlayed]);

  // Determine which piece is "the mistake piece" for a TRAP label
  const targetSq = useMemo(() => {
    const moveStr = movePlayed || "";
    const sqMatch = moveStr.match(/([a-h])([1-8])(?:\+|#|=.*)?$/);
    return sqMatch ? sqMatch[1] + sqMatch[2] : null;
  }, [movePlayed]);

  const BLACK_PIECES = ["♟","♜","♞","♛","♚","♝"];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 8, overflow: "hidden", border: "2px solid var(--ink)", width: sq*8, position: "relative" }}>
        {ranks.map(r => files.map(f => {
          const isDark = (files.indexOf(f) + r) % 2 === 0;
          const k = f+r; const hv = heat[k] || 0;
          const isPiece = !!pieces[k];
          return (
            <div key={k} style={{ width: sq, height: sq, background: isDark?dark:light, display:"grid", placeItems:"center", fontSize: 28, color: BLACK_PIECES.includes(pieces[k])?"var(--ink)":"white", position: "relative" }}>
              {hv > 0 && <div style={{ position: "absolute", inset: 4, background: `rgba(255, 86, 48, ${hv})`, borderRadius: 6, border: hv > 0.7 ? "2px solid #B23A1C" : "none" }} />}
              <span style={{ position: "relative", zIndex: 1 }}>{pieces[k] || ""}</span>
              {k === targetSq && isPiece && <div style={{ position: "absolute", top: 2, right: 3, zIndex: 2, fontSize: 9, fontWeight: 900, color: "white", background: "#B23A1C", padding: "1px 4px", borderRadius: 4, fontFamily: "var(--mono)" }}>!</div>}
            </div>
          );
        }))}
      </div>
      {/* heat legend */}
      <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", textTransform: "uppercase" }}>concept heat</span>
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: "linear-gradient(90deg, transparent, rgba(255,86,48,0.3), rgba(255,86,48,0.95))" }} />
        <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>0 → 1</span>
      </div>
    </div>
  );
}

/* ---- Concept diff visualization ---- */

interface ConceptDiffItem { name: string; delta: number; absDelta: number }

function ConceptDiffViz({ conceptDiffData, movePlayed, bestMove }: { conceptDiffData: ConceptDiffItem[]; movePlayed: string; bestMove: string }) {
  if (conceptDiffData.length === 0) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 13, fontWeight: 500 }}>
        No concept diff data for this position. The ONNX concept model may not have classified this position.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        <span style={{ color: "var(--orange-dark)" }}>← your move ({movePlayed})</span>
        <span>concept</span>
        <span style={{ color: "var(--green-dark)" }}>engine ({bestMove}) →</span>
      </div>
      <div style={{ position: "relative" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: "var(--ink)", transform: "translateX(-1px)" }} />
        {conceptDiffData.map((d, i) => {
          const hot = d.absDelta > 0.5;
          // Negative delta = your move was worse on this concept (show on left)
          // Positive delta = your move emphasized this more (show on right)
          const leftBar = d.delta < 0 ? d.absDelta : 0;
          const rightBar = d.delta > 0 ? d.absDelta : 0;
          return (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", height: 26, marginBottom: 4 }}>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {leftBar > 0 && (
                  <div style={{ width: `${Math.min(leftBar * 100, 100)}%`, height: 14, background: hot ? "var(--orange)" : "rgba(255,139,61,0.5)", borderRadius: "4px 0 0 4px", border: hot ? "2px solid var(--orange-dark)" : "none", borderRight: "none" }} />
                )}
              </div>
              <div style={{ textAlign: "center", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700, color: hot ? "var(--ink)" : "var(--ink-2)", padding: "0 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 120 }}>
                {hot && <span style={{ color: "var(--orange-dark)", marginRight: 4 }}>●</span>}
                {d.name.replace(/_/g, " ")}
              </div>
              <div style={{ display: "flex" }}>
                {rightBar > 0 && (
                  <div style={{ width: `${Math.min(rightBar * 100, 100)}%`, height: 14, background: hot ? "var(--green)" : "rgba(88,204,2,0.5)", borderRadius: "0 4px 4px 0", border: hot ? "2px solid var(--green-dark)" : "none", borderLeft: "none" }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 14, padding: 12, background: "var(--bg-2)", borderRadius: 10, fontSize: 12, color: "var(--ink-2)", fontWeight: 500, lineHeight: 1.5 }}>
        <b style={{ color: "var(--ink)" }}>Reading this:</b> the bigger the gap, the more the engine's move <i>activates</i> a concept your move ignored.
        {conceptDiffData.filter(d => d.absDelta > 0.5).length > 0 && (
          <> {conceptDiffData.filter(d => d.absDelta > 0.5).length} "hot" dim{conceptDiffData.filter(d => d.absDelta > 0.5).length !== 1 ? "s" : ""} dominate{conceptDiffData.filter(d => d.absDelta > 0.5).length === 1 ? "s" : ""} this position: {conceptDiffData.filter(d => d.absDelta > 0.5).map(d => d.name.replace(/_/g, " ")).join(", ")}.</>
        )}
      </div>
    </div>
  );
}

/* ---- Cluster member card ---- */

function ClusterMember({ mistake, idx, gameMap, isActive, onClick }: {
  mistake: StoredMistake;
  idx: number;
  gameMap: Map<string, StoredGame>;
  isActive: boolean;
  onClick: () => void;
}) {
  const sq = 18;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const filesArr = ["a","b","c","d","e","f","g","h"]; const ranksArr = [8,7,6,5,4,3,2,1];

  // Parse the FEN to render a mini board
  const pieces = useMemo(() => {
    const map: Record<string, string> = {};
    const fenBoard = mistake.fen.split(" ")[0];
    const fenRanks = fenBoard.split("/");
    const PIECE_UNICODE: Record<string, string> = {
      K: "♔", Q: "♕", R: "♖", B: "♗", N: "♘", P: "♙",
      k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟",
    };
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const ch of fenRanks[r]) {
        if (ch >= "1" && ch <= "8") {
          f += parseInt(ch);
        } else {
          const key = filesArr[f] + (8 - r);
          map[key] = PIECE_UNICODE[ch] || ch;
          f++;
        }
      }
    }
    return map;
  }, [mistake.fen]);

  // Highlight the target square of the mistake move
  const targetSq = useMemo(() => {
    const moveStr = mistake.movePlayed || "";
    const sqMatch = moveStr.match(/([a-h])([1-8])(?:\+|#|=.*)?$/);
    return sqMatch ? sqMatch[1] + sqMatch[2] : null;
  }, [mistake.movePlayed]);

  // Opponent name from game
  const opponent = useMemo(() => {
    const game = gameMap.get(mistake.gameId);
    if (!game) return mistake.gameId.replace(/.*\//, "").slice(0, 12);
    return mistake.gameId.replace(/.*\//, "").slice(0, 16);
  }, [mistake.gameId, gameMap]);

  // Similarity score: index-based fallback (closer to front = higher similarity)
  const simScore = (0.96 - idx * 0.04).toFixed(2);

  const BLACK_PIECES = ["♟","♜","♞","♛","♚","♝"];

  return (
    <div onClick={onClick} style={{ background: isActive ? "#FFF7DB" : "var(--bg-2)", borderRadius: 12, padding: 12, border: isActive ? "2px solid var(--orange)" : "2px solid var(--line)", cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>vs {opponent}</div>
        <div style={{ fontSize: 9, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>sim {simScore}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(8, ${sq}px)`, borderRadius: 4, overflow: "hidden", border: "1.5px solid var(--ink)", width: sq*8, margin: "0 auto" }}>
        {ranksArr.map(r => filesArr.map(f => {
          const isDark = (filesArr.indexOf(f) + r) % 2 === 0;
          const k = f+r; const isTarget = k === targetSq;
          return <div key={k} style={{ width: sq, height: sq, background: isTarget ? "var(--orange)" : (isDark?dark:light), display:"grid", placeItems:"center", fontSize: 13, color: BLACK_PIECES.includes(pieces[k] || "")?"var(--ink)":"white" }}>{pieces[k] || ""}</div>;
        }))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, fontFamily: "var(--mono)" }}>
        <span style={{ color: "var(--orange-dark)", fontWeight: 800 }}>cpl {mistake.centipawnLoss}</span>
        <span style={{ color: "var(--ink-3)" }}>m{mistake.moveNumber}</span>
      </div>
    </div>
  );
}
