"""
Generate training dataset from Lichess game database.
Downloads PGN files, extracts positions, computes concept labels.

Usage:
    python generate_dataset.py --pgn data/lichess_games.pgn --output data/concepts.h5 --num-positions 100000
"""

import argparse
import random
import sys
from pathlib import Path

import chess
import chess.pgn
import h5py
import numpy as np
from tqdm import tqdm

from board_encoder import encode_board
from concept_labels import label_position, ConceptVector


def extract_positions_from_pgn(
    pgn_path: str,
    num_positions: int,
    min_ply: int = 10,
    max_ply: int = 200,
) -> list[tuple[np.ndarray, np.ndarray]]:
    """Extract random positions from games in a PGN file."""
    samples = []

    with open(pgn_path) as pgn_file:
        pbar = tqdm(total=num_positions, desc="Extracting positions")
        while len(samples) < num_positions:
            game = chess.pgn.read_game(pgn_file)
            if game is None:
                break

            board = game.board()
            positions_in_game = []

            for ply, move in enumerate(game.mainline_moves()):
                board.push(move)
                if min_ply <= ply <= max_ply:
                    positions_in_game.append(board.copy())

            if not positions_in_game:
                continue

            # Sample 1-3 positions per game to avoid correlation
            n_samples = min(3, len(positions_in_game), num_positions - len(samples))
            selected = random.sample(positions_in_game, n_samples)

            for board in selected:
                tensor = encode_board(board)
                concepts = label_position(board)
                samples.append((tensor, np.array(concepts.to_vector(), dtype=np.float32)))
                pbar.update(1)

        pbar.close()

    return samples


def save_dataset(
    samples: list[tuple[np.ndarray, np.ndarray]],
    output_path: str,
):
    """Save dataset to HDF5 file."""
    boards = np.stack([s[0] for s in samples])
    labels = np.stack([s[1] for s in samples])

    with h5py.File(output_path, "w") as f:
        f.create_dataset("boards", data=boards, compression="gzip")
        f.create_dataset("labels", data=labels, compression="gzip")
        f.attrs["concept_names"] = ConceptVector.names()
        f.attrs["num_samples"] = len(samples)
        f.attrs["board_shape"] = boards.shape[1:]
        f.attrs["label_dim"] = labels.shape[1]

    print(f"Saved {len(samples)} samples to {output_path}")
    print(f"  Board tensor shape: {boards.shape}")
    print(f"  Label vector shape: {labels.shape}")
    print(f"  Concept names: {ConceptVector.names()}")


def main():
    parser = argparse.ArgumentParser(description="Generate concept training dataset")
    parser.add_argument("--pgn", required=True, help="Path to PGN file")
    parser.add_argument("--output", required=True, help="Output HDF5 path")
    parser.add_argument("--num-positions", type=int, default=100_000)
    parser.add_argument("--min-ply", type=int, default=10)
    parser.add_argument("--max-ply", type=int, default=200)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    if not Path(args.pgn).exists():
        print(f"Error: PGN file not found: {args.pgn}")
        print()
        print("To get started, download a Lichess database file:")
        print("  https://database.lichess.org/")
        print()
        print("Example (small, ~50MB compressed):")
        print("  wget https://database.lichess.org/standard/lichess_db_standard_rated_2013-01.pgn.zst")
        print("  zstd -d lichess_db_standard_rated_2013-01.pgn.zst")
        sys.exit(1)

    samples = extract_positions_from_pgn(
        args.pgn,
        args.num_positions,
        args.min_ply,
        args.max_ply,
    )

    save_dataset(samples, args.output)


if __name__ == "__main__":
    main()
