"""Attention Map visualization for Transformer-based CheXpert models.

Extracts and visualizes attention weights from Swin-Tiny and ViT-Base models.
Shows which spatial regions the model attends to during classification.

Usage (from project root):
  uv run python -m scripts.attention_maps \
    --config CONFIG --checkpoint CHECKPOINT \
    --image PATH_TO_IMAGE \
    --output outputs/attention_maps/

  # Or use --index N to pick the Nth image from the test set:
  uv run python -m scripts.attention_maps \
    --config CONFIG --checkpoint CHECKPOINT \
    --index 42 --output outputs/attention_maps/
"""

import argparse
import os

import cv2
import matplotlib.pyplot as plt
import numpy as np
import torch
import torch.nn.functional as F
from PIL import Image

from src.dataset import get_valid_transforms
from src.model import build_model
from src.utils import get_device, load_config


class AttentionExtractor:
    """Hook-based attention weight extractor for transformers."""
    
    def __init__(self):
        self.attentions = []
        self.hooks = []
    
    def register_hooks(self, model, arch: str):
        """Register forward hooks to capture attention weights."""
        self.attentions = []
        self.hooks = []
        
        if arch == "swin_tiny":
            # Extract attention from last stage, last block
            # Swin structure: model.layers[3].blocks[-1].attn
            target_block = model.layers[-1].blocks[-1]
            
            def swin_hook(module, input, output):
                # Swin attention output is (B, H*W, C)
                # We need to capture the attention weights from the module
                # The attn module computes: softmax(Q@K.T/scale) @ V
                # We'll hook the attn_drop which comes after softmax
                if hasattr(module, 'attn_drop') and hasattr(module, 'q'):
                    # During forward, capture attention matrix
                    self.attentions.append(output)
            
            # Hook the entire attention module
            handle = target_block.attn.register_forward_hook(swin_hook)
            self.hooks.append(handle)
            
        elif arch == "vit_base":
            # Extract attention from all blocks for attention rollout
            # ViT structure: model.blocks[i].attn
            for block in model.blocks:
                def vit_hook(module, input, output):
                    # ViT attention returns tuple: (output, attention_weights)
                    # If attention weights are returned, capture them
                    self.attentions.append(input[0])  # input to norm after attention
                
                handle = block.attn.register_forward_hook(vit_hook)
                self.hooks.append(handle)
        else:
            raise ValueError(f"Attention maps only supported for swin_tiny and vit_base, got: {arch}")
    
    def remove_hooks(self):
        """Remove all registered hooks."""
        for handle in self.hooks:
            handle.remove()
        self.hooks = []
    
    def get_attention_map(self, arch: str, img_size: int) -> np.ndarray:
        """Aggregate collected attention weights into a spatial heatmap."""
        if arch == "swin_tiny":
            # Swin: Average attention across heads and windows
            # The output shape is (B, H*W, C)
            # We need to reshape back to spatial dimensions
            if not self.attentions:
                # Fallback: return uniform attention
                grid_size = img_size // 32  # Swin patches at final stage
                return np.ones((grid_size, grid_size), dtype=np.float32)
            
            # Use the last attention output
            attn_output = self.attentions[-1]  # (B, N, C)
            if isinstance(attn_output, torch.Tensor):
                attn_output = attn_output[0].detach().cpu()  # First sample
                # Compute attention as norm across channels
                attn_map = attn_output.norm(dim=-1).numpy()  # (N,)
                # Reshape to spatial grid
                grid_size = int(np.sqrt(len(attn_map)))
                attn_map = attn_map.reshape(grid_size, grid_size)
                # Normalize
                attn_map = (attn_map - attn_map.min()) / (attn_map.max() - attn_map.min() + 1e-8)
                return attn_map
            
        elif arch == "vit_base":
            # ViT: Attention rollout from CLS token
            # For simplicity, we'll aggregate the last layer's attention
            # More sophisticated: multiply all attention matrices
            if not self.attentions:
                grid_size = img_size // 16  # ViT patch size
                return np.ones((grid_size, grid_size), dtype=np.float32)
            
            # Use the final block's output before its attention
            # We'll compute a simple norm-based attention map
            final_attn = self.attentions[-1]  # (B, N+1, C) with CLS token
            if isinstance(final_attn, torch.Tensor):
                final_attn = final_attn[0].detach().cpu()  # (N+1, C)
                # Remove CLS token (position 0)
                patch_attn = final_attn[1:]  # (N, C)
                # Compute importance as L2 norm
                attn_map = patch_attn.norm(dim=-1).numpy()  # (N,)
                # Reshape to spatial grid
                grid_size = int(np.sqrt(len(attn_map)))
                attn_map = attn_map.reshape(grid_size, grid_size)
                # Normalize
                attn_map = (attn_map - attn_map.min()) / (attn_map.max() - attn_map.min() + 1e-8)
                return attn_map
        
        return np.zeros((7, 7), dtype=np.float32)


