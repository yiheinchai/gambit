# Gambit — Research Log

## Goal
Discover emergent chess concepts that help players understand and fix recurring mistakes. No hand-written labels — let the model learn what matters.

---

## Experiment 1: More Data for Move Predictor (COMPLETED)

**Date**: 2026-05-02
**Duration**: ~25 min total (dataset: 1 min, training: 15 min, SAE: 8 min, export: 1 min)

### Hypothesis
50K positions produced 11% move accuracy — too low for rich representations. 200K positions should give the model enough signal to learn deeper chess patterns, producing more interpretable SAE features.

### Setup
- **Baseline**: 50K positions, 30 epochs → 11% top-1, 21% top-3
- **Experiment 1**: 200K positions, 50 epochs, same architecture (128ch, 6 blocks)
- SAE: 512 features, k=16, 200 epochs on 200K activations

### Results

**Move predictor**: 18.5% top-1, 35.2% top-3 (epoch 13 best, heavy overfit after)
- 68% improvement in top-1 accuracy over baseline
- Model peaked early and overfit — regularization or early stopping needed

**SAE**: 464/512 alive features (vs 403 baseline), 206 auto-named (vs 148)
- Reconstruction loss: 0.569 (similar to baseline 0.636)
- Feature splitting observed: multiple "Is Opening" features (7 total)

**Top emerging concepts**:
| Feature | Freq | Correlation |
|---------|------|-------------|
| White Advantage | 23.7% | material analysis |
| Open File Rook | 22.7% | open_file_rook=0.158 |
| Bishop Pair | 20.5% | bishop_pair=-0.198 |
| Exposed King | 20.0% | king safety |
| Is Opening | 18.7% | is_opening=0.259 |
| Castled | 16.5% | castled=0.281 |
| Queenless | 5.8% | endgame indicator |
| Is Endgame | 5.4% | is_endgame=0.197 |

**Model deployed**: 7.1MB ONNX at yiheinchai.com/gambit

### Analysis
- More data clearly helps — both move accuracy and SAE feature quality improved
- Feature splitting is a problem: 7 separate "opening" features dilute the signal
- The model learns surface-level positional features (material, phase, piece counts) but not deep tactical patterns (forks, pins, skewers)
- This may be because the backbone CNN can't do "look-ahead" — it sees the static board but not the game tree
- External validation on pinksockerino's games not yet run

### Lessons
- Always estimate training time before starting (this took 15 min on MPS, should have noted upfront)
- The grep filter on training output causes buffering — use `tee` or write to file directly
- SAE converges by epoch 60, 200 epochs is wasteful

---

## Experiment 2: Transformer Backbone (NEXT)

### Hypothesis
CNNs see static board state — they can't reason about "if I go here, they go there." Transformers with self-attention can learn look-ahead (proven in Leela Chess Zero — "Evidence of Learned Look-Ahead", 2406.00877). The attention mechanism naturally captures piece relationships across the board: a bishop attacking a square near the king, a knight that could fork two pieces, etc.

This should produce SAE features that correspond to *tactical* patterns (forks, pins, threats) rather than just *positional* features (material count, game phase).

### Architecture
- Input: 64 tokens (one per square), each token = 15-dim (piece type one-hot + positional features)
- Positional encoding: learned 64-dim embeddings (square identity)
- 4 layers, 128-dim, 4 attention heads
- CLS token for global representation → move prediction head
- Extract CLS token activations for SAE

### Estimated Time
- Dataset: reuse 200K positions (already have them)
- Training: ~20 min on MPS (transformer is slower than CNN per step but same param count)
- SAE: ~3 min (same as before)
- Total: ~25 min

### Risk
Overfitting — transformers are data-hungry and 200K positions may not be enough. Mitigation: dropout=0.1, weight decay, early stopping.

---

## Experiment 3: Planned

### Ideas Queue
- Contrastive learning: train on (mistake_position, correct_position) pairs
- Value prediction instead of move prediction
- Transformer backbone instead of CNN (for look-ahead)
- Validate on pinksockerino's actual game mistakes
- Reduce SAE epochs to 60 (saves time, no quality loss)

---

## External Validation
- **Player**: pinksockerino (Chess.com)
- **Games**: 121 games fetched (Apr-May 2026)
- **Saved**: training/data/pinksockerino.pgn
- **Status**: Not yet validated — will run after Experiment 2
