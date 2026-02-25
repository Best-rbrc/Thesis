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

    Uncertain labels encoded as -1 (u-mask strategy) are excluded from the
    AUROC calculation for that label.

    Args:
        y_true: Ground-truth labels, shape (N, C).  May contain -1 for uncertain.
        y_pred: Predicted probabilities, shape (N, C).
        label_names: Names corresponding to each column.

    Returns:
        Dict mapping label name → AUROC. Labels where AUROC cannot be
        computed (e.g. only one class present) are mapped to NaN.
    """
    aurocs = {}
    for i, name in enumerate(label_names):
        col_true = y_true[:, i]
        col_pred = y_pred[:, i]
        certain = col_true >= 0  # exclude uncertain (-1) labels
        try:
            aurocs[name] = roc_auc_score(col_true[certain], col_pred[certain])
        except ValueError:
            aurocs[name] = float("nan")
    return aurocs


def save_checkpoint(
    model: torch.nn.Module,
    optimizer: torch.optim.Optimizer,
    epoch: int,
    auroc: float,
    path: str,
    *,
    scheduler=None,
    scaler=None,
    best_auroc: float | None = None,
    patience_counter: int | None = None,
) -> None:
    """Save a training checkpoint (enough state to resume later)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = {
        "epoch": epoch,
        "model_state_dict": model.state_dict(),
        "optimizer_state_dict": optimizer.state_dict(),
        "auroc": auroc,
    }
    if scheduler is not None:
        payload["scheduler_state_dict"] = scheduler.state_dict()
    if scaler is not None:
        payload["scaler_state_dict"] = scaler.state_dict()
    if best_auroc is not None:
        payload["best_auroc"] = best_auroc
    if patience_counter is not None:
        payload["patience_counter"] = patience_counter
    torch.save(payload, path)
