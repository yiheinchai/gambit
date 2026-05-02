interface ConceptTrackProps {
  label: string;
  before: number;
  after: number;
  good?: boolean;
}

export function ConceptTrack({ label, before, after, good }: ConceptTrackProps) {
  const dir = after - before;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ink)" }}>{label}</span>
        <span style={{
          fontSize: 10, fontFamily: "var(--mono)", fontWeight: 800,
          color: good ? "var(--green-dark)" : "var(--ink-3)",
        }}>
          {dir > 0 ? "+" : ""}{dir.toFixed(2)}
        </span>
      </div>
      <div style={{ position: "relative", height: 10, background: "var(--bg-2)", borderRadius: 5, border: "1.5px solid var(--line)" }}>
        {/* Before marker */}
        <div style={{
          position: "absolute", left: `${before * 100}%`, top: -2,
          width: 3, height: 14, background: "var(--ink-3)", borderRadius: 1.5,
        }} />
        {/* Fill span between before and after */}
        <div style={{
          position: "absolute",
          left: `${Math.min(before, after) * 100}%`,
          width: `${Math.abs(dir) * 100}%`,
          top: 0, height: "100%",
          background: good ? "var(--green)" : "var(--orange)",
          opacity: 0.5,
          transition: "width 600ms cubic-bezier(0.25, 0.1, 0.25, 1), left 600ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        }} />
        {/* After marker */}
        <div style={{
          position: "absolute", left: `${after * 100}%`, top: -3,
          width: 8, height: 16,
          background: good ? "var(--green)" : "var(--orange)",
          borderRadius: 2, border: "2px solid white",
          transition: "left 600ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        }} />
      </div>
    </div>
  );
}

interface ConceptTrackerCardProps {
  concepts: { label: string; before: number; after: number }[];
  totalDelta?: number;
}

export default function ConceptTrackerCard({ concepts, totalDelta }: ConceptTrackerCardProps) {
  return (
    <div style={{
      background: "white", border: "3px solid var(--ink)", borderRadius: 18,
      padding: 16, boxShadow: "0 5px 0 var(--ink)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        Live concept tracker
      </div>
      {concepts.map((c, i) => (
        <ConceptTrack
          key={i}
          label={c.label}
          before={c.before}
          after={c.after}
          good={c.after > c.before ? true : c.after < c.before ? false : undefined}
        />
      ))}
      {totalDelta !== undefined && (
        <div style={{
          marginTop: 10, padding: 10, background: "var(--bg-2)", borderRadius: 10,
          fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-2)", lineHeight: 1.5,
        }}>
          <span style={{ color: totalDelta >= 0 ? "var(--green-dark)" : "var(--orange-dark)", fontWeight: 800 }}>
            Δ {totalDelta >= 0 ? "+" : ""}{totalDelta.toFixed(2)}
          </span>
          {" · concept distance from centroid "}{totalDelta >= 0 ? "decreased" : "increased"}
        </div>
      )}
    </div>
  );
}
