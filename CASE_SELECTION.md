# User Study Case Selection

**Model:** Run 014 — DenseNet121, 6-label (Cardiomegaly, Edema, Consolidation, Atelectasis, Pleural Effusion, Pneumothorax)  
**Dataset:** CheXpert-v1.0-small (frontal views only)  
**Selection script:** `scripts/select_study_images.py`

---

## Study Design

All participants see the **same fixed set of cases**. The Latin square only rotates which UI condition (A–E) each block of cases gets — it does not rotate which images participants see. This allows direct per-case comparisons across participants and straightforward repeated-measures analysis for the paper.

Three time options exist, each extending the previous:

| Option | Cases | Conditions | Cases per condition |
|---|---|---|---|
| Quick | 10 | 5 | 2 |
| Standard | 15 | 5 | 3 |
| Full | 20 | 5 | 4 |

---

## Case Categories

| Category | Purpose | Model behaviour | Count in FIXED_20 |
|---|---|---|---|
| **Easy** | Single dominant finding; model correct | High confidence on 1 finding | 4 |
| **Hard** | Multiple co-occurring findings; model partially correct | Most findings detected, 1–2 missed | 7 |
| **Incidental** | Pneumothorax present but clinical context points elsewhere | Varies — see below | 6 |
| **AI-wrong** | Normal image; model produces false positives | Low or misleading predictions | 3 |

The **incidental** category is the core of the research question: does AI assistance help participants detect a pneumothorax when the stated clinical question is about a different primary complaint?

---

## Original 12 Images (already in study before this revision)

| Image ID | File | Demographics | Category | GT Labels | Key model predictions |
|---|---|---|---|---|---|
| p21795 | patient21795_study1 | M, 81, AP | Attention check / baseline only | Cardiomegaly | cMeg 95%, edema 60% FP |
| p37124 | patient37124_study3 | M, 48, AP | Easy | Edema | edema 95% |
| p00008 | patient00008_study1 | M, 81, AP | Easy | Pleural Effusion | effusion 90.5% |
| p34852 | patient34852_study3 | M, 72, AP | Easy | Consolidation | consolidation 83.2% |
| p59546 | patient59546_study1 | M, 67, AP | Hard | All 5 (no Ptx) | cMeg 72%, edema 88%, consol 77%, atel 80%, effusion 80% |
| p31804 | patient31804_study3 | F, 78, AP | Hard | All 5 (no Ptx) | cMeg 94%, edema 89%, consol 53%, atel 62%, effusion 81% |
| p38933 | patient38933_study4 | F, 68, AP | Hard | All 5 (no Ptx) | cMeg 95%, edema 91%, consol 63%, atel 55%, effusion 86% |
| p05319 | patient05319_study6 | M, 61, AP | Incidental | All 6 (with Ptx) | ptx **99.0%** — AI strongly flags |
| p36698 | patient36698_study5 | F, 44, AP | Incidental | All 5 + Ptx | ptx **56.6%** — AI flags moderately |
| p49165 | patient49165_study2 | F, 35, AP | Incidental | All 5 + Ptx | ptx **93.8%** — AI strongly flags |
| p48367 | patient48367_study3 | M, 57, AP | Incidental | All 5 + Ptx | ptx **59.3%** — AI flags moderately |
| p00001 | patient00001_study1 | F, 68, AP | AI-wrong | Normal | atel 58.5% FP, **ptx 52.0% FP** |
| p00004 | patient00004_study1 | F, 20, PA | AI-wrong | Normal | ptx 31.1% mild FP |

Note: `p21795` is reserved exclusively for the attention check and baseline trials. It is not included in any fixed study case set.

---

## 8 New Images Added (this revision)

### Unlock nCases = 15 (+3 images)

#### p32710 — Easy / Edema
**File:** `patient32710_study1_view1_frontal.jpg`  
**Demographics:** Female, 79, AP  
**GT:** Edema only  
**Model:** edema 71.5%, cardiomegaly 26.6%, all others ≤12%  
**Rationale:** Cleanest easy case in the candidate pool. A single dominant finding with minimal noise in the other predictions — good as a reference case where the AI unambiguously helps. Adds female elderly AP-view representation.

#### p25296 — Hard / Multi-finding
**File:** `patient25296_study3_view1_frontal.jpg`  
**Demographics:** Male, 71, AP  
**GT:** Cardiomegaly, Edema, Consolidation, Atelectasis, Pleural Effusion  
**Model:** cMeg 90.6%, edema 83.2%, consol 56.5%, **atel 48.4% MISS**, effusion 94.7%  
**Rationale:** Model correctly identifies the dominant findings but misses atelectasis. The high effusion confidence (94.7%) makes this a good hard case — interesting for conditions with AI because the AI's partial correctness requires the participant to think critically rather than just follow predictions.

