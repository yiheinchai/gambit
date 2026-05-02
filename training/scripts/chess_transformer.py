"""
Chess Transformer for move prediction.
Treats the board as 64 tokens (one per square), uses self-attention
to learn piece relationships and look-ahead patterns.
"""

import torch
import torch.nn as nn
import math


class ChessTransformer(nn.Module):
    def __init__(
        self,
        vocab_size: int,
        d_model: int = 128,
        n_heads: int = 4,
        n_layers: int = 4,
        dropout: float = 0.1,
    ):
        super().__init__()
        self.d_model = d_model

        # Each square gets a 15-dim input (from the board tensor channels)
        # Project to d_model
        self.square_embed = nn.Linear(15, d_model)

        # Learned positional embeddings for 64 squares
        self.pos_embed = nn.Embedding(64, d_model)

        # CLS token for global representation
        self.cls_token = nn.Parameter(torch.randn(1, 1, d_model) * 0.02)

        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=n_heads,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            batch_first=True,
            norm_first=True,
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)

        self.norm = nn.LayerNorm(d_model)
        self.head = nn.Linear(d_model, vocab_size)

    def _board_to_tokens(self, x: torch.Tensor) -> torch.Tensor:
        """Convert (batch, 15, 8, 8) board tensor to (batch, 64, 15) token sequence."""
        batch = x.shape[0]
        # x is (B, 15, 8, 8) → reshape to (B, 15, 64) → transpose to (B, 64, 15)
        return x.reshape(batch, 15, 64).transpose(1, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Returns move logits (batch, vocab_size)."""
        tokens = self._board_to_tokens(x)  # (B, 64, 15)
        tokens = self.square_embed(tokens)  # (B, 64, d_model)

        # Add positional embeddings
        pos_ids = torch.arange(64, device=x.device)
        tokens = tokens + self.pos_embed(pos_ids)

        # Prepend CLS token
        cls = self.cls_token.expand(tokens.shape[0], -1, -1)
        tokens = torch.cat([cls, tokens], dim=1)  # (B, 65, d_model)

        # Transformer
        tokens = self.transformer(tokens)
        tokens = self.norm(tokens)

        # CLS token output → move prediction
        cls_out = tokens[:, 0]  # (B, d_model)
        return self.head(cls_out)

    def extract_features(self, x: torch.Tensor) -> torch.Tensor:
        """Returns the d_model-dim CLS activation (before move head)."""
        tokens = self._board_to_tokens(x)
        tokens = self.square_embed(tokens)

        pos_ids = torch.arange(64, device=x.device)
        tokens = tokens + self.pos_embed(pos_ids)

        cls = self.cls_token.expand(tokens.shape[0], -1, -1)
        tokens = torch.cat([cls, tokens], dim=1)

        tokens = self.transformer(tokens)
        tokens = self.norm(tokens)
        return tokens[:, 0]


if __name__ == "__main__":
    model = ChessTransformer(vocab_size=4544)
    params = sum(p.numel() for p in model.parameters())
    x = torch.randn(4, 15, 8, 8)
    logits = model(x)
    features = model.extract_features(x)
    print(f"Params: {params:,}")
    print(f"Logits: {logits.shape}")
    print(f"Features: {features.shape}")
