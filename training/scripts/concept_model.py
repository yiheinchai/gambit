"""
Concept classifier model.
Takes 8x8x15 board tensor → concept activation vector.
Target: ~8M params, exportable to ONNX for browser inference.
"""

import torch
import torch.nn as nn


class ResBlock(nn.Module):
    def __init__(self, channels: int):
        super().__init__()
        self.conv1 = nn.Conv2d(channels, channels, 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(channels)
        self.conv2 = nn.Conv2d(channels, channels, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(channels)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = out + residual
        return self.relu(out)


class ConceptClassifier(nn.Module):
    """
    CNN that maps board state to concept activation vector.

    Architecture:
      - Input projection: 15 → 128 channels
      - 6 residual blocks (128 channels)
      - Global average pool → 128-dim
      - MLP head → concept_dim output

    Total params: ~2.5M (well within 8MB ONNX budget at fp32, ~2.5MB at int8)
    """

    def __init__(self, concept_dim: int = 28, channels: int = 128, num_blocks: int = 6):
        super().__init__()

        self.input_proj = nn.Sequential(
            nn.Conv2d(15, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.ReLU(inplace=True),
        )

        self.blocks = nn.Sequential(*[ResBlock(channels) for _ in range(num_blocks)])

        self.head = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
            nn.Linear(channels, channels),
            nn.ReLU(inplace=True),
            nn.Linear(channels, concept_dim),
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: (batch, 15, 8, 8) board tensor
        Returns:
            (batch, concept_dim) concept activations in [0, 1]
        """
        x = self.input_proj(x)
        x = self.blocks(x)
        return self.head(x)


def export_to_onnx(model: ConceptClassifier, path: str):
    """Export model to ONNX format for browser inference."""
    model.eval()
    dummy = torch.randn(1, 15, 8, 8)

    torch.onnx.export(
        model,
        dummy,
        path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=["board"],
        output_names=["concepts"],
        dynamic_axes={
            "board": {0: "batch_size"},
            "concepts": {0: "batch_size"},
        },
    )


if __name__ == "__main__":
    model = ConceptClassifier()
    total_params = sum(p.numel() for p in model.parameters())
    print(f"Total parameters: {total_params:,}")
    print(f"Estimated ONNX size (fp32): {total_params * 4 / 1024 / 1024:.1f} MB")

    x = torch.randn(4, 15, 8, 8)
    out = model(x)
    print(f"Input shape: {x.shape}")
    print(f"Output shape: {out.shape}")
    print(f"Output range: [{out.min().item():.3f}, {out.max().item():.3f}]")
