interface Props {
  active: string;
  username?: string;
  onNavigate?: (tab: string) => void;
}

export default function TopNav({ active, username, onNavigate }: Props) {
  const items = [
    { id: "weaknesses", label: "Weaknesses" },
    { id: "drill", label: "Drill" },
    { id: "progress", label: "Progress" },
  ];

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, background: "var(--green)",
            display: "grid", placeItems: "center", color: "white", fontWeight: 900,
            fontSize: 18, boxShadow: "0 3px 0 var(--green-dark)"
          }}>♞</div>
          <span style={{ fontWeight: 800, fontSize: 22, letterSpacing: -0.5 }}>missedtake</span>
        </div>
        <div style={{ display: "flex", gap: 4, background: "white", border: "2px solid var(--line)", padding: 4, borderRadius: 14 }}>
          {items.map(i => (
            <div
              key={i.id}
              onClick={() => onNavigate?.(i.id)}
              style={{
                padding: "8px 16px", fontSize: 14, fontWeight: 800, borderRadius: 10,
                background: i.id === active ? "var(--green)" : "transparent",
                color: i.id === active ? "white" : "var(--ink-2)",
                cursor: "pointer",
                boxShadow: i.id === active ? "0 2px 0 var(--green-dark)" : "none",
              }}
            >
              {i.label}
            </div>
          ))}
        </div>
      </div>
      {username && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 6px 6px 14px", background: "white", border: "2px solid var(--line)", borderRadius: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{username}</span>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--orange)", color: "white", fontWeight: 900, fontSize: 12, display: "grid", placeItems: "center" }}>
            {username.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  );
}
