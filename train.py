"""
Training Pipeline — Fine-tunes 3D U-Net on BraTS dataset.
Supports CPU and GPU. Uses mixed precision on GPU for speed.

Usage:
    python train.py --brats_root /data/BraTS2021 --epochs 50 --device cuda

Or for quick demo:
    python train.py --brats_root /data/BraTS2021 --epochs 5 --device cpu
"""
import os
import sys
import argparse
import logging
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from monai.networks.nets import UNet
from monai.losses import DiceCELoss
from monai.metrics import DiceMetric
from monai.transforms import (
    Compose, RandFlipd, RandRotate90d, NormalizeIntensityd,
    EnsureChannelFirstd, Resized, ToTensord
)

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent / "backend"))

from utils.brats_loader import BraTSLoader, BraTSTorchDataset

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

WEIGHTS_DIR = Path(__file__).parent / "backend" / "models" / "weights"
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)


def get_args():
    parser = argparse.ArgumentParser(description="NDT Segmentor Training")
    parser.add_argument("--brats_root", type=str, required=True, help="Path to BraTS dataset root")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch_size", type=int, default=1, help="Batch size (1–2 for 3D)")
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--device", type=str, default="cuda" if torch.cuda.is_available() else "cpu")
    parser.add_argument("--val_ratio", type=float, default=0.2)
    parser.add_argument("--save_path", type=str, default=str(WEIGHTS_DIR / "unet_brats.pth"))
    parser.add_argument("--num_workers", type=int, default=0)
    return parser.parse_args()


def build_model(device: str) -> nn.Module:
    return UNet(
        spatial_dims=3,
        in_channels=4,          # FLAIR, T1, T1ce, T2
        out_channels=4,         # Background + 3 BraTS labels
        channels=(16, 32, 64, 128, 256),
        strides=(2, 2, 2, 2),
        num_res_units=2,
    ).to(device)


def collate_fn(batch):
    """Simple collate for variable-size 3D volumes (no padding in demo)."""
    xs, ys = zip(*batch)
    return torch.stack(xs), torch.stack(ys)


def train(args):
    device = torch.device(args.device)
    logger.info("🚀 Training on device: %s", device)

    # Dataset
    loader = BraTSLoader(args.brats_root)
    train_ids, val_ids = loader.get_split(val_ratio=args.val_ratio)
    logger.info("📂 Train: %d patients | Val: %d patients", len(train_ids), len(val_ids))

    train_ds = BraTSTorchDataset(loader, train_ids)
    val_ds   = BraTSTorchDataset(loader, val_ids)

    train_dl = DataLoader(train_ds, batch_size=args.batch_size,
                          shuffle=True, num_workers=args.num_workers)
    val_dl   = DataLoader(val_ds, batch_size=1,
                          shuffle=False, num_workers=args.num_workers)

    # Model
    model = build_model(args.device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)
    loss_fn = DiceCELoss(to_onehot_y=True, softmax=True)
    dice_metric = DiceMetric(include_background=False, reduction="mean")

    # Mixed precision (GPU only)
    use_amp = device.type == "cuda"
    scaler = torch.cuda.amp.GradScaler(enabled=use_amp)

    best_dice = 0.0

    for epoch in range(1, args.epochs + 1):
        # ── Training ─────────────────────────────────────────────────────
        model.train()
        train_loss = 0.0
        t0 = time.time()

        for x, y in train_dl:
            x = x.to(device)
            y = y.unsqueeze(1).to(device)  # add channel dim for DiceCELoss

            optimizer.zero_grad()
            with torch.cuda.amp.autocast(enabled=use_amp):
                pred = model(x)
                loss = loss_fn(pred, y)

            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()

            train_loss += loss.item()

        scheduler.step()
        avg_train_loss = train_loss / max(len(train_dl), 1)

        # ── Validation ───────────────────────────────────────────────────
        model.eval()
        dice_metric.reset()

        with torch.no_grad():
            for x, y in val_dl:
                x = x.to(device)
                y_onehot = torch.nn.functional.one_hot(
                    y.long(), num_classes=4
                ).permute(0, 4, 1, 2, 3).float().to(device)

                pred = torch.softmax(model(x), dim=1)
                dice_metric(y_pred=pred, y=y_onehot)

        mean_dice = float(dice_metric.aggregate().item())

        elapsed = time.time() - t0
        logger.info(
            "Epoch %3d/%d | Loss: %.4f | Val Dice: %.4f | Time: %.1fs",
            epoch, args.epochs, avg_train_loss, mean_dice, elapsed
        )

        # Save best weights
        if mean_dice > best_dice:
            best_dice = mean_dice
            torch.save(model.state_dict(), args.save_path)
            logger.info("💾 Best model saved (Dice=%.4f) → %s", best_dice, args.save_path)

    logger.info("✅ Training complete. Best Dice: %.4f", best_dice)
    logger.info("   Weights saved at: %s", args.save_path)


if __name__ == "__main__":
    args = get_args()
    train(args)