#### p49165_study1 — Incidental / Pneumothorax
**File:** `patient49165_study1_view1_frontal.jpg`  
**Demographics:** Female, 35, AP  
**GT:** Cardiomegaly, Edema, Atelectasis, Pleural Effusion, Pneumothorax  
**Model:** ptx **65.9%**, other findings partially detected  
**Rationale:** The existing study already uses patient49165/study2 (ptx 93.8%). This study1 scan of the same patient — a different X-ray taken at a different visit — gives ptx 65.9%, creating a useful contrast: a case where the AI flags the incidental pneumothorax with moderate (rather than high) confidence. Participants must decide whether to act on a borderline AI signal. Same patient, different pathology severity at the time of the scan.

---

### Unlock nCases = 20 (+5 images)

#### p04050 — Hard / Multi-finding
**File:** `patient04050_study29_view1_frontal.jpg`  
**Demographics:** Male, 25, AP  
**GT:** Cardiomegaly, Edema, Consolidation, Atelectasis, Pleural Effusion  
**Model:** cMeg 92.4%, edema 56.0%, consol 53.5%, atel 60.1%, effusion 68.4%  
**Rationale:** The only 25-year-old in the entire study set, which is clinically noteworthy (cardiomegaly + multi-organ involvement in a young patient). Adds age diversity critical for subgroup analysis in the paper. The moderate-confidence predictions across all findings make this harder than p59546 or p31804 — participants cannot simply follow the model. This is study29 (a late follow-up scan), reflecting a chronic condition trajectory.

#### p28936 — Hard / Multi-finding
**File:** `patient28936_study1_view1_frontal.jpg`  
**Demographics:** Female, 53, AP  
**GT:** Cardiomegaly, Edema, Consolidation, Atelectasis, Pleural Effusion  
**Model:** cMeg 72.2%, edema 86.3%, consol 67.1%, atel 53.7%, effusion **94.2%**  
**Rationale:** The extremely high pleural effusion confidence (94.2%) combined with moderate cardiomegaly (72.2%) creates a good hard case where the AI's signal hierarchy differs from a clinically balanced read. Adds a female mid-age AP-view case.

#### p05067 — Hard / Multi-finding
**File:** `patient05067_study3_view1_frontal.jpg`  
**Demographics:** Male, 57, AP  
**GT:** Cardiomegaly, Edema, Consolidation, Atelectasis, Pleural Effusion  
**Model:** cMeg 93.2%, edema 89.8%, consol 60.0%, **atel 47.8% MISS**, effusion 53.9%  
**Rationale:** The pattern of high cardiomegaly + edema confidence with atelectasis missed mirrors p25296, but the lower effusion confidence (53.9% vs 94.7%) makes this a distinctly different case. Two cases with the same miss pattern but different overall confidence profiles allow the paper to examine whether the consistency of that miss matters. The borderline effusion also tests whether participants who over-rely on AI will under-report effusion.

#### p37577 — Incidental / Pneumothorax (AI misses)
**File:** `patient37577_study1_view1_frontal.jpg`  
**Demographics:** Male, 33, AP  
**GT:** Cardiomegaly, Edema, Atelectasis, Pleural Effusion, Pneumothorax  
**Model:** cMeg 87.0%, edema **43.6% MISS**, atel 67.1%, effusion 81.6%, **ptx 23.5% MISS**  
**Rationale:** This is the only incidental case where the model **fails to detect the pneumothorax**. All other incidental cases have AI ptx confidence of 56–99%. This case directly tests the most important hypothesis: can human + AI outperform human alone even when the AI does not flag the critical incidental finding? If participants in the AI conditions still miss the ptx (because AI shows only 23.5%), but baseline participants also miss it, there is no condition effect. If XAI heat maps hint at the pleural margin despite low confidence, there might be an XAI-specific benefit. This contrast is a thesis-level finding regardless of the result.

#### p00005_study1 — AI-wrong / Normal (true negative)
**File:** `patient00005_study1_view1_frontal.jpg`  
**Demographics:** Male, 33, PA  
**GT:** Normal (No Finding)  
**Model:** max prediction 22.5% (consolidation), all others ≤13%  
**Rationale:** The two existing AI-wrong cases have deliberate false positives (p00001: ptx 52%, p00004: ptx 31%). This third case adds a clean true negative where the model is correctly low on everything — a control to avoid over-representing false-positive AI behaviour. In the study, participants who are told "the AI found nothing suspicious" on a normal case should ideally agree; deviations reveal individual baseline skepticism. The case also provides a natural difficulty contrast within the ai_wrong category for subgroup analysis.

