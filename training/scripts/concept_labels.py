"""
Generate ground-truth concept labels for chess positions.
Uses python-chess + Stockfish to detect tactical and strategic patterns.
"""

import chess
import chess.engine
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ConceptVector:
    """Binary concept activations for a single position."""
    # Tactical concepts
    fork_possible: float = 0.0
    pin_exists: float = 0.0
    skewer_possible: float = 0.0
    discovered_attack: float = 0.0
    back_rank_threat: float = 0.0
    hanging_piece: float = 0.0
    overloaded_defender: float = 0.0
    trapped_piece: float = 0.0

    # Strategic concepts
    passed_pawn: float = 0.0
    isolated_pawn: float = 0.0
    doubled_pawn: float = 0.0
    backward_pawn: float = 0.0
    open_file_rook: float = 0.0
    bishop_pair: float = 0.0
    bad_bishop: float = 0.0
    knight_outpost: float = 0.0
    weak_squares: float = 0.0
    space_advantage: float = 0.0

    # King safety
    king_exposed: float = 0.0
    castled: float = 0.0
    pawn_shield_broken: float = 0.0

    # Material
    material_up: float = 0.0
    material_down: float = 0.0
    material_imbalance: float = 0.0

    # Phase
    is_opening: float = 0.0
    is_middlegame: float = 0.0
    is_endgame: float = 0.0

    def to_vector(self) -> list[float]:
        return [getattr(self, f.name) for f in self.__dataclass_fields__.values()]

    @staticmethod
    def dim() -> int:
        return len(ConceptVector.__dataclass_fields__)

    @staticmethod
    def names() -> list[str]:
        return list(ConceptVector.__dataclass_fields__.keys())


PIECE_VALUES = {
    chess.PAWN: 1,
    chess.KNIGHT: 3,
    chess.BISHOP: 3,
    chess.ROOK: 5,
    chess.QUEEN: 9,
    chess.KING: 0,
}


def compute_material(board: chess.Board, color: chess.Color) -> int:
    total = 0
    for piece_type in PIECE_VALUES:
        total += len(board.pieces(piece_type, color)) * PIECE_VALUES[piece_type]
    return total


def detect_hanging_pieces(board: chess.Board, color: chess.Color) -> bool:
    """Check if any piece of `color` is attacked but not defended."""
    for square in chess.SQUARES:
        piece = board.piece_at(square)
        if piece is None or piece.color != color:
            continue
        if piece.piece_type == chess.PAWN:
            continue

        attackers = board.attackers(not color, square)
        defenders = board.attackers(color, square)
        if len(attackers) > 0 and len(defenders) == 0:
            return True
    return False


def detect_fork_targets(board: chess.Board, color: chess.Color) -> bool:
    """Check if `color` has a move that attacks 2+ higher-value pieces."""
    for move in board.legal_moves:
        if board.turn != color:
            break

        piece = board.piece_at(move.from_square)
        if piece is None:
            continue

        board.push(move)
        attacked_value = 0
        attacked_count = 0
        for sq in board.attacks(move.to_square):
            target = board.piece_at(sq)
            if target and target.color != color:
                target_val = PIECE_VALUES.get(target.piece_type, 0)
                if target_val > PIECE_VALUES.get(piece.piece_type, 0):
                    attacked_count += 1
                    attacked_value += target_val
        board.pop()

        if attacked_count >= 2:
            return True
    return False


def detect_pins(board: chess.Board) -> bool:
    """Check if any pin exists on the board."""
    for color in [chess.WHITE, chess.BLACK]:
        king_sq = board.king(color)
        if king_sq is None:
            continue
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece is None or piece.color != color:
                continue
            if board.is_pinned(color, square):
                return True
    return False


def detect_passed_pawns(board: chess.Board, color: chess.Color) -> bool:
    """Check if `color` has any passed pawns."""
    pawns = board.pieces(chess.PAWN, color)
    opponent_pawns = board.pieces(chess.PAWN, not color)
    direction = 1 if color == chess.WHITE else -1

    for pawn_sq in pawns:
        pawn_file = chess.square_file(pawn_sq)
        pawn_rank = chess.square_rank(pawn_sq)
        is_passed = True

        for opp_sq in opponent_pawns:
            opp_file = chess.square_file(opp_sq)
            opp_rank = chess.square_rank(opp_sq)

            if abs(opp_file - pawn_file) <= 1:
                if direction == 1 and opp_rank > pawn_rank:
                    is_passed = False
                    break
                elif direction == -1 and opp_rank < pawn_rank:
                    is_passed = False
                    break

        if is_passed:
            return True
    return False


def detect_isolated_pawns(board: chess.Board, color: chess.Color) -> bool:
    """Check if `color` has any isolated pawns."""
    pawns = board.pieces(chess.PAWN, color)
    pawn_files = {chess.square_file(sq) for sq in pawns}

    for pawn_sq in pawns:
        f = chess.square_file(pawn_sq)
        has_neighbor = (f - 1 in pawn_files) or (f + 1 in pawn_files)
        if not has_neighbor:
            return True
    return False


def detect_doubled_pawns(board: chess.Board, color: chess.Color) -> bool:
    """Check if `color` has doubled pawns on any file."""
    pawns = board.pieces(chess.PAWN, color)
    file_counts: dict[int, int] = {}
    for sq in pawns:
        f = chess.square_file(sq)
        file_counts[f] = file_counts.get(f, 0) + 1
    return any(c > 1 for c in file_counts.values())


