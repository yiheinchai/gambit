interface Props {
  xp: number;
  level: number;
  xpToNext: number;
  elapsed: string;
}

export default function XpCard({ xp, level, xpToNext, elapsed }: Props) {
  const progress = xpToNext > 0 ? ((xp % (xp + xpToNext)) / (xp + xpToNext)) * 100 : 0;

  return (
    <div style={{
      background: "white", border: "3px solid var(--ink)", borderRadius: 18,
      padding: 16, boxShadow: "0 5px 0 var(--ink)",
    }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
        Session XP
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span style={{ fontSize: 36, fontWeight: 900, color: "var(--green)", letterSpacing: -1 }}>+{xp}</span>
        <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 700 }}>xp · {elapsed}</span>
      </div>
      <div style={{ marginTop: 10, height: 10, background: "var(--bg-2)", borderRadius: 5, overflow: "hidden", border: "1.5px solid var(--line)" }}>
        <div style={{ width: `${progress}%`, height: "100%", background: "var(--green)" }} />
      </div>
      <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", marginTop: 6 }}>
        level {level} · {xpToNext} xp to level {level + 1}
      </div>
    </div>
  );
}
