interface ConceptDim {
  name: string;
  yourMove: number;
  engineMove: number;
  hot?: boolean;
}

interface Props {
  concepts: ConceptDim[];
  yourMoveLabel?: string;
  engineMoveLabel?: string;
}

export default function ConceptDiffViz({ concepts, yourMoveLabel = "Your move", engineMoveLabel = "Engine" }: Props) {
  const maxVal = Math.max(...concepts.map(c => Math.max(c.yourMove, c.engineMove)), 0.01);

  return (
    <div style={{
      background: "white", border: "3px solid var(--ink)", borderRadius: 20,
      padding: 22, boxShadow: "0 6px 0 var(--ink)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            Concept activation diff
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>
            What separates your move from the engine&apos;s
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px", gap: 0, marginTop: 16, marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--orange-dark)", textTransform: "uppercase", letterSpacing: 0.5, textAlign: "right", paddingRight: 12 }}>
          ← {yourMoveLabel}
        </div>
        <div />
        <div style={{ fontSize: 10, fontWeight: 800, color: "var(--green-dark)", textTransform: "uppercase", letterSpacing: 0.5, paddingLeft: 12 }}>
          {engineMoveLabel} →
        </div>
      </div>

      {/* Rows */}
      {concepts.map((c, i) => {
        const yourWidth = (c.yourMove / maxVal) * 100;
        const engineWidth = (c.engineMove / maxVal) * 100;
        const isHot = c.hot || Math.abs(c.engineMove - c.yourMove) > maxVal * 0.3;

        return (
          <div key={i} style={{
            display: "grid", gridTemplateColumns: "180px 1fr 180px",
            alignItems: "center", marginBottom: 4, minHeight: 24,
          }}>
            {/* Your move bar (right-aligned) */}
            <div style={{ display: "flex", justifyContent: "flex-end", paddingRight: 8 }}>
              <div style={{
                width: `${yourWidth}%`, minWidth: c.yourMove > 0 ? 4 : 0, height: 14,
                background: isHot ? "var(--orange)" : "rgba(255,139,61,0.3)",
                borderRadius: "4px 0 0 4px",
                border: isHot ? "2px solid var(--orange-dark)" : "none",
              }} />
            </div>

            {/* Center label */}
            <div style={{
              textAlign: "center", fontSize: 11, fontFamily: "var(--mono)", fontWeight: 700,
              color: isHot ? "var(--ink)" : "var(--ink-3)",
              borderLeft: "2px solid var(--ink)", borderRight: "2px solid var(--ink)",
              padding: "2px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {isHot && <span style={{ color: "var(--orange-dark)", marginRight: 4 }}>•</span>}
              {c.name}
            </div>

            {/* Engine bar (left-aligned) */}
            <div style={{ paddingLeft: 8 }}>
              <div style={{
                width: `${engineWidth}%`, minWidth: c.engineMove > 0 ? 4 : 0, height: 14,
                background: isHot ? "var(--green)" : "rgba(88,204,2,0.3)",
                borderRadius: "0 4px 4px 0",
                border: isHot ? "2px solid var(--green-dark)" : "none",
              }} />
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{ marginTop: 12, fontSize: 11, color: "var(--ink-3)", fontStyle: "italic", lineHeight: 1.5 }}>
        Reading this: the bigger the gap, the more the engine&apos;s move activates a concept your move ignored.
      </div>
      <div style={{ marginTop: 4, fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
        emergent features · top dims by |Δactivation|
      </div>
    </div>
  );
}
