# Handoff: missedtake — Chess Weakness Coach UI

> Like *take-take-take* (a piece) but *mistake* — **missedtake**.

## Overview
**missedtake** is a browser-based chess improvement app that pulls a user's games from Chess.com, identifies recurring mistake patterns using concept representations distilled from LC0 (a superhuman chess transformer), and drills those weaknesses out via spaced repetition. The persona throughout the design is `magnus_fan_42 · 1842 Elo` whose recurring weakness is *trapped knights on outpost squares* (notably d7 in Najdorf-style positions).

## About the Design Files
The HTML files in this bundle are **design references**, not production code. They are React prototypes built with inline JSX + Babel for fast iteration in a design tool. **Do not ship them as-is.** You will rebuild them in your stack of choice (Next.js, Remix, etc.) using these as the source of truth for layout, type, color, copy, and interaction patterns.

The single canvas page (`missedtake UI.html`) loads each screen as a separate `<DCArtboard>`. Open it locally to inspect spacing, hover states, and the heatmap/concept-diff visualizations interactively.

## Screens (9)

### 01 — Entry & analysis
1. **Landing** — hero with username input, mascot owl-knight, floating board with concept chips
2. **Analysis loading** — live Stockfish log + concept inference preview

### 02 — Weakness insights
3. **Weakness dashboard (hero)** — "4 weaknesses costing you ~136 Elo," radar fingerprint vs. cohort, ranked weakness cards, mistake timeline
4. **Weakness detail** — heatmap board overlay, divergent concept-diff bars (your move ← → engine), cluster gallery

### 03 — Practice & progress
5. **Drill mode** — hearts, live concept tracker, XP, SM-2 review schedule
6. **Daily quest** — Duolingo-style winding lesson path (locked / current / boss nodes), mate-in-3 daily challenge, gem-rewarded quests, streak HUD
7. **Progress tracker** — Elo projection, stacked concept frequency, streak calendar, per-cluster sparkline progress

### 04 — Explore & study
8. **Concept library (187 dimensions)** — taxonomy grouped by Tactical / Strategic / Endgame / King safety, mastery summary band, sticky right-rail concept detail with probe definition + co-activation graph
9. **Game review** — annotated game with vertical eval bar, blunder highlight on board, scrubbable move list, eval-over-time timeline, mistake list, dark concept-activation panel

### 05 — Social & competition
10. **Leagues** — full 8-tier ladder (Bronze → Grandmaster), Sapphire group leaderboard with promotion/demotion zones, live duel invites, season badges, friend activity feed

## Design system

**Aesthetic:** Duolingo's chunky 3-border + drop-shadow buttons, vibrant green/orange/purple accents on warm cream — but tuned for power users with information-dense data viz, mono cpl/eval values, 187-dim concept vectors, FEN refs, and real chess vocabulary.

**Type:** DM Sans (UI/display) + JetBrains Mono (code, eval, FEN, numerical data).

**Color tokens** (defined in `missedtake UI.html` `:root`):
- `--bg #FAF8F2`, `--bg-2 #F1EDE2`, `--ink #1B2730`, `--line #E5DFD0`
- `--green #58CC02` (success/progress) / `--green-dark #45A302`
- `--orange #FF8B3D` (weakness/alert) / `--orange-dark #C25A1B`
- `--purple #8B5CF6` (strategic concepts), `--blue #3B82F6` (theory/endgame)
- `--yellow #FFD23F` (rewards/gems) / `--yellow-dark #D4A91A`
- `--red #E04E3F` (king safety / blunder)

**Component patterns:**
- Cards: `3px solid var(--ink)` border + `box-shadow: 0 6px 0 var(--ink)` (chunky drop)
- Primary button: colored bg + `0 4px 0 [color-dark]` shadow + uppercase 12px/900/0.6-tracking label
- Hot/weak markers: dashed border in accent color + small uppercase pill at top-right
- Numerical readouts: JetBrains Mono in `--ink-3` with bold values in `--ink`

## File map

| File | Purpose |
|---|---|
| `missedtake UI.html` | Canvas wrapper loading all screens with shared design tokens |
| `design-canvas.jsx` | Pan/zoom canvas component (design tool only) |
| `screens/landing.jsx` | Landing screen + mascot + floating board |
| `screens/loading.jsx` | Analysis loading + Stockfish log + concept stream |
| `screens/dashboard.jsx` | Weakness dashboard hero + radar + ranked cards |
| `screens/detail.jsx` | Weakness detail + concept-diff bars + heatmap board |
| `screens/drill.jsx` | Drill mode + hearts/XP + SM-2 schedule |
| `screens/progress.jsx` | Long-term progress + sparklines + calendar |
| `screens/library.jsx` | Concept library + 187-dim taxonomy + concept detail |
| `screens/review.jsx` | Game review + eval bar + annotated board + timeline |
| `screens/quest.jsx` | Daily quest path + mate-in-3 + gems |
| `screens/leagues.jsx` | Leagues + ladder + duels + badges + friend feed |

## How to view
Open `missedtake UI.html` in a modern browser. Pan with drag, zoom with scroll, click any artboard label to enter focus mode (`Esc` to exit).

## Engineering notes (read me before building)
- **Concept vectors** (187-dim) come from probing LC0 BT4 internal layers; see references on the dashboard ("L11", "L14", activation magnitudes). The library shows probe definitions for each concept.
- **SM-2 review schedule** drives drill ordering — see `drill.jsx` for the spaced-repetition card stack and the cohort comparison logic.
- **Cluster centroids** are FEN positions; the detail screen shows nearest-neighbor positions from your own games (see "cluster gallery").
- **Eval bar / accuracy** uses Stockfish 16 NNUE @ depth 22; cpl thresholds: ≤30 best, ≤80 inaccuracy, ≤200 mistake, >200 blunder.

---

This bundle replaces the previous `gambit` working name. All branding, copy, and assets now use **missedtake**.
