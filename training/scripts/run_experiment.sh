#!/bin/bash
# Run the full emergent concept pipeline: activations → SAE → interpret → export → deploy
# Usage: ./run_experiment.sh [activations_dataset] [move_checkpoint]
set -e

DATASET="${1:-../data/move_prediction_200k.h5}"
CHECKPOINT="${2:-../models/move_predictor_best.pt}"
SAE_OUTPUT="../models/sae.pt"
CONCEPTS_JSON="../models/emergent_concepts.json"
ONNX_OUTPUT="../../public/models/concept_classifier.onnx"

echo "=== Step 1: Extract activations ==="
python extract_activations.py --dataset "$DATASET" --checkpoint "$CHECKPOINT" --output ../data/activations.h5

echo ""
echo "=== Step 2: Train SAE ==="
python sparse_autoencoder.py --activations ../data/activations.h5 --output "$SAE_OUTPUT" --dict-size 512 --k 16 --epochs 200

echo ""
echo "=== Step 3: Interpret features ==="
python interpret_features.py --activations ../data/activations.h5 --dataset "$DATASET" --sae "$SAE_OUTPUT" --output "$CONCEPTS_JSON"

echo ""
echo "=== Step 4: Export ONNX ==="
python export_emergent.py --move-checkpoint "$CHECKPOINT" --sae "$SAE_OUTPUT" --concepts-json "$CONCEPTS_JSON" --output "$ONNX_OUTPUT"

echo ""
echo "=== Done ==="
echo "ONNX model: $ONNX_OUTPUT"
echo "Concepts: $CONCEPTS_JSON"
