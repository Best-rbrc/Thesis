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
| 001 | DenseNet121 (ImageNet) | 2025-02-25 | 6 | 0.7951 | 0.7888 |
| 002 | Swin-Tiny v1 | 2025-02-25 | 7 | 0.7942 | 0.7905 |
| 003 | Swin-Tiny v2 (224px) | 2026-02-26 | 11 | 0.7882 | 0.8076 |
| 004 | ViT-Base | 2026-02-27 | 10 | 0.7854 | 0.8041 |
| 005 | Swin-Tiny v3 (384px) | 2026-02-13 | 9 | 0.7944 | 0.8075 |
| 006 | DenseNet121-CXR (torchxrayvision) | 2026-02-28 | 13 | 0.7794 | 0.7853 |
| 007 | Swin-Tiny single-label (Consolidation only) | 2026-02-13 | 16 | 0.6744 | **0.7082** |
| 008 | **Swin-Tiny perclass (per-label U + pos_weight)** | 2026-03-09 | 9 | 0.7937 | **0.8129** |
| 009 | ViT-Base perclass (per-label U + pos_weight) | 2026-03-10 | 9 | 0.7905 | 0.8118 |
| 010 | **DenseNet121 perclass (per-label U + pos_weight)** | 2026-03-11 | 10 | 0.7925 | **0.8298** |
| 011 | DenseNet121 perclass longer (patience=7 ablation) | 2026-03-15 | 7 | 0.7931 | 0.8145 |
| — | Swin-Tiny v2 + TTA | 2026-02-27 | — | — | 0.8089 |
| — | Swin-Tiny v3 + TTA | 2026-02-13 | — | — | 0.8095 |
| — | DenseNet121-CXR + TTA | 2026-02-28 | — | — | 0.7871 |
| — | **Swin-Tiny perclass + TTA** | 2026-03-09 | — | — | **0.8146** |
| — | ViT-Base perclass + TTA | 2026-03-10 | — | — | 0.8139 |
| — | **Ensemble (Swin+ViT)** | 2026-02-27 | — | — | 0.8111 |
| — | **Ensemble (Swin+ViT+DenseNet perclass)** | 2026-03-11 | — | — | 0.8295 |

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

### Run 007 — Swin-Tiny single-label (Consolidation only)

| Label | AUROC |
|---|---|
| Consolidation | **0.7082** |
| **Mean** | **0.7082** |

**Comparison vs. multi-label Swin-Tiny v2 (Run 003):** Consolidation 0.6994 → 0.7082 (**Δ +0.0088**). Single-label training yields a modest but real improvement for the hardest label.

### Run 008 — Swin-Tiny perclass (per-label U-strategy + pos_weight)

| Label | AUROC | Δ vs Run 003 |
|---|---|---|
| Cardiomegaly | 0.8685 | +0.0035 |
| Edema | 0.8615 | +0.0002 |
| Consolidation | 0.7263 | **+0.0269** |
| Atelectasis | 0.7284 | **+0.0042** |
| Pleural Effusion | 0.8798 | −0.0082 |
| **Mean** | **0.8129** | **+0.0053** |

**New best single-model result.** Largest gains on the two hardest labels: Consolidation (+0.027) and Atelectasis (+0.004). Pleural Effusion slightly lower (−0.008), likely because `u-zeros` removes informative uncertain samples for that label.

### Run 009 — ViT-Base perclass (per-label U-strategy + pos_weight)

| Label | AUROC | Δ vs Run 004 |
|---|---|---|
| Cardiomegaly | 0.8673 | +0.0058 |
| Edema | 0.8566 | −0.0020 |
| Consolidation | 0.7257 | **+0.0283** |
| Atelectasis | 0.7330 | **+0.0158** |
| Pleural Effusion | 0.8768 | −0.0089 |
| **Mean** | **0.8118** | **+0.0077** |

Same per-label U-strategy + pos_weight as Run 008. Consolidation and Atelectasis show very large gains vs. baseline ViT-Base. Edema and Pleural Effusion slightly lower, consistent with the `u-zeros` trade-off for those labels.

