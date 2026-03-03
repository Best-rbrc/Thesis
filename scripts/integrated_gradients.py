"""Integrated Gradients visualization for CheXpert models.

Computes pixel-level attribution using Integrated Gradients method (Sundararajan et al. 2017).
Shows which pixels contribute most to each pathology prediction.

Usage (from project root):
  uv run python -m scripts.integrated_gradients \
    --config CONFIG --checkpoint CHECKPOINT \
    --image PATH_TO_IMAGE \
    --output outputs/integrated_gradients/

  # Or use --index N to pick the Nth image from the test set:
  uv run python -m scripts.integrated_gradients \
    --config CONFIG --checkpoint CHECKPOINT \
    --index 42 --output outputs/integrated_gradients/
    
  # Adjust number of steps for Riemann approximation (default=50):
  uv run python -m scripts.integrated_gradients \
    --config CONFIG --checkpoint CHECKPOINT \
    --image PATH --n-steps 100
"""

import argparse
import os

import matplotlib.pyplot as plt
import numpy as np
import torch
from captum.attr import IntegratedGradients
from PIL import Image

from src.dataset import get_cxr_valid_transforms, get_valid_transforms
from src.model import build_model
from src.utils import get_device, load_config


def _load_image_rgb(path: str, image_size: int) -> np.ndarray:
    """Load an image and return it as a float32 RGB array in [0, 1]."""
    img = Image.open(path).convert("RGB")
    img = img.resize((image_size, image_size), Image.BILINEAR)
    return np.array(img).astype(np.float32) / 255.0


class SingleOutputWrapper(torch.nn.Module):
    """Wrapper to extract a single output from multi-label model."""
    
    def __init__(self, model, target_idx: int):
        super().__init__()
        self.model = model
        self.target_idx = target_idx
    
    def forward(self, x):
        logits = self.model(x)
        return logits[:, self.target_idx:self.target_idx + 1]


def run_integrated_gradients(
    config_path: str,
    checkpoint_path: str,
    image_path: str,
    output_dir: str,
    n_steps: int = 50,
) -> None:
    cfg = load_config(config_path)
    device = get_device(cfg)
    
    # Captum has issues with MPS on Apple Silicon - use CPU instead
    if device.type == "mps":
        print("Note: Using CPU instead of MPS for Captum compatibility", flush=True)
        device = torch.device("cpu")
    
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
    
    # Prepare input
    if use_cxr:
        tfm = get_cxr_valid_transforms(image_size)
        pil_img = Image.open(image_path).convert("L")
    else:
        tfm = get_valid_transforms(image_size)
        pil_img = Image.open(image_path).convert("RGB")
    
    input_tensor = tfm(pil_img).unsqueeze(0).to(device)
    input_tensor.requires_grad = True
    
    # Get predictions
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.sigmoid(logits).cpu().numpy()[0]
    
    # Load RGB image for visualization
    rgb_img = _load_image_rgb(image_path, image_size)
    
    # Create baseline (black image)
    baseline = torch.zeros_like(input_tensor).to(device)
    
    # Compute Integrated Gradients for each label
    n_labels = len(target_labels)
    attributions = []
    
    print(f"Computing Integrated Gradients with {n_steps} steps...", flush=True)
    
    for i in range(n_labels):
        # Wrap model to output single label
        wrapped_model = SingleOutputWrapper(model, i)
        
        # Compute IG
        ig = IntegratedGradients(wrapped_model)
        attr = ig.attribute(
            input_tensor,
            baselines=baseline,
            n_steps=n_steps,
            internal_batch_size=1,
        )
        
        # Aggregate over channels (take absolute value and sum)
        attr_agg = attr.abs().sum(dim=1).squeeze(0).detach().cpu().numpy()
        
        # Normalize to [0, 1]
        attr_min, attr_max = attr_agg.min(), attr_agg.max()
        if attr_max > attr_min:
            attr_norm = (attr_agg - attr_min) / (attr_max - attr_min)
        else:
            attr_norm = np.zeros_like(attr_agg)
        
        attributions.append(attr_norm)
        print(f"  [{i+1}/{n_labels}] {target_labels[i]}: done", flush=True)
    
    # Create figure with original + per-label attributions
    fig, axes = plt.subplots(1, n_labels + 1, figsize=(4 * (n_labels + 1), 4))
    
    # Panel 0: original
    axes[0].imshow(rgb_img, cmap="gray")
    axes[0].set_title("Original", fontsize=11)
    axes[0].axis("off")
    
    # Panels 1-n: attribution heatmaps
    for i, label in enumerate(target_labels):
        # Show original image
        axes[i + 1].imshow(rgb_img, cmap="gray")
        # Overlay attribution heatmap
        im = axes[i + 1].imshow(attributions[i], cmap="hot", alpha=0.6)
        axes[i + 1].set_title(f"{label}\np={probs[i]:.3f}", fontsize=10)
        axes[i + 1].axis("off")
    
    fig.suptitle(f"Integrated Gradients — {arch}", fontsize=13, y=1.02)
    fig.tight_layout()
    
    # Save
    os.makedirs(output_dir, exist_ok=True)
    parts = image_path.replace("\\", "/").split("/")
    patient_parts = [p for p in parts if p.startswith("patient") or p.startswith("study") or p.startswith("view")]
    basename = "_".join(patient_parts) if patient_parts else os.path.splitext(os.path.basename(image_path))[0]
    basename = basename.replace(".jpg", "").replace(".png", "")
    out_path = os.path.join(output_dir, f"{basename}_{arch}_ig.png")
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Integrated Gradients for CheXpert models.")
    parser.add_argument("--config", required=True, help="Path to YAML config.")
    parser.add_argument("--checkpoint", required=True, help="Path to .pt checkpoint.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--image", help="Path to a single X-ray image.")
    group.add_argument("--index", type=int, help="Pick the Nth image from the test set.")
    parser.add_argument("--output", default="outputs/integrated_gradients/", help="Output directory.")
    parser.add_argument("--n-steps", type=int, default=50, help="Number of steps for IG approximation.")
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
    
    run_integrated_gradients(args.config, args.checkpoint, image_path, args.output, args.n_steps)
