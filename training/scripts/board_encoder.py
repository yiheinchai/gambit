"""
Encode chess positions (FEN) into tensor representations.
8x8x15 tensor: 12 piece channels + side to move + castling + en passant.
"""

import numpy as np
import chess

PIECE_TO_CHANNEL = {
    chess.PAWN: 0,
    chess.KNIGHT: 1,
    chess.BISHOP: 2,
    chess.ROOK: 3,
    chess.QUEEN: 4,
    chess.KING: 5,
}


def encode_board(board: chess.Board) -> np.ndarray:
    """Encode a chess.Board into an 8x8x15 float32 tensor."""
    tensor = np.zeros((15, 8, 8), dtype=np.float32)

    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece is None:
            continue

        rank = chess.square_rank(square)
        file = chess.square_file(square)

        channel = PIECE_TO_CHANNEL[piece.piece_type]
        if piece.color == chess.BLACK:
            channel += 6

        tensor[channel, rank, file] = 1.0

    # Channel 12: side to move (1 = white, 0 = black)
    if board.turn == chess.WHITE:
        tensor[12, :, :] = 1.0

    # Channel 13: castling rights
    if board.has_kingside_castling_rights(chess.WHITE):
        tensor[13, 0, 7] = 1.0
    if board.has_queenside_castling_rights(chess.WHITE):
        tensor[13, 0, 0] = 1.0
    if board.has_kingside_castling_rights(chess.BLACK):
        tensor[13, 7, 7] = 1.0
    if board.has_queenside_castling_rights(chess.BLACK):
        tensor[13, 7, 0] = 1.0

    # Channel 14: en passant
    if board.ep_square is not None:
        rank = chess.square_rank(board.ep_square)
        file = chess.square_file(board.ep_square)
        tensor[14, rank, file] = 1.0

    return tensor


def encode_fen(fen: str) -> np.ndarray:
    """Encode a FEN string into an 8x8x15 float32 tensor."""
    board = chess.Board(fen)
    return encode_board(board)


def encode_board_after_move(board: chess.Board, move: chess.Move) -> np.ndarray:
    """Encode the board state after making a move."""
    board_copy = board.copy()
    board_copy.push(move)
    return encode_board(board_copy)


def batch_encode(fens: list[str]) -> np.ndarray:
    """Encode a batch of FEN strings. Returns (N, 15, 8, 8) tensor."""
    return np.stack([encode_fen(fen) for fen in fens])
