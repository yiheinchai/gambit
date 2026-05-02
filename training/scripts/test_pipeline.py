"""
End-to-end test of the training pipeline.
Generates synthetic data, trains for a few epochs, exports to ONNX, validates.

Usage:
    python test_pipeline.py
"""

import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent


def run(cmd: list[str], desc: str):
    print(f"\n{'='*60}")
    print(f"  {desc}")
    print(f"{'='*60}")
    result = subprocess.run(
        cmd,
        cwd=str(SCRIPTS_DIR),
        capture_output=False,
    )
    if result.returncode != 0:
        print(f"FAIL: {desc}")
        sys.exit(1)
    print(f"OK: {desc}")


def main():
    with tempfile.TemporaryDirectory() as tmpdir:
        data_path = f"{tmpdir}/test.h5"
        model_dir = f"{tmpdir}/models"
        onnx_path = f"{tmpdir}/models/concept_classifier.onnx"
        checkpoint_path = f"{tmpdir}/models/concept_classifier_best.pt"

        # Step 1: Generate synthetic data
        run(
            [sys.executable, "generate_synthetic.py", "--output", data_path, "--num-positions", "500"],
            "Generate 500 synthetic positions",
        )

        # Step 2: Train for 3 epochs
        run(
            [
                sys.executable, "train.py",
                "--dataset", data_path,
                "--epochs", "3",
                "--batch-size", "64",
                "--channels", "32",
                "--blocks", "2",
                "--output-dir", model_dir,
                "--device", "cpu",
            ],
            "Train concept model (3 epochs, tiny config)",
        )

        # Step 3: Verify checkpoint exists
        if not Path(checkpoint_path).exists():
            print(f"FAIL: Checkpoint not found at {checkpoint_path}")
            sys.exit(1)
        print(f"OK: Checkpoint exists ({Path(checkpoint_path).stat().st_size / 1024:.0f} KB)")

        # Step 4: Export to ONNX
        run(
            [
                sys.executable, "export_for_browser.py",
                "--checkpoint", checkpoint_path,
                "--output", onnx_path,
                "--channels", "32",
                "--blocks", "2",
            ],
            "Export to ONNX and validate",
        )

        # Step 5: Verify ONNX exists
        if not Path(onnx_path).exists():
            print(f"FAIL: ONNX not found at {onnx_path}")
            sys.exit(1)

        onnx_size = Path(onnx_path).stat().st_size / 1024
        print(f"OK: ONNX exists ({onnx_size:.0f} KB)")

        # Step 6: Verify concepts manifest
        manifest_path = Path(model_dir) / "concepts.json"
        if not manifest_path.exists():
            print(f"FAIL: Manifest not found at {manifest_path}")
            sys.exit(1)

        import json
        with open(manifest_path) as f:
            manifest = json.load(f)
        print(f"OK: Manifest has {manifest['concept_dim']} concepts, {manifest['params']:,} params")

    print(f"\n{'='*60}")
    print("  ALL PIPELINE TESTS PASSED")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
