"""CheXpert dataset and data loading utilities."""

import os

import pandas as pd
import torch
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms


# The 14 pathology columns in the CheXpert CSV (in order)
ALL_LABELS = [
    "No Finding",
    "Enlarged Cardiomediastinum",
    "Cardiomegaly",
    "Lung Opacity",
    "Lung Lesion",
    "Edema",
    "Consolidation",
    "Pneumonia",
    "Atelectasis",
    "Pneumothorax",
    "Pleural Effusion",
    "Pleural Other",
    "Fracture",
    "Support Devices",
]

# The 5 competition pathologies
COMPETITION_LABELS = [
    "Cardiomegaly",
    "Edema",
    "Consolidation",
    "Atelectasis",
    "Pleural Effusion",
]


class CheXpertDataset(Dataset):
    """PyTorch Dataset for the CheXpert-Small chest X-ray dataset.

    Handles:
    - Loading images from disk based on CSV paths
    - Filtering to frontal views (optional)
    - Mapping uncertain labels (-1) via a configurable strategy
    - Selecting a subset of target labels
    """

    def __init__(
        self,
        csv_path: str,
        data_dir: str,
        target_labels: list[str] | None = None,
        transform: transforms.Compose | None = None,
        frontal_only: bool = True,
        uncertainty_strategy: str = "u-ones",
    ):
        """Initialise the CheXpert dataset.

        Args:
            csv_path: Path to the CheXpert CSV (train.csv or valid.csv).
            data_dir: Root directory that contains the images. The CSV `Path`
                column values are resolved relative to the *parent* of this
                directory (i.e. the workspace root).
            target_labels: Which pathology columns to use as targets.
                Defaults to the 5 competition labels.
            transform: torchvision transforms to apply to each image.
            frontal_only: If True, keep only frontal-view images.
            uncertainty_strategy: How to handle the uncertain label (-1).
                "u-ones"  → map -1 → 1  (treat uncertain as positive)
                "u-zeros" → map -1 → 0  (treat uncertain as negative)
                "u-ignore"→ map -1 → 0  (same as u-zeros for BCE; could be
                    extended with masking later)
        """
        self.data_dir = data_dir
        self.target_labels = target_labels or COMPETITION_LABELS
        self.transform = transform
        self.uncertainty_strategy = uncertainty_strategy

        # ── Load & filter the CSV ──
        df = pd.read_csv(csv_path)

        if frontal_only:
            df = df[df["Frontal/Lateral"] == "Frontal"]

        df = df.reset_index(drop=True)

        # ── Handle uncertainty labels ──
        for col in self.target_labels:
            if uncertainty_strategy == "u-ones":
                df[col] = df[col].fillna(0.0).replace(-1.0, 1.0)
            elif uncertainty_strategy in ("u-zeros", "u-ignore"):
                df[col] = df[col].fillna(0.0).replace(-1.0, 0.0)
            elif uncertainty_strategy == "u-mask":
                # NaN (not mentioned) → 0  (implicit negative)
                # -1  (uncertain)     → kept as -1 so the loss function can mask it
                df[col] = df[col].fillna(0.0)
            else:
                raise ValueError(
                    f"Unknown uncertainty strategy: {uncertainty_strategy!r}. "
                    "Choose from: u-ones, u-zeros, u-ignore, u-mask"
                )

        self.df = df
        self.labels = df[self.target_labels].values.astype("float32")

    def __len__(self) -> int:
        return len(self.df)

    def __getitem__(self, idx: int) -> tuple[torch.Tensor, torch.Tensor]:
        row = self.df.iloc[idx]
        raw_path = row["Path"]

        # CSV path is like "CheXpert-v1.0-small/train/patient…/…/view.jpg"
        if os.path.isabs(self.data_dir):
            # Kaggle etc.: data_dir is full path to dataset root; drop first path segment
            rel = raw_path.split("/", 1)[1] if "/" in raw_path else raw_path
            img_path = os.path.join(self.data_dir, rel)
        else:
            img_path = os.path.join(os.path.dirname(self.data_dir), raw_path)
        image = Image.open(img_path).convert("RGB")

        if self.transform:
            image = self.transform(image)

        label = torch.tensor(self.labels[idx], dtype=torch.float32)
        return image, label


# ─── Transforms ─────────────────────────────────────────────────────────────


def get_train_transforms(image_size: int = 320) -> transforms.Compose:
    """Training-time augmentations."""
    return transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(10),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )


def get_valid_transforms(image_size: int = 320) -> transforms.Compose:
    """Validation-time transforms (deterministic)."""
    return transforms.Compose(
        [
            transforms.Resize((image_size, image_size)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225],
            ),
        ]
    )


# ─── DataLoader helpers ─────────────────────────────────────────────────────


def build_dataloaders(
    cfg: dict,
    *,
    pin_memory: bool = True,
) -> tuple[DataLoader, DataLoader]:
    """Build train and validation DataLoaders from a config dict.

    Args:
        cfg: Parsed YAML config (see configs/train_config.yaml).
        pin_memory: Set False on MPS to avoid warning; True on CUDA for speed.

    Returns:
        (train_loader, valid_loader)
    """
    data_cfg = cfg["data"]
    label_cfg = cfg["labels"]
    train_cfg = cfg["training"]

    image_size = data_cfg["image_size"]
    target_labels = label_cfg["target_labels"]

    train_dataset = CheXpertDataset(
        csv_path=data_cfg["train_csv"],
        data_dir=data_cfg["data_dir"],
        target_labels=target_labels,
        transform=get_train_transforms(image_size),
        frontal_only=data_cfg["frontal_only"],
        uncertainty_strategy=data_cfg["uncertainty_strategy"],
    )

    valid_dataset = CheXpertDataset(
        csv_path=data_cfg["valid_csv"],
        data_dir=data_cfg["data_dir"],
        target_labels=target_labels,
        transform=get_valid_transforms(image_size),
        frontal_only=data_cfg["frontal_only"],
        uncertainty_strategy="u-ones",  # valid set has no -1, but be safe
    )

    nw = train_cfg["num_workers"]

    train_loader = DataLoader(
        train_dataset,
        batch_size=train_cfg["batch_size"],
        shuffle=True,
        num_workers=nw,
        pin_memory=pin_memory,
        drop_last=True,
        persistent_workers=nw > 0,
    )

    valid_loader = DataLoader(
        valid_dataset,
        batch_size=train_cfg["batch_size"],
        shuffle=False,
        num_workers=nw,
        pin_memory=pin_memory,
        persistent_workers=nw > 0,
    )

    return train_loader, valid_loader
