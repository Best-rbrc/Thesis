# Explainability Methods Verification Checklist

**Status Date:** March 12, 2026  
**Target Completion:** This week (March 15, 2026)

---

## Overview

This checklist documents the verification and testing of all 4 explainability methods for the CheXpert thesis. The goal is to confirm that each method:
1. **Executes end-to-end** without crashes
2. **Generates valid outputs** (PNG visualizations)
3. **Works across architectures** (DenseNet121, Swin Tiny)
4. **Produces quantifiable metrics** for thesis comparison

**Scope:** Top 2 performing architectures (DenseNet121 + Swin Tiny perclass models)  
**Manual Verification:** No automated test suite yet, but structured checklist

---

## Methods Summary

| # | Method | Speed | Lines | Status | Key Feature |
|---|--------|-------|-------|--------|-------------|
| 1 | Grad-CAM | ⚡ Fast | 184 | 🔄 TODO | Gradient-based heatmaps |
| 2 | Attention Maps | ⚡ Fast | 229 | 🔄 TODO | Transformer internal attention |
| 3 | Integrated Gradients | ⚡⚡ Medium | 202 | 🔄 TODO | Pixel-level attribution |
| 4 | SHAP | 🐢 Slow | 377 | 🔄 TODO | **NEVER RUN** — Includes sanity check |

---

## Pre-Verification Checklist

- [ ] Code changes applied: Bug fixes in `shap_analysis.py` and `attention_maps.py` ✅ DONE
  - [ ] Background sampling error handling improved
  - [ ] CPU fallback logging added to SHAP
  - [ ] Attention hook validation (raises instead of None)
  
- [ ] New script created: `scripts/compute_explainability_metrics.py` ✅ DONE
  - [ ] Computes Heatmap IoU
  - [ ] Computes pixel correlation
  - [ ] Computes attention entropy
  - [ ] Generates summary PNG
  
- [ ] Verification notebook created: `notebooks/explainability_verification.ipynb` ✅ DONE
  - [ ] Phase 1: Grad-CAM tests
  - [ ] Phase 2: Attention Maps tests
  - [ ] Phase 3: Integrated Gradients tests
  - [ ] Phase 4: SHAP + Sanity Check tests
  - [ ] Phase 5: Metrics computation

---

## Execution Verification

### Phase 1: Grad-CAM (Expected: ~30 seconds)

**Command:**
```bash
uv run python -m scripts.gradcam --config configs/densenet121_perclass.yaml \
  --checkpoint checkpoints/densenet121/run010_densenet121_perclass_ep10_val0.7925_test0.8298.pt \
  --index 0 --output outputs/gradcam
```

**Checklist:**

DenseNet121 Tests:
- [ ] Sample 0: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 1: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 2: ✅ / ❌ / ⏳  (runtime: ___ s)

Swin Tiny Tests:
- [ ] Sample 0: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 1: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 2: ✅ / ❌ / ⏳  (runtime: ___ s)

**Output Verification:**
- [ ] PNG files created: `outputs/gradcam/patient*_densenet121_gradcam.png`
- [ ] PNG files created: `outputs/gradcam/patient*_swin_tiny_gradcam.png`
- [ ] All files > 100 KB (i.e., not empty)

### Phase 2: Attention Maps (Expected: ~20 seconds)

**Command:**
```bash
uv run python -m scripts.attention_maps --config configs/swin_tiny_perclass.yaml \
  --checkpoint checkpoints/swin_tiny/run008_swin_tiny_perclass_ep09_val0.7937_test0.8129.pt \
  --index 0 --output outputs/attention_maps
```

**Checklist:**

Swin Tiny Tests:
- [ ] Sample 0: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 1: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 2: ✅ / ❌ / ⏳  (runtime: ___ s)

**Output Verification:**
- [ ] PNG files created: `outputs/attention_maps/patient*_swin_tiny_attention.png`
- [ ] All files > 100 KB
- [ ] No DenseNet121 output (expected: CNN architecture error)

