"""
Extract 128-dim CLS token activations from the trained chess transformer.

Usage:
    python extract_transformer_activations.py --dataset ../data/move_prediction_200k.h5 --checkpoint ../models/transformer_best.pt --output ../data/transformer_activations.h5
"""

import argparse
from pathlib import Path

import h5py
import numpy as np
import torch

from chess_transformer import ChessTransformer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--d-model", type=int, default=128)
    parser.add_argument("--n-layers", type=int, default=4)
    parser.add_argument("--n-heads", type=int, default=4)
    parser.add_argument("--batch-size", type=int, default=512)
    args = parser.parse_args()

    with h5py.File(args.dataset, "r") as f:
        boards = torch.tensor(np.array(f["boards"]), dtype=torch.float32)
        vocab_size = int(f.attrs["vocab_size"])

    print(f"Loaded {len(boards)} positions")

    model = ChessTransformer(vocab_size, args.d_model, args.n_heads, args.n_layers)
    model.load_state_dict(torch.load(args.checkpoint, map_location="cpu", weights_only=True))
    model.eval()

    all_features = []
    with torch.no_grad():
        for i in range(0, len(boards), args.batch_size):
            batch = boards[i : i + args.batch_size]
            features = model.extract_features(batch)
            all_features.append(features.numpy())
            if (i // args.batch_size) % 20 == 0:
                print(f"  Extracted {min(i + args.batch_size, len(boards))}/{len(boards)}")

    activations = np.concatenate(all_features, axis=0)

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with h5py.File(args.output, "w") as f:
        f.create_dataset("activations", data=activations, compression="gzip")
        f.attrs["num_samples"] = len(activations)
        f.attrs["feature_dim"] = activations.shape[1]
        f.attrs["model_type"] = "transformer"

    print(f"Saved {len(activations)} activation vectors ({activations.shape[1]}-dim)")
    print(f"Activation stats: mean={activations.mean():.4f}, std={activations.std():.4f}")


if __name__ == "__main__":
    main()