### Run 010 — DenseNet121 perclass (per-label U-strategy + pos_weight)

| Label | AUROC | Δ vs Run 001 |
|---|---|---|
| Cardiomegaly | 0.8816 | **+0.0327** |
| Edema | 0.8694 | **+0.0283** |
| Consolidation | 0.7587 | **+0.0818** |
| Atelectasis | 0.7532 | **+0.0501** |
| Pleural Effusion | 0.8861 | +0.0121 |
| **Mean** | **0.8298** | **+0.0410** |

**New overall best single-model result by a large margin.** Per-label U-strategy + pos_weight yields a +0.041 improvement over the baseline DenseNet121 (Run 001, 0.7888). All labels improve substantially, with Consolidation gaining +0.082 and Atelectasis +0.050. Remarkably, DenseNet121 with the right training strategy outperforms both Swin-Tiny perclass (+0.017) and ViT-Base perclass (+0.018) despite being a simpler convolutional architecture.

### Run 011 — DenseNet121 perclass longer (patience=7 ablation)

| Label | AUROC | Δ vs Run 010 |
|---|---|---|
| Cardiomegaly | 0.8655 | −0.0161 |
| Edema | 0.8600 | −0.0094 |
| Consolidation | 0.7309 | −0.0278 |
| Atelectasis | 0.7354 | −0.0178 |
| Pleural Effusion | 0.8808 | −0.0053 |
| **Mean** | **0.8145** | **−0.0153** |

**Negative ablation result.** Increasing early stopping patience from 5 to 7 did **not** improve DenseNet121 perclass. The model selected at epoch 7 reaches 0.8145 mean test AUROC, which is substantially below Run 010 (0.8298). All five labels are worse, with the largest drops on Consolidation (−0.028) and Atelectasis (−0.018). This suggests that the stronger Run 010 result was not caused by overly aggressive early stopping; instead, the patience=7 setting appears to have selected a weaker checkpoint despite a slightly higher validation AUROC (0.7931 vs. 0.7925), highlighting some validation-test noise in this regime.

---

### Run 005 — Swin-Tiny v3 (384px)

| Label | Standard | TTA | Δ |
|---|---|---|---|
| Cardiomegaly | 0.8644 | 0.8677 | +0.0033 |
| Edema | 0.8658 | 0.8669 | +0.0011 |
| Consolidation | 0.6953 | 0.6975 | +0.0022 |
| Atelectasis | 0.7218 | 0.7227 | +0.0009 |
| Pleural Effusion | 0.8903 | 0.8927 | +0.0024 |
| **Mean** | **0.8075** | **0.8095** | **+0.0020** |

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

### Run 006 — DenseNet121-CXR (torchxrayvision)

| Label | Standard | TTA | Δ |
|---|---|---|---|
| Cardiomegaly | 0.8484 | 0.8506 | +0.0022 |
| Edema | 0.8413 | 0.8429 | +0.0016 |
| Consolidation | 0.6695 | 0.6699 | +0.0004 |
| Atelectasis | 0.6937 | 0.6970 | +0.0033 |
| Pleural Effusion | 0.8734 | 0.8751 | +0.0017 |
| **Mean** | **0.7853** | **0.7871** | **+0.0018** |

---

### Run 006 — DenseNet121-CXR (Hyperparameters)

| Parameter | Value |
|---|---|
| Architecture | `densenet121` (torchxrayvision, pretrained on 7 CXR datasets) |
| Pretrained | CXR (densenet121-res224-all) |
| Image size | 224×224 |
| Normalization | Grayscale, mean=0.5, std=0.5 |
| Batch size | 32 |
| Epochs (max) | 15 |
| Best epoch | 13 |
| Learning rate | 1e-4 |
| Weight decay | 1e-5 |
| Warmup epochs | 1 |
| Scheduler | Cosine |
| Early stopping patience | 5 |
| Drop path | — |

