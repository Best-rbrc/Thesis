"""Evaluate a trained CheXpert model on the official validation set."""

import argparse
import os

import numpy as np
import torch
import torch.nn as nn
from tqdm import tqdm

from src.dataset import CheXpertDataset, get_valid_transforms
from src.model import build_model
from src.utils import compute_aurocs, get_device, load_config


def evaluate(config_path: str, checkpoint_path: str) -> None:
    """Load a checkpoint and evaluate on the validation set."""
    cfg = load_config(config_path)
    device = get_device(cfg)

    data_cfg = cfg["data"]
    target_labels = cfg["labels"]["target_labels"]

    # ── Dataset ──
    valid_dataset = CheXpertDataset(
        csv_path=data_cfg["valid_csv"],
        data_dir=data_cfg["data_dir"],
        target_labels=target_labels,
        transform=get_valid_transforms(data_cfg["image_size"]),
        frontal_only=data_cfg["frontal_only"],
        uncertainty_strategy="u-ones",
    )
    valid_loader = torch.utils.data.DataLoader(
        valid_dataset,
        batch_size=cfg["training"]["batch_size"],
        shuffle=False,
        num_workers=cfg["training"]["num_workers"],
        pin_memory=True,
    )
    print(f"Validation samples: {len(valid_dataset)}")

    # ── Model ──
    model = build_model(cfg).to(device)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(ckpt["model_state_dict"])
    print(f"Loaded checkpoint from epoch {ckpt['epoch']} "
          f"(train AUROC={ckpt['auroc']:.4f})")

    # ── Evaluate ──
    model.eval()
    criterion = nn.BCEWithLogitsLoss()
    running_loss = 0.0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for images, labels in tqdm(valid_loader, desc="Evaluating"):
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            logits = model(images)
            loss = criterion(logits, labels)
            running_loss += loss.item() * images.size(0)

            probs = torch.sigmoid(logits)
            all_preds.append(probs.cpu().numpy())
            all_labels.append(labels.cpu().numpy())

    val_loss = running_loss / len(valid_loader.dataset)
    all_preds = np.concatenate(all_preds)
    all_labels = np.concatenate(all_labels)

    aurocs = compute_aurocs(all_labels, all_preds, target_labels)
    mean_auroc = np.nanmean(list(aurocs.values()))

    # ── Report ──
    print(f"\n{'─' * 40}")
    print(f"Validation loss: {val_loss:.4f}")
    print(f"Mean AUROC:      {mean_auroc:.4f}")
    print(f"{'─' * 40}")
    for label, auc in aurocs.items():
        print(f"  {label:30s} {auc:.4f}")
    print(f"{'─' * 40}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate CheXpert model")
    parser.add_argument(
        "--config",
        type=str,
        default="configs/train_config.yaml",
    )
    parser.add_argument(
        "--checkpoint",
        type=str,
        default="checkpoints/best_model.pt",
    )
    args = parser.parse_args()
    evaluate(args.config, args.checkpoint)
