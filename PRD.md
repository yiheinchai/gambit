# Gambit — Product Requirements Document

## Vision

A browser-based chess improvement app that pulls a user's games from Chess.com, identifies recurring mistake patterns using concept representations distilled from superhuman chess transformers, and delivers targeted drills to fix those weaknesses. The core differentiator: mistakes are grouped by abstract chess concepts (piece activity, king safety, tactical motifs) extracted from LC0's learned representations — not hand-crafted heuristics.

## Target Users

- Intermediate chess players (800–2000 Elo) who play regularly on Chess.com
- Players who want structured improvement but can't afford or access a human coach
- Players who know they make mistakes but can't identify the underlying patterns

## Core User Flow

```
1. Enter Chess.com username
2. App fetches game history (last 100–500 games)
3. Stockfish WASM analyzes each game, flags mistakes (centipawn loss > threshold)
4. Concept classifier runs on each mistake position → concept activation vector
5. Mistakes are clustered by concept similarity across all games
6. User sees a Weakness Dashboard:
   - Top 3–5 recurring weakness patterns, ranked by frequency and severity
   - Each pattern shows: concept name, natural language explanation,
     example positions from the user's own games
7. User enters Drill Mode for a weakness:
   - Replay-your-own-mistake: the user's actual game position, try again
   - Matched puzzles: positions from Lichess DB sharing the same concept profile
   - Spaced repetition scheduling for long-term retention
8. Progress tracking over time as user adds new games
```

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────┐
│                    Browser (Client)                  │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Chess.com │  │  Stockfish   │  │   Concept     │  │
│  │ API Fetch │  │  WASM Engine │  │  Classifier   │  │
│  │          │  │              │  │  (ONNX.js)    │  │
│  └────┬─────┘  └──────┬───────┘  └───────┬───────┘  │
│       │               │                  │           │
│       ▼               ▼                  ▼           │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Analysis Pipeline                   │ │
│  │  PGN → Positions → Eval → Mistakes → Concepts   │ │
│  └──────────────────────┬──────────────────────────┘ │
│                         │                            │
│                         ▼                            │
│  ┌──────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │  Weakness    │  │  Drill   │  │   Progress    │  │
│  │  Dashboard   │  │  Engine  │  │   Tracker     │  │
│  └──────────────┘  └──────────┘  └───────────────┘  │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │         Local Storage / IndexedDB               │ │
│  │  (cached analysis, drill state, progress)       │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
         │
         │ API calls (cached, async)
         ▼
┌─────────────────────┐
│   LLM API (Claude)  │
│  Explanation render  │
│  (per-cluster, not   │
│   per-position)      │
└─────────────────────┘
```

### Component Breakdown

#### 1. Chess.com Data Ingestion

- **API**: Chess.com Published Data API (no auth required)
  - `GET /pub/player/{username}/games/{YYYY}/{MM}` — returns PGN
  - `GET /pub/player/{username}/stats` — current ratings
- **Data extracted per game**: PGN moves, time control, player color, result, opponent rating, date
- **Parsing**: chess.js for PGN parsing and move validation
- **Storage**: IndexedDB for caching fetched games (avoid re-fetching)
- **Rate limiting**: Chess.com API is unauthenticated; respect rate limits, fetch incrementally

#### 2. Stockfish WASM Analysis Engine

- **Role**: Identify mistakes by computing centipawn evaluation for each move
- **Implementation**: stockfish.js (Stockfish compiled to WASM, runs in Web Worker)
- **Analysis depth**: depth 18–20 per position (balance between accuracy and speed)
- **Mistake detection**:
  - Blunder: centipawn loss > 200
  - Mistake: centipawn loss > 100
  - Inaccuracy: centipawn loss > 50
- **Output per mistake**: FEN position, move played, best move(s), eval before/after, game phase
- **Performance**: analyze in background via Web Worker, ~0.5–1s per position at depth 18
- **Full game analysis**: ~30–60s per game (analyzing every move), parallelizable across workers

#### 3. Concept Classifier (Core Innovation)

This is the key technical component. A small neural network that maps chess positions to concept activation vectors, distilled from LC0's internal representations.

##### Training Pipeline (Offline, One-Time)

```
Step 1: Extract LC0 activations
  - Run LC0 (BT4 or similar) on millions of positions from Lichess database
  - Record intermediate layer activations at layers 5, 8, 11, 14
  - Dataset: ~5–10M positions, diverse across Elo ranges and game phases