Config: [`configs/archive/run006_densenet121_cxr_2026-02-28/densenet121_cxr.yaml`](configs/archive/run006_densenet121_cxr_2026-02-28/densenet121_cxr.yaml)  
Checkpoint: [`checkpoints/densenet121_cxr/run006_densenet121_cxr_ep13_val0.7794_test0.7853.pt`](checkpoints/densenet121_cxr/run006_densenet121_cxr_ep13_val0.7794_test0.7853.pt)

---

### Run 005 — Swin-Tiny v3 (384px resolution)

| Parameter | Value |
|---|---|
| Architecture | `swin_tiny_patch4_window7_224` (timm, `img_size=384`) |
| Pretrained | ImageNet-1k |
| Image size | 384×384 |
| Batch size | 32 |
| Epochs (max) | 30 |
| Learning rate | 5e-5 |
| Weight decay | 0.05 |
| Warmup epochs | 2 |
| Scheduler | Cosine |
| Early stopping patience | 7 |
| Drop path | 0.1 |
| Gradient clipping | max_norm=1.0 |
| AdamW param groups | bias/norm WD=0, rest WD=0.05 |
| Per-epoch time | ~53 min (vs. ~20 min at 224px) |

Config: [`configs/archive/run005_swin_tiny_v3_2026-02-13/swin_tiny.yaml`](configs/archive/run005_swin_tiny_v3_2026-02-13/swin_tiny.yaml)  
Checkpoint: [`checkpoints/swin_tiny/run005_swin_tiny_v3_ep09_val0.7944_test0.8075.pt`](checkpoints/swin_tiny/run005_swin_tiny_v3_ep09_val0.7944_test0.8075.pt)

---

### Run 007 — Swin-Tiny single-label (Consolidation only)

| Parameter | Value |
|---|---|
| Architecture | `swin_tiny_patch4_window7_224` (timm) |
| Pretrained | ImageNet-1k |
| Task | **Single-label** (Consolidation only, num_classes=1) |
| Image size | 224×224 |
| Batch size | 128 |
| Epochs (max) | 30 |
| Learning rate | 5e-5 |
| Weight decay | 0.05 |
| Warmup epochs | 5 |
| Scheduler | Cosine |
| Early stopping patience | 7 |
| Drop path | 0.1 |
| Gradient clipping | max_norm=1.0 |
| AdamW param groups | bias/norm WD=0, rest WD=0.05 |

Config: [`configs/archive/run007_swin_tiny_consolidation_2026-02-13/swin_tiny_consolidation.yaml`](configs/archive/run007_swin_tiny_consolidation_2026-02-13/swin_tiny_consolidation.yaml)  
Checkpoint: [`checkpoints/swin_tiny/run007_swin_tiny_consolidation_ep16_val0.6744_test0.7082.pt`](checkpoints/swin_tiny/run007_swin_tiny_consolidation_ep16_val0.6744_test0.7082.pt)

---

### Run 008 — Swin-Tiny perclass

| Parameter | Value |
|---|---|
| Architecture | `swin_tiny_patch4_window7_224` (timm) |
| Pretrained | ImageNet-1k |
| Image size | 224×224 |
| Batch size | 64 |
| Epochs (best) | 9 / 30 |
| Learning rate | 5e-5 |
| Weight decay | 0.05 |
| Warmup epochs | 2 |
| Scheduler | Cosine |
| Early stopping patience | 7 |
| Uncertainty strategy | **u-mixed** (per-label) |
| Per-label strategies | Cardiomegaly: u-zeros, Edema: u-ones, Consolidation: u-ones, Atelectasis: u-ones, Pleural Effusion: u-zeros |
| pos_weight | **true** (Cardiomegaly 7.15×, Consolidation 4.10×, Atelectasis 2.20×, Edema 2.10×, Pleural Effusion 1.48×) |
| AdamW param groups | bias/norm WD=0, rest WD=0.05 |
| Gradient clipping | max_norm=1.0 |