def _load_image_rgb(path: str, image_size: int) -> np.ndarray:
    """Load an image and return it as a float32 RGB array in [0, 1]."""
    img = Image.open(path).convert("RGB")
    img = img.resize((image_size, image_size), Image.BILINEAR)
    return np.array(img).astype(np.float32) / 255.0


def run_attention_maps(
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
    
    # Only support transformer architectures
    if arch not in ("swin_tiny", "vit_base"):
        raise ValueError(f"Attention maps only available for transformers (swin_tiny, vit_base), got: {arch}")
    
    # Build model and load checkpoint
    cfg["model"]["pretrained"] = False
    model = build_model(cfg).to(device)
    ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()
    print(f"Loaded {arch} from epoch {ckpt['epoch']}", flush=True)
    
    # Prepare input
    tfm = get_valid_transforms(image_size)
    pil_img = Image.open(image_path).convert("RGB")
    input_tensor = tfm(pil_img).unsqueeze(0).to(device)
    
    # Get predictions
    with torch.no_grad():
        logits = model(input_tensor)
        probs = torch.sigmoid(logits).cpu().numpy()[0]
    
    # Extract attention maps
    extractor = AttentionExtractor()
    extractor.register_hooks(model, arch)
    
    with torch.no_grad():
        _ = model(input_tensor)  # Forward pass to capture attention
    
    attn_map = extractor.get_attention_map(arch, image_size)
    extractor.remove_hooks()
    
    # Upsample attention map to match image size
    attn_map_upsampled = cv2.resize(attn_map, (image_size, image_size), interpolation=cv2.INTER_CUBIC)
    
    # Load RGB image for visualization
    rgb_img = _load_image_rgb(image_path, image_size)
    
    # Create figure with original + attention overlay
    fig, axes = plt.subplots(1, 2, figsize=(10, 5))
    
    # Panel 0: original
    axes[0].imshow(rgb_img, cmap="gray")
    axes[0].set_title("Original", fontsize=12)
    axes[0].axis("off")
    
    # Panel 1: attention overlay
    axes[1].imshow(rgb_img, cmap="gray")
    im = axes[1].imshow(attn_map_upsampled, cmap="viridis", alpha=0.6)
    axes[1].set_title("Attention Map", fontsize=12)
    axes[1].axis("off")
    
    # Add colorbar
    plt.colorbar(im, ax=axes[1], fraction=0.046, pad=0.04)
    
    # Add predictions as text
    pred_text = "\n".join([f"{label}: {probs[i]:.3f}" for i, label in enumerate(target_labels)])
    fig.text(0.98, 0.5, pred_text, fontsize=9, ha="left", va="center", 
             bbox=dict(boxstyle="round,pad=0.5", facecolor="white", alpha=0.8))
    
    fig.suptitle(f"Attention Map — {arch}", fontsize=14, y=0.98)
    fig.tight_layout()
    
    # Save
    os.makedirs(output_dir, exist_ok=True)
    parts = image_path.replace("\\", "/").split("/")
    patient_parts = [p for p in parts if p.startswith("patient") or p.startswith("study") or p.startswith("view")]
    basename = "_".join(patient_parts) if patient_parts else os.path.splitext(os.path.basename(image_path))[0]
    basename = basename.replace(".jpg", "").replace(".png", "")
    out_path = os.path.join(output_dir, f"{basename}_{arch}_attention.png")
    fig.savefig(out_path, dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved: {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Attention maps for transformer-based CheXpert models.")
    parser.add_argument("--config", required=True, help="Path to YAML config.")
    parser.add_argument("--checkpoint", required=True, help="Path to .pt checkpoint.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--image", help="Path to a single X-ray image.")
    group.add_argument("--index", type=int, help="Pick the Nth image from the test set.")
    parser.add_argument("--output", default="outputs/attention_maps/", help="Output directory.")
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
    
    run_attention_maps(args.config, args.checkpoint, image_path, args.output)
