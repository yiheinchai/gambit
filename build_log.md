# Gambit Build Log

## Current State
**Phase**: Feature-complete. Polished. Retrained on real data.
**Last updated**: 2026-05-02 iteration 14
**Build status**: TypeScript clean. 26/26 tests pass. Production build passes.
**Codebase**: 28 TS files (4114 lines) + 7 Python files (1082 lines) + 11 components + 9 lib modules
**Repo**: https://github.com/yiheinchai/gambit (12 commits)

## All Milestones Complete

### M1: Data Pipeline & Core UI
- [x] Chess.com API client with snake_case mapping, newest-first ordering
- [x] PGN parser via chess.js loadPgn(), short game filtering
- [x] IndexedDB v2 (games, mistakes, clusters, drillProgress, explanationCache)
- [x] Stockfish 18 WASM (lite-single, 7MB, depth 16)
- [x] Incremental analysis: cached results loaded, only new games analyzed
- [x] Cancel/stop mid-analysis with partial results viewing
- [x] ETA display during analysis
- [x] Error handling: player not found, network errors, empty profiles

### M2: Concept Probe Training
- [x] Full training pipeline: board_encoder, concept_labels, concept_model
- [x] Synthetic data generator (no Lichess download needed for testing)
- [x] Pipeline E2E test: generate → train → export → validate
- [x] Trained: 1.8M params, 128ch, 6 blocks, 20 epochs, 90.7% accuracy
- [x] Exported: 7MB ONNX + concepts.json manifest
- [x] Browser export script with ONNX validation

### M3: Concept Analysis in Browser
- [x] ONNX Runtime Web inference (auto-detects model availability)
- [x] Concept diff computation: what the player missed per mistake
- [x] k-means clustering with cosine similarity + auto-K via silhouette
- [x] Heuristic fallback when no model present
- [x] Concept radar chart (SVG spider chart of weakness profile)
- [x] GameReview shows "What you missed" concept tags

### M4: Explanations
- [x] /api/explain: Claude Haiku coaching explanations with fallback
- [x] Explanation caching in IndexedDB (7-day TTL)
- [x] Cluster cards load explanations asynchronously

### M5: Drill Engine
- [x] Interactive drill with drag-and-drop + Stockfish evaluation
- [x] Spaced repetition scheduling (SM-2 algorithm)
- [x] Drill progress persistence across sessions in IndexedDB
- [x] Drill schedule UI: Due/New/Scheduled/Mastered status badges
- [x] Schedule auto-refreshes after drill completion
- [x] Completion screen with accuracy stats

### M6: Progress Tracking
- [x] Elo over time, mistakes/game trend, blunders/game trend
- [x] Phase breakdown, recent results grid, summary stats
- [x] SVG charts (zero dependencies)
- [x] Tab navigation: Weaknesses | Progress

### Testing
- [x] 26/26 unit tests: API smoke, Stockfish logic, clustering, progress
- [x] Training pipeline E2E test
- [x] Endpoint smoke tests: /debug, /api/explain, ONNX model, concepts manifest
- [x] /debug page for in-browser runtime testing

### Deploy Prep
- [x] GitHub: https://github.com/yiheinchai/gambit
- [x] vercel.json with COOP/COEP headers
- [x] ONNX model committed (7MB) for Vercel
- [x] postinstall copies Stockfish + ONNX WASM from npm
- [x] .env.example, README with full docs

### Latest (Iteration 14)
- [x] Analysis depth presets: Quick Scan (d10/20g), Standard (d14/50g), Deep (d18/100g)
- [x] Drill keyboard shortcuts: Enter/Space (next), R (retry), Esc (exit)
- [x] Concept model retrained on 50K real Lichess positions (Jan 2013 DB)
- [x] All endpoints verified via HTTP smoke tests

## To Deploy
1. Go to https://vercel.com/new
2. Import: yiheinchai/gambit
3. Framework: Next.js (auto-detected)
4. Optional env: ANTHROPIC_API_KEY for LLM explanations
5. Deploy

## File Structure (28 TS + 7 Python)
```
src/
  app/
    layout.tsx, page.tsx
    api/explain/route.ts
    debug/page.tsx
  components/
    UsernameForm.tsx           — landing page
    AnalysisProgress.tsx       — progress bars + ETA
    MistakeCard.tsx            — individual mistake display
    WeaknessClusterCard.tsx    — cluster card + LLM explanation
    WeaknessDashboard.tsx      — stats + radar + clusters + schedule
    GameReview.tsx             — detailed review + concept tags
    DrillMode.tsx              — interactive drill + persistence
    DrillSchedule.tsx          — spaced repetition schedule UI
    ProgressView.tsx           — progress charts
    Charts.tsx                 — SVG line + bar charts
    ConceptRadar.tsx           — weakness profile radar chart
  lib/
    chesscom-api.ts            — Chess.com API + PGN parsing
    db.ts                      — IndexedDB v2 + all CRUD
    stockfish.ts               — Stockfish WASM wrapper
    analysis.ts                — pipeline + concept integration
    concept-classifier.ts      — ONNX browser inference
    clustering.ts              — k-means weakness clustering
    drill-engine.ts            — drill sessions + SM-2
    progress.ts                — progress computation
    explanations.ts            — fetch + cache explanations
  lib/__tests__/
    smoke.test.ts              — Chess.com API E2E
    stockfish-smoke.test.ts    — engine logic tests
    clustering-smoke.test.ts   — clustering tests
    progress-smoke.test.ts     — progress tests
training/
  scripts/
    board_encoder.py           — FEN → tensor
    concept_labels.py          — 27 concept detectors
    concept_model.py           — ResNet CNN + ONNX export
    generate_dataset.py        — Lichess PGN → HDF5
    generate_synthetic.py      — synthetic data for testing
    train.py                   — training loop
    export_for_browser.py      — checkpoint → ONNX
    test_pipeline.py           — E2E pipeline test
public/
  models/concept_classifier.onnx (7MB)
  models/concepts.json
  stockfish/ (WASM, from postinstall)
  onnx/ (WASM, from postinstall)
```