Config: [`configs/archive/run008_swin_tiny_perclass_2026-03-09/swin_tiny_perclass.yaml`](configs/archive/run008_swin_tiny_perclass_2026-03-09/swin_tiny_perclass.yaml)  
Checkpoint: [`checkpoints/swin_tiny/run008_swin_tiny_perclass_ep09_val0.7937_test0.8129.pt`](checkpoints/swin_tiny/run008_swin_tiny_perclass_ep09_val0.7937_test0.8129.pt)

---

### Run 009 — ViT-Base perclass

| Parameter | Value |
|---|---|
| Architecture | `vit_base_patch16_224` (timm) |
| Pretrained | ImageNet-21k → ImageNet-1k fine-tune |
| Image size | 224×224 |
| Batch size | 64 |
| Epochs (best) | 9 / 30 |
| Learning rate | 3e-5 |
| Weight decay | 0.1 |
| Warmup epochs | 2 |
| Scheduler | Cosine |
| Early stopping patience | 7 |
| Uncertainty strategy | **u-mixed** (per-label) |
| Per-label strategies | Cardiomegaly: u-zeros, Edema: u-ones, Consolidation: u-ones, Atelectasis: u-ones, Pleural Effusion: u-zeros |
| pos_weight | **true** (Cardiomegaly 7.15×, Consolidation 4.10×, Atelectasis 2.20×, Edema 2.10×, Pleural Effusion 1.48×) |
| AdamW param groups | bias/norm WD=0, rest WD=0.1 |
| Gradient clipping | max_norm=1.0 |

Config: [`configs/archive/run009_vit_base_perclass_2026-03-10/vit_base_perclass.yaml`](configs/archive/run009_vit_base_perclass_2026-03-10/vit_base_perclass.yaml)  
Checkpoint: [`checkpoints/vit_base/run009_vit_base_perclass_ep09_val0.7905_test0.8118.pt`](checkpoints/vit_base/run009_vit_base_perclass_ep09_val0.7905_test0.8118.pt)

---

### Run 010 — DenseNet121 perclass

| Parameter | Value |
|---|---|
| Architecture | `densenet121` (torchvision) |
| Pretrained | ImageNet-1k |
| Image size | 224×224 |
| Batch size | 64 |
| Epochs (best) | 10 / 20 |
| Learning rate | 1e-4 |
| Weight decay | 0.01 |
| Warmup epochs | 1 |
| Scheduler | Cosine |
| Early stopping patience | 5 |
| Uncertainty strategy | **u-mixed** (per-label) |
| Per-label strategies | Cardiomegaly: u-zeros, Edema: u-ones, Consolidation: u-ones, Atelectasis: u-ones, Pleural Effusion: u-zeros |
| pos_weight | **true** (Cardiomegaly 7.15×, Consolidation 4.10×, Atelectasis 2.20×, Edema 2.10×, Pleural Effusion 1.48×) |
| AdamW param groups | bias/norm WD=0, rest WD=0.01 |
| Gradient clipping | max_norm=1.0 |

Config: [`configs/archive/run010_densenet121_perclass_2026-03-11/densenet121_perclass.yaml`](configs/archive/run010_densenet121_perclass_2026-03-11/densenet121_perclass.yaml)  
Checkpoint: [`checkpoints/densenet121/run010_densenet121_perclass_ep10_val0.7925_test0.8298.pt`](checkpoints/densenet121/run010_densenet121_perclass_ep10_val0.7925_test0.8298.pt)

---

### Run 011 — DenseNet121 perclass longer (patience=7 ablation)

| Parameter | Value |
|---|---|
| Architecture | `densenet121` (torchvision) |
| Pretrained | ImageNet-1k |
| Image size | 224×224 |
| Batch size | 64 |
| Epochs (best) | 7 / 20 |
| Learning rate | 1e-4 |
| Weight decay | 0.01 |
| Warmup epochs | 1 |
| Scheduler | Cosine |
| Early stopping patience | 7 |
| Uncertainty strategy | **u-mixed** (per-label) |
| Per-label strategies | Cardiomegaly: u-zeros, Edema: u-ones, Consolidation: u-ones, Atelectasis: u-ones, Pleural Effusion: u-zeros |
| pos_weight | **true** (Cardiomegaly 7.15×, Consolidation 4.10×, Atelectasis 2.20×, Edema 2.10×, Pleural Effusion 1.48×) |
| AdamW param groups | bias/norm WD=0, rest WD=0.01 |
| Gradient clipping | max_norm=1.0 |

