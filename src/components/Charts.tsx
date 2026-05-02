
interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  title: string;
  valueFormat?: (v: number) => string;
}

export function LineChart({
  data,
  height = 160,
  color = "#f59e0b",
  title,
  valueFormat = (v) => v.toFixed(0),
}: LineChartProps) {
  if (data.length < 2) {
    return (
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
        <p className="text-zinc-400 text-sm mb-2">{title}</p>
        <p className="text-zinc-600 text-xs">Not enough data</p>
      </div>
    );
  }

  const padding = { top: 10, right: 10, bottom: 25, left: 45 };
  const width = 400;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  // Y-axis ticks
  const yTicks = 4;
  const yTickValues = Array.from({ length: yTicks }, (_, i) =>
    minVal + (range * i) / (yTicks - 1)
  );

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <p className="text-zinc-400 text-sm mb-2">{title}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {/* Grid lines */}
        {yTickValues.map((v, i) => {
          const y = padding.top + chartH - ((v - minVal) / range) * chartH;
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#3f3f46"
                strokeWidth={0.5}
              />
              <text x={padding.left - 5} y={y + 3} textAnchor="end" fill="#71717a" fontSize={9}>
                {valueFormat(v)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill={color} fillOpacity={0.1} />

        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />

        {/* X-axis labels */}
        {data.length <= 20
          ? data.map((d, i) => (
              <text
                key={i}
                x={points[i].x}
                y={height - 3}
                textAnchor="middle"
                fill="#71717a"
                fontSize={7}
              >
                {d.label}
              </text>
            ))
          : [0, Math.floor(data.length / 2), data.length - 1].map((i) => (
              <text
                key={i}
                x={points[i].x}
                y={height - 3}
                textAnchor="middle"
                fill="#71717a"
                fontSize={8}
              >
                {data[i].label}
              </text>
            ))}
      </svg>
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
  title: string;
}

export function BarChart({ data, height = 140, title }: BarChartProps) {
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
      <p className="text-zinc-400 text-sm mb-3">{title}</p>
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <span className="text-white text-xs font-medium mb-1">{d.value}</span>
            <div
              className="w-full rounded-t"
              style={{
                height: `${(d.value / maxVal) * (height - 40)}px`,
                backgroundColor: d.color || "#f59e0b",
                minHeight: d.value > 0 ? 4 : 0,
              }}
            />
            <span className="text-zinc-500 text-xs mt-1 truncate w-full text-center">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
