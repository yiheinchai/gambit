#!/bin/bash
# Run SAE pipeline on Experiment 4 checkpoint
set -e
cd "$(dirname "$0")"
source ../../../training/.venv/bin/activate 2>/dev/null || source /Users/yihein.chai/Documents/learn/gambit/training/.venv/bin/activate

echo "=== Extract activations from exp4 ==="
python extract_transformer_activations.py \
  --dataset ../data/move_prediction_500k.h5 \
  --checkpoint ../models/exp4/transformer_best.pt \
  --output ../data/activations_exp4.h5

echo "=== Train SAE ==="
python sparse_autoencoder.py \
  --activations ../data/activations_exp4.h5 \
  --output ../models/sae_exp4.pt \
  --dict-size 512 --k 16 --epochs 100

echo "=== Interpret features ==="
python interpret_features.py \
  --activations ../data/activations_exp4.h5 \
  --dataset ../data/move_prediction_500k.h5 \
  --sae ../models/sae_exp4.pt \
  --output ../models/emergent_concepts_exp4.json

echo "=== Export ONNX ==="
python export_transformer_emergent.py \
  --checkpoint ../models/exp4/transformer_best.pt \
  --sae ../models/sae_exp4.pt \
  --concepts-json ../models/emergent_concepts_exp4.json \
  --output ../../public/models/concept_classifier.onnx

echo "=== DONE ==="
