"""
Extract 128-dim activation vectors from the trained move prediction model.

Usage:
    python extract_activations.py --dataset ../data/move_prediction.h5 --checkpoint ../models/move_predictor_best.pt --output ../data/activations.h5
"""

import argparse
from pathlib import Path

import h5py
import numpy as np
import torch

from move_predictor import MovePredictor


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--channels", type=int, default=128)
    parser.add_argument("--blocks", type=int, default=6)
    parser.add_argument("--batch-size", type=int, default=512)
    args = parser.parse_args()

    with h5py.File(args.dataset, "r") as f:
        boards = torch.tensor(np.array(f["boards"]), dtype=torch.float32)
        vocab_size = int(f.attrs["vocab_size"])

    print(f"Loaded {len(boards)} positions")

    model = MovePredictor(vocab_size, args.channels, args.blocks)
    model.load_state_dict(torch.load(args.checkpoint, map_location="cpu", weights_only=True))
    model.eval()

    all_features = []
    with torch.no_grad():
        for i in range(0, len(boards), args.batch_size):
            batch = boards[i : i + args.batch_size]
            features = model.extract_features(batch)
            all_features.append(features.numpy())
            print(f"  Extracted {min(i + args.batch_size, len(boards))}/{len(boards)}")

    activations = np.concatenate(all_features, axis=0)

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with h5py.File(args.output, "w") as f:
        f.create_dataset("activations", data=activations, compression="gzip")
        f.attrs["num_samples"] = len(activations)
        f.attrs["feature_dim"] = activations.shape[1]

    print(f"\nSaved {len(activations)} activation vectors ({activations.shape[1]}-dim)")
    print(f"Activation stats: mean={activations.mean():.4f}, std={activations.std():.4f}")
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
