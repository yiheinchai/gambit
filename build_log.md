# Gambit Build Log

## Current State
**Phase**: Complete. Every PRD feature implemented, tested, pushed.
**Last updated**: 2026-05-02 iteration 20
**Build**: TypeScript clean, 26/26 tests pass, production build passes
**Codebase**: 34 TS files (5,175 lines) + 8 Python files (1,082 lines)
**Repo**: https://github.com/yiheinchai/gambit (23 commits)

---

## Feature Inventory (All PRD Items)

| PRD Feature | Status | Files |
|---|---|---|
| Chess.com game import | Done | `chesscom-api.ts` |
| Stockfish WASM analysis | Done | `stockfish.ts`, `analysis.ts` |
| Concept model (ONNX) | Done | `concept-classifier.ts`, `concept_model.py` |
| Weakness clustering | Done | `clustering.ts` |
| Interactive drills | Done | `drill-engine.ts`, `DrillMode.tsx` |
| Matched puzzles | Done | `puzzles.ts`, `PuzzleMode.tsx` |
| Spaced repetition (SM-2) | Done | `drill-engine.ts`, `DrillSchedule.tsx` |
| Progress tracking | Done | `progress.ts`, `ProgressView.tsx`, `Charts.tsx` |
| Opening repertoire | Done | `openings.ts`, `OpeningStats.tsx` |
| Concept radar chart | Done | `ConceptRadar.tsx` |
| LLM explanations | Done | `api/explain/route.ts`, `explanations.ts` |
| Explanation caching | Done | `db.ts` (IndexedDB, 7-day TTL) |
| Elo prediction | Done | `elo-prediction.ts` |
| JSON export | Done | `export.ts` |
| Analysis depth presets | Done | `UsernameForm.tsx` (Quick/Standard/Deep) |
| Cancel/partial results | Done | `page.tsx` |
| ETA display | Done | `AnalysisProgress.tsx` |
| Incremental analysis | Done | `page.tsx` (skips cached games) |
| Returning user auto-load | Done | `page.tsx` (localStorage + IndexedDB) |
| "Add New Games" button | Done | `ProgressView.tsx` |
| Drill keyboard shortcuts | Done | `DrillMode.tsx`, `PuzzleMode.tsx` |
| Mobile CPU warning | Done | `AnalysisProgress.tsx` |
| Diagnostics page | Done | `debug/page.tsx` (8 tests including ONNX) |
| Mobile responsive | Done | All components |

## Concept Model

- Architecture: ResNet CNN, 1.8M params (128ch, 6 residual blocks)
- Trained on: 50K real Lichess positions (Jan 2013 rated games database)
- Accuracy: 96.9% average across 27 concepts (val loss 0.084)
- Output: 7MB ONNX, runs in browser via ONNX Runtime Web (~5ms per position)
- 27 concepts: fork, pin, skewer, discovered attack, back rank, hanging piece, overloaded defender, trapped piece, passed pawn, isolated pawn, doubled pawn, backward pawn, open file rook, bishop pair, bad bishop, knight outpost, weak squares, space, king safety, castling, pawn shield, material up/down, imbalance, opening, middlegame, endgame

## To Deploy
1. Go to https://vercel.com/new
2. Import: yiheinchai/gambit
3. Framework: Next.js (auto-detected)
4. Optional env: `ANTHROPIC_API_KEY` for LLM coaching explanations
5. Deploy — postinstall copies Stockfish + ONNX WASM from npm

## File Map
```
src/app/
  page.tsx                      — main page, state machine, incremental analysis
  layout.tsx                    — root layout, dark theme
  api/explain/route.ts          — Claude Haiku coaching explanations
  debug/page.tsx                — 8-test browser diagnostics

src/components/ (13)
  UsernameForm.tsx              — landing page with depth presets
  AnalysisProgress.tsx          — progress bars, ETA, mobile warning
  MistakeCard.tsx               — mistake display with mini board
  WeaknessClusterCard.tsx       — cluster card + LLM explanation + 3 actions
  WeaknessDashboard.tsx         — stats + radar + clusters + schedule + export
  GameReview.tsx                — detailed review + concept tags
  DrillMode.tsx                 — interactive drill + keyboard shortcuts
  DrillSchedule.tsx             — spaced repetition schedule UI
  PuzzleMode.tsx                — matched puzzle practice
  ProgressView.tsx              — charts + Elo prediction + Add New Games
  Charts.tsx                    — SVG line + bar charts
  ConceptRadar.tsx              — weakness profile radar chart
  OpeningStats.tsx              — opening repertoire analysis

src/lib/ (11)
  chesscom-api.ts               — Chess.com API + PGN parsing
  db.ts                         — IndexedDB v2 (6 stores)
  stockfish.ts                  — Stockfish WASM wrapper
  analysis.ts                   — pipeline + concept integration
  concept-classifier.ts         — ONNX browser inference
  clustering.ts                 — k-means + auto-K
  drill-engine.ts               — drill sessions + SM-2
  progress.ts                   — progress computation
  openings.ts                   — opening detection (30+ openings)
  elo-prediction.ts             — Elo gain estimation
  explanations.ts               — fetch + cache LLM explanations
  export.ts                     — JSON export
  puzzles.ts                    — Lichess puzzle matching

src/lib/__tests__/ (4)
  smoke.test.ts                 — Chess.com API E2E
  stockfish-smoke.test.ts       — engine logic (12 tests)
  clustering-smoke.test.ts      — clustering (7 tests)
  progress-smoke.test.ts        — progress (7 tests)

training/scripts/ (8)
  board_encoder.py, concept_labels.py, concept_model.py
  generate_dataset.py, generate_synthetic.py
  train.py, export_for_browser.py, test_pipeline.py
```
