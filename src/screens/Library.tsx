import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useApp } from "../store";
import { getMistakesByUsername, getDrillProgressByUsername } from "../lib/db";
import { CONCEPT_NAMES } from "../lib/concept-classifier";
import type { StoredMistake, DrillProgress } from "../lib/db";
import type { WeaknessCluster } from "../lib/clustering";

/* ─── types ─── */
interface Concept {
  name: string;
  you: number;
  mastery: "mastered" | "improving" | "active" | "weak";
  drilled: number;
  k?: string;
  hot?: boolean;
  /** indices into CONCEPT_NAMES that map to this deduplicated concept */
  indices: number[];
  /** how many mistakes activated this concept */
  appearances: number;
  /** the best matching cluster id for drilling, or -1 */
  clusterId: number;
  /** co-activating concept names with correlation values */
  coActivations: { label: string; v: number }[];
  /** family label for the detail panel */
  familyName: string;
}

interface Family {
  name: string;
  count: number;
  color: string;
  concepts: Concept[];
}

interface ChipBtnProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

interface ConceptTileProps {
  c: Concept;
  color: string;
  active: boolean;
  onClick: () => void;
}

interface ConceptDetailProps {
  concept: Concept | null;
  totalGames: number;
}

interface CoChipProps {
  label: string;
  v: number;
}

interface MiniProps {
  label: string;
  v: string;
  sub: string;
  accent?: boolean;
}

/* ─── family classification ─── */
const FAMILY_RULES: { name: string; color: string; patterns: RegExp[] }[] = [
  {
    name: "Endgame",
    color: "var(--blue)",
    patterns: [/endgame/i, /queenless/i],
  },
  {
    name: "King safety",
    color: "var(--red)",
    patterns: [/king.?exposed/i, /castled/i, /pawn.?shield/i],
  },
  {
    name: "Strategic patterns",
    color: "var(--purple)",
    patterns: [
      /bishop.?pair/i, /open.?file/i, /material/i, /space/i, /outpost/i,
      /advantage/i, /imbalance/i, /middlegame/i,
    ],
  },
  {
    name: "Positional & Phase",
    color: "var(--orange)",
    patterns: [/opening/i, /is.?opening/i, /position/i],
  },
];

function classifyFamily(conceptName: string): { name: string; color: string } {
  for (const rule of FAMILY_RULES) {
    if (rule.patterns.some((p) => p.test(conceptName))) {
      return { name: rule.name, color: rule.color };
    }
  }
  return { name: "General features", color: "#888" };
}

