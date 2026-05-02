interface Props {
  type: "correct" | "incorrect" | "thinking";
  movePlayed?: string;
  bestMove?: string;
  explanation?: string;
  onNext?: () => void;
  onRetry?: () => void;
}

export default function DrillFeedback({ type, movePlayed, bestMove, explanation, onNext, onRetry }: Props) {
  if (type === "thinking") return null;

  if (type === "correct") {
    return (
      <div style={{
        background: "#E8F8E5", border: "2.5px solid var(--green)",
        borderRadius: 16, padding: 16, boxShadow: "0 4px 0 var(--green-dark)",
        display: "flex", gap: 14, alignItems: "center",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: "var(--green)",
          color: "white", display: "grid", placeItems: "center", fontSize: 22,
          fontWeight: 900, boxShadow: "0 3px 0 var(--green-dark)", flexShrink: 0,
        }}>
          ✓
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 900, color: "var(--green-dark)",
            letterSpacing: 0.4, textTransform: "uppercase",
          }}>
            Correct!
          </div>
          <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2, fontWeight: 500 }}>
            You found <b>{movePlayed}</b>.{" "}
            {explanation && <span style={{ color: "var(--ink-3)" }}>{explanation}</span>}
          </div>
        </div>
        <button
          onClick={onNext}
          className="btn-duo"
          style={{
            background: "var(--green)", color: "white", padding: "16px 22px",
            borderRadius: 14, fontSize: 13, letterSpacing: 0.6,
            boxShadow: "0 4px 0 var(--green-dark)", whiteSpace: "nowrap",
          }}
        >
          Next →
        </button>
      </div>
    );
  }

  return (
    <div style={{
      background: "#FEECEC", border: "2.5px solid var(--red)",
      borderRadius: 16, padding: 16, boxShadow: "0 4px 0 #A8281C",
      display: "flex", gap: 14, alignItems: "center",
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, background: "var(--red)",
        color: "white", display: "grid", placeItems: "center", fontSize: 22,
        fontWeight: 900, boxShadow: "0 3px 0 #A8281C", flexShrink: 0,
      }}>
        ✗
      </div>
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 14, fontWeight: 900, color: "#A8281C",
          letterSpacing: 0.4, textTransform: "uppercase",
        }}>
          Not quite
        </div>
        <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2, fontWeight: 500 }}>
          You played <b>{movePlayed}</b>. Best was <b style={{ color: "var(--green-dark)" }}>{bestMove}</b>.
          {explanation && <span style={{ color: "var(--ink-3)" }}> {explanation}</span>}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
        <button
          onClick={onRetry}
          style={{
            background: "white", color: "var(--ink)", border: "2px solid var(--line)",
            padding: "10px 16px", borderRadius: 12, fontFamily: "var(--sans)",
            fontWeight: 800, fontSize: 12, cursor: "pointer",
          }}
        >
          Retry <kbd style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: 4 }}>R</kbd>
        </button>
        <button
          onClick={onNext}
          className="btn-duo"
          style={{
            background: "var(--red)", color: "white", padding: "10px 16px",
            borderRadius: 12, fontSize: 12, letterSpacing: 0.4,
            boxShadow: "0 3px 0 #A8281C",
          }}
        >
          Next <kbd style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", marginLeft: 4 }}>Enter</kbd>
        </button>
      </div>
    </div>
  );
}
