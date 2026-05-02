import type { EloPrediction } from "@/lib/elo-prediction";

interface Props {
  currentElo?: number;
  prediction?: EloPrediction | null;
}

export default function EloBanner({ currentElo, prediction }: Props) {
  const potentialGain = prediction?.potentialGain || 0;
  const projected = (currentElo || 1200) + potentialGain;

  return (
    <div style={{
      background: "linear-gradient(135deg, #1B2730 0%, #0F1A22 100%)",
      color: "white", borderRadius: 20, padding: 24,
      border: "3px solid var(--ink)", marginBottom: 20,
      display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24,
    }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Current rating
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4 }}>
          {currentElo || "—"}
        </div>
        {potentialGain > 0 && (
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "#A8D88A", fontWeight: 700, marginTop: 2 }}>
            potential: +{potentialGain}
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Projected (90d)
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4, color: "#FFD23F" }}>
          {projected}
        </div>
        <div style={{ fontSize: 12, fontFamily: "var(--mono)", opacity: 0.6, marginTop: 2 }}>
          if drill cadence holds
        </div>
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Elo locked behind weaknesses
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4, color: "#FF8B3D" }}>
          ~{potentialGain}
        </div>
        <div style={{ fontSize: 12, fontFamily: "var(--mono)", opacity: 0.6, marginTop: 2 }}>
          {prediction?.topImprovements.length || 0} active clusters
        </div>
      </div>
    </div>
  );
}