/* ─── mock fallback data ─── */
const MOCK_FAMILIES: Family[] = [
  { name: "Tactical motifs", count: 32, color: "var(--orange)", concepts: [
    { name: "Knight fork", you: 0.72, mastery: "improving", drilled: 84, k: "fork", indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Tactical motifs" },
    { name: "Absolute pin", you: 0.81, mastery: "mastered", drilled: 62, k: "pin", indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Tactical motifs" },
    { name: "Skewer", you: 0.66, mastery: "improving", drilled: 41, k: "skewer", indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Tactical motifs" },
    { name: "Discovered attack", you: 0.43, mastery: "weak", drilled: 12, k: "disc", indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Tactical motifs" },
    { name: "Back-rank threat", you: 0.58, mastery: "improving", drilled: 28, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Tactical motifs" },
    { name: "Overloaded defender", you: 0.39, mastery: "weak", drilled: 8, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Tactical motifs" },
    { name: "Trapped piece", you: 0.28, mastery: "weak", drilled: 4, hot: true, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Tactical motifs" },
    { name: "Hanging piece", you: 0.84, mastery: "mastered", drilled: 91, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Tactical motifs" },
  ]},
  { name: "Strategic patterns", count: 31, color: "var(--purple)", concepts: [
    { name: "Good vs bad bishop", you: 0.34, mastery: "weak", drilled: 9, hot: true, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Strategic patterns" },
    { name: "Open file control", you: 0.72, mastery: "improving", drilled: 44, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Strategic patterns" },
    { name: "Space advantage", you: 0.55, mastery: "active", drilled: 18, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Strategic patterns" },
    { name: "Prophylaxis", you: 0.31, mastery: "weak", drilled: 7, hot: true, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Strategic patterns" },
  ]},
  { name: "Endgame technique", count: 19, color: "var(--blue)", concepts: [
    { name: "Lucena position", you: 0.78, mastery: "mastered", drilled: 24, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Endgame technique" },
    { name: "Opposition (K+P)", you: 0.74, mastery: "improving", drilled: 42, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Endgame technique" },
    { name: "Zugzwang", you: 0.44, mastery: "active", drilled: 12, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "Endgame technique" },
  ]},
  { name: "King safety", count: 14, color: "var(--red)", concepts: [
    { name: "Pawn shield integrity", you: 0.41, mastery: "weak", drilled: 9, hot: true, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "King safety" },
    { name: "Castled vs uncastled", you: 0.68, mastery: "improving", drilled: 33, indices: [], appearances: 0, clusterId: -1, coActivations: [], familyName: "King safety" },
  ]},
];

/* ─── SearchBox ─── */
function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ background: "white", border: "2px solid var(--line)", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, width: 220 }}>
      <span style={{ color: "var(--ink-3)", fontSize: 14 }}>⌕</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder="search concepts" style={{ border: "none", outline: "none", fontFamily: "var(--sans)", fontSize: 13, fontWeight: 600, flex: 1, background: "transparent" }} />
      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", padding: "1px 5px", border: "1px solid var(--line)", borderRadius: 4 }}>⌘K</span>
    </div>
  );
}

/* ─── ChipBtn ─── */
function ChipBtn({ children, active, onClick }: ChipBtnProps) {
  return <div onClick={onClick} style={{ padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 800, background: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink-2)", border: "2px solid " + (active ? "var(--ink)" : "var(--line)"), cursor: "pointer" }}>{children}</div>;
}

/* ─── ConceptTile ─── */
function ConceptTile({ c, color, active, onClick }: ConceptTileProps) {
  const masteryBg: Record<string, string> = { mastered: "var(--green)", improving: "#A8D88A", active: "var(--yellow)", weak: "var(--orange)" };
  const isHot = c.hot;
  return (
    <div onClick={onClick} style={{ background: active ? "var(--bg-2)" : "white", border: active ? `2.5px solid ${color}` : isHot ? `2px dashed ${color}` : "2px solid var(--line)", borderRadius: 10, padding: 10, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6, position: "relative", boxShadow: active ? `0 3px 0 ${color}` : "none" }}>
      {isHot && <div style={{ position: "absolute", top: -7, right: -7, background: "var(--orange)", color: "white", padding: "1px 6px", fontSize: 9, fontWeight: 900, borderRadius: 5, boxShadow: "0 2px 0 var(--orange-dark)", textTransform: "uppercase", letterSpacing: 0.4 }}>hot</div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2 }}>{c.name}</div>
        <div style={{ width: 8, height: 8, borderRadius: 99, background: masteryBg[c.mastery], flexShrink: 0 }} />
      </div>
      <div style={{ height: 4, background: "var(--bg-2)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${c.you*100}%`, height: "100%", background: color, opacity: 0.7 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
        <span>{(c.you).toFixed(2)}</span>
        <span>{c.drilled}x</span>
      </div>
    </div>
  );
}

/* ─── ConceptDetail ─── */
function ConceptDetail({ concept, totalGames }: ConceptDetailProps) {
  const navigate = useNavigate();
  if (!concept) {
    return (
      <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)" }}>
        <p style={{ fontSize: 13, color: "var(--ink-3)", fontWeight: 500 }}>Select a concept to see details.</p>
      </div>
    );
  }

  const masteryLabel = concept.mastery;
  const isHot = concept.hot;
  const masteryColor: Record<string, string> = { mastered: "var(--green)", improving: "#A8D88A", active: "var(--yellow)", weak: "var(--orange)" };
  const badgeBg = isHot ? "var(--orange)" : masteryColor[masteryLabel] || "var(--ink-3)";
  const badgeText = isHot ? `${masteryLabel} · hot` : masteryLabel;
  const conceptIdx = concept.indices.length > 0 ? concept.indices[0] : -1;

  const drillCount = concept.appearances > 0 ? concept.appearances : 0;

  return (
    <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 6px 0 var(--ink)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ background: badgeBg, color: "white", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase" }}>{badgeText}</div>
        <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>concept #{conceptIdx >= 0 ? conceptIdx : "?"} {concept.familyName ? `· ${concept.familyName.toLowerCase()}` : ""}</div>
      </div>
      <h2 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.8, margin: "10px 0 4px", lineHeight: 1.1 }}>{concept.name}</h2>
      <p style={{ fontSize: 13, color: "var(--ink-2)", margin: "4px 0 14px", lineHeight: 1.5, fontWeight: 500 }}>
        {concept.indices.length > 1
          ? `This concept spans ${concept.indices.length} model dimensions. It appears in ${concept.appearances} of your analyzed mistakes.`
          : concept.appearances > 0
            ? `Detected in ${concept.appearances} of your mistakes with an average activation of ${concept.you.toFixed(2)}.`
            : "No activations detected in your games yet. Play and analyze more games to see data."}
      </p>

      {/* example board */}
      <MiniBoardLib />

      {/* probe panel */}
      <div style={{ marginTop: 14, padding: 12, background: "var(--bg-2)", borderRadius: 12, fontFamily: "var(--mono)", fontSize: 11, lineHeight: 1.7 }}>
        <div style={{ color: "var(--ink-3)" }}># model dimensions</div>
        <div>spans {concept.indices.length} dim{concept.indices.length !== 1 ? "s" : ""}: [{concept.indices.slice(0, 6).join(", ")}{concept.indices.length > 6 ? ", ..." : ""}]</div>
        <div style={{ color: "var(--ink-3)", marginTop: 6 }}># drill progress</div>
        <div>{concept.drilled} attempts{concept.mastery === "mastered" ? " (mastered)" : ""}</div>
        {concept.coActivations.length > 0 && (
          <>
            <div style={{ color: "var(--ink-3)", marginTop: 6 }}># co-activates with</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              {concept.coActivations.slice(0, 5).map(co => (
                <CoChip key={co.label} label={co.label} v={co.v} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* your stats */}
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <Mini label="your activation" v={concept.you.toFixed(2)} sub={concept.you < 0.3 ? "low" : concept.you < 0.6 ? "moderate" : "high"} />
        <Mini label="drilled" v={String(concept.drilled)} sub={concept.mastery} />
        <Mini label="appearances" v={String(concept.appearances)} sub={totalGames > 0 ? `last ${totalGames} games` : "no games"} accent={concept.appearances > 0} />
      </div>

      {concept.clusterId >= 0 ? (
        <Link to="/drill" search={{ clusterId: concept.clusterId }} style={{ textDecoration: "none" }}>
          <button style={{ marginTop: 14, width: "100%", background: "var(--orange)", color: "white", border: "none", padding: "14px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--orange-dark)", cursor: "pointer" }}>
            Drill this concept {drillCount > 0 ? `· ${drillCount} positions` : ""}
          </button>
        </Link>
      ) : (
        <button
          onClick={() => navigate({ to: "/drill" })}
          style={{ marginTop: 14, width: "100%", background: "var(--orange)", color: "white", border: "none", padding: "14px", borderRadius: 14, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 13, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--orange-dark)", cursor: "pointer", opacity: 0.7 }}
        >
          Drill all concepts
        </button>
      )}
    </div>
  );
}

/* ─── CoChip ─── */
function CoChip({ label, v }: CoChipProps) {
  return <span style={{ padding: "2px 6px", background: "white", borderRadius: 5, color: "var(--ink-2)", fontWeight: 700, border: "1px solid var(--line)" }}>{label} <span style={{ color: "var(--orange-dark)" }}>{v.toFixed(2)}</span></span>;
}

/* ─── Mini ─── */
function Mini({ label, v, sub, accent }: MiniProps) {
  return (
    <div style={{ background: accent ? "#FFF4E5" : "var(--bg-2)", border: "2px solid " + (accent ? "var(--orange)" : "var(--line)"), borderRadius: 10, padding: 10 }}>
      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent ? "var(--orange-dark)" : "var(--ink)", letterSpacing: -0.3 }}>{v}</div>
      <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{sub}</div>
    </div>
  );
}

/* ─── MiniBoardLib ─── */
function MiniBoardLib() {
  const sq = 32;
  const dark = "#7FA650"; const light = "#EFEFD0";
  const pieces: Record<string, string> = {a8:"♜",e8:"♚",h8:"♜",a7:"♟",f7:"♟",g7:"♟",h7:"♟",d7:"♞",c6:"♞",d6:"♟",e5:"♟",c3:"♘",a2:"♙",b2:"♙",f2:"♙",g2:"♙",h2:"♙",a1:"♖",e1:"♔",h1:"♖"};
  const heat: Record<string, number> = { d7: 0.92, b8: 0.5, f6: 0.3 };
  const files = ["a","b","c","d","e","f","g","h"]; const ranks = [8,7,6,5,4,3,2,1];
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

/* ─── data helpers ─── */
function buildConceptData(
  mistakes: StoredMistake[],
  clusters: WeaknessCluster[],
  drillProgress: DrillProgress[],
): Family[] {
  if (CONCEPT_NAMES.length === 0) return [];

  // Deduplicate concept names: group indices by their display name
  const nameToIndices = new Map<string, number[]>();
  for (let i = 0; i < CONCEPT_NAMES.length; i++) {
    const n = CONCEPT_NAMES[i];
    // Skip raw feature_N names — they are uninterpreted
    if (/^feature_\d+$/i.test(n)) continue;
    const existing = nameToIndices.get(n);
    if (existing) existing.push(i);
    else nameToIndices.set(n, [i]);
  }

  // Compute per-dimension averages across mistakes that have conceptDiff
  const withDiff = mistakes.filter(m => m.conceptDiff && m.conceptDiff.length > 0);
  const dim = CONCEPT_NAMES.length;
  const avgActivation = new Float64Array(dim);
  const activationCount = new Uint32Array(dim);

  for (const m of withDiff) {
    const diff = m.conceptDiff!;
    for (let i = 0; i < Math.min(diff.length, dim); i++) {
      const v = Math.abs(diff[i]);
      if (v > 0.01) {
        avgActivation[i] += v;
        activationCount[i]++;
      }
    }
  }
  for (let i = 0; i < dim; i++) {
    if (activationCount[i] > 0) avgActivation[i] /= activationCount[i];
  }

  // Build co-activation matrix (correlation between dimensions within same mistake)
  // We'll compute per unique-concept pair how often they co-activate
  const uniqueNames = Array.from(nameToIndices.keys());
  const coActivationSums = new Map<string, Map<string, { sum: number; count: number }>>();

  if (withDiff.length > 0) {
    // For each pair of unique concepts, measure co-activation
    for (const m of withDiff) {
      const diff = m.conceptDiff!;
      // For each unique concept, compute its aggregate activation in this mistake
      const conceptActivations = new Map<string, number>();
      for (const [name, indices] of nameToIndices) {
        let maxAct = 0;
        for (const idx of indices) {
          if (idx < diff.length) maxAct = Math.max(maxAct, Math.abs(diff[idx]));
        }
        if (maxAct > 0.05) conceptActivations.set(name, maxAct);
      }

      // Record co-activations
      const activeNames = Array.from(conceptActivations.keys());
      for (let i = 0; i < activeNames.length; i++) {
        for (let j = i + 1; j < activeNames.length; j++) {
          const a = activeNames[i], b = activeNames[j];
          const va = conceptActivations.get(a)!, vb = conceptActivations.get(b)!;
          const corr = Math.min(va, vb);

          if (!coActivationSums.has(a)) coActivationSums.set(a, new Map());
          if (!coActivationSums.has(b)) coActivationSums.set(b, new Map());
          const mapA = coActivationSums.get(a)!;
          const mapB = coActivationSums.get(b)!;
          const entryAB = mapA.get(b) || { sum: 0, count: 0 };
          entryAB.sum += corr; entryAB.count++;
          mapA.set(b, entryAB);
          const entryBA = mapB.get(a) || { sum: 0, count: 0 };
          entryBA.sum += corr; entryBA.count++;
          mapB.set(a, entryBA);
        }
      }
    }
  }

  // Determine "hot" concepts: those that appear in cluster top concepts
  const hotConceptNames = new Set<string>();
  for (const cluster of clusters) {
    for (const tc of cluster.topConcepts) {
      hotConceptNames.add(tc.name);
    }
  }

  // Map drill progress by clusterId
  const drillByCluster = new Map<number, DrillProgress>();
  for (const dp of drillProgress) {
    drillByCluster.set(dp.clusterId, dp);
  }

  // Build concepts
  const concepts: Concept[] = [];
  for (const [name, indices] of nameToIndices) {
    // Aggregate activation: take the max avg across all indices for this concept
    let you = 0;
    let totalAppearances = 0;
    for (const idx of indices) {
      you = Math.max(you, avgActivation[idx]);
      totalAppearances = Math.max(totalAppearances, activationCount[idx]);
    }

    // Find best matching cluster for this concept
    let bestClusterId = -1;
    let bestClusterScore = 0;
    for (const cluster of clusters) {
      for (const tc of cluster.topConcepts) {
        if (tc.name === name || indices.some(i => CONCEPT_NAMES[i] === tc.name)) {
          const score = tc.avgActivation * cluster.frequency;
          if (score > bestClusterScore) {
            bestClusterScore = score;
            bestClusterId = cluster.id;
          }
        }
      }
    }

    // Compute drill count from matching cluster's progress
    let drilled = 0;
    if (bestClusterId >= 0) {
      const dp = drillByCluster.get(bestClusterId);
      if (dp) drilled = dp.totalAttempts;
    }

    // Determine mastery
    let mastery: Concept["mastery"] = "weak";
    if (drilled >= 50 && you > 0.6) mastery = "mastered";
    else if (drilled >= 20 && you > 0.4) mastery = "improving";
    else if (drilled >= 5 || you > 0.3) mastery = "active";

    // Co-activations
    const coMap = coActivationSums.get(name);
    const coActivations: { label: string; v: number }[] = [];
    if (coMap) {
      for (const [coName, { sum, count }] of coMap) {
        if (count >= 2) {
          coActivations.push({ label: coName, v: sum / count });
        }
      }
      coActivations.sort((a, b) => b.v - a.v);
    }

    const family = classifyFamily(name);

    concepts.push({
      name,
      you,
      mastery,
      drilled,
      hot: hotConceptNames.has(name) || indices.some(i => hotConceptNames.has(CONCEPT_NAMES[i])),
      indices,
      appearances: totalAppearances,
      clusterId: bestClusterId,
      coActivations,
      familyName: family.name,
    });
  }

  // Sort concepts by activation descending within each family
  concepts.sort((a, b) => b.you - a.you);

  // Group into families
  const familyMap = new Map<string, { color: string; concepts: Concept[] }>();
  for (const c of concepts) {
    const { name: famName, color } = classifyFamily(c.name);
    if (!familyMap.has(famName)) familyMap.set(famName, { color, concepts: [] });
    familyMap.get(famName)!.concepts.push(c);
  }

  const families: Family[] = [];
  for (const [name, { color, concepts: fConcepts }] of familyMap) {
    families.push({
      name,
      count: fConcepts.length,
      color,
      concepts: fConcepts,
    });
  }

  // Sort families by number of concepts descending
  families.sort((a, b) => b.concepts.length - a.concepts.length);

  return families;
}

/* ─── Main screen ─── */
export default function Library() {
  const store = useApp();
  const navigate = useNavigate();
  const [localMistakes, setLocalMistakes] = useState<StoredMistake[]>([]);
  const [localDrillProgress, setLocalDrillProgress] = useState<DrillProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "weak" | "hot">("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      // Use store data if available
      if (store.mistakes.length > 0) {
        setLocalMistakes(store.mistakes);
        setLocalDrillProgress(store.drillProgress);
        setLoading(false);
        return;
      }

      const username = store.username;
      if (!username) {
        navigate({ to: "/" });
        return;
      }

      const [dbMistakes, dbDrill] = await Promise.all([
        getMistakesByUsername(username),
        getDrillProgressByUsername(username),
      ]);

      if (dbMistakes.length === 0) {
        // No data yet — just show mock
        setLoading(false);
        return;
      }

      setLocalMistakes(dbMistakes);
      setLocalDrillProgress(dbDrill);
      store.setMistakes(dbMistakes);
      store.setDrillProgress(dbDrill);
      setLoading(false);
    }
    loadData();
  }, [store.username, store.mistakes.length]);

  const families = useMemo(() => {
    const real = buildConceptData(localMistakes, store.clusters, localDrillProgress);
    // If CONCEPT_NAMES not loaded yet or no mistakes, fall back to mock
    if (real.length === 0) return MOCK_FAMILIES;
    return real;
  }, [localMistakes, store.clusters, localDrillProgress]);

  // Flatten all concepts for mastery stats
  const allConcepts = useMemo(() => families.flatMap(f => f.concepts), [families]);

  // Filtered families
  const filteredFamilies = useMemo(() => {
    return families.map(fam => {
      let concepts = fam.concepts;
      if (filter === "weak") concepts = concepts.filter(c => c.mastery === "weak");
      if (filter === "hot") concepts = concepts.filter(c => c.hot);
      if (search.trim()) {
        const q = search.toLowerCase();
        concepts = concepts.filter(c => c.name.toLowerCase().includes(q));
      }
      return { ...fam, concepts };
    }).filter(fam => fam.concepts.length > 0);
  }, [families, filter, search]);

  const mastered = allConcepts.filter(c => c.mastery === "mastered").length;
  const improving = allConcepts.filter(c => c.mastery === "improving").length;
  const active = allConcepts.filter(c => c.mastery === "active").length;
  const weak = allConcepts.filter(c => c.mastery === "weak").length;
  const total = allConcepts.length;
  const engaged = mastered + improving + active + weak;
  const unseen = Math.max(0, total - engaged);

  const [activeName, setActiveName] = useState<string>("");

  // Set initial active concept
  useEffect(() => {
    if (!activeName && allConcepts.length > 0) {
      // Pick first "hot" concept, or first weak, or first concept
      const hot = allConcepts.find(c => c.hot);
      const weakC = allConcepts.find(c => c.mastery === "weak");
      setActiveName(hot?.name || weakC?.name || allConcepts[0].name);
    }
  }, [allConcepts, activeName]);

  const activeConcept = useMemo(() => {
    return allConcepts.find(c => c.name === activeName) || null;
  }, [allConcepts, activeName]);

  const totalGames = store.games.length;

  if (loading) {
    return (
      <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", display: "grid", placeItems: "center" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-3)" }}>Loading concept library...</div>
      </div>
    );
  }

  // Compute bar percentages
  const pctMastered = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const pctImproving = total > 0 ? Math.round((improving / total) * 100) : 0;
  const pctActive = total > 0 ? Math.round((active / total) * 100) : 0;
  const pctWeak = total > 0 ? Math.round((weak / total) * 100) : 0;

  return (
    <div style={{ width: "100%", minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--sans)", padding: "20px 40px" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Concept library {"·"} {total} dimensions</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "6px 0 0", lineHeight: 1.05 }}>Every chess idea, mapped.</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <SearchBox value={search} onChange={setSearch} />
          <ChipBtn active={filter === "all"} onClick={() => setFilter("all")}>All</ChipBtn>
          <ChipBtn active={filter === "weak"} onClick={() => setFilter("weak")}>Weak only</ChipBtn>
          <ChipBtn active={filter === "hot"} onClick={() => setFilter("hot")}>Hot</ChipBtn>
        </div>
      </div>

      {/* mastery summary band */}
      <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 16, boxShadow: "0 6px 0 var(--ink)", display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24, marginBottom: 18, alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Your mastery</div>
          <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4, letterSpacing: -0.5 }}>{engaged} / {total} concepts</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 4 }}>{mastered} mastered {"·"} {improving} improving {"·"} {active} active {"·"} {weak} weak</div>
        </div>
        <div style={{ height: 28, borderRadius: 8, overflow: "hidden", display: "flex", border: "2px solid var(--ink)" }}>
          {pctMastered > 0 && <div style={{ width: `${pctMastered}%`, background: "var(--green)", display: "grid", placeItems: "center", color: "white", fontSize: 10, fontWeight: 900, letterSpacing: 0.5 }}>{mastered}</div>}
          {pctImproving > 0 && <div style={{ width: `${pctImproving}%`, background: "#A8D88A", display: "grid", placeItems: "center", color: "var(--ink)", fontSize: 10, fontWeight: 900 }}>{improving}</div>}
          {pctActive > 0 && <div style={{ width: `${pctActive}%`, background: "var(--yellow)", display: "grid", placeItems: "center", color: "var(--ink)", fontSize: 10, fontWeight: 900 }}>{active}</div>}
          {pctWeak > 0 && <div style={{ width: `${pctWeak}%`, background: "var(--orange)", display: "grid", placeItems: "center", color: "white", fontSize: 10, fontWeight: 900 }}>{weak}</div>}
          <div style={{ flex: 1, background: "var(--bg-2)", display: "grid", placeItems: "center", color: "var(--ink-3)", fontSize: 10, fontWeight: 900 }}>{unseen > 0 ? `${unseen} unseen` : "all seen"}</div>
        </div>
      </div>

      {/* main grid: families list + detail */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 18 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredFamilies.map(fam => (
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
                  <ConceptTile key={c.name} c={c} color={fam.color} active={activeName === c.name} onClick={() => setActiveName(c.name)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* concept detail panel */}
        <div style={{ position: "sticky", top: 20, alignSelf: "start" }}>
          <ConceptDetail concept={activeConcept} totalGames={totalGames} />
        </div>
      </div>
    </div>
  );
}