Config: [`configs/archive/run011_densenet121_perclass_longer_2026-03-15/densenet121_perclass_longer.yaml`](configs/archive/run011_densenet121_perclass_longer_2026-03-15/densenet121_perclass_longer.yaml)  
Checkpoint: [`checkpoints/densenet121/run011_densenet121_perclass_longer_ep07_val0.7931_test0.8145.pt`](checkpoints/densenet121/run011_densenet121_perclass_longer_ep07_val0.7931_test0.8145.pt)

---

## Post-hoc Evaluation (no retraining)

### TTA — Swin-Tiny perclass (Run 008 + horizontal flip average)

| Label | Standard | TTA | Δ |
|---|---|---|---|
| Cardiomegaly | 0.8685 | 0.8704 | +0.0019 |
| Edema | 0.8615 | 0.8626 | +0.0011 |
| Consolidation | 0.7263 | 0.7282 | +0.0019 |
| Atelectasis | 0.7284 | 0.7304 | +0.0020 |
| Pleural Effusion | 0.8798 | 0.8812 | +0.0014 |
| **Mean** | **0.8129** | **0.8146** | **+0.0017** |

**Current best single-model result with TTA.** Consistent improvement across all labels.

---

### TTA — ViT-Base perclass (Run 009 + horizontal flip average)

| Label | Standard | TTA | Δ |
|---|---|---|---|
| Cardiomegaly | 0.8673 | 0.8705 | +0.0032 |
| Edema | 0.8566 | 0.8584 | +0.0018 |
| Consolidation | 0.7257 | 0.7271 | +0.0014 |
| Atelectasis | 0.7330 | 0.7346 | +0.0016 |
| Pleural Effusion | 0.8768 | 0.8788 | +0.0020 |
| **Mean** | **0.8118** | **0.8139** | **+0.0021** |

Consistent improvement across all labels. Run 009+TTA (0.8139) is below Run 008+TTA (0.8146), confirming Swin-Tiny perclass as the stronger single model.

---

### TTA — DenseNet121 perclass (Run 010 + horizontal flip average)

| Label | Standard | TTA | Δ |
|---|---|---|---|
| Cardiomegaly | 0.8816 | 0.8862 | +0.0046 |
| Edema | 0.8694 | 0.8722 | +0.0028 |
| Consolidation | 0.7587 | 0.7629 | +0.0042 |
| Atelectasis | 0.7532 | 0.7578 | +0.0046 |
| Pleural Effusion | 0.8861 | 0.8882 | +0.0021 |
| **Mean** | **0.8298** | **0.8334** | **+0.0036** |

**New overall best result.** TTA adds +0.0036, consistent across all labels.

---

### Ensemble — Swin-Tiny perclass + ViT-Base perclass + DenseNet121 perclass (3-model logit average)

| Label | Swin-Tiny (008) | ViT-Base (009) | DenseNet (010) | Ensemble | Δ vs DenseNet |
|---|---|---|---|---|---|
| Cardiomegaly | 0.8685 | 0.8673 | 0.8816 | 0.8832 | +0.0016 |
| Edema | 0.8615 | 0.8566 | 0.8694 | 0.8712 | +0.0018 |
| Consolidation | 0.7263 | 0.7257 | 0.7587 | 0.7542 | −0.0045 |
| Atelectasis | 0.7284 | 0.7330 | 0.7532 | 0.7511 | −0.0021 |
| Pleural Effusion | 0.8798 | 0.8768 | 0.8861 | 0.8877 | +0.0016 |
| **Mean** | **0.8129** | **0.8118** | **0.8298** | **0.8295** | **−0.0003** |

