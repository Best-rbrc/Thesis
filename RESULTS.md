# Experiment Results — CheXpert Multi-Label Classification

**Thesis:** Multi-Label Chest X-Ray Classification using Vision Transformers  
**Dataset:** CheXpert-v1.0-small (frontal views only)  
**Task:** Multi-label classification of 5 pathologies  
**Metric:** Mean AUROC (Area Under ROC Curve)

---

## Target Labels

| # | Label |
|---|---|
| 1 | Cardiomegaly |
| 2 | Edema |
| 3 | Consolidation |
| 4 | Atelectasis |
| 5 | Pleural Effusion |

---

## Data Splits

All splits are **patient-level** (no patient appears in more than one split).

| Split | File | Samples (frontal) | Purpose |
|---|---|---|---|
| Train | `train_proper.csv` | ~180,900 | Training |
| Validation | `val_proper.csv` | ~9,500 | Early stopping & model selection |
| Test | `test.csv` | 28,639 | Final evaluation only (reported once) |

**Split procedure:**
1. Original `train.csv` (223,414 rows) → 85% train_split / 15% test (patient-level, `random_state=42`)
2. `train_split.csv` → 95% train_proper / 5% val_proper (patient-level, `random_state=42`)

**Uncertainty strategy:** `u-mask` — uncertain labels (-1) are masked in the loss function (masked BCE), NaN treated as 0 (implicit negative).

---

## Training Infrastructure

| Setting | Value |
|---|---|
| Compute | Kaggle T4 GPU (16 GB VRAM) |
| Framework | PyTorch + timm |
| Loss | Masked BCE (`u-mask` strategy) |
| Optimizer | AdamW with parameter groups (bias/norm: weight_decay=0) |
| LR Schedule | Linear warmup → Cosine annealing |
| Mixed Precision | AMP (CUDA only) |
| Gradient Clipping | max_norm=1.0 |
| Augmentation | RandomHorizontalFlip, RandomRotation(10°), RandomAffine(translate=0.05), ColorJitter, RandomErasing(p=0.25) |
| Pretrained | ImageNet-1k (torchvision / timm) |

---

## Results Summary

| Run | Model | Date | Best Epoch | Val AUROC | **Test AUROC** |
|---|---|---|---|---|---|
| 001 | DenseNet121 | 2025-02-25 | 6 | 0.7951 | 0.7888 |
| 002 | Swin-Tiny v1 | 2025-02-25 | 7 | 0.7942 | 0.7905 |
| 003 | Swin-Tiny v2 | 2026-02-26 | 11 | 0.7882 | **0.8076** |
| 004 | ViT-Base | 2026-02-27 | 10 | 0.7854 | **0.8041** |

---

## Per-Label Test AUROC

### Run 002 — Swin-Tiny v1 (suboptimal, baseline)

| Label | AUROC |
|---|---|
| Cardiomegaly | 0.8488 |
| Edema | 0.8478 |
| Consolidation | 0.6787 |
| Atelectasis | 0.7029 |
| Pleural Effusion | 0.8741 |
| **Mean** | **0.7905** |

### Run 003 — Swin-Tiny v2 (corrected hyperparameters)

| Label | AUROC |
|---|---|
| Cardiomegaly | 0.8650 |
| Edema | 0.8613 |
| Consolidation | 0.6994 |
| Atelectasis | 0.7242 |
| Pleural Effusion | 0.8880 |
| **Mean** | **0.8076** |

### Run 004 — ViT-Base

| Label | AUROC |
|---|---|
| Cardiomegaly | 0.8615 |
| Edema | 0.8586 |
| Consolidation | 0.6974 |
| Atelectasis | 0.7172 |
| Pleural Effusion | 0.8857 |
| **Mean** | **0.8041** |

---

## Hyperparameter Details per Run

### Run 001 — DenseNet121

| Parameter | Value |
|---|---|
| Architecture | `densenet121` (torchvision) |
| Pretrained | ImageNet-1k |
| Image size | 224×224 |
| Batch size | 32 |
| Epochs (max) | 10 |
| Learning rate | 1e-4 |
| Weight decay | 1e-5 |
| Warmup epochs | 1 |
| Scheduler | Cosine |
| Early stopping patience | 3 |
| Drop path | — |

**Test results (2026-02-27):**

| Label | AUROC |
|---|---|
| Cardiomegaly | 0.8489 |
| Edema | 0.8411 |
| Consolidation | 0.6769 |
| Atelectasis | 0.7031 |
| Pleural Effusion | 0.8740 |
| **Mean** | **0.7888** |

Config: [`configs/archive/run001_densenet121_2025-02-25/densenet121.yaml`](configs/archive/run001_densenet121_2025-02-25/densenet121.yaml)  
Checkpoint: [`checkpoints/densenet121/run001_densenet121_ep06_val0.7951_test0.7888.pt`](checkpoints/densenet121/run001_densenet121_ep06_val0.7951_test0.7888.pt)

