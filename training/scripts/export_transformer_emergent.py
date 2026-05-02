"""
Export transformer + SAE as combined ONNX for browser.

Usage:
    python export_transformer_emergent.py --checkpoint ../models/transformer_best.pt --sae ../models/sae_transformer.pt --output ../../public/models/concept_classifier.onnx
"""

import argparse
import json
from pathlib import Path

import numpy as np
import onnx
import torch
import torch.nn as nn

from chess_transformer import ChessTransformer
from sparse_autoencoder import SparseAutoencoder


class TransformerEmergentModel(nn.Module):
    def __init__(self, backbone: ChessTransformer, sae: SparseAutoencoder):
        super().__init__()
        self.square_embed = backbone.square_embed
        self.pos_embed = backbone.pos_embed
        self.cls_token = backbone.cls_token
        self.transformer = backbone.transformer
        self.norm = backbone.norm
        self.sae_encoder = sae.encoder
        self.sae_bias = sae.bias
        self.k = sae.k
        self.dict_size = sae.dict_size

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        batch = x.shape[0]
        tokens = x.reshape(batch, 15, 64).transpose(1, 2)
        tokens = self.square_embed(tokens)
        pos_ids = torch.arange(64, device=x.device)
        tokens = tokens + self.pos_embed(pos_ids)
        cls = self.cls_token.expand(batch, -1, -1)
        tokens = torch.cat([cls, tokens], dim=1)
        tokens = self.transformer(tokens)
        tokens = self.norm(tokens)
        cls_out = tokens[:, 0]

        z = cls_out - self.sae_bias
        z = torch.relu(self.sae_encoder(z))
        topk_vals, topk_idx = z.topk(self.k, dim=-1)
        sparse_z = torch.zeros_like(z)
        sparse_z.scatter_(-1, topk_idx, topk_vals)
        return sparse_z


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--sae", required=True)
    parser.add_argument("--concepts-json", default="../models/emergent_concepts_transformer.json")
    parser.add_argument("--output", required=True)
    parser.add_argument("--d-model", type=int, default=128)
    parser.add_argument("--n-layers", type=int, default=4)
    parser.add_argument("--n-heads", type=int, default=4)
    args = parser.parse_args()

    sae_data = torch.load(args.sae, map_location="cpu", weights_only=True)
    sae = SparseAutoencoder(sae_data["input_dim"], sae_data["dict_size"], sae_data["k"])
    sae.load_state_dict(sae_data["state_dict"])

    state = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    vocab_size = state["head.weight"].shape[0]
    backbone = ChessTransformer(vocab_size, args.d_model, args.n_heads, args.n_layers)
    backbone.load_state_dict(state)

    model = TransformerEmergentModel(backbone, sae)
    model.eval()

    dummy = torch.randn(1, 15, 8, 8)
    out = model(dummy)
    active = (out > 0).sum().item()
    print(f"Output: {out.shape}, active: {active}, k={sae_data['k']}")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    torch.onnx.export(
        model, dummy, str(output_path),
        export_params=True, opset_version=18,
        input_names=["board"], output_names=["concepts"],
        dynamic_axes={"board": {0: "batch"}, "concepts": {0: "batch"}},
    )

    m = onnx.load(str(output_path))
    onnx.save_model(m, str(output_path), save_as_external_data=False)
    for f in output_path.parent.glob("*.onnx.data"):
        f.unlink()

    size_mb = output_path.stat().st_size / 1024 / 1024
    print(f"Exported: {output_path} ({size_mb:.1f} MB)")

    import onnxruntime as ort
    sess = ort.InferenceSession(str(output_path))
    result = sess.run(None, {"board": dummy.numpy()})[0]
    print(f"ONNX validation: shape={result.shape}, active={int((result > 0).sum())}")

    features_info = []
    if Path(args.concepts_json).exists():
        with open(args.concepts_json) as f:
            data = json.load(f)
            features_info = data.get("features", [])

    concept_names = []
    for i in range(sae_data["dict_size"]):
        feat = next((f for f in features_info if f["id"] == i), None)
        concept_names.append(feat["name"] if feat else f"feature_{i}")

    manifest = {
        "type": "emergent-transformer",
        "concept_names": concept_names,
        "concept_dim": sae_data["dict_size"],
        "k": sae_data["k"],
        "backbone": "transformer",
        "params": sum(p.numel() for p in model.parameters()),
    }
    manifest_path = output_path.parent / "concepts.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
