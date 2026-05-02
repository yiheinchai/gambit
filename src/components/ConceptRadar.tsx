
import type { StoredMistake } from "@/lib/db";
import { CONCEPT_NAMES } from "@/lib/concept-classifier";

interface Props {
  mistakes: StoredMistake[];
}

const DISPLAY_NAMES: Record<string, string> = {
  fork_possible: "Forks",
  pin_exists: "Pins",
  back_rank_threat: "Back Rank",
  hanging_piece: "Hanging Pieces",
  trapped_piece: "Trapped Pieces",
  passed_pawn: "Passed Pawns",
  isolated_pawn: "Isolated Pawns",
  open_file_rook: "Open Files",
  bishop_pair: "Bishop Pair",
  space_advantage: "Space",
  king_exposed: "King Safety",
  material_up: "Converting",
  material_down: "Defending",
};

export default function ConceptRadar({ mistakes }: Props) {
  const withConcepts = mistakes.filter((m) => m.conceptDiff && m.conceptDiff.length > 0);
  if (withConcepts.length < 3) return null;

  // Average concept diff magnitudes across all mistakes
  const avgDiffs = new Array(CONCEPT_NAMES.length).fill(0);
  for (const m of withConcepts) {
    for (let i = 0; i < m.conceptDiff!.length; i++) {
      avgDiffs[i] += Math.abs(m.conceptDiff![i]);
    }
  }
  for (let i = 0; i < avgDiffs.length; i++) {
    avgDiffs[i] /= withConcepts.length;
  }

  // Pick top concepts with meaningful display names
  const topConcepts = CONCEPT_NAMES
    .map((name, i) => ({ name, displayName: DISPLAY_NAMES[name], value: avgDiffs[i] }))
    .filter((c) => c.displayName && c.value > 0.05)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (topConcepts.length < 3) return null;

  const cx = 150;
  const cy = 150;
  const maxR = 120;
  const n = topConcepts.length;
  const maxVal = Math.max(...topConcepts.map((c) => c.value), 0.5);

  const points = topConcepts.map((c, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (c.value / maxVal) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      labelX: cx + (maxR + 20) * Math.cos(angle),
      labelY: cy + (maxR + 20) * Math.sin(angle),
      label: c.displayName!,
      value: c.value,
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <p className="text-zinc-400 text-sm mb-3">Weakness Profile</p>
      <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
        {/* Grid */}
        {rings.map((scale) => (
          <polygon
            key={scale}
            points={topConcepts
              .map((_, i) => {
                const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
                const r = scale * maxR;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
              })
              .join(" ")}
            fill="none"
            stroke="#3f3f46"
            strokeWidth={0.5}
          />
        ))}

        {/* Axis lines */}
        {topConcepts.map((_, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + maxR * Math.cos(angle)}
              y2={cy + maxR * Math.sin(angle)}
              stroke="#3f3f46"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Data polygon */}
        <polygon
          points={polygonPoints}
          fill="#f59e0b"
          fillOpacity={0.15}
          stroke="#f59e0b"
          strokeWidth={2}
        />

        {/* Data points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f59e0b" />
        ))}

        {/* Labels */}
        {points.map((p, i) => (
          <text
            key={i}
            x={p.labelX}
            y={p.labelY}
            textAnchor="middle"
            dominantBaseline="central"
            fill="#a1a1aa"
            fontSize={9}
          >
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
