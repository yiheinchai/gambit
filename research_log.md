# Gambit — Research Log

## Goal
Discover emergent chess concepts that help players understand and fix recurring mistakes. No hand-written labels — let the model learn what matters.

---

## Experiment 1: Baseline Emergent Model

**Date**: 2026-05-02
**Status**: Running

### Hypothesis
The current model (move prediction → SAE) produces 512 features, but only 11% move prediction accuracy suggests the backbone hasn't learned deep chess representations. The SAE features may be too shallow. Increasing training data and epochs for the move predictor should produce richer activations and more interpretable SAE features.

### Setup
- **Baseline** (current): 50K positions, 30 epochs, 11% top-1 accuracy
- **Experiment 1**: 200K positions, 50 epochs, same architecture (128ch, 6 blocks)
- **SAE**: 512 features, k=16, 200 epochs

### Changes
- Extract 200K move prediction pairs from Lichess (we have 89MB PGN)
- Train longer with learning rate warmup
- Evaluate: does higher move accuracy → more interpretable SAE features?

### Status
- 200K move pairs extracted from Lichess (17s)
- 121 games from pinksockerino fetched for external validation
- Move predictor training on MPS (50 epochs, batch 512, 200K positions)
- Training in progress — checkpoint updating at 9.1MB

### Results
*(training in progress — will complete on next loop iteration)*

### Next
After training completes:
1. Extract activations from the 200K-trained model
2. Train SAE (512 features, k=16)
3. Interpret features — compare to baseline
4. Export ONNX and deploy
5. Validate on pinksockerino's games
