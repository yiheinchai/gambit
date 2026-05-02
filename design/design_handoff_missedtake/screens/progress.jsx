/* global React */
function Progress() {
  return (
    <div style={{ width: 1280, height: 1080, background: "var(--bg)", fontFamily: "var(--sans)", padding: "24px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Progress · last 90 days</div>
          <h1 style={{ fontSize: 42, fontWeight: 900, letterSpacing: -1.2, margin: "6px 0 0", lineHeight: 1.05 }}>You're getting better.</h1>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ padding: "10px 14px", background: "white", border: "2px solid var(--line)", borderRadius: 12, fontSize: 12, fontWeight: 800 }}>30d</div>
          <div style={{ padding: "10px 14px", background: "var(--ink)", color: "white", borderRadius: 12, fontSize: 12, fontWeight: 800 }}>90d</div>
          <div style={{ padding: "10px 14px", background: "white", border: "2px solid var(--line)", borderRadius: 12, fontSize: 12, fontWeight: 800 }}>1y</div>
          <button style={{ background: "var(--green)", color: "white", border: "none", padding: "12px 18px", borderRadius: 12, fontFamily: "var(--sans)", fontWeight: 900, fontSize: 12, letterSpacing: 0.6, textTransform: "uppercase", boxShadow: "0 4px 0 var(--green-dark)", cursor: "pointer", marginLeft: 8 }}>Pull new games</button>
        </div>
      </div>

      {/* prediction banner */}
      <div style={{ background: "linear-gradient(135deg, #1B2730 0%, #0F1A22 100%)", color: "white", borderRadius: 20, padding: 24, border: "3px solid var(--ink)", marginBottom: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>current rapid</div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4 }}>1842</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", color: "#A8D88A", fontWeight: 700, marginTop: 2 }}>↑ +47 in 30d</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>projected (90d)</div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4, color: "#FFD23F" }}>1978</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", opacity: 0.6, marginTop: 2 }}>if drill cadence holds</div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.6, textTransform: "uppercase", letterSpacing: 0.5 }}>elo locked behind weaknesses</div>
          <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: -1.5, marginTop: 4, color: "#FF8B3D" }}>~136</div>
          <div style={{ fontSize: 12, fontFamily: "var(--mono)", opacity: 0.6, marginTop: 2 }}>across 4 active clusters</div>
        </div>
      </div>

      {/* main charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 18 }}>
        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Mistake frequency by concept</div>
              <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>per 100 games · stacked</div>
            </div>
            <Legend />
          </div>
          <StackedChart />
        </div>

        <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Streak calendar</div>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 14 }}>11-day streak 🔥</div>
          <Calendar />
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", fontSize: 11, fontFamily: "var(--mono)", color: "var(--ink-3)" }}>
            <span>78 / 90 active days</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span>less</span>
              {[0.15, 0.35, 0.6, 0.85].map(o => <div key={o} style={{ width: 10, height: 10, borderRadius: 2, background: `rgba(88,204,2,${o})` }} />)}
              <span>more</span>
            </div>
          </div>
        </div>
      </div>

      {/* per-concept progress grid */}
      <div style={{ marginTop: 20, background: "white", border: "3px solid var(--ink)", borderRadius: 20, padding: 22, boxShadow: "0 6px 0 var(--ink)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: 0.5 }}>Per-cluster progress</div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>4 active · 2 mastered · 1 regressed</div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          <ClusterProgress name="Trapped pieces" status="improving" success={72} attempts={84} delta={-0.42} color="var(--orange)" data={[5,4,4,3,3,2,2,2,1]} />
          <ClusterProgress name="Premature kingside attacks" status="active" success={58} attempts={51} delta={-0.18} color="var(--red)" data={[4,3,4,3,3,3,2,3,2]} />
          <ClusterProgress name="Bishop endgame" status="mastered" success={91} attempts={62} delta={-0.71} color="var(--purple)" data={[3,3,2,2,1,1,1,0,0]} mastered />
          <ClusterProgress name="Najdorf English" status="mastered" success={88} attempts={44} delta={-0.55} color="var(--blue)" data={[2,2,2,1,1,1,1,1,0]} mastered />
          <ClusterProgress name="Rook activity" status="regressed" success={42} attempts={28} delta={+0.14} color="var(--yellow-dark)" data={[1,1,1,2,2,2,3,3,4]} regressed />
          <ClusterProgress name="Queen trades" status="new" success={null} attempts={6} delta={null} color="#16A34A" data={[0,0,0,0,0,0,1,2,3]} fresh />
        </div>
      </div>

      {/* footer */}
      <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Achievement icon="🏆" title="First mastery" sub="Bishop endgame · 4 weeks ago" />
        <Achievement icon="🎯" title="Sharpshooter" sub="20 puzzles in a row, no errors" />
        <Achievement icon="🦉" title="Night owl" sub="50 drills after 10pm" />
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { c: "var(--orange)", l: "trapped" },
    { c: "var(--red)", l: "kingside" },
    { c: "var(--purple)", l: "endgame" },
    { c: "var(--blue)", l: "openings" },
    { c: "var(--yellow-dark)", l: "other" },
  ];
  return (
    <div style={{ display: "flex", gap: 10 }}>
      {items.map(i => (
        <div key={i.l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: i.c }} />
          <span style={{ color: "var(--ink-2)" }}>{i.l}</span>
        </div>
      ))}
    </div>
  );
}

function StackedChart() {
  const W = 720, H = 240;
  const weeks = 13;
  // each row is one concept. values per week.
  const data = [
    { c: "var(--orange)", v: [4.2,4.0,4.1,3.8,3.5,3.2,3.0,2.8,2.5,2.2,2.0,1.8,1.6] },
    { c: "var(--red)",    v: [3.0,3.1,3.0,2.8,2.7,2.5,2.4,2.4,2.2,2.0,1.9,1.7,1.5] },
    { c: "var(--purple)", v: [2.5,2.4,2.2,2.0,1.8,1.6,1.4,1.1,0.8,0.6,0.4,0.3,0.2] },
    { c: "var(--blue)",   v: [2.2,2.1,2.0,1.8,1.7,1.5,1.3,1.0,0.8,0.5,0.4,0.3,0.2] },
    { c: "var(--yellow-dark)", v: [1.5,1.5,1.4,1.4,1.3,1.2,1.2,1.1,1.0,1.0,0.9,0.9,0.8] },
  ];
  const totals = Array.from({length: weeks}, (_,i) => data.reduce((s,d) => s + d.v[i], 0));
  const max = Math.max(...totals);
  const pts = (vs, baseline) => vs.map((v,i) => [i*(W/(weeks-1)), H - ((baseline[i] + v) / max) * (H - 30)]);
  let baseline = Array(weeks).fill(0);
  const layers = data.map(d => {
    const top = pts(d.v, baseline);
    const bottomBase = [...baseline];
    baseline = baseline.map((b,i) => b + d.v[i]);
    const bottom = bottomBase.map((b,i) => [i*(W/(weeks-1)), H - (b/max) * (H - 30)]);
    const path = "M " + top.map(p => p.join(",")).join(" L ") + " L " + bottom.reverse().map(p => p.join(",")).join(" L ") + " Z";
    return { ...d, path };
  });
  return (
    <svg width={W} height={H + 24} style={{ display: "block", width: "100%", height: "auto" }}>
      {[0.25, 0.5, 0.75, 1].map(g => (
        <line key={g} x1="0" x2={W} y1={H - g*(H-30)} y2={H - g*(H-30)} stroke="var(--line)" strokeDasharray="3 4" />
      ))}
      {layers.map((l,i) => <path key={i} d={l.path} fill={l.c} opacity={0.85} stroke="white" strokeWidth="1.5" />)}
      {[0,3,6,9,12].map(i => (
        <text key={i} x={i*(W/(weeks-1))} y={H + 16} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-3)" textAnchor={i === 0 ? "start" : i === 12 ? "end" : "middle"}>w{i+1}</text>
      ))}
    </svg>
  );
}

