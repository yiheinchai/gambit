"""
Generate a small synthetic dataset for testing the training pipeline.
Uses random chess positions from python-chess, no external data needed.

Usage:
    python generate_synthetic.py --output ../data/synthetic.h5 --num-positions 5000
"""

import argparse
import random
from pathlib import Path

import chess
import h5py
import numpy as np
from tqdm import tqdm

from board_encoder import encode_board
from concept_labels import label_position, ConceptVector


def random_position(min_ply: int = 5, max_ply: int = 80) -> chess.Board:
    """Generate a random legal chess position by playing random moves."""
    board = chess.Board()
    num_moves = random.randint(min_ply, max_ply)

    for _ in range(num_moves):
        legal = list(board.legal_moves)
        if not legal or board.is_game_over():
            break
        board.push(random.choice(legal))

    return board


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic training data")
    parser.add_argument("--output", default="../data/synthetic.h5")
    parser.add_argument("--num-positions", type=int, default=5000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)

    boards_list = []
    labels_list = []

    for _ in tqdm(range(args.num_positions), desc="Generating positions"):
        board = random_position()
        if board.is_game_over():
            continue

        tensor = encode_board(board)
        concepts = label_position(board)
        boards_list.append(tensor)
        labels_list.append(np.array(concepts.to_vector(), dtype=np.float32))

    boards = np.stack(boards_list)
    labels = np.stack(labels_list)

    with h5py.File(args.output, "w") as f:
        f.create_dataset("boards", data=boards, compression="gzip")
        f.create_dataset("labels", data=labels, compression="gzip")
        f.attrs["concept_names"] = ConceptVector.names()
        f.attrs["num_samples"] = len(boards_list)
        f.attrs["board_shape"] = boards.shape[1:]
        f.attrs["label_dim"] = labels.shape[1]

    print(f"\nSaved {len(boards_list)} positions to {args.output}")
    print(f"Board shape: {boards.shape}")
    print(f"Labels shape: {labels.shape}")

    # Print label statistics
    print("\nLabel frequencies:")
    names = ConceptVector.names()
    for i, name in enumerate(names):
        freq = labels[:, i].mean()
        print(f"  {name:25s}: {freq:.3f}")


if __name__ == "__main__":
    main()