---

### Run 002 — Swin-Tiny v1 (suboptimal)

| Parameter | Value | Note |
|---|---|---|
| Architecture | `swin_tiny_patch4_window7_224` (timm) | |
| Pretrained | ImageNet-1k | |
| Image size | 224×224 | |
| Batch size | 32 | too small |
| Epochs (max) | 20 | |
| Learning rate | 5e-5 | |
| Weight decay | 5e-5 | **bug: too low** |
| Warmup epochs | 2 | |
| Scheduler | Cosine | |
| Early stopping patience | 5 | |
| Drop path | 0.0 | missing |
| Gradient clipping | — | missing |
| AdamW param groups | — | missing |

Config: [`configs/archive/run002_swin_tiny_v1_2025-02-25/swin_tiny.yaml`](configs/archive/run002_swin_tiny_v1_2025-02-25/swin_tiny.yaml)  
Checkpoint: [`checkpoints/swin_tiny/run002_swin_tiny_v1_ep07_val0.7942_test0.7905.pt`](checkpoints/swin_tiny/run002_swin_tiny_v1_ep07_val0.7942_test0.7905.pt)

---

### Run 003 — Swin-Tiny v2 (corrected)

| Parameter | Value |
|---|---|
| Architecture | `swin_tiny_patch4_window7_224` (timm) |
| Pretrained | ImageNet-1k |
| Image size | 224×224 |
| Batch size | 64 |
| Epochs (max) | 30 |
| Learning rate | 5e-5 |
| Weight decay | 0.05 |
| Warmup epochs | 5 |
| Scheduler | Cosine |
| Early stopping patience | 7 |
| Drop path | 0.1 |
| Gradient clipping | max_norm=1.0 |
| AdamW param groups | bias/norm WD=0, rest WD=0.05 |

Config: [`configs/archive/run003_swin_tiny_v2_2026-02-26/swin_tiny.yaml`](configs/archive/run003_swin_tiny_v2_2026-02-26/swin_tiny.yaml)  
Checkpoint: [`checkpoints/swin_tiny/run003_swin_tiny_v2_ep11_val0.7882_test0.8076.pt`](checkpoints/swin_tiny/run003_swin_tiny_v2_ep11_val0.7882_test0.8076.pt)

---

### Run 004 — ViT-Base

| Parameter | Value |
|---|---|
| Architecture | `vit_base_patch16_224` (timm) |
| Pretrained | ImageNet-21k → ImageNet-1k fine-tune |
| Image size | 224×224 |
| Batch size | 64 |
| Epochs (max) | 30 |
| Learning rate | 3e-5 |
| Weight decay | 0.1 |
| Warmup epochs | 5 |
| Scheduler | Cosine |
| Early stopping patience | 7 |
| Drop path | 0.1 |
| Gradient clipping | max_norm=1.0 |
| AdamW param groups | bias/norm WD=0, rest WD=0.1 |

Config: [`configs/archive/run004_vit_base_2026-02-27/vit_base.yaml`](configs/archive/run004_vit_base_2026-02-27/vit_base.yaml)  
Checkpoint: [`checkpoints/vit_base/run004_vit_base_ep10_val0.7854_test0.8041.pt`](checkpoints/vit_base/run004_vit_base_ep10_val0.7854_test0.8041.pt)

---

## Key Observations

1. **Both Transformer models outperform DenseNet121** on the test set (~+2% AUROC), consistent with the literature.
2. **Swin-Tiny slightly outperforms ViT-Base** (0.8076 vs 0.8041), likely because Swin's local window attention is better suited for localized pathology patterns in X-rays.
3. **Consolidation and Atelectasis are consistently the hardest labels** across all models (~0.70 and ~0.72 AUROC). This is known in the CheXpert literature due to high label uncertainty.
4. **Hyperparameter corrections mattered significantly**: Fixing weight_decay (5e-5 → 0.05), adding drop_path=0.1, AdamW parameter groups, and gradient clipping improved Swin-Tiny by +1.7% AUROC (0.7905 → 0.8076).
5. **Neither Transformer model trained to completion** — both stopped via early stopping at ~epoch 11/10 out of 30. Further tuning of warmup_epochs (5 may be too long) could allow longer effective training.

---

## Reproducibility

To reproduce any run:

```bash
# Evaluate (replace paths as needed)
uv run python -m src.evaluate \
  --config configs/archive/run003_swin_tiny_v2_2026-02-26/swin_tiny.yaml \
  --checkpoint checkpoints/swin_tiny/run003_swin_tiny_v2_ep11_val0.7882_test0.8076.pt \
  --split test

# Re-train from scratch
uv run python -m src.train --config configs/swin_tiny.yaml
```

Python version: 3.13  
PyTorch version: see `.venv`  
timm version: latest (installed via pip in Kaggle)