function Calendar() {
  const cells = Array.from({length: 13*7}, (_,i) => {
    const r = Math.random();
    if (r < 0.13) return 0;
    if (r < 0.4) return 0.25;
    if (r < 0.7) return 0.5;
    if (r < 0.92) return 0.75;
    return 1;
  });
  // ensure last 11 cells are 'on'
  for (let i = cells.length - 11; i < cells.length; i++) cells[i] = 0.75 + Math.random()*0.25;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(13, 1fr)", gridTemplateRows: "repeat(7, 1fr)", gap: 3, gridAutoFlow: "column" }}>
      {cells.map((v,i) => (
        <div key={i} style={{ aspectRatio: 1, borderRadius: 3, background: v === 0 ? "var(--bg-2)" : `rgba(88,204,2,${0.2 + v*0.7})`, border: "1px solid " + (v === 0 ? "var(--line)" : "rgba(0,0,0,0.05)") }} />
      ))}
    </div>
  );
}

function ClusterProgress({ name, status, success, attempts, delta, color, data, mastered, regressed, fresh }) {
  const badge = mastered ? { bg: "var(--green)", txt: "mastered", glyph: "✓" } : regressed ? { bg: "var(--orange)", txt: "regressed", glyph: "↑" } : fresh ? { bg: "var(--blue)", txt: "new", glyph: "+" } : { bg: "var(--ink)", txt: status, glyph: "•" };
  const W = 200, H = 50;
  const max = Math.max(...data, 1);
  const pts = data.map((v,i) => [i*(W/(data.length-1)), H - (v/max)*H]).map(p => p.join(",")).join(" ");
  return (
    <div style={{ background: "var(--bg-2)", border: "2px solid var(--line)", borderRadius: 14, padding: 14, display: "grid", gridTemplateColumns: "1fr auto", gap: 12, alignItems: "center" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
          <div style={{ fontSize: 14, fontWeight: 900 }}>{name}</div>
          <div style={{ background: badge.bg, color: "white", padding: "2px 7px", borderRadius: 5, fontSize: 9, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase" }}>{badge.glyph} {badge.txt}</div>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 8, fontFamily: "var(--mono)", fontSize: 11, color: "var(--ink-2)" }}>
          <div><span style={{ color: "var(--ink-3)" }}>success</span> <b style={{ color: "var(--ink)" }}>{success !== null ? success + "%" : "—"}</b></div>
          <div><span style={{ color: "var(--ink-3)" }}>drilled</span> <b style={{ color: "var(--ink)" }}>{attempts}×</b></div>
          {delta !== null && <div><span style={{ color: "var(--ink-3)" }}>freq Δ</span> <b style={{ color: delta < 0 ? "var(--green-dark)" : "var(--orange-dark)" }}>{delta > 0 ? "+" : ""}{delta.toFixed(2)}/g</b></div>}
        </div>
      </div>
      <svg width={W} height={H}>
        <polyline fill="none" stroke={color} strokeWidth="2.5" points={pts} strokeLinejoin="round" strokeLinecap="round" />
        <polyline fill={color} opacity="0.15" points={`${pts} ${W},${H} 0,${H}`} />
      </svg>
    </div>
  );
}

function Achievement({ icon, title, sub }) {
  return (
    <div style={{ background: "white", border: "3px solid var(--ink)", borderRadius: 16, padding: 14, boxShadow: "0 5px 0 var(--ink)", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "#FFF7DB", border: "2px solid var(--yellow)", display: "grid", placeItems: "center", fontSize: 24, boxShadow: "0 3px 0 var(--yellow-dark)" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 900 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

window.Progress = Progress;
