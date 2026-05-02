import type { StoredMistake } from "@/lib/db";
import { CONCEPT_NAMES } from "@/lib/concept-classifier";

interface Props {
  mistakes: StoredMistake[];
}

function formatFeatureName(name: string): string {
  if (name.startsWith("feature_")) return null as unknown as string;
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/^Is /, "");
}

export default function ConceptRadar({ mistakes }: Props) {
  const withConcepts = mistakes.filter((m) => m.conceptDiff && m.conceptDiff.length > 0);
  if (withConcepts.length < 3) return null;

  const dim = withConcepts[0].conceptDiff!.length;
  const avgDiffs = new Array(dim).fill(0);
  for (const m of withConcepts) {
    for (let i = 0; i < Math.min(dim, m.conceptDiff!.length); i++) {
      avgDiffs[i] += Math.abs(m.conceptDiff![i]);
    }
  }
  for (let i = 0; i < dim; i++) avgDiffs[i] /= withConcepts.length;

  const topConcepts = avgDiffs
    .map((value, i) => {
      const rawName = CONCEPT_NAMES[i] || `feature_${i}`;
      const displayName = formatFeatureName(rawName);
      return { name: rawName, displayName, value };
    })
    .filter((c) => c.displayName && c.value > 0.01)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (topConcepts.length < 3) return null;

  const cx = 150;
  const cy = 150;
  const maxR = 120;
  const n = topConcepts.length;
  const maxVal = Math.max(...topConcepts.map((c) => c.value), 0.1);

  const points = topConcepts.map((c, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (c.value / maxVal) * maxR;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      labelX: cx + (maxR + 20) * Math.cos(angle),
      labelY: cy + (maxR + 20) * Math.sin(angle),
      label: c.displayName,
    };
  });

  const polygonPoints = points.map((p) => `${p.x},${p.y}`).join(" ");
  const rings = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <p className="text-zinc-400 text-sm mb-3">Weakness Profile</p>
      <svg viewBox="0 0 300 300" className="w-full max-w-xs mx-auto">
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
        {topConcepts.map((_, i) => {
          const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
          return (
            <line key={i} x1={cx} y1={cy} x2={cx + maxR * Math.cos(angle)} y2={cy + maxR * Math.sin(angle)} stroke="#3f3f46" strokeWidth={0.5} />
          );
        })}
        <polygon points={polygonPoints} fill="#f59e0b" fillOpacity={0.15} stroke="#f59e0b" strokeWidth={2} />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="#f59e0b" />
        ))}
        {points.map((p, i) => (
          <text key={i} x={p.labelX} y={p.labelY} textAnchor="middle" dominantBaseline="central" fill="#a1a1aa" fontSize={9}>
            {p.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
