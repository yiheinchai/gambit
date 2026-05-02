"""
Build a vocabulary of all possible UCI moves on a standard chess board.
Each move is a string like "e2e4", "g1f3", "e7e8q" (with promotion).
"""

import chess


def build_move_vocab() -> dict[str, int]:
    """Generate all possible UCI moves and assign indices."""
    moves = set()

    # Generate moves from every possible position feature
    # Rather than enumerating positions, enumerate all possible (from, to, promo) tuples
    for from_sq in chess.SQUARES:
        for to_sq in chess.SQUARES:
            if from_sq == to_sq:
                continue
            uci = chess.square_name(from_sq) + chess.square_name(to_sq)
            moves.add(uci)
            # Promotion moves (only from rank 7→8 or rank 2→1)
            from_rank = chess.square_rank(from_sq)
            to_rank = chess.square_rank(to_sq)
            if (from_rank == 6 and to_rank == 7) or (from_rank == 1 and to_rank == 0):
                for promo in ["q", "r", "b", "n"]:
                    moves.add(uci + promo)

    sorted_moves = sorted(moves)
    return {m: i for i, m in enumerate(sorted_moves)}


def move_to_index(move: chess.Move, vocab: dict[str, int]) -> int | None:
    """Convert a chess.Move to a vocab index."""
    uci = move.uci()
    return vocab.get(uci)


def index_to_move(idx: int, vocab: dict[str, int]) -> str:
    """Convert a vocab index back to UCI string."""
    inv = {v: k for k, v in vocab.items()}
    return inv.get(idx, "")


if __name__ == "__main__":
    vocab = build_move_vocab()
    print(f"Vocabulary size: {len(vocab)}")
    print(f"First 10: {list(vocab.items())[:10]}")
    print(f"e2e4 index: {vocab.get('e2e4')}")
    print(f"e7e8q index: {vocab.get('e7e8q')}")
