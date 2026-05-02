interface Props {
  hearts: number;
  maxHearts?: number;
}

export default function HeartsCard({ hearts, maxHearts = 5 }: Props) {
  return (
    <div style={{
      background: "var(--orange)", border: "3px solid var(--orange-dark)",
      borderRadius: 18, padding: 16, boxShadow: "0 5px 0 var(--orange-dark)", color: "white",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.85 }}>Hearts</span>
        {hearts < maxHearts && (
          <span style={{ fontSize: 11, fontFamily: "var(--mono)", opacity: 0.85 }}>refill soon</span>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        {Array.from({ length: maxHearts }).map((_, i) => (
          <div key={i} style={{ fontSize: 28 }}>{i < hearts ? "❤️" : "🤍"}</div>
        ))}
      </div>
    </div>
  );
}