Step 2: Train concept probes
  - Linear probes on LC0 activations for known chess concepts
  - Concept label sources:
    a) Stockfish evaluation components (king safety, mobility, pawn structure,
       passed pawns, space, threats, etc.)
    b) Tactical motif detection (forks, pins, skewers, discovered attacks,
       back-rank threats — detectable programmatically from the game tree)
    c) Strategic patterns (weak squares, outposts, open files, bishop pair,
       good/bad bishops, pawn chains, isolated pawns)
  - ~80–120 concept dimensions total
  - Validation: precision/recall against rule-based ground truth
    (following methodology from "Acquisition of Chess Knowledge in AlphaZero")

Step 3: Discover latent concepts
  - Apply sparse autoencoder (SAE) to LC0 activations
    (following methodology from the LC0 sparse decomposition paper)
  - Extract additional concept dimensions beyond the labeled set
  - Filter for features with high activation consistency and interpretability
  - Target: 50–100 additional latent concept dimensions
  - Total concept vector: ~150–200 dimensions

Step 4: Distill into standalone model
  - Architecture: lightweight CNN or transformer encoder
    - Input: 8x8x12 board representation (piece placement) +
             additional features (castling rights, en passant, side to move)
    - Output: concept activation vector (150–200 dimensions)
    - Model size target: 5–20M parameters (must run in browser via ONNX.js)
  - Training objective: predict the full concept vector (probed + latent)
    from raw board state, without needing LC0 at inference time
  - Distillation loss: MSE on concept activations + cosine similarity loss
  - Validation: concept prediction accuracy vs. LC0-derived ground truth
```

##### Inference (Browser, Per-Position)

```
Input:  FEN string of mistake position
Output: concept activation vector (150–200 dims)

Process:
  1. Encode FEN → 8x8x12 tensor
  2. Forward pass through distilled model (ONNX.js, ~5–10ms)
  3. Return concept vector

For each mistake:
  - Compute concept vector for (position, move_played)
  - Compute concept vector for (position, best_move)
  - Concept diff = vector difference → "what the player missed"
```

##### Concept Clustering Across Games

```
Input:  N mistake concept-diffs from a user's game history
Output: K weakness clusters with explanations

Process:
  1. Collect all concept-diff vectors across user's games
  2. Dimensionality reduction (UMAP or PCA) for visualization
  3. Clustering (HDBSCAN or k-means with silhouette scoring)
  4. Each cluster = a recurring weakness pattern
  5. Rank clusters by: frequency * average severity (centipawn loss)
  6. For each cluster:
     - Identify top activated concept dimensions → concept label
     - Select 3–5 representative positions (closest to cluster centroid)
     - Generate natural language explanation via LLM API
