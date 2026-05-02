# Handoff: Gambit — Chess Weakness Coach UI

## Overview
Gambit is a browser-based chess improvement app that pulls a user's games from Chess.com, identifies recurring mistake patterns using concept representations distilled from LC0 (a superhuman chess transformer), and delivers targeted drills. This handoff covers the full v1 product UI: 6 screens covering the entry flow, weakness analysis, drill practice, and progress tracking.

## About the Design Files
The HTML files in this bundle are **design references**, not production code. They are React prototypes built with inline JSX + Babel for fast iteration in a design tool. **Do not ship them as-is.** Your task is to recreate the visual design and interactions in the project's target environment (per the PRD: Next.js App Router + Tailwind + react-chessboard + chess.js + ONNX Runtime Web + Stockfish.js).

The single canvas page (`Gambit UI.html`) loads each screen as a separate `<DCArtboard>`. Open it locally to inspect spacing, hover states, and the heatmap/concept-diff visualizations interactively.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and component shapes are intentional and should be recreated pixel-accurately. The novel data visualizations (concept-diff divergent bars, trap-risk heatmap overlay, radar fingerprint) are core to the product differentiation and should match exactly.

---

## Aesthetic Direction

Duolingo-inspired but tuned for chess power users. Specifically:
- **Chunky 3px borders + 4–6px drop shadows** on every card and primary button (no float-on-blur effects). Shadow is a hard offset of the same color family — `box-shadow: 0 6px 0 var(--ink)` — never blurred.
- **Buttons depress on hover**: shadow shrinks to 2px, transform: translateY(2px), 80ms transition. This is the canonical Duo button feel.
- **Warm cream background** (`#FAF8F2`) instead of pure white. Avoid sterile gray neutrals.
- **Vibrant categorical accents** (green, orange, red, purple, blue, yellow) used to color-code weakness clusters. Each cluster keeps the same color across every screen.
- **Mascot**: green owl-knight hybrid. Drawn in SVG in `screens/landing.jsx` — it is a placeholder; commission proper mascot art before shipping.
- **Information density** is high in tables, eval bars, and concept lists (mono font, 11–12px), but breathing room in headlines (DM Sans 900, -1.2 letter-spacing, large sizes).

---

## Design Tokens

### Colors
```css
--bg:          #FAF8F2;   /* page background */
--bg-2:        #F1EDE2;   /* card subtle, disabled */
--ink:         #1B2730;   /* primary text, primary borders */
--ink-2:       #4A5A66;   /* body text */
--ink-3:       #8A98A3;   /* meta, captions */
--line:        #E5DFD0;   /* borders on light surfaces */

--green:       #58CC02;   /* primary CTA, "you" mascot */
--green-dark:  #45A302;   /* button shadow */
--green-2:     #A8D88A;   /* success accents on dark */

--orange:      #FF8B3D;   /* weakness #1, alerts, "your move" */
--orange-dark: #C25A1B;

--red:         #E04E3F;   /* weakness #2 */
--purple:      #8B5CF6;   /* weakness #3 */
--blue:        #3B82F6;   /* weakness #4, peer cohort */
--yellow:      #FFD23F;   /* streak / highlight */
--yellow-dark: #D4A91A;

/* Chess board */
--board-dark:  #7FA650;   /* dark squares (Chess.com green) */
--board-light: #EFEFD0;   /* light squares */
```

### Typography
- **Sans**: DM Sans (Google) — 400, 500, 600, 700, 800, 900
- **Mono**: JetBrains Mono — 400, 500, 700, 800

Type scale used:
| role | size | weight | letter-spacing |
|---|---|---|---|
| Hero H1 | 76px | 900 | -2.5 |
| Page H1 | 42–56px | 900 | -1.2 to -1.5 |
| Section H2 | 18–22px | 900 | -0.5 |
| Card title | 16–20px | 900 | -0.5 |
| Body | 13–15px | 500 | 0 |
| Meta / mono labels | 10–12px | 700–800 | 0.4–0.6 (uppercase) |
| Number display | 30–48px | 900 | -1 to -1.5 |

