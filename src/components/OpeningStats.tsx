import type { OpeningStats as OpeningStatsType } from "@/lib/openings";

interface Props {
  stats: OpeningStatsType[];
}

export default function OpeningStats({ stats }: Props) {
  if (stats.length === 0) return null;

  const maxGames = Math.max(...stats.map((s) => s.gamesPlayed));

  return (
    <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 20, boxShadow: "0 5px 0 var(--ink)" }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 14 }}>Opening Repertoire</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {stats.slice(0, 8).map((opening) => {
          const winPct = Math.round(opening.winRate * 100);
          const barWidth = (opening.gamesPlayed / maxGames) * 100;

          return (
            <div key={opening.name}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {opening.name}
                  </span>
                  {opening.eco && (
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)", flexShrink: 0 }}>{opening.eco}</span>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, flexShrink: 0, marginLeft: 8 }}>
                  <span style={{ fontFamily: "var(--mono)", color: "var(--ink-3)", fontWeight: 700 }}>{opening.gamesPlayed}g</span>
                  <span style={{
                    fontWeight: 900,
                    color: winPct >= 55 ? "var(--green-dark)" : winPct <= 40 ? "var(--red)" : "var(--ink)",
                  }}>
                    {winPct}%
                  </span>
                </div>
              </div>

              {/* W/D/L bar */}
              <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden", width: `${barWidth}%`, minWidth: 40, border: "1px solid var(--line)" }}>
                {opening.wins > 0 && (
                  <div style={{ width: `${(opening.wins / opening.gamesPlayed) * 100}%`, background: "var(--green)" }} />
                )}
                {opening.draws > 0 && (
                  <div style={{ width: `${(opening.draws / opening.gamesPlayed) * 100}%`, background: "var(--bg-2)" }} />
                )}
                {opening.losses > 0 && (
                  <div style={{ width: `${(opening.losses / opening.gamesPlayed) * 100}%`, background: "var(--red)" }} />
                )}
              </div>

              {opening.avgMistakes > 2 && (
                <p style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--orange-dark)", marginTop: 2 }}>
                  {opening.avgMistakes.toFixed(1)} mistakes/game
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 14, paddingTop: 12, borderTop: "1.5px dashed var(--line)", fontSize: 11, fontWeight: 700, color: "var(--ink-3)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--green)" }} />Win</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--bg-2)", border: "1px solid var(--line)" }} />Draw</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--red)" }} />Loss</span>
      </div>
    </div>
  );
}