```

#### 4. LLM Explanation Rendering

- **When called**: once per weakness cluster (not per position)
- **Input to LLM**:
  ```json
  {
    "top_concepts": ["piece_activity", "trapped_piece", "bishop_mobility"],
    "concept_activations": [0.87, 0.72, 0.65],
    "example_positions": ["FEN1", "FEN2", "FEN3"],
    "example_best_moves": ["Nd7", "Be3", "Bf1"],
    "player_elo": 1350,
    "frequency": "12 times in 150 games",
    "avg_centipawn_loss": 145
  }
  ```
- **Output**: 2–3 sentence coaching explanation + 1 sentence actionable advice
- **Caching**: explanations cached per cluster signature in IndexedDB
- **Cost**: ~$0.01–0.05 per cluster, ~5–10 clusters per user = negligible

#### 5. Drill Engine

##### Replay-Your-Own-Mistake Mode
- Present the user's actual game position where they made the mistake
- User plays from that position against Stockfish (set to appropriate strength)
- Show concept activation diff after each move: "you're addressing the piece activity issue"
- Success = finding a move within the top-3 engine moves

##### Matched Puzzle Mode
- **Source**: Lichess puzzle database (4M+ puzzles, freely available, tagged by theme)
- **Matching**: compute concept vector for puzzle positions, find nearest neighbors
  to the user's weakness cluster centroids
- **Difficulty scaling**: start with puzzles from slightly below user's Elo,
  increase as they succeed
- **Presentation**: standard puzzle UI (find the best move sequence)

##### Spaced Repetition
- Track per-concept success rate
- Schedule drills using SM-2 algorithm variant:
  - New weakness: drill daily
  - Improving (>60% success): every 3 days
  - Strong (>80% success): weekly review
  - Mastered (>90% over 4 weeks): monthly check-in
- Re-surface concepts if new games reveal regression

#### 6. Progress Tracking

- **Per-concept metrics**: success rate in drills, frequency of mistake in new games
- **Overall metrics**: blunder rate over time, Elo progression, weakness count
- **Visualizations**:
  - Weakness radar chart (concept dimensions as axes)
  - Time series of mistake frequency per concept
  - Before/after comparison when user adds new games

---

## Data Model

### IndexedDB Schema

```
games {
  id: string (chess.com game ID)
  username: string
  pgn: string
  date: Date
  timeControl: string
  playerColor: "white" | "black"
  result: "win" | "loss" | "draw"
  playerElo: number
  opponentElo: number
  analyzedAt: Date | null
}

mistakes {
  id: string (auto)
  gameId: string → games.id
  moveNumber: number
  fen: string
  movePlayed: string
  bestMove: string
  evalBefore: number
  evalAfter: number
  centipawnLoss: number
  severity: "inaccuracy" | "mistake" | "blunder"
  gamePhase: "opening" | "middlegame" | "endgame"
  conceptVector: Float32Array
  conceptDiff: Float32Array
}

clusters {
  id: string (auto)
  username: string
  computedAt: Date
  centroid: Float32Array
  topConcepts: string[]
  mistakeIds: string[]
  frequency: number
  avgSeverity: number
  explanation: string (LLM-generated)
}