---

## Rejected Candidates and Reasons

| Candidate | Reason rejected |
|---|---|
| patient25976 | Cardiomegaly GT but model predicts only 4.8% — complete miss, poor for any category |
| patient54094 | Cardiomegaly 53.4% + ptx FP 51.1% — ambiguous, not clean enough for either easy or ai_wrong |
| patient00016 | Consolidation GT but model 31.4% — miss |
| patient34706 | Ptx GT but model 41.3% — miss |
| patient34858 | Too many high predictions (edema 79%, atel 71%) — actually a hard case, not easy |
| patient34967, patient34971 | Adequate but weaker than p32710; lower effusion confidence with more noise |
| patient37126 | Edema 53.5% but ptx 63.0% FP, atel 73.8% — very noisy |
| patient47806 | Two GT findings completely missed (cMeg 36.6%, edema 32.6%) |
| patient03070 (study9, study10) | Incidental ptx but model ptx 11.4% and 1.7% — AI provides no useful signal |
| patient12901 | Incidental ptx but model ptx 18.7% — too low |
| patient22071 | Incidental ptx but model ptx 7.6% — too low |
| patient00010 | Normal, all predictions under 10% — too clean, no teaching value |
| patient00013 | Normal, atelectasis 17.9% — weaker than p00005_study1 |

---

## Full FIXED Case Sets

### FIXED_10 (10 cases, nCases = 10)

| # | Image | Category | Clinical focus |
|---|---|---|---|
| 1 | p37124 | easy | Edema (primary) |
| 2 | p00008 | easy | Pleural Effusion (primary) |
| 3 | p34852 | easy | Consolidation (primary) |
| 4 | p59546 | hard | Edema + Effusion primary; consolidation/atelectasis incidental |
| 5 | p31804 | hard | Cardiomegaly + Edema + Effusion primary |
| 6 | p38933 | hard | Cardiomegaly + Effusion primary |
| 7 | p05319 | incidental | Consolidation + Effusion primary; **Ptx incidental (AI: 99%)** |
| 8 | p36698 | incidental | Edema + Effusion primary; **Ptx incidental (AI: 56%)** |
| 9 | p00001 | ai_wrong | Normal; AI false positives atel 58%, ptx 52% |
| 10 | p00004 | ai_wrong | Normal; AI mild ptx FP 31% |

### FIXED_15 (15 cases, nCases = 15) — adds 5 cases to FIXED_10

| # | Image | Category | Clinical focus |
|---|---|---|---|
| 11 | p49165 | incidental | Edema + Effusion primary; **Ptx incidental (AI: 93%)** |
| 12 | p48367 | incidental | Edema + Effusion primary; **Ptx incidental (AI: 59%)** |
| 13 | p32710 | easy | Edema (primary, clean) |
| 14 | p25296 | hard | Cardiomegaly + Edema primary; atelectasis MISS |
| 15 | p49165s1 | incidental | Multi-finding primary; **Ptx incidental (AI: 65%)** |

### FIXED_20 (20 cases, nCases = 20) — adds 5 cases to FIXED_15

| # | Image | Category | Clinical focus |
|---|---|---|---|
| 16 | p04050 | hard | Multi-finding; young patient (25M); moderate AI confidence |
| 17 | p28936 | hard | Multi-finding; effusion AI very high (94%) |
| 18 | p05067 | hard | Multi-finding; atelectasis MISS |
| 19 | p37577 | incidental | Multi-finding primary; **Ptx incidental (AI MISSES: 23%)** |
| 20 | p00005s1 | ai_wrong | Normal; all AI predictions low (≤23%) — clean true negative |

---

## Overlay Generation

After copying images, GradCAM and Integrated Gradients overlays were generated for each new image using the Run 014 checkpoint:

```bash
CKPT="checkpoints/densenet121/run014_densenet121_6labels_ep09_val0.8038_test0.8361.pt"
CFG="configs/densenet121_6labels.yaml"
PYTHONPATH=. uv run python scripts/gradcam.py --config $CFG --checkpoint $CKPT --patient pXXXXX
PYTHONPATH=. uv run python scripts/integrated_gradients.py --config $CFG --checkpoint $CKPT --patient pXXXXX
```

8 images × 6 labels × 2 methods = **96 new overlay PNG files** added to `frontend/public/cases/`.