### Phase 3: Integrated Gradients (Expected: ~1 minute)

**Command:**
```bash
uv run python -m scripts.integrated_gradients --config configs/densenet121_perclass.yaml \
  --checkpoint checkpoints/densenet121/run010_densenet121_perclass_ep10_val0.7925_test0.8298.pt \
  --index 0 --n-steps 50 --output outputs/integrated_gradients
```

**Checklist:**

DenseNet121 Tests:
- [ ] Sample 0: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 1: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 2: ✅ / ❌ / ⏳  (runtime: ___ s)

Swin Tiny Tests:
- [ ] Sample 0: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 1: ✅ / ❌ / ⏳  (runtime: ___ s)
- [ ] Sample 2: ✅ / ❌ / ⏳  (runtime: ___ s)

**Output Verification:**
- [ ] PNG files created: `outputs/integrated_gradients/patient*_densenet121_ig.png`
- [ ] PNG files created: `outputs/integrated_gradients/patient*_swin_tiny_ig.png`
- [ ] All files > 100 KB

### Phase 4: SHAP + Sanity Check (Expected: 30-40 minutes total)

**WARNING: This is SLOW and NEVER RUN BEFORE**

**Command:**
```bash
# DenseNet121 (with n-background=30 for speed)
uv run python -m scripts.shap_analysis --config configs/densenet121_perclass.yaml \
  --checkpoint checkpoints/densenet121/run010_densenet121_perclass_ep10_val0.7925_test0.8298.pt \
  --index 0 --n-background 30 --output outputs/shap --run-sanity-check
```

**Checklist:**

DenseNet121 Test:
- [ ] Main SHAP visualization: ✅ / ❌ / ⏳  (runtime: ___ min)
  - File: `outputs/shap/patient*_densenet121_shap.png`
  - Size: > 100 KB
- [ ] Sanity check plot: ✅ / ❌ / ⏳
  - File: `outputs/shap/patient*_densenet121_shap_sanitycheck.png`
  - **Key check:** Does correlation drop from 1.0 to <0.3 as weights randomize?
  - If YES ✅: SHAP is model-dependent (good!)
  - If NO ❌: SHAP explanations may not reflect model behavior

Swin Tiny Test:
- [ ] Main SHAP visualization: ✅ / ❌ / ⏳  (runtime: ___ min)
  - File: `outputs/shap/patient*_swin_tiny_shap.png`
  - Size: > 100 KB
- [ ] Sanity check plot: ✅ / ❌ / ⏳
  - File: `outputs/shap/patient*_swin_tiny_shap_sanitycheck.png`
  - **Key check:** Correlation drop validation

**Output Verification:**
- [ ] 2 main figures (1 per model)
- [ ] 2 sanity check figures (1 per model)
- [ ] All SHAP outputs > 100 KB

---

## Metrics Computation

**Command:**
```bash
uv run python -m scripts.compute_explainability_metrics \
  --output-dir outputs/ \
  --methods gradcam integrated_gradients attention_maps shap
```

**Checklist:**
- [ ] Metrics script executes without error
- [ ] CSV file created: `outputs/explainability_metrics.csv`
- [ ] Summary PNG created: `outputs/metrics_summary.png`
- [ ] Metrics include:
  - [ ] Heatmap IoU (Grad-CAM vs IG)
  - [ ] Pixel correlation (Grad-CAM vs IG)
  - [ ] Attention entropy (Swin Tiny)
  - [ ] SSIM (structural similarity)

**CSV Content Check:**
- [ ] At least 6 rows (one per test sample/architecture)
- [ ] "heatmap_iou_mean" column populated
- [ ] "method_correlation_mean" column populated
- [ ] "attention_entropy_mean" column (for Swin Tiny rows)

---

## Error Handling Verification