drillProgress {
  id: string (auto)
  clusterId: string → clusters.id
  totalAttempts: number
  successRate: number
  lastDrilled: Date
  nextDue: Date
  interval: number (days)
}
```

---

## UI Requirements

### Tech Stack
- **Framework**: Next.js (React) with App Router
- **Styling**: Tailwind CSS
- **Chess board**: react-chessboard
- **Chess logic**: chess.js
- **Engine**: stockfish.js (Web Worker)
- **ML inference**: ONNX Runtime Web (onnxruntime-web)
- **Storage**: IndexedDB via idb library
- **Charts**: Recharts or D3
- **Deployment**: Vercel (static + edge functions for LLM API proxy)

### Pages

#### 1. Landing / Username Entry
- Single input: Chess.com username
- "Analyze My Games" button
- Brief value proposition (one line)

#### 2. Analysis Loading
- Progress indicator: fetching games → analyzing moves → detecting concepts → clustering
- Show partial results as they complete (first game analyzed → show first mistakes)
- Background processing via Web Workers — UI stays responsive

#### 3. Weakness Dashboard (Primary View)
- Top 3–5 weakness clusters, each as a card:
  - Concept name (derived from top activated dimensions)
  - Severity badge (how much Elo it's costing them, estimated)
  - Frequency ("appears in 15% of your games")
  - 2–3 sentence explanation
  - Mini board showing one example position
  - "Drill This" button
- Secondary section: full mistake timeline across games
- Radar chart showing concept profile

#### 4. Weakness Detail View
- Expanded view of one weakness cluster
- All example positions from user's games (scrollable, with board)
- For each position: move played vs. best move, concept diff visualization
- Concept activation heatmap overlay on the board
- "Start Drilling" button

#### 5. Drill Mode
- Interactive chess board
- Mode toggle: "Your Positions" vs. "Practice Puzzles"
- Move feedback: correct/incorrect with concept-level explanation
- Session stats: attempts, success rate, streak
- "Next Position" / "Retry" controls

#### 6. Progress View
- Time series charts per weakness concept
- Overall improvement metrics
- "Add New Games" button to pull latest games and re-analyze
- Elo prediction: "fixing these patterns could gain you ~X Elo"

---

## Concept Probe Training — Detailed Plan

### Dataset Construction

| Source | Purpose | Size |
|--------|---------|------|
| Lichess database (open) | Diverse positions across all Elo ranges | 5M positions |
| Chess.com game archives | Positions representative of target users | 2M positions |
| Lichess puzzle database | Positions with known tactical themes (ground truth) | 4M puzzles |

### Concept Taxonomy (Seed Labels for Probes)

These are starting labels for supervised probes. Latent concepts from the SAE will extend beyond this list.

**Tactical concepts** (~30):
- Fork (knight fork, bishop fork, queen fork, pawn fork)
- Pin (absolute pin, relative pin)
- Skewer
- Discovered attack / discovered check
- Double check
- Back-rank threat
- Overloaded defender
- Deflection / decoy
- Zwischenzug (intermediate move)
- Removal of the guard
- Trapped piece
- Hanging piece

**Strategic concepts** (~30):
- Piece activity / mobility
- Good bishop vs. bad bishop
- Outpost (knight outpost, bishop outpost)
- Open file control
- Weak squares / color complex weakness
- Pawn structure (isolated, doubled, backward, passed, connected)
- Space advantage
- King safety (castled vs. uncastled, pawn shield integrity)
- Piece coordination
- Prophylaxis
- Pawn breaks
- Minority attack

**Positional/phase concepts** (~20):
- Opening principles (development, center control, king safety)
- Transition to endgame (when to trade)
- Rook endgame technique (active rook, Lucena, Philidor)
- Pawn endgame technique (opposition, key squares)
- Piece vs. pawns evaluation
- Fortress recognition
- Zugzwang potential

**Meta concepts** (~10):
- Time pressure pattern (moves after move 30 in rapid/blitz)
- Complexity of position (sharp vs. quiet)
- Initiative / tempo
- Compensation for material

### Training Infrastructure

- **GPU**: 1x A100 (80GB) or equivalent — LC0 activation extraction is the bottleneck
- **LC0 model**: BT4 (15 transformer layers, 1024 hidden dim, 32 heads)
- **Activation extraction**: ~2 hours for 5M positions (batched inference)
- **Probe training**: ~1 hour for 120 linear probes
- **SAE training**: ~4–8 hours for 16,384-feature SAE
- **Distillation**: ~8–12 hours for the small browser model
- **Total**: ~2–3 days of GPU time

### Distilled Model Architecture

```
Input: 8x8x15 tensor
  - 12 channels: piece placement (6 piece types x 2 colors)
  - 1 channel: side to move
  - 1 channel: castling rights (encoded)
  - 1 channel: en passant square

Encoder:
  - 3x Conv2d(15→64, 3x3, padding=1) + BatchNorm + ReLU
  - 3x Conv2d(64→128, 3x3, padding=1) + BatchNorm + ReLU
  - 2x Conv2d(128→256, 3x3, padding=1) + BatchNorm + ReLU
  - Global average pooling → 256-dim vector
  - Linear(256→200) → concept activation vector