### Spacing & Radius
- Card radius: **20–24px** (hero), **14–18px** (sub-cards), **10–12px** (chips/pills)
- Card padding: **20–28px** for major cards, **14–16px** for compact
- Section gap: **18–24px**
- Border weights: **3px** for hero/major card outlines (always `var(--ink)`), **2px** for secondary, **1.5px** for subtle dividers, **1px dashed** for inline separators

### Shadows
Hard offsets only, no blur:
- Major card: `0 6px 0 var(--ink)`
- Primary button: `0 4px 0 [color-dark]` → `0 2px 0` on hover with `translateY(2px)`
- Compact card: `0 4px 0 var(--ink)` or `0 5px 0 var(--ink)`
- Speech bubble / mini-cards: `0 4px 0 [accent]`

---

## Screens

### 1. Landing — `screens/landing.jsx`
**Viewport**: 1280×820

**Purpose**: Single CTA — collect Chess.com username, kick off analysis.

**Layout**: 2-column grid (1.05fr / 1fr), 100px top padding, 64px horizontal.

**Components**:
- **Top nav** (68px): logo (knight glyph in green rounded square w/ shadow) + brand "gambit" 22px/900. Right: "How it works", "Concepts", "Sign in" — 14px/700, color `--ink-2`.
- **Eyebrow chip**: pale green pill (`#E8F8E5` bg, `var(--green)` border, 999px radius), green dot + "POWERED BY LC0 CONCEPT DISTILLATION" 12px/800/uppercase/0.4 tracking.
- **H1**: "Stop losing to the **same mistake.**" — 76px/900/-2.5, line-height 0.96. "same mistake." in `var(--green)`.
- **Subhead**: 19px/500, max-width 520, color `--ink-2`.
- **Username input** (max-width 540): white card (2px line border, 16px radius, 12/18 padding) with chess.com mark (28×28 #7FA650 rounded square, "♞" glyph) + transparent input 18px/600. Adjacent **Analyze** button: 16px radius, green w/ green-dark 4px shadow, depresses on hover.
- **Disclaimer line** below: 13px/500/--ink-3 — "Free · No account · Runs in your browser · ~3 minutes for 100 games"
- **Stats row** (56px top margin, 40px gap): three Stats — number 32px/900/-1, label 12px/700/uppercase/0.5/--ink-3. Last stat ("+142 avg Elo gain at 90d") uses green color.
- **Right column**: 
  - Mascot SVG (130×130) absolute top-right, owl-knight hybrid. Speech bubble: white card w/ 2px ink border + 0 4px 0 ink shadow + tail triangle, "You hung your knight on f5 again."
  - Tilted floating board (rotate(-2deg)): white card with 3px ink border + 0 10px 0 ink shadow, 12px padding. Header strip with mock username + "move 23 · -1.4" mono. 8×8 grid, 44px squares, with f5 highlighted in orange and d6 outlined.
  - Three concept chips floating around the board (absolute positioning): white card, 2px colored border, 4px colored shadow, 14px radius. Inside: 28×28 colored square showing percentage in mono, then "CONCEPT" label + concept name.
- **Bottom strip** (64px, full-width): `var(--ink)` bg, white text 13px/700/uppercase/0.6, pipeline arrow flow: "Pull games → Stockfish flags mistakes → LC0 concept probe → Drills tailored to you" (last in `--green-2`).

**Interactions**: Username input is controlled. Analyze button: hover lowers shadow, transitions transform/box-shadow over 80ms. Submit → loading screen.

---

### 2. Analysis Loading — `screens/loading.jsx`
**Viewport**: 1280×820

**Purpose**: Show progress through the 4-stage pipeline. Keep the user engaged with live results.

**Layout**: 2-column 1.2fr/1fr, 56px padding.

**Components**:
- **Brand** top-left: 36×36 logo + "gambit" 22/800.
- **H1**: "magnus_fan_42 · 1842 elo" — 56px/900, the "· 1842 elo" part in `--ink-3` weight 700.
- **Pipeline stepper**: 4 cards (Step component) each 16px padded, 14px radius. States:
  - Done: green checkmark icon, "done" label in green-dark
  - Current: `--green` 2.5px border + 0 4px 0 green-dark shadow, animated SVG spinner, percentage 14px mono on right, 8px progress bar at bottom
  - Pending: dotted bullet, --line border
- **Live log**: `var(--ink)` bg, 16px radius, 18px padding, mono 12px green text. Shows interleaved Stockfish output and concept diff results. Inaccuracies in yellow, mistakes in red, blunders in orange.
- **Right column "Live preview"**: 3px ink border card, contains:
  - Game counter "game 78 / 100" + blunder tag (orange pill, white text, uppercase mono)
  - Mini board (38px squares) showing the most recent flagged position with d7 highlighted
  - Move notation in mono: "23. … **Nd7?** (best: Bxf3)" 
  - Eval transition: "+0.4 → −2.4" with the bad value in orange-dark
  - "What you missed" subcard: bg-2 panel with 3 ConceptBars (130px label, fill bar with colored 8px height, 11px mono value)
- **ETA footer**: "Estimated time remaining · **1m 42s**" centered, 13px.

---

### 3. Weakness Dashboard (HERO) — `screens/dashboard.jsx`
**Viewport**: 1280×1240

**Purpose**: Primary screen. Shows the 4 weakness clusters ranked by Elo cost, with one-click drill entry.

**Layout**: 24/40 padding, vertical stack.
1. Top nav (described below)
2. Hero header row (1.4fr / 1fr, 24px gap)
3. 5-column metric strip
4. Ranked weakness card list
5. Mistake timeline footer

**Top nav**: Logo + segmented tab control (Weaknesses, Drill, Progress, Concept library) — pills in white container w/ 2px line border, active tab green w/ shadow. Right side: streak chip (🔥 11 mono) + user chip (avatar M in orange).

**Hero header (left)**: Green gradient card (linear-gradient(135deg, #58CC02, #45A302)), 24px radius, 3px green-dark border, 0 6px 0 green-dark shadow. Decorative giant ♞ glyph at 200px size, opacity 0.12, top-right. Content:
- Eyebrow: "DAY 14 · 11-GAME STREAK" 12px/800/uppercase
- H1: "4 weaknesses are **costing you ~136 Elo.**" — 38px/900/-1, white
- Subhead: "We analyzed 100 games (7,432 positions). Drilling the top one for 20 minutes a day predicts **+47 Elo in 30 days**."
- Two buttons: "Drill #1 now" (white bg, green text, green-dark shadow) + "See full report" (transparent, white outlined ghost)

**Concept fingerprint (right)**: White card 3px ink border. Header: "CONCEPT FINGERPRINT" eyebrow + "vs. 1800 cohort" 18/900 + meta "187 dims · 4 clusters" mono.
- Radar chart, 8 axes (tactics, endgame, openings, king safety, calculation, structure, piece play, prophylaxis). Two overlapping polygons:
  - Peer cohort: blue stroke 2px dashed, 15% blue fill
  - You: orange stroke 2.5px solid, 25% orange fill, with 4px white-bordered orange dots at vertices
  - 4 concentric reference polygons in line color
  - Axis labels at 1.18r, 11px/800/--ink-2
  - Legend bottom-left: "you" (orange dot) / "1800 cohort" (faded blue dot)

**Metric strip**: 5 equal columns. Each Metric card: 16px radius, 2px line border, 16px padding. Label 11px/800/uppercase + value 30px/900/-1 + sub 11px mono. Streak metric is highlighted (`#FFF7DB` bg, yellow border, yellow-dark shadow).

**Weakness cards** (5-column grid: 60px/140px/1fr/240px/160px):
1. **Rank chip**: 60×60, 14px radius, colored bg matching cluster, 28px/900 white "#1", 0 4px 0 darker-shadow
2. **Board thumbnail** (BoardThumb): 16px squares, 8×8 = 128px wide, with cluster-color highlights on key squares
3. **Title block**: cluster name 20/900 + 13px description + concept hashtag chips (mono 11px in bg-2 pills, "#trapped_piece" format)
4. **Stats column**: 3 StatRow lines (frequency, avg cpl mono, elo cost mono in orange-dark) separated by dashed line
5. **Action column**: "Drill this" colored button + "Inspect" outline button stacked

Cards: white, 3px ink border, 20px radius, 0 6px 0 ink shadow, 20px padding.

**Sort pills row** above cards: "By cost" (active, ink filled), "By frequency", "By recency", "By phase" — 6/14 padding pills.

**Mistake timeline**: White card 3px border. Bar chart, 100 bars (one per game), heights 0–80px proportional to mistake count, colors random from cluster palette. Date labels mono below.

---

### 4. Weakness Detail — `screens/detail.jsx`
**Viewport**: 1280×920

**Purpose**: Drill-down on one cluster. Shows the heatmap, the divergent concept-diff visualization, and all positions in the cluster.

**Layout**:
- Breadcrumb row "Weaknesses › #1 Trapped pieces in the middlegame"
- Header row (1fr / auto): title block + action buttons
- Main 1.4fr/1fr grid: Featured position card | Concept diff card
- Cluster gallery card (full width, 6 thumbnails)

**Header**: 
- Orange "WEAKNESS #1" pill w/ shadow + meta "cluster_id: c.0a3f · last_updated: 2h ago" mono
- H1 42/900/-1.2: "Trapped pieces in the middlegame"
- 15px subhead, max-w 720
- Buttons: "Start drilling" orange w/ shadow + "Export PGN" outline

**Featured Position card** (BoardWithHeat):
- Header strip: position context "vs. PolarBear_77 · move 23 · Mar 14" + 1/5 paginator with arrow nav buttons
- 2-col layout (board / right rail):
  - **Board** 44px squares, 8×8, with **trap-risk heatmap overlay**: each square has an absolute-positioned colored div with rgba(255,86,48, intensity). Severe squares (intensity > 0.7) get a 2px dark-red border. The d7 square (with trapped knight) has a "TRAP" badge in dark red, mono 9px.
  - Heat legend below: gradient bar, "TRAP RISK 0 → 1"
  - **Right rail**:
    - Toggle row: "Heatmap: trap risk" (active, ink filled), "Eval", "Mobility"
    - Mono code panel (bg-2): your move ("Nd7??") and engine line, eval transition
    - Orange callout box: 2px orange border, #FFF4E5 bg, 12px radius. "!" icon in orange square + "What you missed" header + explanation paragraph

**Concept diff card** — **NOVEL VISUALIZATION**:
- Title: "Concept activation diff" / "What separates your move from the engine's"
- Custom **divergent bar chart**:
  - Vertical center axis (2px ink line)
  - 8 rows, one per concept dimension
  - Left side: "← YOUR MOVE (Nd7)" header in orange-dark
  - Right side: "ENGINE (Bxf3) →" header in green-dark
  - Each row: `grid-template-columns: 180px 1fr 180px`
  - Left bar (your move's activation): right-aligned, orange (intense for "hot" dims, faded otherwise), border-radius 4px on left only, 2px orange-dark border for hot
  - Center label: concept name in mono, with • orange-dark dot prefix for hot dims
  - Right bar (engine's activation): left-aligned, green
  - Hot dims (top 3 by absolute Δ): bolder colors + 2px borders
- Footer caption: "Reading this: the bigger the gap, the more the engine's move *activates* a concept your move ignored."
- Mono attribution: "distilled from LC0 BT4 · layer 11 · 187 dims · shown: top 8 dims by |Δactivation|"

**Cluster gallery**:
- Toggle row right-aligned: "Cluster view" / "List" / "UMAP"
- 6-column grid of ClusterMember cards: bg-2 panel, 12px radius, 2px border. Each shows opponent name, similarity score, mini board (18px squares) with highlighted squares in orange, plus mono cpl + move number footer.

---

### 5. Drill Mode — `screens/drill.jsx`
**Viewport**: 1280×880

**Layout**: 3-column 260px / 1fr / 320px.

**Left column**:
- **Session card** (white, 3px ink border, 5px shadow):
  - Eyebrow + "Trapped pieces" 16/900 + cluster id mono
  - Progress: "Position 4 of 12 · 33%" + 12px progress bar (orange fill with inset 0 -3px 0 orange-dark to look chunky)
  - 2×2 KPI grid: streak (green), accuracy, avg time, rating delta
- **Mode card**: 3 ModeBtn entries — "Your positions" (active, green border, pale green bg), "Matched puzzles", "vs Stockfish". Each has 36px icon square, title 13/900, subtitle 11/600.
- **Spaced repetition queue**: ink-filled dark card. Lines: "Trapped pieces · now (yellow)", "Kingside attacks · 3d (green)", etc. Mono.

**Center column** — board area:
- White card 3px border, 22px radius, 6px shadow
- Top strip: opponent (avatar + "polarbear_77" + "1873 · to move: black" mono) and "evaluation +0.4" pill
- **Drill board** (60px squares, 8×8): 3px ink border, 6px shadow, last-move squares highlighted with rgba(88,204,2,0.5). Coordinate labels in corners, mono 9px. SVG arrow overlay (orange, 8px stroke, arrowhead) showing the played move.
- **Feedback banner** below (success state shown): pale green bg #E8F8E5, 2.5px green border, 4px green-dark shadow. 48px green check icon + "Brilliant — engine's #1 move" header + explanation referencing concept activation deltas + green "Next →" button.
- **Move strip**: mono notation with the just-played move highlighted (green pill). Right-side icon buttons: undo (↶), hint (💡), settings (⚙).

**Right column**:
- **Hearts card**: orange bg, 3px orange-dark border, 5px shadow, white text. "HEARTS · refill 8m" + 5 hearts (4 ❤️, 1 🤍).
- **Live concept tracker** card (the most distinctive viz here):
  - 5 ConceptTrack rows. Each row:
    - Label + mono delta on right (green if good)
    - Track: bg-2 strip with 1.5px line border, 10px tall
    - "Before" position: 3px ink-3 vertical bar at `before*100%`
    - Filled span between before and after, colored (green if improvement)
    - "After" position: 8px wide, 16px tall colored block w/ 2px white border at `after*100%`
  - Footer summary: "Δ +1.85 · concept distance from centroid decreased"
- **XP card**: "+62 xp · 7m elapsed" — 36px green number. 10px progress bar. "level 14 · 38 xp to level 15".

---

### 6. Progress — `screens/progress.jsx`
**Viewport**: 1280×1080

**Layout**:
- Header row with timeframe pills (30d / 90d active / 1y) + "Pull new games" green CTA
- Elo prediction banner (3-col)
- Charts row (1.6fr / 1fr): stacked area + streak calendar
- Per-cluster grid (2 columns × 3 rows)
- 3 achievement cards footer

**Elo banner**: dark gradient bg (linear-gradient #1B2730 → #0F1A22), 20px radius, 3px ink border, 24px padding. White text. 3 columns:
- "CURRENT RAPID" 1842 (white 48/900) + "↑ +47 in 30d" mono green
- "PROJECTED (90d)" 1978 (yellow!) + "if drill cadence holds" mono
- "ELO LOCKED BEHIND WEAKNESSES" ~136 (orange!) + "across 4 active clusters"

**Stacked area chart** (StackedChart):
- 720×240 SVG
- 5 stacked layers (trapped, kingside, endgame, openings, other) each in their cluster color, opacity 0.85, white 1.5px stroke between layers
- 13 weeks of data on x-axis
- Dashed horizontal gridlines
- Mono week labels on baseline
- Inline legend top-right: 5 colored squares + concept names

**Calendar** (right):
- "11-day streak 🔥" header
- 13×7 grid of small rounded cells (gridAutoFlow: column to mimic GitHub-style)
- Color intensity: rgba(88,204,2, 0.2 + value*0.7), inactive cells in bg-2
- Last 11 cells forced active for streak continuity
- Footer: "78 / 90 active days" + intensity legend (less ▢▢▢▢ more)

**Per-cluster progress** grid: 2 columns. Each ClusterProgress card (bg-2, 2px border, 14px radius):
- Color dot + cluster name + status badge:
  - "MASTERED" (green badge, ✓ glyph)
  - "REGRESSED" (orange badge, ↑ glyph)
  - "NEW" (blue badge, + glyph)
  - default: ink badge
- 3 stats inline mono: success%, drill count, frequency Δ per game (green if negative)
- Inline 200×50 sparkline SVG: 2.5px stroke + 15% opacity area fill, both in cluster color, rounded joins

**Achievements** footer: 3 cards. Each: white 3px ink border, 16px radius, 5px shadow. 48px yellow trophy icon (#FFF7DB bg, yellow border, yellow-dark shadow) + title 14/900 + sub 11/600.

---

## Interactions & Behavior

### Buttons (Duo-style)
```css
/* Default */
box-shadow: 0 4px 0 [color-dark];
transform: translateY(0);
transition: transform 80ms, box-shadow 80ms;

/* Hover */
box-shadow: 0 2px 0 [color-dark];
transform: translateY(2px);

/* Active/pressed */
box-shadow: 0 0 0 [color-dark];
transform: translateY(4px);
```

### Navigation flow
1. Landing → click "Analyze" with valid username → Loading
2. Loading auto-advances → Dashboard once 4th step hits 100%
3. Dashboard → click "Drill this" on a cluster card → Drill mode (filtered to that cluster)
4. Dashboard → click "Inspect" on cluster card → Detail view
5. Detail → click "Start drilling" → Drill mode
6. Top nav available everywhere except Landing/Loading

### Drill mode states
- **Awaiting move**: empty feedback area, no last-move highlight
- **Correct (engine top-3)**: green feedback banner, +XP toast
- **Incorrect**: red banner with engine line displayed, "Retry" + "See solution" buttons, lose 1 heart
- **Out of hearts**: paywall/wait modal (not designed yet)

### Animations
- Loading spinner: 1s linear rotate, infinite, dasharray 22/50
- Concept tracker bars: animate from before → after position over 600ms cubic-bezier(0.25, 0.1, 0.25, 1)
- Card entry on dashboard: stagger 60ms, slide up 12px + fade in
- Hover on weakness cards: lift to `0 8px 0 ink` shadow, no transform

### Empty / cold-start states
With <20 games analyzed: clusters not shown. Replace cluster list with a "Need more data" panel and per-game mistake list. Also degrade the radar chart to an empty placeholder. (Designs for these are TODO — flagged as a known gap.)

---

## State Management

**Per-user state** (IndexedDB):
- `games` table — fetched Chess.com PGNs, analysis status
- `mistakes` — flagged positions w/ concept vectors
- `clusters` — computed weakness clusters w/ centroids and LLM explanations
- `drillProgress` — SM-2 spaced repetition state per cluster

**Session state**:
- Current view (route)
- Drill session: cluster, position index, hearts, streak, XP earned this session
- Concept tracker live values (pre/post move)
- Loading pipeline progress (4 steps)

See PRD §"Data Model" for full schema.

---

## Assets

All assets in this design are SVG/CSS — no raster images.

- **Logo**: green rounded square with white knight glyph (`<path>` in `Logo` component, landing.jsx)
- **Mascot**: owl-knight SVG hybrid in `Mascot` component (landing.jsx). **Placeholder** — commission proper character art before launch.
- **Chess pieces**: Unicode glyphs (♜♞♝♛♚♟) styled by font color. **Replace with proper SVG piece set in production** (Cburnett, Merida, or react-chessboard's defaults).
- **Chess.com mark**: green square with ♞ — placeholder. The real Chess.com brand mark is property of Chess.com; do not use without permission. Use a generic "C" mark or the Chess.com OAuth logo if integrating.

---

## Files

| File | Purpose |
|---|---|
| `Gambit UI.html` | Canvas wrapper loading all 6 screens |
| `design-canvas.jsx` | Pan/zoom canvas component (design tool, not for prod) |
| `screens/landing.jsx` | Landing screen + mascot + floating board |
| `screens/loading.jsx` | Analysis pipeline progress |
| `screens/dashboard.jsx` | Hero weakness dashboard + radar |
| `screens/detail.jsx` | Cluster detail w/ heatmap + concept-diff viz |
| `screens/drill.jsx` | Drill mode w/ live concept tracker |
| `screens/progress.jsx` | Long-term progress + sparklines + calendar |

Open `Gambit UI.html` to see all screens together. Each artboard has its viewport pinned (`width` × `height`) and the canvas allows panning/zooming and full-screen focus on any one screen.

---

## Implementation notes for the developer

1. **Use react-chessboard** for any interactive board — don't reinvent the grid + piece-positioning logic. Override its square colors to match the palette (`#7FA650` / `#EFEFD0`). Use the `customSquareStyles` prop for the heatmap overlay (Detail screen) and last-move highlight (Drill screen).
2. **The concept-diff divergent bar chart** is the most novel viz. It is implemented in plain HTML/CSS in `screens/detail.jsx` (`ConceptDiffViz`); do not switch to a charting library — the design relies on exact alignment to a center axis with conditional left/right bar rendering.
3. **The radar chart** is hand-rolled SVG (`Radar` in dashboard.jsx). You can swap to Recharts `<RadarChart>` if you prefer, but match the dual-polygon (you/cohort) aesthetic and the orange dot vertex markers.
4. **The live concept tracker** (drill.jsx, `ConceptTrack`) — animate the "after" marker from "before" position when a move is submitted. Use react-spring or framer-motion. ~600ms is the right feel.
5. **Stacked area chart** (progress.jsx) is hand-rolled SVG. You can move to Recharts `<AreaChart stackOffset="none">` — keep the white separator strokes between layers (they're crucial for legibility).
6. **The streak calendar** is a 13×7 CSS grid with `gridAutoFlow: column`. This emulates GitHub's contribution graph layout. 90 days = 13 weeks × ~7 days.
7. **Tailwind mapping**: define the design tokens above as Tailwind theme extensions. `shadow-duo: 0 6px 0 var(--tw-shadow-color)`. Use `shadow-[0_6px_0_theme(colors.ink)]` arbitrary values where needed.
8. **Mobile**: not designed. The PRD calls out that analysis is CPU-intensive — show a desktop-recommended warning. A read-only mobile dashboard view should be designed in a follow-up.

---

## Known design gaps / follow-ups

- Empty states (cold start, <20 games)
- Error states (invalid username, Chess.com 404, rate-limit)
- Mobile layouts
- Out-of-hearts paywall/wait state
- Concept library page (referenced in nav, not designed)
- Onboarding tour for first-time dashboard view
- Settings / account page
- Dark mode (the brief implied light-only)

