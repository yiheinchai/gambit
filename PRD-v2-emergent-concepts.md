# Gambit v2 — Emergent Concept Discovery

## Problem

The current concept model uses 27 hand-written labels (fork, pin, hanging piece, etc.) to classify chess mistakes. 8 of those labels are always zero (never implemented). The model is a compressed heuristic — it memorizes our rules, not chess understanding.

This violates the bitter lesson: methods that leverage computation and learning scale better than methods that encode human knowledge.

## Goal

Replace the hand-labeled concept pipeline with emergent concepts discovered by a neural network. No human decides what the concepts are. The model learns representations that are useful for playing chess, and we extract whatever structure it finds.

## Approach

### Phase 1 — Move Prediction Model

Train a small chess transformer/CNN on **move prediction**: given a position, predict what move a strong player would play. This is self-supervised — the Lichess game database provides millions of (position, move) pairs for free.

The model must develop internal representations of tactics, strategy, and piece relationships to predict moves well. These representations are the raw material for concept discovery.

**Architecture**: Same ResNet backbone we have (15-channel input, 128-dim residual blocks, 6 blocks). Replace the 27-dim sigmoid head with a **move prediction head** — output is a probability distribution over legal moves.

**Move encoding**: Map each move to an index. Use the UCI format (e.g., "e2e4" → index). There are ~1880 possible UCI moves on an 8x8 board (64 source squares x ~30 avg legal targets). Use a fixed vocabulary of all possible moves.

**Training data**: 50K positions already extracted from Lichess. Each has a known next move from the game. Train on (position, move_played) pairs.

**Training target**: Cross-entropy loss. The model learns to predict what a rated Lichess player would play.

**Validation**: Top-1 and top-3 move prediction accuracy on held-out positions.

### Phase 2 — Activation Extraction

After training, run every position through the model and record the 128-dim activation vector from the last residual block (before the move prediction head). These vectors encode whatever the model learned about the position.

### Phase 3 — Sparse Autoencoder (SAE)

Train a sparse autoencoder on the extracted activations:

```
Input:  128-dim activation vector
Encoder: Linear(128 → 512) + ReLU + TopK sparsity (k=16)
Decoder: Linear(512 → 128)
Loss:   MSE reconstruction + L1 sparsity penalty
```

The SAE learns 512 dictionary features. Each feature fires on positions that share some structural property — an emergent concept. Only ~16 features are active per position (sparsity), so each feature is specific and interpretable.

**Why 512 features**: Expansion factor of 4x over the 128-dim activation space. The AlphaZero concept paper used 16,384 features on 1024-dim activations (16x expansion). We use 4x because our model is smaller.

### Phase 4 — Concept Interpretation

For each of the 512 SAE features:
1. Find the top 50 positions where that feature activates most strongly
2. Look for patterns — does this feature fire on positions with forks? With weak kings? With passed pawns?
3. Some features will match known concepts. Others won't have names. Both are valid.

Auto-labeling: for features that correlate with known patterns (>80% overlap with a programmatic detector), assign a human-readable name. For others, generate a name from the most common board properties when the feature fires.

### Phase 5 — Integration

Replace the current concept classifier:
- **Old**: position → 27 hand-labeled sigmoid outputs
- **New**: position → 128-dim activation → SAE encoder → 512 sparse feature activations

The 512-dim sparse vector replaces the 27-dim concept vector everywhere in the app. Clustering, concept diffs, radar chart, and drill matching all work the same way — just with richer, emergent features.

**Browser model**: Export as a single ONNX model that goes directly from board tensor to SAE features. No need to expose the intermediate 128-dim activations.

## Data

| Asset | Source | Size |
|-------|--------|------|
| Training positions | Already extracted: `training/data/lichess_concepts.h5` | 50K positions |
| More data if needed | Lichess Jan 2013 PGN (already downloaded, 89MB) | Up to 500K positions |

## Training Plan (M2 MacBook Pro)

| Step | What | Estimated Time |
|------|------|---------------|
| 1. Build move vocab | Map all possible UCI moves to indices | Seconds |
| 2. Generate move prediction dataset | Extract (position, move) pairs from Lichess PGN | ~2 min |
| 3. Train move prediction model | 128ch, 6 blocks, ~30 epochs on 50K positions (MPS) | ~10 min |
| 4. Extract activations | Forward pass on 50K positions | ~1 min |
| 5. Train SAE | 128→512 sparse autoencoder, ~100 epochs | ~2 min |
| 6. Interpret features | Correlate with programmatic detectors, auto-label | ~1 min |
| 7. Export ONNX | Combined model (board → SAE features) | Seconds |

**Total: ~15 minutes of compute.**

## File Plan

```
training/scripts/
  move_vocab.py              — build UCI move vocabulary
  generate_move_dataset.py   — extract (position, move) pairs
  move_predictor.py          — move prediction model architecture
  train_move_predictor.py    — train the model
  extract_activations.py     — get 128-dim vectors for all positions
  sparse_autoencoder.py      — SAE architecture + training
  interpret_features.py      — auto-label emergent features
  export_emergent.py         — export combined ONNX for browser
```

## Success Criteria

1. Move prediction model achieves >25% top-1 accuracy (random is ~3%)
2. SAE reconstruction loss < 0.1 (faithfully represents the activations)
3. At least 30% of SAE features correlate with known chess patterns
4. Remaining features activate on coherent position types (manual inspection)
5. Clustering with emergent features produces more specific clusters than the current 27-label model
6. Total pipeline runs in <20 minutes on M2 MacBook Pro

## What Changes in the App

- `concept-classifier.ts`: loads the new ONNX model, outputs 512-dim sparse vector instead of 27-dim
- `clustering.ts`: works on 512-dim vectors (no code change needed — already generic)
- `ConceptRadar.tsx`: shows top emergent features instead of 27 named concepts
- `GameReview.tsx`: concept tags come from auto-labeled SAE features
- `concepts.json`: manifest lists 512 features with auto-generated names

## What Stays the Same

Everything else. The app UI, drill engine, progress tracking, opening stats, spaced repetition — all unchanged. This is a drop-in replacement for the concept layer.