def detect_open_file_rook(board: chess.Board, color: chess.Color) -> bool:
    """Check if `color` has a rook on an open or semi-open file."""
    rooks = board.pieces(chess.ROOK, color)
    for rook_sq in rooks:
        f = chess.square_file(rook_sq)
        own_pawns_on_file = any(
            chess.square_file(sq) == f for sq in board.pieces(chess.PAWN, color)
        )
        if not own_pawns_on_file:
            return True
    return False


def detect_bishop_pair(board: chess.Board, color: chess.Color) -> bool:
    return len(board.pieces(chess.BISHOP, color)) >= 2


def detect_king_exposed(board: chess.Board, color: chess.Color) -> bool:
    """Check if the king has few pawn defenders nearby."""
    king_sq = board.king(color)
    if king_sq is None:
        return False

    king_rank = chess.square_rank(king_sq)
    king_file = chess.square_file(king_sq)
    shield_count = 0

    direction = 1 if color == chess.WHITE else -1
    for df in [-1, 0, 1]:
        f = king_file + df
        r = king_rank + direction
        if 0 <= f <= 7 and 0 <= r <= 7:
            sq = chess.square(f, r)
            piece = board.piece_at(sq)
            if piece and piece.piece_type == chess.PAWN and piece.color == color:
                shield_count += 1

    return shield_count < 2


def classify_phase(board: chess.Board) -> tuple[bool, bool, bool]:
    """Returns (opening, middlegame, endgame) booleans."""
    piece_count = 0
    for pt in [chess.KNIGHT, chess.BISHOP, chess.ROOK, chess.QUEEN]:
        piece_count += len(board.pieces(pt, chess.WHITE))
        piece_count += len(board.pieces(pt, chess.BLACK))

    queens = len(board.pieces(chess.QUEEN, chess.WHITE)) + len(
        board.pieces(chess.QUEEN, chess.BLACK)
    )

    if piece_count <= 6:
        return False, False, True
    if queens == 0 or piece_count <= 10:
        return False, True, False
    if board.fullmove_number <= 10:
        return True, False, False
    return False, True, False


def label_position(board: chess.Board) -> ConceptVector:
    """Generate concept labels for a position."""
    cv = ConceptVector()
    color = board.turn

    # Tactical
    if board.turn == color:
        cv.fork_possible = float(detect_fork_targets(board, color))
    cv.pin_exists = float(detect_pins(board))
    cv.hanging_piece = float(detect_hanging_pieces(board, color))

    # Back rank threat (simplified)
    king_sq = board.king(not color)
    if king_sq is not None:
        king_rank = chess.square_rank(king_sq)
        if (not color == chess.WHITE and king_rank == 0) or (
            not color == chess.BLACK and king_rank == 7
        ):
            cv.back_rank_threat = 1.0 if detect_king_exposed(board, not color) else 0.0

    # Strategic
    cv.passed_pawn = float(detect_passed_pawns(board, color))
    cv.isolated_pawn = float(detect_isolated_pawns(board, color))
    cv.doubled_pawn = float(detect_doubled_pawns(board, color))
    cv.open_file_rook = float(detect_open_file_rook(board, color))
    cv.bishop_pair = float(detect_bishop_pair(board, color))

    # King safety
    cv.king_exposed = float(detect_king_exposed(board, color))
    has_castled = board.has_castling_rights(color) is False and (
        (color == chess.WHITE and chess.square_file(board.king(color) or 0) in [2, 6])
        or (color == chess.BLACK and chess.square_file(board.king(color) or 0) in [2, 6])
    )
    cv.castled = float(has_castled)

    # Material
    own_mat = compute_material(board, color)
    opp_mat = compute_material(board, not color)
    cv.material_up = float(own_mat > opp_mat + 1)
    cv.material_down = float(opp_mat > own_mat + 1)

    bishop_w = len(board.pieces(chess.BISHOP, chess.WHITE))
    bishop_b = len(board.pieces(chess.BISHOP, chess.BLACK))
    knight_w = len(board.pieces(chess.KNIGHT, chess.WHITE))
    knight_b = len(board.pieces(chess.KNIGHT, chess.BLACK))
    cv.material_imbalance = float(
        abs(bishop_w - bishop_b) >= 2
        or abs(knight_w - knight_b) >= 2
        or (bishop_w >= 2 and knight_b >= 2)
    )

    # Phase
    opening, middlegame, endgame = classify_phase(board)
    cv.is_opening = float(opening)
    cv.is_middlegame = float(middlegame)
    cv.is_endgame = float(endgame)

    # Space advantage (count squares controlled in opponent's half)
    own_control = 0
    for sq in chess.SQUARES:
        rank = chess.square_rank(sq)
        if color == chess.WHITE and rank >= 4:
            if len(board.attackers(color, sq)) > 0:
                own_control += 1
        elif color == chess.BLACK and rank <= 3:
            if len(board.attackers(color, sq)) > 0:
                own_control += 1
    cv.space_advantage = float(own_control > 12)

    return cv


def label_fen(fen: str) -> ConceptVector:
    return label_position(chess.Board(fen))
