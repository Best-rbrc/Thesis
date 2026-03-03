"""Grad-CAM heatmap visualization for CheXpert models.

Generates a figure with the original X-ray and one Grad-CAM overlay per
pathology label, showing which image regions the model focuses on.

Usage (from project root):
  uv run python -m scripts.gradcam \
    --config CONFIG --checkpoint CHECKPOINT \
    --image PATH_TO_IMAGE \
    --output outputs/gradcam/

  # Or use --index N to pick the Nth image from the test set:
  uv run python -m scripts.gradcam \
    --config CONFIG --checkpoint CHECKPOINT \
    --index 42 --output outputs/gradcam/
"""

import argparse
import os

import cv2
import matplotlib.pyplot as plt
import numpy as np
import torch
from PIL import Image
from pytorch_grad_cam import GradCAM
from pytorch_grad_cam.utils.image import show_cam_on_image
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

from src.dataset import get_cxr_valid_transforms, get_valid_transforms
from src.model import build_model
from src.utils import get_device, load_config


def _get_target_layer_and_reshape(model, arch: str, img_size: int):
    """Return (target_layers, reshape_transform) for the given architecture."""
    if arch in ("densenet121", "densenet121_cxr"):
        # Last conv layer in DenseNet
        target_layers = [model.features.denseblock4.denselayer16.conv2]
        return target_layers, None

    if arch == "resnet50":
        target_layers = [model.layer4[-1].conv3]
        return target_layers, None

    if arch == "swin_tiny":
        target_layers = [model.norm]  # output is (B, H, W, C)
        def reshape(tensor):
            if tensor.ndim == 4:
                # (B, H, W, C) → permute to (B, C, H, W) so the library treats H,W as spatial
                return tensor.permute(0, 3, 1, 2)
            B, N, C = tensor.shape
            h = w = int(N ** 0.5)
            return tensor.reshape(B, h, w, C).permute(0, 3, 1, 2)
        return target_layers, reshape

    if arch == "vit_base":
        target_layers = [model.blocks[-1].norm1]
        grid = img_size // 16  # ViT patch size = 16
        def reshape(tensor, height=grid, width=grid):
            # ViT has a CLS token at position 0 — remove it
            B, N, C = tensor.shape
            return tensor[:, 1:, :].reshape(B, height, width, C)
        return target_layers, reshape

    raise ValueError(f"Unsupported architecture for Grad-CAM: {arch}")


def _load_image_rgb(path: str, image_size: int) -> np.ndarray:
    """Load an image and return it as a float32 RGB array in [0, 1] for overlay."""
    img = Image.open(path).convert("RGB")
    img = img.resize((image_size, image_size), Image.BILINEAR)
    return np.array(img).astype(np.float32) / 255.0


def run_gradcam(
    config_path: str,
    checkpoint_path: str,
    image_path: str,
    output_dir: str,
) -> None:
    cfg = load_config(config_path)
    device = get_device(cfg)
    data_cfg = cfg["data"]
    target_labels = cfg["labels"]["target_labels"]
    image_size = data_cfg["image_size"]
    arch = cfg["model"]["architecture"]
    use_cxr = data_cfg.get("cxr_pretrained", False)

    # Build model and load checkpoint
    cfg["model"]["pretrained"] = False
    model = build_model(cfg).to(device)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    print(f"Loaded {arch} from epoch {ckpt['epoch']}", flush=True)

    # Prepare transforms and input tensor
    if use_cxr:
        tfm = get_cxr_valid_transforms(image_size)
        pil_img = Image.open(image_path).convert("L")
    else:
        tfm = get_valid_transforms(image_size)
        pil_img = Image.open(image_path).convert("RGB")

    input_tensor = tfm(pil_img).unsqueeze(0).to(device)

    # Get predictions
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.sigmoid(logits).cpu().numpy()[0]

    # RGB image for overlay (always RGB regardless of model input)
    rgb_img = _load_image_rgb(image_path, image_size)

    # Grad-CAM setup
    target_layers, reshape_fn = _get_target_layer_and_reshape(model, arch, image_size)
    cam = GradCAM(model=model, target_layers=target_layers, reshape_transform=reshape_fn)

    # Generate one heatmap per label
    n_labels = len(target_labels)
    fig, axes = plt.subplots(1, n_labels + 1, figsize=(4 * (n_labels + 1), 4))

    # Panel 0: original X-ray
    axes[0].imshow(rgb_img, cmap="gray")
    axes[0].set_title("Original", fontsize=11)
    axes[0].axis("off")

    for i, label in enumerate(target_labels):
        targets = [ClassifierOutputTarget(i)]
        grayscale_cam = cam(input_tensor=input_tensor, targets=targets)
        grayscale_cam = grayscale_cam[0]  # first (only) image in batch

        overlay = show_cam_on_image(rgb_img, grayscale_cam, use_rgb=True)
        axes[i + 1].imshow(overlay)
        axes[i + 1].set_title(f"{label}\np={probs[i]:.3f}", fontsize=10)
        axes[i + 1].axis("off")

    fig.suptitle(f"Grad-CAM — {arch}", fontsize=13, y=1.02)
    fig.tight_layout()

    # Save
    os.makedirs(output_dir, exist_ok=True)
    # Build a descriptive filename from the patient path
    parts = image_path.replace("\\", "/").split("/")
    patient_parts = [p for p in parts if p.startswith("patient") or p.startswith("study") or p.startswith("view")]
    basename = "_".join(patient_parts) if patient_parts else os.path.splitext(os.path.basename(image_path))[0]
    basename = basename.replace(".jpg", "").replace(".png", "")
    out_path = os.path.join(output_dir, f"{basename}_{arch}_gradcam.png")
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Grad-CAM heatmaps for CheXpert models.")
    parser.add_argument("--config", required=True, help="Path to YAML config.")
    parser.add_argument("--checkpoint", required=True, help="Path to .pt checkpoint.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--image", help="Path to a single X-ray image.")
    group.add_argument("--index", type=int, help="Pick the Nth image from the test set.")
    parser.add_argument("--output", default="outputs/gradcam/", help="Output directory.")
    args = parser.parse_args()

    if args.image:
        image_path = args.image
    else:
        # Load test set and pick image by index
        import pandas as pd
        cfg = load_config(args.config)
        data_cfg = cfg["data"]
        df = pd.read_csv(data_cfg["test_csv"])
        if data_cfg.get("frontal_only", False):
            df = df[df["Frontal/Lateral"] == "Frontal"].reset_index(drop=True)
        raw_path = df.iloc[args.index]["Path"]
        data_dir = data_cfg["data_dir"]
        if os.path.isabs(data_dir):
            rel = raw_path.split("/", 1)[1] if "/" in raw_path else raw_path
            image_path = os.path.join(data_dir, rel)
        else:
            image_path = os.path.join(os.path.dirname(data_dir), raw_path)
        print(f"Test image [{args.index}]: {image_path}")

    run_gradcam(args.config, args.checkpoint, image_path, args.output)
