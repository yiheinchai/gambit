"""
Interpret SAE features by correlating with known chess patterns.

For each SAE feature, find positions where it activates most strongly,
then check what programmatic chess patterns those positions share.

Usage:
    python interpret_features.py --activations ../data/activations.h5 --dataset ../data/move_prediction.h5 --sae ../models/sae.pt
"""

import argparse
import json
from pathlib import Path

import chess
import h5py
import numpy as np
import torch

from sparse_autoencoder import SparseAutoencoder
from concept_labels import label_position, ConceptVector


def board_from_tensor(tensor: np.ndarray) -> chess.Board:
    """Reconstruct a chess.Board from the 15x8x8 tensor (approximate)."""
    board = chess.Board.empty()
    piece_map = [
        (chess.PAWN, chess.WHITE), (chess.KNIGHT, chess.WHITE),
        (chess.BISHOP, chess.WHITE), (chess.ROOK, chess.WHITE),
        (chess.QUEEN, chess.WHITE), (chess.KING, chess.WHITE),
        (chess.PAWN, chess.BLACK), (chess.KNIGHT, chess.BLACK),
        (chess.BISHOP, chess.BLACK), (chess.ROOK, chess.BLACK),
        (chess.QUEEN, chess.BLACK), (chess.KING, chess.BLACK),
    ]
    for ch, (pt, color) in enumerate(piece_map):
        for rank in range(8):
            for file in range(8):
                if tensor[ch, rank, file] > 0.5:
                    sq = chess.square(file, rank)
                    board.set_piece_at(sq, chess.Piece(pt, color))

    board.turn = chess.WHITE if tensor[12, 0, 0] > 0.5 else chess.BLACK
    return board


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--activations", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--sae", required=True)
    parser.add_argument("--output", default="../models/emergent_concepts.json")
    parser.add_argument("--top-n", type=int, default=50)
    args = parser.parse_args()

    with h5py.File(args.activations, "r") as f:
        activations = np.array(f["activations"])
    with h5py.File(args.dataset, "r") as f:
        boards = np.array(f["boards"])

    sae_data = torch.load(args.sae, map_location="cpu", weights_only=True)
    sae = SparseAutoencoder(sae_data["input_dim"], sae_data["dict_size"], sae_data["k"])
    sae.load_state_dict(sae_data["state_dict"])
    sae.eval()

    # Get SAE features for all positions
    with torch.no_grad():
        _, features = sae(torch.tensor(activations, dtype=torch.float32))
    features = features.numpy()

    print(f"Analyzing {sae_data['dict_size']} SAE features...")

    known_concept_names = ConceptVector.names()
    concept_labels = []
    for i in range(min(len(boards), len(activations))):
        board = board_from_tensor(boards[i])
        try:
            cv = label_position(board)
            concept_labels.append(cv.to_vector())
        except Exception:
            concept_labels.append([0.0] * len(known_concept_names))
    concept_labels = np.array(concept_labels, dtype=np.float32)

    print(f"Computed {len(concept_labels)} concept label vectors")

    feature_info = []
    for feat_idx in range(sae_data["dict_size"]):
        feat_acts = features[:, feat_idx]
        activation_freq = (feat_acts > 0).mean()

        if activation_freq < 0.005:
            continue

        # Find top activating positions
        top_indices = np.argsort(feat_acts)[-args.top_n:]
        top_acts = feat_acts[top_indices]

        # Correlate with known concepts
        correlations = {}
        for c_idx, c_name in enumerate(known_concept_names):
            if concept_labels[:, c_idx].std() < 0.01:
                continue
            corr = np.corrcoef(feat_acts, concept_labels[:, c_idx])[0, 1]
            if not np.isnan(corr) and abs(corr) > 0.15:
                correlations[c_name] = round(float(corr), 3)

        # Analyze top positions for common properties
        top_boards = [board_from_tensor(boards[i]) for i in top_indices]
        properties = analyze_position_set(top_boards)

        # Auto-generate a name
        if correlations:
            best_corr = max(correlations.items(), key=lambda x: abs(x[1]))
            name = best_corr[0].replace("_", " ").title()
        elif properties:
            name = properties[0]
        else:
            name = f"Feature {feat_idx}"

        feature_info.append({
            "id": feat_idx,
            "name": name,
            "activation_freq": round(float(activation_freq), 4),
            "mean_activation": round(float(feat_acts[feat_acts > 0].mean()), 4) if (feat_acts > 0).any() else 0,
            "correlations": correlations,
            "properties": properties,
        })

    feature_info.sort(key=lambda x: x["activation_freq"], reverse=True)

    # Summary
    named = sum(1 for f in feature_info if not f["name"].startswith("Feature"))
    print(f"\nAlive features: {len(feature_info)}/{sae_data['dict_size']}")
    print(f"Auto-named: {named}")
    print(f"Unnamed: {len(feature_info) - named}")

    print("\nTop 20 features:")
    for f in feature_info[:20]:
        corr_str = ", ".join(f"{k}={v}" for k, v in sorted(f["correlations"].items(), key=lambda x: -abs(x[1]))[:3])
        print(f"  [{f['id']:3d}] {f['name']:30s} freq={f['activation_freq']:.3f}  {corr_str}")

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    with open(args.output, "w") as f:
        json.dump({
            "type": "emergent",
            "dict_size": sae_data["dict_size"],
            "k": sae_data["k"],
            "input_dim": sae_data["input_dim"],
            "features": feature_info,
        }, f, indent=2)
    print(f"\nSaved to {args.output}")


def analyze_position_set(boards: list[chess.Board]) -> list[str]:
    """Find common properties across a set of positions."""
    properties = []
    n = len(boards)
    if n == 0:
        return properties

    # Material balance
    mat_diffs = []
    for b in boards:
        w = sum(len(b.pieces(pt, chess.WHITE)) * v for pt, v in [(chess.PAWN,1),(chess.KNIGHT,3),(chess.BISHOP,3),(chess.ROOK,5),(chess.QUEEN,9)])
        bk = sum(len(b.pieces(pt, chess.BLACK)) * v for pt, v in [(chess.PAWN,1),(chess.KNIGHT,3),(chess.BISHOP,3),(chess.ROOK,5),(chess.QUEEN,9)])
        mat_diffs.append(w - bk)
    avg_diff = np.mean(mat_diffs)
    if avg_diff > 3:
        properties.append("White Advantage")
    elif avg_diff < -3:
        properties.append("Black Advantage")

    # Piece count (endgame?)
    piece_counts = [len(b.piece_map()) for b in boards]
    if np.mean(piece_counts) < 12:
        properties.append("Endgame Positions")
    elif np.mean(piece_counts) > 28:
        properties.append("Opening Positions")

    # King safety
    exposed = sum(1 for b in boards if is_king_exposed(b, b.turn)) / n
    if exposed > 0.6:
        properties.append("Exposed King")

    # Queens on board
    queens = sum(1 for b in boards if len(b.pieces(chess.QUEEN, chess.WHITE)) + len(b.pieces(chess.QUEEN, chess.BLACK)) > 0) / n
    if queens < 0.3:
        properties.append("Queenless")

    return properties


def is_king_exposed(board: chess.Board, color: chess.Color) -> bool:
    king_sq = board.king(color)
    if king_sq is None:
        return False
    return len(board.attackers(not color, king_sq)) > 0


if __name__ == "__main__":
    main()
