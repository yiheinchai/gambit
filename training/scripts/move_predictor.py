"""
Move prediction model.
Same ResNet backbone as the concept classifier, but the head predicts
which move a strong player would make (cross-entropy over move vocab).

The internal representations (128-dim vectors from the residual blocks)
are what we extract for concept discovery.
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
        return self.relu(out + residual)


class MovePredictor(nn.Module):
    def __init__(self, vocab_size: int, channels: int = 128, num_blocks: int = 6):
        super().__init__()
        self.input_proj = nn.Sequential(
            nn.Conv2d(15, channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(channels),
            nn.ReLU(inplace=True),
        )
        self.blocks = nn.Sequential(*[ResBlock(channels) for _ in range(num_blocks)])
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.flatten = nn.Flatten()
        self.head = nn.Linear(channels, vocab_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Returns move logits (batch, vocab_size)."""
        x = self.input_proj(x)
        x = self.blocks(x)
        x = self.pool(x)
        x = self.flatten(x)
        return self.head(x)

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Returns the 128-dim activation vector (before the move head)."""
        x = self.input_proj(x)
        x = self.blocks(x)
        x = self.pool(x)
        return self.flatten(x)


if __name__ == "__main__":
    model = MovePredictor(vocab_size=5000)
    x = torch.randn(4, 15, 8, 8)
    logits = model(x)
    features = model.extract_features(x)
    print(f"Params: {sum(p.numel() for p in model.parameters()):,}")
    print(f"Logits shape: {logits.shape}")
    print(f"Features shape: {features.shape}")
