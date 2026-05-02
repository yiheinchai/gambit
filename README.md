# Gambit

A browser-based chess improvement app that analyzes your Chess.com games, identifies recurring weakness patterns, and provides targeted drills.

## Features

- **Game Analysis**: Fetches your games from Chess.com and analyzes every position with Stockfish WASM (runs entirely in your browser)
- **Weakness Clustering**: Groups your mistakes by pattern — not just "you blundered" but "you keep missing knight forks in the middlegame"
- **Interactive Drills**: Practice your actual mistake positions with real-time Stockfish evaluation
- **Progress Tracking**: Elo trends, mistake rates, phase breakdowns, spaced repetition scheduling
- **Coaching Explanations**: Optional LLM-powered explanations for each weakness pattern (requires API key)

All analysis runs client-side. No game data leaves your browser.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter a Chess.com username, and start analyzing.

### Optional: LLM Explanations

Copy `.env.example` to `.env.local` and add your Anthropic API key for coaching-style weakness explanations:

```bash
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY
```

## Architecture

```
Browser (client-side):
  Chess.com API → fetch games
  Stockfish WASM → evaluate positions, find mistakes
  ONNX model → classify mistake patterns (concept probes)
  k-means → cluster similar mistakes
  Drill engine → interactive practice
  IndexedDB → persist everything locally

Server (optional):
  /api/explain → Claude Haiku coaching explanations
```

## Training the Concept Model

The concept classifier is a small CNN (~2.5M params) that maps chess positions to concept activation vectors, distilled from chess transformer representations.

```bash
cd training
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Quick test (synthetic data, ~15s)
cd scripts && python test_pipeline.py

# Full training (needs Lichess PGN)
python generate_dataset.py --pgn ../data/lichess.pgn --output ../data/concepts.h5
python train.py --dataset ../data/concepts.h5 --epochs 50
python export_for_browser.py --checkpoint ../models/concept_classifier_best.pt --output ../../public/models/concept_classifier.onnx
```

## Tech Stack

- Next.js 16, React 19, TypeScript, Tailwind CSS
- chess.js, react-chessboard v5
- Stockfish 18 WASM (lite, 7MB)
- ONNX Runtime Web
- IndexedDB via idb
- PyTorch (training pipeline)