The 3-model ensemble (0.8295) is marginally **below** DenseNet121 perclass alone (0.8298). The two weaker models (Swin and ViT perclass, both ~0.81) dilute the DenseNet signal, especially on Consolidation and Atelectasis where averaging lowers scores. This is consistent with ensemble theory: averaging only helps when models are both diverse **and** individually strong.

---

### TTA — Swin-Tiny v2 (Run 003 + horizontal flip average)

| Label | Standard | TTA | Δ |
|---|---|---|---|
| Cardiomegaly | 0.8650 | 0.8669 | +0.0019 |
| Edema | 0.8613 | 0.8626 | +0.0013 |
| Consolidation | 0.6994 | 0.6994 | +0.0000 |
| Atelectasis | 0.7242 | 0.7258 | +0.0016 |
| Pleural Effusion | 0.8880 | 0.8897 | +0.0017 |
| **Mean** | **0.8076** | **0.8089** | **+0.0013** |

### TTA — Swin-Tiny v3 (Run 005 + horizontal flip average)

| Label | Standard | TTA | Δ |
|---|---|---|---|
| Cardiomegaly | 0.8644 | 0.8677 | +0.0033 |
| Edema | 0.8658 | 0.8669 | +0.0011 |
| Consolidation | 0.6953 | 0.6975 | +0.0022 |
| Atelectasis | 0.7218 | 0.7227 | +0.0009 |
| Pleural Effusion | 0.8903 | 0.8927 | +0.0024 |
| **Mean** | **0.8075** | **0.8095** | **+0.0020** |

### Ensemble — Swin-Tiny v2 + ViT-Base (logit average)

| Label | Swin-Tiny | ViT-Base | Ensemble | Δ vs best single |
|---|---|---|---|---|
| Cardiomegaly | 0.8650 | 0.8615 | 0.8678 | +0.0028 |
| Edema | 0.8613 | 0.8586 | 0.8647 | +0.0034 |
| Consolidation | 0.6994 | 0.6974 | 0.7033 | +0.0039 |
| Atelectasis | 0.7242 | 0.7172 | 0.7277 | +0.0035 |
| Pleural Effusion | 0.8880 | 0.8857 | 0.8919 | +0.0039 |
| **Mean** | **0.8076** | **0.8041** | **0.8111** | **+0.0035** |

---

## Stratified AUROC and False Positive Analysis (Run 003 — Swin-Tiny v2)

Test set (frontal only): **28,639** samples. Stratum sizes: **16,039** with 0–1 diseases, **12,600** with 2+ diseases.

### Stratified AUROC (0–1 vs 2+ diseases)

| Label | N(0-1) | AUROC(0-1) | N(2+) | AUROC(2+) | Δ |
|---|---:|---:|---:|---:|---:|
| Cardiomegaly | 16,039 | 0.8299 | 12,600 | 0.8487 | +0.0188 |
| Edema | 16,039 | 0.8489 | 12,600 | 0.8233 | −0.0256 |
| Consolidation | 16,039 | 0.7400 | 12,600 | 0.5912 | **−0.1489** |
| Atelectasis | 16,039 | 0.7195 | 12,600 | 0.6753 | −0.0442 |
| Pleural Effusion | 16,039 | 0.8872 | 12,600 | 0.8449 | −0.0423 |
| **MEAN** | | **0.8051** | | **0.7567** | **−0.0484** |

**Conclusion:** The model performs **worse on samples with 2+ diseases** (mean AUROC 0.7567 vs 0.8051). The drop is largest for **Consolidation** (−0.15).

### False Positives (threshold 0.5)

| Label | Negatives | FP | FPR (%) | Samples w/ FP |
|---|---:|---:|---:|---:|
| Cardiomegaly | 24,158 | 612 | 2.53% | 612 (2.1%) |
| Edema | 19,510 | 1,296 | 6.64% | 1,296 (4.5%) |
| Consolidation | 23,147 | 19 | 0.08% | 19 (0.1%) |
| Atelectasis | 19,727 | 171 | 0.87% | 171 (0.6%) |
| Pleural Effusion | 15,701 | 3,070 | **19.55%** | 3,070 (10.7%) |
| **OVERALL** | 102,243 | 5,168 | **5.05%** | — |

