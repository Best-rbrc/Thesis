"""Evaluate a trained CheXpert model on the validation or test set."""

import argparse

import numpy as np
import torch
import torch.nn as nn
from tqdm import tqdm

from src.dataset import CheXpertDataset, get_valid_transforms
from src.model import build_model
from src.utils import compute_aurocs, get_device, load_config


def _run_evaluation(
    model: nn.Module,
    loader: torch.utils.data.DataLoader,
    criterion: nn.Module,
    device: torch.device,
    target_labels: list[str],
    split_name: str,
) -> dict[str, float]:
    """Run inference on one DataLoader and return AUROC dict."""
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_labels = []

    with torch.no_grad():
        for images, labels in tqdm(loader, desc=f"Evaluating {split_name}"):
            images = images.to(device, non_blocking=True)
            labels = labels.to(device, non_blocking=True)

            logits = model(images)
            loss = criterion(logits, labels)
            running_loss += loss.item() * images.size(0)

            probs = torch.sigmoid(logits)
            all_preds.append(probs.cpu().numpy())
            all_labels.append(labels.cpu().numpy())

    eval_loss = running_loss / len(loader.dataset)
    all_preds = np.concatenate(all_preds)
    all_labels = np.concatenate(all_labels)

    aurocs = compute_aurocs(all_labels, all_preds, target_labels)
    mean_auroc = float(np.nanmean(list(aurocs.values())))

    print(f"\n{'─' * 44}")
    print(f"  Split:      {split_name}")
    print(f"  Loss:       {eval_loss:.4f}")
    print(f"  Mean AUROC: {mean_auroc:.4f}")
    print(f"{'─' * 44}")
    for label, auc in aurocs.items():
        print(f"  {label:30s}  {auc:.4f}")
    print(f"{'─' * 44}")

    return aurocs


def evaluate(
    config_path: str,
    checkpoint_path: str,
    split: str = "valid",
) -> None:
    """Load a checkpoint and evaluate on the chosen split.

    Args:
        config_path: Path to YAML config.
        checkpoint_path: Path to a saved .pt checkpoint.
        split: "valid" (default) or "test" (held-out, report only once at the end).
    """
    cfg = load_config(config_path)
    device = get_device(cfg)
    data_cfg = cfg["data"]
    target_labels = cfg["labels"]["target_labels"]
    pin_memory = device.type == "cuda"
    nw = cfg["training"]["num_workers"]

    if split == "test":
        if "test_csv" not in data_cfg:
            raise ValueError(
                "No 'test_csv' key in config. "
                "Run scripts/split_train_test.py first and add test_csv to the config."
            )
        csv_path = data_cfg["test_csv"]
        split_name = "TEST (held-out)"
    else:
        csv_path = data_cfg["valid_csv"]
        split_name = "Validation"

    dataset = CheXpertDataset(
        csv_path=csv_path,
        data_dir=data_cfg["data_dir"],
        target_labels=target_labels,
        transform=get_valid_transforms(data_cfg["image_size"]),
        frontal_only=data_cfg["frontal_only"],
        uncertainty_strategy="u-ones",
    )
    loader = torch.utils.data.DataLoader(
        dataset,
        batch_size=cfg["training"]["batch_size"],
        shuffle=False,
        num_workers=nw,
        pin_memory=pin_memory,
        persistent_workers=nw > 0,
    )
    print(f"{split_name} samples: {len(dataset):,}")

    model = build_model(cfg).to(device)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(ckpt["model_state_dict"])
    print(f"Loaded checkpoint: epoch {ckpt['epoch']}  "
          f"(saved AUROC={ckpt.get('auroc', float('nan')):.4f})")

    _run_evaluation(
        model, loader, nn.BCEWithLogitsLoss(), device, target_labels, split_name
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate CheXpert model")
    parser.add_argument("--config", default="configs/train_config.yaml")
    parser.add_argument("--checkpoint", default="checkpoints/best_model.pt")
    parser.add_argument(
        "--split",
        choices=["valid", "test"],
        default="valid",
        help="Which split to evaluate on. Use 'test' only for final reporting.",
    )
    args = parser.parse_args()
    evaluate(args.config, args.checkpoint, split=args.split)
