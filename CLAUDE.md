# Gambit — Claude Code Project Guide

## What This Is
A browser-based chess improvement app. Users enter their Chess.com username, the app fetches and analyzes their games with Stockfish WASM, identifies recurring weakness patterns using a trained concept classifier (ONNX), and provides interactive drills with spaced repetition.

## Commands
- `npm run dev` — start dev server (http://localhost:3000)
- `npm run build` — production build
- `npm test` — run 26 unit tests (stockfish logic, clustering, progress, API smoke)
- `npm run test:e2e` — end-to-end test against Chess.com API

## Architecture
Everything runs client-side except optional LLM explanations (/api/explain → Claude Haiku).

Key libs: `src/lib/stockfish.ts` (engine wrapper + StockfishPool for parallel analysis), `src/lib/analysis.ts` (pipeline with analyzeBatch for concurrent games), `src/lib/concept-classifier.ts` (ONNX inference), `src/lib/clustering.ts` (k-means), `src/lib/drill-engine.ts` (SM-2 scheduling).

The concept model (7MB ONNX in `public/models/`) was trained on 50K real Lichess positions using the Python scripts in `training/scripts/`. To retrain: activate `training/.venv`, run `python test_pipeline.py` for a quick validation, or `python train.py --dataset ../data/lichess_concepts.h5` for full training.

## Key Decisions
- Stockfish lite-single WASM (7MB, no SharedArrayBuffer needed)
- react-chessboard v5 uses `options` prop, not flat props
- Chess.com API uses snake_case (`end_time`, `time_control`) — mapped in `chesscom-api.ts`
- IndexedDB v2 for persistence (games, mistakes, clusters, drillProgress, explanationCache)
- Concept model: 1.8M params, 128 channels, 6 residual blocks, 27 concepts
- ONNX model committed to git (7MB) since Vercel can't run torch in postinstall

## Don't
- Don't add SharedArrayBuffer / multi-threaded Stockfish — breaks Safari and many hosts
- Don't import stockfish as an ES module — it must be loaded as a Web Worker from `/public/stockfish/`
- Don't use `position` as a flat prop on `<Chessboard>` — v5 requires `options={{ position }}`
