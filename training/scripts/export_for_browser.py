"""
Export a trained concept model to ONNX and prepare it for browser deployment.

Usage:
    python export_for_browser.py --checkpoint ../models/concept_classifier_best.pt --output ../../public/models/concept_classifier.onnx
"""

import argparse
import json
from pathlib import Path

import numpy as np
import torch

from concept_model import ConceptClassifier, export_to_onnx
from concept_labels import ConceptVector


def validate_onnx(onnx_path: str):
    """Validate the ONNX model with onnxruntime."""
    import onnxruntime as ort

    session = ort.InferenceSession(onnx_path)

    dummy = np.random.randn(1, 15, 8, 8).astype(np.float32)
    results = session.run(None, {"board": dummy})
    output = results[0]

    print(f"ONNX validation:")
    print(f"  Input shape:  {dummy.shape}")
    print(f"  Output shape: {output.shape}")
    print(f"  Output range: [{output.min():.4f}, {output.max():.4f}]")
    print(f"  All values in [0,1]: {(output >= 0).all() and (output <= 1).all()}")


def main():
    parser = argparse.ArgumentParser(description="Export model for browser")
    parser.add_argument("--checkpoint", required=True, help="Path to .pt checkpoint")
    parser.add_argument("--output", required=True, help="Output ONNX path")
    parser.add_argument("--channels", type=int, default=128)
    parser.add_argument("--blocks", type=int, default=6)
    args = parser.parse_args()

    concept_dim = ConceptVector.dim()
    print(f"Concept dimension: {concept_dim}")
    print(f"Concept names: {ConceptVector.names()}")

    model = ConceptClassifier(
        concept_dim=concept_dim,
        channels=args.channels,
        num_blocks=args.blocks,
    )

    state_dict = torch.load(args.checkpoint, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    print(f"Loaded checkpoint: {args.checkpoint}")

    total_params = sum(p.numel() for p in model.parameters())
    print(f"Parameters: {total_params:,}")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    export_to_onnx(model, str(output_path))
    size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"Exported ONNX: {output_path} ({size_mb:.1f} MB)")

    validate_onnx(str(output_path))

    # Write concept names manifest for the browser
    manifest_path = output_path.parent / "concepts.json"
    manifest = {
        "concept_names": ConceptVector.names(),
        "concept_dim": concept_dim,
        "model_file": output_path.name,
        "channels": args.channels,
        "blocks": args.blocks,
        "params": total_params,
    }
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
