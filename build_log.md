# Gambit Build Log

## Current State
**Phase**: Feature-complete. Polish pass done.
**Last updated**: 2026-05-02 iteration 6
**Build status**: TypeScript clean. Production build passes. 3143 TS + 808 Python lines.

## All Features Complete

### M1: Data Pipeline & Core UI
- [x] Chess.com API client — snake_case→camelCase mapping, newest-first ordering
- [x] PGN parser via chess.js loadPgn(), filters out trivially short games
- [x] IndexedDB v2 schema (games, mistakes, clusters, drillProgress, explanationCache)
- [x] Stockfish 18 WASM (lite-single, 7MB, depth 16)
- [x] Analysis pipeline with incremental analysis (skips already-analyzed games)
- [x] Error handling: player not found, network errors, empty profiles, short games

### M2: Concept Probe Training Pipeline (offline, needs GPU)
- [x] board_encoder.py, concept_labels.py, concept_model.py
- [x] generate_dataset.py, train.py

### M3: Concept Analysis in Browser
- [x] concept-classifier.ts — ONNX Runtime Web inference (ready for trained model)
- [x] clustering.ts — k-means + cosine similarity + auto-K via silhouette
- [x] Heuristic fallback clustering when no concept model
- [x] WeaknessClusterCard with LLM explanation loading

### M4: Explanations
- [x] /api/explain route — Claude Haiku coaching explanations
- [x] Fallback explanations when no API key
- [x] Explanation caching in IndexedDB (7-day TTL)
- [x] explanations.ts — fetch-with-cache helper

### M5: Drill Engine
- [x] Interactive drill with drag-and-drop board
- [x] Stockfish evaluation (30cp tolerance)
- [x] Drill progress persistence in IndexedDB
- [x] SM-2 spaced repetition scheduling
- [x] Cumulative stats across sessions

### M6: Progress Tracking
- [x] Elo over time, mistakes/game trend, blunders/game trend (rolling averages)
- [x] Phase breakdown, recent results grid, summary stats
- [x] SVG charts (zero dependencies)
- [x] Tab navigation: Weaknesses | Progress

### Polish
- [x] Incremental analysis — re-entering same username loads cached results, only analyzes new games
- [x] Explanation caching — LLM explanations cached in IndexedDB, 7-day TTL
- [x] Drill progress persistence — accumulated across sessions with SM-2 scheduling
- [x] Chess.com API: fixed snake_case field mapping, newest-first game ordering
- [x] Edge cases: player not found, no games, network errors, short games filtered
- [x] Landing page: feature highlights, privacy note, autofocus
- [x] .env.example for ANTHROPIC_API_KEY

## Remaining (Deploy / Research)
- [x] git init + initial commit (04eea46)
- [x] Smoke tests: 26/26 passing (API, Stockfish logic, clustering, progress)
- [x] End-to-end test: Chess.com API → PGN parsing → field mapping verified
- [x] Mobile responsive: all components stack on small screens
- [x] /debug page: in-browser test suite (Stockfish WASM, API, PGN, IndexedDB)
- [x] ONNX WASM + models directories ready for concept model
- [x] Training pipeline E2E: generate → train → export → ONNX validate (ALL PASS)
- [x] 27 concepts matched between Python and TypeScript
- [x] Commits: 04eea46 → e4125d6 → b3e7cae → 1f1cc83
- [ ] Deploy to Vercel
- [ ] M2: Train on real Lichess data with full-size model (needs GPU)
- [ ] Manual browser test via /debug page

## File Structure (21 TS, 5 Python)
```
src/
  app/
    layout.tsx                    ← root layout, dark theme
    page.tsx                      ← main page, tab nav, incremental analysis
    api/explain/route.ts          ← Claude Haiku coaching explanations
  components/
    UsernameForm.tsx              ← landing with features + privacy note
    AnalysisProgress.tsx          ← progress bars during analysis
    MistakeCard.tsx               ← individual mistake with mini board
    WeaknessClusterCard.tsx       ← weakness pattern card + LLM explanation
    WeaknessDashboard.tsx         ← stats + clusters + mistakes
    GameReview.tsx                ← detailed mistake review modal
    DrillMode.tsx                 ← interactive drill with persistence
    ProgressView.tsx              ← progress charts and stats
    Charts.tsx                    ← SVG line + bar charts
  lib/
    chesscom-api.ts               ← Chess.com API + PGN parsing
    db.ts                         ← IndexedDB v2 + all CRUD
    stockfish.ts                  ← Stockfish WASM wrapper
    analysis.ts                   ← analysis pipeline
    concept-classifier.ts         ← ONNX browser inference
    clustering.ts                 ← k-means weakness clustering
    drill-engine.ts               ← drill sessions + SM-2
    progress.ts                   ← progress computation
    explanations.ts               ← fetch + cache explanations
training/
  scripts/                        ← Python training pipeline
```