Total parameters: ~8M
ONNX model size: ~32MB (quantized to int8: ~8MB)
Inference time: ~5ms on modern browser
```

### Validation Metrics

| Metric | Target | Method |
|--------|--------|--------|
| Concept prediction accuracy | >85% per concept | Compare to LC0-derived labels on held-out set |
| Tactical motif detection | >90% precision, >80% recall | Compare to programmatic motif detection |
| Cluster meaningfulness | >0.4 silhouette score | HDBSCAN on concept-diff vectors |
| Cross-position generality | Same concept clusters across diverse positions | Manual inspection of 100 clusters |
| Explanation usefulness | >4/5 user rating | User study (post-launch) |

---

## Non-Functional Requirements

### Performance
- Initial game fetch: <10s for 100 games
- Per-game analysis (Stockfish): <60s (background, parallelized across workers)
- Per-position concept inference: <10ms
- Clustering + dashboard render: <2s after analysis complete
- Drill mode move response: <100ms

### Storage
- IndexedDB budget: <100MB per user
- Concept model: ~8MB (cached after first load)
- Stockfish WASM: ~2MB

### Privacy
- All analysis runs client-side in the browser
- No game data sent to any server except:
  - Chess.com API (public data, read-only)
  - LLM API for explanation rendering (sends cluster summaries, not full games)
- No user accounts required (username is Chess.com username)
- Optional: export analysis as JSON

### Browser Support
- Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- Requires: WebAssembly, Web Workers, IndexedDB, SharedArrayBuffer
- Mobile: responsive layout, but analysis is CPU-intensive — show warning on mobile

---

## Milestones

### M1: Data Pipeline (Week 1–2)
- Chess.com API integration
- PGN parsing with chess.js
- Stockfish WASM analysis in Web Worker
- Mistake detection and storage in IndexedDB
- Basic UI: username input → game list → per-game mistake list

### M2: Concept Probe Training (Week 2–4, parallel with M1)
- LC0 activation extraction pipeline
- Supervised probe training for ~100 concepts
- SAE training for latent concept discovery
- Distillation into small ONNX model
- Validation against ground truth

### M3: Concept Analysis in Browser (Week 4–5)
- ONNX.js integration for concept classifier
- Concept-diff computation per mistake
- HDBSCAN clustering of concept-diffs
- Weakness dashboard UI with cluster cards

### M4: Explanations (Week 5–6)
- LLM API integration for cluster explanations
- Explanation caching
- Concept name derivation from activation dimensions
- Weakness detail view with example positions

### M5: Drill Engine (Week 6–8)
- Replay-your-own-mistake mode
- Lichess puzzle database integration + concept-vector matching
- Spaced repetition scheduling
- Drill UI with move feedback

### M6: Progress Tracking + Polish (Week 8–10)
- Progress charts and metrics
- Incremental re-analysis when new games are added
- Performance optimization (lazy loading, worker pooling)
- Mobile responsiveness
- Deploy to Vercel

---

## Open Questions

1. **SAE feature interpretability**: What percentage of SAE-discovered latent concepts will be human-interpretable? The LC0 paper found some features resist interpretation. How do we handle clusters driven by uninterpretable features?

2. **Concept-diff vs. position-diff**: When computing what the player "missed," should we diff concept vectors of the resulting positions (after played move vs. after best move) or diff at the current position level? The former captures consequences, the latter captures what was available.

3. **Cold start for new users**: With <20 games, clustering will be noisy. Minimum viable analysis threshold? Show per-game analysis without clustering until enough data accumulates?

4. **Concept model updates**: As LC0 improves or new concept probes are trained, how do we update the ONNX model without invalidating cached analysis? Version the model and re-analyze on update?

5. **Drill effectiveness measurement**: How do we distinguish "the user learned the concept" from "the user memorized specific positions"? Track performance on novel positions sharing the same concept cluster.

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Analysis completion rate | >80% of users complete full analysis | Frontend analytics |
| Drill engagement | >50% of users who see dashboard start drilling | Frontend analytics |
| Return rate | >30% of users return within 7 days | Frontend analytics |
| Concept accuracy (perceived) | >4/5 "this matches my experience" | In-app survey |
| Elo improvement signal | Positive correlation between drill usage and Elo change | Chess.com stats comparison over time |
