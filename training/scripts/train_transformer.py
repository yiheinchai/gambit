"""
Train the chess transformer on move prediction.

Usage:
    python train_transformer.py --dataset ../data/move_prediction_200k.h5 --epochs 30 --output-dir ../models
"""

import argparse
import time
from pathlib import Path

import h5py
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset, random_split

from chess_transformer import ChessTransformer


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--lr", type=float, default=5e-4)
    parser.add_argument("--d-model", type=int, default=128)
    parser.add_argument("--n-layers", type=int, default=4)
    parser.add_argument("--n-heads", type=int, default=4)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--output-dir", default="../models")
    parser.add_argument("--log-file", default="../models/transformer_training.log")
    args = parser.parse_args()

    if torch.backends.mps.is_available():
        device = torch.device("mps")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
    else:
        device = torch.device("cpu")

    with h5py.File(args.dataset, "r") as f:
        boards = torch.tensor(np.array(f["boards"]), dtype=torch.float32)
        moves = torch.tensor(np.array(f["moves"]), dtype=torch.long)
        vocab_size = int(f.attrs["vocab_size"])

    dataset = TensorDataset(boards, moves)
    train_size = int(0.9 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = random_split(dataset, [train_size, val_size])
    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size)

    model = ChessTransformer(
        vocab_size, args.d_model, args.n_heads, args.n_layers, args.dropout
    ).to(device)
    params = sum(p.numel() for p in model.parameters())

    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=0.01)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    criterion = nn.CrossEntropyLoss()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    log_path = Path(args.log_file)

    # Time estimation
    info = (
        f"Device: {device}\n"
        f"Samples: {len(boards)}, Vocab: {vocab_size}, Params: {params:,}\n"
        f"Architecture: d={args.d_model}, layers={args.n_layers}, heads={args.n_heads}\n"
        f"Epochs: {args.epochs}, Batch: {args.batch_size}, LR: {args.lr}\n"
        f"Estimated time: ~{args.epochs * len(train_loader) * 0.15 / 60:.0f} min\n"
    )
    print(info)
    with open(log_path, "w") as lf:
        lf.write(info + "\n")

    best_val_acc = 0.0
    start_time = time.time()

    for epoch in range(args.epochs):
        epoch_start = time.time()

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
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
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
        epoch_time = time.time() - epoch_start
        total_time = time.time() - start_time
        eta = epoch_time * (args.epochs - epoch - 1)

        line = (
            f"Epoch {epoch+1:3d}/{args.epochs} | "
            f"Loss: {train_loss/train_total:.4f} | "
            f"Train: {train_acc:.3f} | "
            f"Val: {val_acc:.3f} | "
            f"Top3: {val_top3_acc:.3f} | "
            f"{epoch_time:.0f}s/ep | "
            f"ETA: {eta/60:.0f}m"
        )
        print(line)
        with open(log_path, "a") as lf:
            lf.write(line + "\n")

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), output_dir / "transformer_best.pt")
            save_line = f"  -> Saved best (val_acc={val_acc:.3f})"
            print(save_line)
            with open(log_path, "a") as lf:
                lf.write(save_line + "\n")

        # Early stopping: if no improvement for 10 epochs
        if epoch > 15 and val_acc < best_val_acc * 0.95:
            stop_line = f"  Early stopping at epoch {epoch+1} (best was {best_val_acc:.3f})"
            print(stop_line)
            with open(log_path, "a") as lf:
                lf.write(stop_line + "\n")
            break

    summary = f"\nDone in {(time.time()-start_time)/60:.1f} min. Best val acc: {best_val_acc:.3f}\n"
    print(summary)
    with open(log_path, "a") as lf:
        lf.write(summary)


if __name__ == "__main__":
    main()
