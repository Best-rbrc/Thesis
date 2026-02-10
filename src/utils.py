"""Shared utilities: config loading, device selection, metrics."""

import os

import torch
import yaml
from sklearn.metrics import roc_auc_score


def load_config(path: str = "configs/train_config.yaml") -> dict:
    """Load a YAML config file and return it as a dict."""
    with open(path) as f:
        return yaml.safe_load(f)


def get_device(cfg: dict) -> torch.device:
    """Select the best available device based on config.

    Priority: CUDA > MPS (Apple Silicon) > CPU.
    """
    requested = cfg.get("device", "auto")

    if requested != "auto":
        return torch.device(requested)

    if torch.cuda.is_available():
        return torch.device("cuda")
    if torch.backends.mps.is_available():
        return torch.device("mps")
    return torch.device("cpu")


def compute_aurocs(
    y_true,
    y_pred,
    label_names: list[str],
) -> dict[str, float]:
    """Compute per-label AUROC scores.

    Args:
        y_true: Ground-truth labels, shape (N, C).
        y_pred: Predicted probabilities, shape (N, C).
        label_names: Names corresponding to each column.

    Returns:
        Dict mapping label name → AUROC. Labels where AUROC cannot be
        computed (e.g. only one class present) are mapped to NaN.
    """
    aurocs = {}
    for i, name in enumerate(label_names):
        try:
            aurocs[name] = roc_auc_score(y_true[:, i], y_pred[:, i])
        except ValueError:
            aurocs[name] = float("nan")
    return aurocs


def save_checkpoint(
    model: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    auroc: float,
    path: str,
) -> None:
    """Save a training checkpoint."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    torch.save(
        {
            "epoch": epoch,
            "model_state_dict": model.state_dict(),
            "optimizer_state_dict": optimizer.state_dict(),
            "auroc": auroc,
        },
        path,
    )
