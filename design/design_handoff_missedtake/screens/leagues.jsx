/* global React */
function Leagues() {
  const players = [
    { rank: 1, name: "knight_rider_88", elo: 1947, xp: 4820, change: "+312", you: false, you_friend: false, badge: "👑" },
    { rank: 2, name: "endgame_eli", elo: 1902, xp: 4410, change: "+241", friend: true },
    { rank: 3, name: "magnus_fan_42", elo: 1842, xp: 4180, change: "+267", you: true },
    { rank: 4, name: "najdorf_jr", elo: 1888, xp: 3940, change: "+198", friend: true },
    { rank: 5, name: "polarbear_77", elo: 1873, xp: 3720, change: "+154" },
    { rank: 6, name: "tactical_tim", elo: 1801, xp: 3450, change: "+187" },
    { rank: 7, name: "queens_gambit_dec", elo: 1812, xp: 3280, change: "+121" },
    { rank: 8, name: "blitz_bandit", elo: 1855, xp: 2980, change: "+89" },
    { rank: 9, name: "rookie_no_more", elo: 1769, xp: 2810, change: "+143", friend: true },
    { rank: 10, name: "pawn_storm", elo: 1798, xp: 2640, change: "+78" },
  ];

  return (
    <div style={{ width: 1280, height: 1080, background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Week 17 · 4 days, 11h left</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "4px 0 0" }}>Sapphire league</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <ChipL>Friends</ChipL>
          <ChipL active>League</ChipL>
          <ChipL>Global</ChipL>
        </div>
      </div>

      {/* league progression */}
      <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Tier ladder</div>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>top 5 promote · bottom 10 demote</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 8 }}>
          {[
            { name: "Bronze", c: "#B87333", g: "🥉" },
            { name: "Silver", c: "#9CA3AF", g: "🥈" },
            { name: "Gold", c: "#FFD23F", g: "🥇" },
            { name: "Ruby", c: "#E04E3F", g: "♦" },
            { name: "Sapphire", c: "#3B82F6", g: "♦", current: true },
            { name: "Emerald", c: "#10B981", g: "♦" },
            { name: "Diamond", c: "#06B6D4", g: "💎" },
            { name: "Grandmaster", c: "var(--ink)", g: "♛" }
          ].map(t => (
            <div key={t.name} style={{ background: t.current ? t.c : "var(--bg-2)", color: t.current ? "white" : "var(--ink-3)", padding: 12, borderRadius: 12, textAlign: "center", border: t.current ? `3px solid ${t.c}` : "2px solid var(--line)", boxShadow: t.current ? `0 4px 0 ${t.c}` : "none", filter: t.current ? "none" : "grayscale(0.7)" }}>
              <div style={{ fontSize: 22 }}>{t.g}</div>
              <div style={{ fontSize: 11, fontWeight: 900, marginTop: 2, letterSpacing: 0.4, textTransform: "uppercase" }}>{t.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 900 }}>Sapphire · group 4,182</div>
            <div style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>30 players · weekly XP</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {/* promotion zone */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", color: "var(--green-dark)", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
              <div style={{ flex: 1, height: 1, background: "var(--green)", opacity: 0.4 }} />
              <span>↑ promote to emerald</span>
              <div style={{ flex: 1, height: 1, background: "var(--green)", opacity: 0.4 }} />
            </div>
            {players.slice(0, 5).map(p => <LeagueRow key={p.rank} {...p} promo />)}
            {players.slice(5).map(p => <LeagueRow key={p.rank} {...p} />)}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", color: "var(--orange-dark)", fontSize: 10, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
              <div style={{ flex: 1, height: 1, background: "var(--orange)", opacity: 0.4 }} />
              <span>↓ demote at rank 21</span>
              <div style={{ flex: 1, height: 1, background: "var(--orange)", opacity: 0.4 }} />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* duels */}
          <div style={{ background: "linear-gradient(135deg, #8B5CF6, #5B21B6)", color: "white", borderRadius: 20, padding: 22, border: "3px solid #4C1D95", boxShadow: "0 6px 0 #4C1D95", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", right: -10, bottom: -10, fontSize: 100, opacity: 0.15 }}>⚔</div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", opacity: 0.9 }}>⚔ concept duels · live</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5, margin: "6px 0 4px" }}>Challenge a friend</h2>
            <p style={{ fontSize: 12, opacity: 0.95, margin: "0 0 12px" }}>Solve 10 puzzles from a shared concept pool. First to 7 wins.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <Avatar n="E" c="var(--green)" />
              <span style={{ fontSize: 13, fontWeight: 800 }}>endgame_eli wants to duel</span>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button style={{ background: "white", color: "#5B21B6", border: "none", padding: "10px 14px", borderRadius: 10, fontWeight: 900, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", boxShadow: "0 3px 0 rgba(0,0,0,0.2)", cursor: "pointer", fontFamily: "var(--sans)" }}>Accept</button>
              <button style={{ background: "transparent", color: "white", border: "2px solid rgba(255,255,255,0.5)", padding: "8px 14px", borderRadius: 10, fontWeight: 800, fontSize: 12, cursor: "pointer", fontFamily: "var(--sans)" }}>Decline</button>
            </div>
          </div>

          {/* badges */}
          <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 18, padding: 18, boxShadow: "0 5px 0 var(--ink)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Season badges · 4 of 12</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {[
                { g: "🔥", c: "var(--orange)", on: true, n: "Streak 10" },
                { g: "🎯", c: "var(--green)", on: true, n: "Sniper" },
                { g: "⚔", c: "var(--purple)", on: true, n: "Duelist" },
                { g: "📚", c: "var(--blue)", on: true, n: "Scholar" },
                { g: "🏆", c: "var(--yellow-dark)", n: "Champion" },
                { g: "🦉", c: "var(--ink)", n: "Owl" },
                { g: "♛", c: "#5B21B6", n: "Master" },
                { g: "💎", c: "#06B6D4", n: "Diamond" }
              ].map((b, i) => (
                <div key={i} style={{ aspectRatio: 1, borderRadius: 12, background: b.on ? b.c : "var(--bg-2)", color: b.on ? "white" : "var(--ink-3)", display: "grid", placeItems: "center", border: "2px solid " + (b.on ? b.c : "var(--line)"), boxShadow: b.on ? `0 3px 0 ${b.c}` : "none", filter: b.on ? "none" : "grayscale(1) opacity(0.5)" }}>
                  <div style={{ fontSize: 26 }}>{b.g}</div>
                  <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase", marginTop: -4 }}>{b.n}</div>
                </div>
              ))}
            </div>
          </div>

          {/* friend activity */}
          <div style={{ background: "var(--ink)", color: "white", borderRadius: 18, padding: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Friend activity</div>
            <Activity who="endgame_eli" what="mastered Lucena position" t="2m" g="🏆" />
            <Activity who="najdorf_jr" what="solved 20 puzzles in a row" t="14m" g="🔥" />
            <Activity who="rookie_no_more" what="reached Gold league" t="1h" g="🥇" />
            <Activity who="endgame_eli" what="challenged you to a duel" t="3h" g="⚔" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ChipL({ children, active }) {
  return <div style={{ padding: "10px 18px", borderRadius: 12, fontSize: 12, fontWeight: 800, background: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink-2)", border: "2px solid " + (active ? "var(--ink)" : "var(--line)"), cursor: "pointer", letterSpacing: 0.4, textTransform: "uppercase" }}>{children}</div>;
}

function LeagueRow({ rank, name, elo, xp, change, you, friend, badge, promo }) {
  const rankColor = rank === 1 ? "var(--yellow-dark)" : rank === 2 ? "#9CA3AF" : rank === 3 ? "#B87333" : "var(--ink-3)";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 80px 80px 80px", gap: 12, alignItems: "center", padding: "10px 12px", background: you ? "#FFF4E5" : "transparent", border: you ? "2.5px solid var(--orange)" : "2px solid transparent", borderRadius: 12, boxShadow: you ? "0 3px 0 var(--orange-dark)" : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 16, fontWeight: 900, color: rankColor, fontFamily: "var(--mono)" }}>{rank}</span>
        {badge && <span style={{ fontSize: 16 }}>{badge}</span>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Avatar n={name[0].toUpperCase()} c={you ? "var(--orange)" : friend ? "var(--green)" : "var(--bg-2)"} dark={!you && !friend} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "var(--ink)" }}>
            {name}{you && <span style={{ marginLeft: 6, background: "var(--orange)", color: "white", padding: "1px 6px", borderRadius: 4, fontSize: 9, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase" }}>you</span>}
            {friend && <span style={{ marginLeft: 6, color: "var(--green-dark)", fontSize: 11, fontWeight: 800 }}>· friend</span>}
          </div>
          <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>{elo} elo</div>
        </div>
      </div>
      <div style={{ textAlign: "right", fontSize: 14, fontFamily: "var(--mono)", fontWeight: 900, color: "var(--ink)" }}>{xp.toLocaleString()}<span style={{ fontSize: 10, color: "var(--ink-3)", marginLeft: 2 }}>xp</span></div>
      <div style={{ textAlign: "right", fontSize: 12, fontFamily: "var(--mono)", fontWeight: 800, color: "var(--green-dark)" }}>{change}</div>
      <div style={{ textAlign: "right" }}>
        {promo ? <span style={{ fontSize: 9, fontWeight: 900, color: "var(--green-dark)", letterSpacing: 0.5, textTransform: "uppercase", background: "#E8F8E5", padding: "3px 8px", borderRadius: 6 }}>↑ promote</span> : null}
      </div>
    </div>
  );
}

function Avatar({ n, c, dark }) {
  return <div style={{ width: 32, height: 32, borderRadius: 8, background: c, color: dark ? "var(--ink-2)" : "white", display: "grid", placeItems: "center", fontWeight: 900, fontSize: 13, border: dark ? "2px solid var(--line)" : "none" }}>{n}</div>;
}

function Activity({ who, what, t, g }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px dashed rgba(255,255,255,0.1)" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.1)", display: "grid", placeItems: "center", fontSize: 16 }}>{g}</div>
      <div style={{ flex: 1, fontSize: 12 }}>
        <span style={{ fontWeight: 900 }}>{who}</span> <span style={{ opacity: 0.7 }}>{what}</span>
      </div>
      <div style={{ fontSize: 10, fontFamily: "var(--mono)", opacity: 0.5 }}>{t}</div>
    </div>
  );
}

window.Leagues = Leagues;
