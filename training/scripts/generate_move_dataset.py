"""
Generate (position, move) pairs from Lichess PGN for move prediction training.

Usage:
    python generate_move_dataset.py --pgn ../data/lichess_2013-01.pgn --output ../data/move_prediction.h5 --num-positions 50000
"""

import argparse
import random
from pathlib import Path

import chess
import chess.pgn
import h5py
import numpy as np
from tqdm import tqdm

from board_encoder import encode_board
from move_vocab import build_move_vocab, move_to_index


def extract_move_pairs(
    pgn_path: str,
    num_positions: int,
    vocab: dict[str, int],
    min_elo: int = 1200,
    min_ply: int = 5,
    max_ply: int = 200,
) -> tuple[list[np.ndarray], list[int]]:
    """Extract (board_tensor, move_index) pairs from games."""
    boards = []
    moves = []

    with open(pgn_path) as f:
        pbar = tqdm(total=num_positions, desc="Extracting move pairs")
        while len(boards) < num_positions:
            game = chess.pgn.read_game(f)
            if game is None:
                break

            # Filter by Elo
            try:
                white_elo = int(game.headers.get("WhiteElo", "0"))
                black_elo = int(game.headers.get("BlackElo", "0"))
                if white_elo < min_elo or black_elo < min_elo:
                    continue
            except ValueError:
                continue

            board = game.board()
            for ply, move in enumerate(game.mainline_moves()):
                if ply < min_ply or ply > max_ply:
                    board.push(move)
                    continue

                # Sample ~2 positions per game to avoid correlation
                if random.random() > 0.05:
                    board.push(move)
                    continue

                move_idx = move_to_index(move, vocab)
                if move_idx is None:
                    board.push(move)
                    continue

                boards.append(encode_board(board))
                moves.append(move_idx)
                pbar.update(1)

                board.push(move)

                if len(boards) >= num_positions:
                    break

        pbar.close()

    return boards, moves


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pgn", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--num-positions", type=int, default=50000)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)

    vocab = build_move_vocab()
    print(f"Move vocabulary: {len(vocab)} moves")

    boards, moves = extract_move_pairs(args.pgn, args.num_positions, vocab)

    boards_arr = np.stack(boards)
    moves_arr = np.array(moves, dtype=np.int64)

    with h5py.File(args.output, "w") as f:
        f.create_dataset("boards", data=boards_arr, compression="gzip")
        f.create_dataset("moves", data=moves_arr, compression="gzip")
        f.attrs["vocab_size"] = len(vocab)
        f.attrs["num_samples"] = len(boards)

    print(f"Saved {len(boards)} samples to {args.output}")
    print(f"Board shape: {boards_arr.shape}, Move indices shape: {moves_arr.shape}")
    print(f"Unique moves seen: {len(set(moves))}")


if __name__ == "__main__":
    main()
