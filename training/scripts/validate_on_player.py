"""
Validate emergent concepts on a specific player's games.
Analyzes what SAE features fire most on their mistakes vs good moves.

Usage:
    python validate_on_player.py --pgn ../data/pinksockerino.pgn --sae ../models/sae.pt --checkpoint ../models/move_predictor_best.pt --concepts ../models/emergent_concepts.json
"""

import argparse
import json

import chess
import chess.pgn
import numpy as np
import torch

from board_encoder import encode_board
from move_predictor import MovePredictor
from chess_transformer import ChessTransformer
from sparse_autoencoder import SparseAutoencoder


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pgn", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--sae", required=True)
    parser.add_argument("--concepts", required=True)
    parser.add_argument("--channels", type=int, default=128)
    parser.add_argument("--blocks", type=int, default=6)
    parser.add_argument("--model-type", default="auto", choices=["auto", "cnn", "transformer"])
    args = parser.parse_args()

    # Load models
    sae_data = torch.load(args.sae, map_location="cpu", weights_only=True)
    sae = SparseAutoencoder(sae_data["input_dim"], sae_data["dict_size"], sae_data["k"])
    sae.load_state_dict(sae_data["state_dict"])
    sae.eval()

    state = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    vocab_size = state["head.weight"].shape[0]

    # Auto-detect model type from checkpoint keys
    is_transformer = args.model_type == "transformer" or (
        args.model_type == "auto" and "transformer.layers.0.self_attn.in_proj_weight" in state
    )

    if is_transformer:
        model = ChessTransformer(vocab_size, args.channels, 4, 4)
    else:
        model = MovePredictor(vocab_size, args.channels, args.blocks)
    model.load_state_dict(state)
    model.eval()
    print(f"Model type: {'transformer' if is_transformer else 'cnn'}")

    with open(args.concepts) as f:
        concepts_data = json.load(f)
    feature_names = {f["id"]: f["name"] for f in concepts_data.get("features", [])}

    # Process games
    games_analyzed = 0
    positions_analyzed = 0
    feature_counts = np.zeros(sae_data["dict_size"])

    with open(args.pgn) as f:
        while True:
            game = chess.pgn.read_game(f)
            if game is None:
                break

            board = game.board()
            for move in game.mainline_moves():
                # Get features for this position
                tensor = torch.tensor(encode_board(board), dtype=torch.float32).unsqueeze(0)
                with torch.no_grad():
                    activation = model.extract_features(tensor)
                    _, features = sae(activation)

                active = (features[0] > 0).numpy()
                feature_counts += active
                positions_analyzed += 1

                board.push(move)

            games_analyzed += 1

    print(f"\nAnalyzed {games_analyzed} games, {positions_analyzed} positions")
    print(f"\nTop 20 most frequently active features on this player's games:")

    freq = feature_counts / max(positions_analyzed, 1)
    top_indices = np.argsort(freq)[::-1][:20]

    for idx in top_indices:
        name = feature_names.get(int(idx), f"feature_{idx}")
        print(f"  [{idx:3d}] {name:35s} freq={freq[idx]:.3f} ({int(feature_counts[idx])}/{positions_analyzed})")

    # Compare to training set distribution
    print(f"\nFeatures unique to this player (>2x above average):")
    avg_freq = 16.0 / sae_data["dict_size"]  # expected if uniform
    for idx in top_indices:
        if freq[idx] > avg_freq * 2:
            name = feature_names.get(int(idx), f"feature_{idx}")
            print(f"  [{idx:3d}] {name:35s} freq={freq[idx]:.3f} ({freq[idx]/avg_freq:.1f}x above avg)")


if __name__ == "__main__":
    main()
