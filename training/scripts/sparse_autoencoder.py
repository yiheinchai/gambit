"""
Sparse Autoencoder for emergent concept discovery.

Learns a dictionary of 512 features from 128-dim model activations.
Each feature is a direction in representation space that the model
found useful — an emergent concept.

Usage:
    python sparse_autoencoder.py --activations ../data/activations.h5 --output ../models/sae.pt
"""

import argparse
from pathlib import Path

import h5py
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset


class SparseAutoencoder(nn.Module):
    def __init__(self, input_dim: int = 128, dict_size: int = 512, k: int = 16):
        super().__init__()
        self.input_dim = input_dim
        self.dict_size = dict_size
        self.k = k

        self.encoder = nn.Linear(input_dim, dict_size)
        self.decoder = nn.Linear(dict_size, input_dim, bias=False)

        # Tie decoder weights to encoder for better feature quality
        # self.decoder.weight = nn.Parameter(self.encoder.weight.T.clone())

        # Pre-encoder bias (subtract mean activation)
        self.register_buffer("bias", torch.zeros(input_dim))

    def encode(self, x: torch.Tensor) -> torch.Tensor:
        """Encode input to sparse feature activations."""
        x = x - self.bias
        z = torch.relu(self.encoder(x))
        # TopK sparsity: keep only the k largest activations
        if self.k < self.dict_size:
            topk_vals, topk_idx = z.topk(self.k, dim=-1)
            sparse_z = torch.zeros_like(z)
            sparse_z.scatter_(-1, topk_idx, topk_vals)
            return sparse_z
        return z

    def decode(self, z: torch.Tensor) -> torch.Tensor:
        """Reconstruct input from sparse features."""
        return self.decoder(z) + self.bias

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """Returns (reconstruction, sparse_features)."""
        z = self.encode(x)
        x_hat = self.decode(z)
        return x_hat, z


def train_sae(
    activations: np.ndarray,
    dict_size: int = 512,
    k: int = 16,
    epochs: int = 100,
    batch_size: int = 256,
    lr: float = 1e-3,
    l1_weight: float = 1e-4,
) -> SparseAutoencoder:
    """Train the SAE on extracted activations."""
    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

    data = torch.tensor(activations, dtype=torch.float32)
    input_dim = data.shape[1]

    # Compute and set bias to mean activation
    mean_act = data.mean(dim=0)

    sae = SparseAutoencoder(input_dim, dict_size, k).to(device)
    sae.bias.copy_(mean_act.to(device))

    loader = DataLoader(TensorDataset(data), batch_size=batch_size, shuffle=True)
    optimizer = torch.optim.Adam(sae.parameters(), lr=lr)

    for epoch in range(epochs):
        total_loss = 0.0
        total_recon = 0.0
        total_l1 = 0.0
        total_alive = 0

        for (batch,) in loader:
            batch = batch.to(device)
            x_hat, z = sae(batch)

            recon_loss = nn.functional.mse_loss(x_hat, batch)
            l1_loss = z.abs().mean()
            loss = recon_loss + l1_weight * l1_loss

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            total_loss += loss.item() * batch.size(0)
            total_recon += recon_loss.item() * batch.size(0)
            total_l1 += l1_loss.item() * batch.size(0)
            total_alive += (z > 0).any(0).sum().item()

        n = len(data)
        alive_features = total_alive // max(1, len(loader))

        if (epoch + 1) % 10 == 0 or epoch == 0:
            print(
                f"Epoch {epoch+1:3d}/{epochs} | "
                f"Loss: {total_loss/n:.6f} | "
                f"Recon: {total_recon/n:.6f} | "
                f"L1: {total_l1/n:.6f} | "
                f"Alive: {alive_features}/{dict_size}"
            )

    return sae.cpu()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--activations", required=True)
    parser.add_argument("--output", default="../models/sae.pt")
    parser.add_argument("--dict-size", type=int, default=512)
    parser.add_argument("--k", type=int, default=16)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--l1-weight", type=float, default=1e-4)
    args = parser.parse_args()

    with h5py.File(args.activations, "r") as f:
        activations = np.array(f["activations"])
    print(f"Loaded {len(activations)} activations ({activations.shape[1]}-dim)")

    sae = train_sae(
        activations,
        dict_size=args.dict_size,
        k=args.k,
        epochs=args.epochs,
        l1_weight=args.l1_weight,
    )

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    torch.save({
        "state_dict": sae.state_dict(),
        "input_dim": sae.input_dim,
        "dict_size": sae.dict_size,
        "k": sae.k,
    }, args.output)
    print(f"\nSaved SAE to {args.output}")

    # Quick analysis
    data = torch.tensor(activations, dtype=torch.float32)
    with torch.no_grad():
        _, features = sae(data)
    active_per_sample = (features > 0).float().sum(1).mean().item()
    feature_freq = (features > 0).float().mean(0)
    alive = (feature_freq > 0.01).sum().item()

    print(f"Avg active features per position: {active_per_sample:.1f}")
    print(f"Features alive (>1% activation): {alive}/{args.dict_size}")
    print(f"Feature activation range: [{feature_freq.min():.4f}, {feature_freq.max():.4f}]")


if __name__ == "__main__":
    main()
