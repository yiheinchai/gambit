"""
Train the move prediction model.

Usage:
    python train_move_predictor.py --dataset ../data/move_prediction.h5 --epochs 30
"""

import argparse
from pathlib import Path

import h5py
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset, random_split

from move_predictor import MovePredictor


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--channels", type=int, default=128)
    parser.add_argument("--blocks", type=int, default=6)
    parser.add_argument("--output-dir", default="../models")
    args = parser.parse_args()

    if torch.backends.mps.is_available():
        device = torch.device("mps")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")
    print(f"Device: {device}")

    with h5py.File(args.dataset, "r") as f:
        boards = torch.tensor(np.array(f["boards"]), dtype=torch.float32)
        moves = torch.tensor(np.array(f["moves"]), dtype=torch.long)
        vocab_size = int(f.attrs["vocab_size"])

    print(f"Loaded {len(boards)} samples, vocab size {vocab_size}")

    dataset = TensorDataset(boards, moves)
    train_size = int(0.9 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size)

    model = MovePredictor(vocab_size, args.channels, args.blocks).to(device)
    print(f"Params: {sum(p.numel() for p in model.parameters()):,}")

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    criterion = nn.CrossEntropyLoss()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    best_val_acc = 0.0

    for epoch in range(args.epochs):
        # Train
        model.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        for x, y in train_loader:
            x, y = x.to(device), y.to(device)
            optimizer.zero_grad()
            logits = model(x)
            loss = criterion(logits, y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * x.size(0)
            train_correct += (logits.argmax(1) == y).sum().item()
            train_total += x.size(0)
        scheduler.step()

        # Validate
        model.eval()
        val_correct = 0
        val_top3 = 0
        val_total = 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                logits = model(x)
                val_correct += (logits.argmax(1) == y).sum().item()
                top3 = logits.topk(3, dim=1).indices
                val_top3 += (top3 == y.unsqueeze(1)).any(1).sum().item()
                val_total += x.size(0)

        train_acc = train_correct / train_total
        val_acc = val_correct / val_total
        val_top3_acc = val_top3 / val_total

        print(
            f"Epoch {epoch+1:3d}/{args.epochs} | "
            f"Loss: {train_loss/train_total:.4f} | "
            f"Train Acc: {train_acc:.3f} | "
            f"Val Acc: {val_acc:.3f} | "
            f"Val Top3: {val_top3_acc:.3f}"
        )

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), output_dir / "move_predictor_best.pt")
            print(f"  -> Saved best (val_acc={val_acc:.3f})")

    print(f"\nBest validation accuracy: {best_val_acc:.3f}")


if __name__ == "__main__":
    main()
