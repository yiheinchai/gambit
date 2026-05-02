"""
Train the concept classifier model.

Usage:
    python train.py --dataset data/concepts.h5 --epochs 50 --batch-size 256
"""

import argparse
from pathlib import Path

import h5py
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset, random_split
from tqdm import tqdm

from concept_model import ConceptClassifier, export_to_onnx


def load_dataset(path: str) -> tuple[torch.Tensor, torch.Tensor, list[str]]:
    with h5py.File(path, "r") as f:
        boards = torch.tensor(np.array(f["boards"]), dtype=torch.float32)
        labels = torch.tensor(np.array(f["labels"]), dtype=torch.float32)
        concept_names = list(f.attrs["concept_names"])
    return boards, labels, concept_names


def train_epoch(
    model: nn.Module,
    loader: DataLoader,
    optimizer: torch.optim.Optimizer,
    criterion: nn.Module,
    device: torch.device,
) -> float:
    model.train()
    total_loss = 0.0
    for boards, labels in loader:
        boards, labels = boards.to(device), labels.to(device)
        optimizer.zero_grad()
        preds = model(boards)
        loss = criterion(preds, labels)
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * boards.size(0)
    return total_loss / len(loader.dataset)


@torch.no_grad()
def evaluate(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    concept_names: list[str],
) -> tuple[float, dict[str, float]]:
    model.eval()
    total_loss = 0.0
    all_preds = []
    all_labels = []

    for boards, labels in loader:
        boards, labels = boards.to(device), labels.to(device)
        preds = model(boards)
        loss = criterion(preds, labels)
        total_loss += loss.item() * boards.size(0)
        all_preds.append(preds.cpu())
        all_labels.append(labels.cpu())

    avg_loss = total_loss / len(loader.dataset)

    all_preds = torch.cat(all_preds)
    all_labels = torch.cat(all_labels)

    # Per-concept accuracy (threshold at 0.5)
    binary_preds = (all_preds > 0.5).float()
    per_concept_acc = {}
    for i, name in enumerate(concept_names):
        correct = (binary_preds[:, i] == all_labels[:, i]).float().mean().item()
        per_concept_acc[name] = correct

    return avg_loss, per_concept_acc


def main():
    parser = argparse.ArgumentParser(description="Train concept classifier")
    parser.add_argument("--dataset", required=True, help="Path to HDF5 dataset")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--channels", type=int, default=128)
    parser.add_argument("--blocks", type=int, default=6)
    parser.add_argument("--output-dir", default="../models")
    parser.add_argument("--device", default="auto")
    args = parser.parse_args()

    if args.device == "auto":
        if torch.cuda.is_available():
            device = torch.device("cuda")
        elif torch.backends.mps.is_available():
            device = torch.device("mps")
        else:
            device = torch.device("cpu")
    else:
        device = torch.device(args.device)

    print(f"Using device: {device}")

    boards, labels, concept_names = load_dataset(args.dataset)
    print(f"Loaded {len(boards)} samples, {len(concept_names)} concepts")

    dataset = TensorDataset(boards, labels)
    train_size = int(0.9 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size, num_workers=4)

    model = ConceptClassifier(
        concept_dim=len(concept_names),
        channels=args.channels,
        num_blocks=args.blocks,
    ).to(device)

    total_params = sum(p.numel() for p in model.parameters())
    print(f"Model params: {total_params:,}")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    criterion = nn.BCELoss()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    best_val_loss = float("inf")

    for epoch in range(args.epochs):
        train_loss = train_epoch(model, train_loader, optimizer, criterion, device)
        val_loss, per_concept_acc = evaluate(model, val_loader, criterion, device, concept_names)
        scheduler.step()

        avg_acc = np.mean(list(per_concept_acc.values()))
        lr = optimizer.param_groups[0]["lr"]

        print(
            f"Epoch {epoch+1:3d}/{args.epochs} | "
            f"Train Loss: {train_loss:.4f} | "
            f"Val Loss: {val_loss:.4f} | "
            f"Avg Acc: {avg_acc:.3f} | "
            f"LR: {lr:.6f}"
        )

        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), output_dir / "concept_classifier_best.pt")

            # Also export ONNX
            model_cpu = ConceptClassifier(
                concept_dim=len(concept_names),
                channels=args.channels,
                num_blocks=args.blocks,
            )
            model_cpu.load_state_dict(model.state_dict())
            export_to_onnx(model_cpu, str(output_dir / "concept_classifier.onnx"))
            print(f"  -> Saved best model (val_loss={val_loss:.4f})")

        # Print worst concepts every 10 epochs
        if (epoch + 1) % 10 == 0:
            sorted_acc = sorted(per_concept_acc.items(), key=lambda x: x[1])
            print("  Worst concepts:")
            for name, acc in sorted_acc[:5]:
                print(f"    {name}: {acc:.3f}")

    # Final report
    print("\n=== Final Per-Concept Accuracy ===")
    val_loss, per_concept_acc = evaluate(model, val_loader, criterion, device, concept_names)
    for name, acc in sorted(per_concept_acc.items(), key=lambda x: -x[1]):
        print(f"  {name:25s}: {acc:.3f}")


if __name__ == "__main__":
    main()