**Samples with ≥1 false positive (any label):** 4,776 / 28,639 (**16.7%**).

**Conclusion:** Pleural Effusion has the highest false positive rate (19.55%); Consolidation has the lowest (0.08%). Overall FPR 5.05%.

*Generated with:* `uv run python -m scripts.analyze_multilabel --config configs/archive/run003_swin_tiny_v2_2026-02-26/swin_tiny.yaml --checkpoint checkpoints/swin_tiny/run003_swin_tiny_v2_ep11_val0.7882_test0.8076.pt`

---

## Key Observations

1. **Both Transformer models outperform DenseNet121** on the test set (~+2% AUROC), consistent with the literature.
2. **Swin-Tiny slightly outperforms ViT-Base** (0.8076 vs 0.8041), likely because Swin's local window attention is better suited for localized pathology patterns in X-rays.
3. **Consolidation and Atelectasis are consistently the hardest labels** across all models (~0.70 and ~0.72 AUROC). This is known in the CheXpert literature due to high label uncertainty.
4. **Hyperparameter corrections mattered significantly**: Fixing weight_decay (5e-5 → 0.05), adding drop_path=0.1, AdamW parameter groups, and gradient clipping improved Swin-Tiny by +1.7% AUROC (0.7905 → 0.8076).
5. **Neither Transformer model trained to completion** — both stopped via early stopping at ~epoch 11/10 out of 30. Further tuning of warmup_epochs (5 may be too long) could allow longer effective training.
6. **TTA provides a small but consistent gain** (+0.0013 mean AUROC) on Swin-Tiny v2, improving every label except Consolidation.
7. **Ensemble of Swin-Tiny + ViT-Base yields the best result** (0.8111), improving every single label over the best individual model. The gain is largest for the hardest labels: Consolidation (+0.0039) and Atelectasis (+0.0035).
8. **Higher resolution (384px) does NOT improve Swin-Tiny**: Run 005 at 384px achieved 0.8075 test AUROC, virtually identical to Run 003 at 224px (0.8076). The 384px model costs ~2.7× more compute per epoch (53 min vs. 20 min), making it a poor trade-off. TTA benefit was slightly larger at 384px (+0.0020 vs +0.0013), but the net result (0.8095) only marginally exceeds v2+TTA (0.8089).
9. **CXR pretraining (torchxrayvision) does NOT outperform ImageNet pretraining**: DenseNet121-CXR (0.7853) is actually worse than the standard ImageNet DenseNet121 (0.7888) and far below the Transformer models (~0.80+). Likely causes: the pretrained 18-class head is replaced with a fresh 5-class head (loses task-specific features), the CXR normalization (grayscale, mean=0.5) may not perfectly match the torchxrayvision pretraining pipeline, and the hyperparameters were not optimised for domain-adaptive fine-tuning. This is an important negative result for the thesis.
10. **Multi-disease and false positive behaviour (Swin-Tiny v2):** Performance drops on samples with 2+ diseases (mean AUROC 0.7567 vs 0.8051), with the largest drop for Consolidation (−0.15). At threshold 0.5, Pleural Effusion has the highest FPR (19.55%) and Consolidation the lowest (0.08%); 16.7% of test samples have at least one false positive. Relevant for the thesis discussion on multi-label and clinical deployment (calibration / threshold choice).
11. **Single-label vs. multi-label for Consolidation (Run 007):** A dedicated Swin-Tiny model trained only on Consolidation achieves 0.7082 AUROC on the test set vs. 0.6994 for the multi-label Swin-Tiny v2 (Δ +0.0088). This is a modest but real improvement. The single-label model also beats the Swin+ViT ensemble (0.7033) for Consolidation. The gain does not justify 5× inference cost if applied per-label; a hybrid setup (multi-label + optional single-label for hardest labels) could be considered.
12. **Per-label uncertainty strategy + pos_weight is the strongest single-model result (Run 008, 0.8129):** Replacing the global `u-mask` strategy with per-label strategies (Consolidation/Edema/Atelectasis → u-ones; Cardiomegaly/Pleural Effusion → u-zeros) and adding class-frequency-based `pos_weight` improved mean AUROC from 0.8076 (Run 003) to **0.8129** (+0.005), surpassing even the Swin+ViT ensemble (0.8111). The biggest beneficiaries were the two hardest labels: Consolidation (+0.027, from 0.699 to 0.726) and Atelectasis (+0.004). This confirms that label-specific uncertainty handling is the most effective single intervention for CheXpert.
13. **ViT-Base also benefits strongly from per-label U-strategy + pos_weight (Run 009, 0.8118):** Applying the same intervention to ViT-Base improved mean AUROC from 0.8041 (Run 004) to **0.8118** (+0.0077). Consolidation gained +0.028 and Atelectasis +0.016 — both even larger than in Swin-Tiny. The per-label strategy improvement is consistent across architectures, confirming the intervention generalises beyond a single model. Run 009 is slightly below Run 008 (0.8118 vs 0.8129), suggesting Swin-Tiny has a marginal architectural advantage for this task under these settings.
14. **DenseNet121 with per-label U-strategy + pos_weight is the new best single model (Run 010, 0.8298):** Applying the same per-label U-strategy and pos_weight to DenseNet121 achieves **0.8298** test AUROC (+0.041 over baseline Run 001 at 0.7888), far surpassing both Swin-Tiny perclass (0.8129) and ViT-Base perclass (0.8118). This is a surprising result: a classical CNN architecture outperforms both transformers when given the right uncertainty handling and loss weighting. The effect is most pronounced on the hardest labels — Consolidation (+0.082) and Atelectasis (+0.050) — suggesting that the training strategy matters more than the architecture for these labels. The higher optimal learning rate (1e-4 vs. 5e-5/3e-5) and faster convergence (epoch 10 of 20) may reflect DenseNet's lower sample efficiency requirements.
15. **DenseNet121 perclass + TTA achieves the overall best result (0.8334):** TTA adds a further +0.0036, bringing Run 010 to **0.8334**, the highest score in all experiments. All labels improve consistently.
16. **The 3-model perclass ensemble (0.8295) is marginally worse than DenseNet121 perclass alone (0.8298):** Averaging logits from Swin-Tiny (0.8129) and ViT-Base (0.8118) with DenseNet (0.8298) slightly dilutes the ensemble, especially on Consolidation (−0.0045) and Atelectasis (−0.0021) where DenseNet is clearly the strongest. Only the shared strong labels (Cardiomegaly, Edema, Pleural Effusion) show small gains (+0.0016–0.0018). This demonstrates that ensemble gains require model diversity **and** comparable individual strength; including consistently weaker models can hurt the best-performing label scores.
17. **Increasing DenseNet121 perclass patience from 5 to 7 hurts performance (Run 011, 0.8145):** The longer-patience ablation underperforms Run 010 by **−0.0153** mean AUROC and is worse on every label. This indicates that Run 010 was not prematurely stopped; extra patience does not recover a better checkpoint and instead leads to a weaker final model on the held-out test set.

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

# Stratified AUROC + False Positive analysis (Run 003)
uv run python -m scripts.analyze_multilabel \
  --config configs/archive/run003_swin_tiny_v2_2026-02-26/swin_tiny.yaml \
  --checkpoint checkpoints/swin_tiny/run003_swin_tiny_v2_ep11_val0.7882_test0.8076.pt

# Evaluate single-label Consolidation model (Run 007)
uv run python -m src.evaluate \
  --config configs/archive/run007_swin_tiny_consolidation_2026-02-13/swin_tiny_consolidation.yaml \
  --checkpoint checkpoints/swin_tiny/run007_swin_tiny_consolidation_ep16_val0.6744_test0.7082.pt \
  --split test
```

Python version: 3.13  
PyTorch version: see `.venv`  
timm version: latest (installed via pip in Kaggle)