### Bug Fixes Applied

**SHAP Background Sampling [lines 97-128]:**
- [ ] Catches failed image loads with warning
- [ ] Tracks `failed_count` and reports at end
- [ ] Raises error if NO samples loaded (not silent failure)
- [ ] Logs: "⚠️ Loaded X/Y background samples (Z failed)"

**SHAP CPU Fallback [lines 203-208]:**
- [ ] Detects MPS device
- [ ] Prints warning with expected runtime (~10-30 min)
- [ ] Falls back to CPU gracefully

**Attention Maps Hook Validation [line 44]:**
- [ ] Raises RuntimeError if attention_weights list is empty
- [ ] Message: "Failed to capture attention weights. Hook may not have been triggered."

**Attention Maps Extraction Exception Handling [line 160]:**
- [ ] Wraps extraction in try-except
- [ ] Prints error and re-raises (not silent failure)
- [ ] Raises RuntimeError if map is None

### Edge Cases to Test (Optional)

- [ ] Invalid config file → caught as FileNotFoundError
- [ ] Missing checkpoint → caught as FileNotFoundError
- [ ] Invalid image path → caught as PIL ImageError
- [ ] Device conflicts (MPS/CPU) → graceful fallback

---

## Documentation & Reproducibility

- [ ] This checklist saved to: `docs/EXPLAINABILITY_VERIFICATION_CHECKLIST.md`
- [ ] Verification notebook saved to: `notebooks/explainability_verification.ipynb`
- [ ] Metrics script path: `scripts/compute_explainability_metrics.py`
- [ ] Bug fixes documented in commit message (if using version control)

---

## Timeline & Effort

| Phase | Task | Est. Time | Status | Actual | Notes |
|-------|------|-----------|--------|--------|-------|
| 1 | Grad-CAM | 30 sec | ⏳ | ___ | Fast baseline |
| 2 | Attention Maps | 20 sec | ⏳ | ___ | Transformer only |
| 3 | Int. Gradients | 60 sec | ⏳ | ___ | Medium speed |
| 4 | SHAP + Sanity | 30-40 min | ⏳ | ___ | CPU fallback |
| 5 | Metrics | 5 min | ⏳ | ___ | Aggregation |
| **Total** | | **~45 min** | ⏳ | ___ | Actual vs planned |

---

## Known Limitations & Workarounds

| Issue | Impact | Workaround | Status |
|-------|--------|-----------|--------|
| SHAP on MPS (Apple Silicon) | Very slow | CPU fallback automatically applied | ✅ Fixed |
| Attention Maps on CNN | N/A (CNN) | Error raised, expected | ✅ By design |
| IG with Captum on MPS | Slow| CPU fallback | ✅ Implemented |
| Background image load failures | Silent drop | Now logged with count | ✅ Fixed |
| Attention hook not triggered | None return | Now raises RuntimeError | ✅ Fixed |

---

## Final Thesis Integration

Once all tests pass:

1. **Save outputs** to backup directory (date-stamped)
2. **Include visualizations** in thesis Chapter 5 (Interpretability)
   - One representative example per method per architecture
   - Side-by-side comparison (CNN vs Transformer)
3. **Report metrics** in table format
   - IoU scores (shows method agreement)
   - Attention entropy (shows CNN vs Transformer differences)
4. **Cite sanity check results**
   - Include SHAP randomization plots as evidence of model dependence

---

## Sign-Off

- [ ] All tests completed
- [ ] All outputs reviewed and saved
- [ ] Metrics summary examined
- [ ] Documentation updated
- [ ] Ready for thesis submission

**Completed by:** _____________  
**Date:** _____________

---

**Related Documents:**
- [INTERPRETABILITY_GUIDE.md](INTERPRETABILITY_GUIDE.md) — Method reference
- [explainability_verification.ipynb](../notebooks/explainability_verification.ipynb) — Executable test notebook
