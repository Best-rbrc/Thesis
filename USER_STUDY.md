# User Study Specification (Current Implementation)

This document reflects the **current implemented behavior** of the frontend and Supabase integration in this repository.
It replaces the earlier aspirational plan and is intended to be used as the ground-truth methods spec for pilot runs.

## 1) Study Goal

Evaluate how AI assistance affects chest X-ray decision-making across different UI conditions:
- condition A: AI predictions shown **immediately** (single-phase, no lock-in / revise)
- condition B: AI confidence bars (two-phase: assess alone, then revise with AI)
- condition C: AI confidence bars + explainability overlays + bias warnings (two-phase)
- condition E: explainability overlays only, no numeric AI confidence bars (two-phase)

> **V2 change (2026-04-27):** Reduced from 5 to 4 conditions. Old condition A (no AI) replaced by "AI immediate". Old condition D (C + bias) merged into C — bias warnings now always accompany heatmaps. See §14 for details.

## 2) Implemented Screen Flow

Exact runtime flow in the app:

1. `landing`
2. `consent`
3. `welcome` (demographics + time budget)
4. `interface-tutorial` (4-step preparation: anatomy overview, 6 findings with examples, findings checkboxes, confidence slider; **no AI content**)
5. `baseline` (4 unassisted practice/baseline cases)
6. `pre-survey` (Jian 6-item trust scale, pre)
7. `tutorial` (2-step AI feature tutorial: AI confidence bars, heatmaps & bias warnings)
8. `trial` (main cases, two-stage response)
9. `block-break` (between blocks)
10. `bonus-offer`
11. `bonus-round` (optional 4 extra cases)
12. `debrief` (Jian 6-item trust scale, post + comments + optional email)
13. `complete` (rendered by Debrief screen)

**Design rationale — two-stage tutorial split:**
The tutorial is intentionally split into two parts to satisfy both UX and scientific validity requirements:
- `interface-tutorial` (pre-baseline): 4 steps — (1) anatomy orientation, (2) the 6 findings with expandable clinical detail and example images, (3) how to use the findings checkboxes, (4) how to use the confidence slider. Contains **no AI-related content**, so it cannot prime AI-biased responses. Showing anatomy and findings before the baseline is scientifically sound: participants need to know what they are looking for; the restriction applies only to AI exposure.
- `tutorial` (post-baseline): 2 steps — (1) AI confidence bars, (2) heatmap overlays and bias warnings. Shown **after** the baseline so that AI content never contaminates the unassisted baseline measurement.

Notes:
- Session can be resumed via 6-character session code.
- Back button is suppressed during study flow.
- App persists both to Supabase and localStorage fallback.

## 3) Two-Stage Trial Protocol (Implemented)

For two-phase cases (`condition B, C, or E`):

- Phase 1:
  - participant selects findings
  - participant sets confidence (0-100)
  - clicks "Lock In"
- Phase 2:
  - AI content shown depending on condition
  - participant can revise findings + confidence
  - participant rates AI helpfulness (0-100)
  - if explanations are present: XAI helpfulness + XAI faithfulness
  - participant self-reports whether answer changed
  - clicks "Submit & Next"

For immediate cases (`condition === "A"`):
- AI predictions are shown alongside the X-ray from the start
- single-phase submission — participant sees AI, selects findings, sets confidence, and submits

Captured timing:
- `response_time_pre_ms`
- `response_time_post_ms` (phase 2 only, not present for condition A)

## 4) Condition Behavior in UI

- **A**: AI prediction bars shown **immediately in phase 1** — single-phase submit, no revision step
- **B**: AI prediction bars in phase 2 (two-phase: lock-in → revise)
- **C**: AI prediction bars + heatmap overlay switch (`original`, `gradcam`) + dismissible bias warning banner (when applicable)
- **E**: heatmap overlays only (no numeric AI bars) + bias warnings (when applicable), still phase-2 review

> Legacy condition **D** (AI + heatmaps + bias) may appear in old session data but is no longer assigned to new sessions.

Condition explainer modal appears when condition changes.

## 5) Baseline and Survey Design

### Baseline block
- 4 fixed baseline cases
- no AI assistance
- same findings interface + confidence slider
- baseline accuracy is computed in-app and stored as `baseline_accuracy`

### Pre-survey
- Jian trust scale (6 items), displayed in randomized order
- randomized order is deterministically generated from session code and persisted

### Block break survey
- 3 condensed NASA-TLX items:
  - mental demand
  - time pressure
  - frustration
- 1 trust pulse item (1-7): "The AI system is reliable"

### Debrief
- Jian trust scale (post; 6 items)
- free-text comment
- optional email collection (stored separately)

## 6) Case and Block Assignment (Current Logic)

### Overall design: Within-subjects with Latin square counterbalancing

The study uses a **within-subjects design** — every participant experiences all 4 conditions (A, B, C, E). To control for confounds, a **balanced Latin square** determines which condition is applied to which block of cases.

**Key principle:** All participants who select the same time budget see the **exact same cases in the exact same order**. The only thing that changes between participants is **which condition each block of cases is shown under**.

This is the standard counterbalancing approach for within-subjects experiments in HCI and medical decision-making research. It ensures that observed differences between conditions cannot be attributed to differences in case difficulty or case ordering.

### Why counterbalancing is necessary

Without counterbalancing, a fixed case→condition mapping (e.g., "case fx-01 is always shown with no AI") would introduce a **confound between case difficulty and condition**. If easy cases happened to be assigned to the AI condition and hard cases to the no-AI condition, any observed accuracy difference could reflect case difficulty rather than the effect of AI assistance. The Latin square rotation ensures that, across participants, every case is seen under every condition, allowing the analysis to separate condition effects from case-level variance.

Additionally, the Latin square controls for **order effects** (learning and fatigue). Because conditions rotate positions across participants, no single condition is systematically advantaged or disadvantaged by always appearing early or late in the study.

### Time budget mapping

Configured mapping in code (values are clean for Latin-square allocation):
- 20 min → `n_cases = 10`
- 30 min → `n_cases = 15`
- 40 min → `n_cases = 20`

### Fixed case sets

All participants within the same time tier see the same fixed set of cases. Longer tiers are strict supersets:

| Tier | Cases | Set |
|---|---|---|
| 20 min | 10 cases (~2-3 per block) | `FIXED_10` |
| 30 min | 15 cases (~3-4 per block) | `FIXED_15` = `FIXED_10` + 5 additional |
| 40 min | 20 cases (5 per block) | `FIXED_20` = `FIXED_15` + 5 additional |

Case ordering within each fixed set is deterministic — it does **not** vary between participants. The cases are arranged to distribute category types (easy, hard, incidental, ai_wrong) across blocks.

### Latin square condition rotation (V2 — 4×4)

Each participant receives a `sessionIndex` (0–3), deterministically derived from their 6-character session code via a hash function (`codeToSessionIndex`, using `h % 4`). This index selects one row of the 4×4 Latin square:

| sessionIndex | Block 1 | Block 2 | Block 3 | Block 4 |
|:---:|:---:|:---:|:---:|:---:|
| 0 | A | B | C | E |
| 1 | B | C | E | A |
| 2 | C | E | A | B |
| 3 | E | A | B | C |

**Concrete example (FIXED_10, Block 1 — cases fx-01 through fx-03):**

| Participant sessionIndex | Condition for Block 1 cases |
|:---:|:---|
| 0 | **A** — AI predictions shown immediately |
| 1 | **B** — AI prediction bars (two-phase) |
| 2 | **C** — AI predictions + heatmaps + bias warnings |
| 3 | **E** — Heatmaps only |

Across all participants, every case appears under each of the 4 conditions with roughly equal frequency (~25% per condition, assuming uniform session code distribution).

### Main-case generation

`generateCaseOrder(sessionIndex, nCases)` performs the following:
1. Selects the appropriate fixed pool (`FIXED_10`, `FIXED_15`, or `FIXED_20`) based on `nCases`
2. Looks up the Latin square row for the given `sessionIndex` (`sessionIndex % 4`)
3. Computes `casesPerBlock = floor(pool.length / 4)`
4. Assigns each case the condition from its block: `condition = conditionOrder[floor(i / casesPerBlock)]`
5. Returns the full case list with conditions applied

After `generateCaseOrder`, one attention-check case is inserted at a deterministic position (within the 20%–80% range, derived from the session code).

### Block-break survey frequency
- Block-break surveys are **decoupled from condition blocks** — conditions still rotate in 4 blocks, but surveys appear less often:
  - 10 cases (20 min): **1** block-break survey (after ~6 cases)
  - 15 cases (30 min): **2** block-break surveys (after ~6 and ~12 cases)
  - 20 cases (40 min): **2** block-break surveys (after ~7 and ~14 cases)
- The survey interval accounts for the +1 attention check case inserted into the list

### Important implementation implications

With `floor(nCases / 4)`:
- 20-min path (`n_cases=10`) → 10 main (~2-3 per condition) + 1 attention check = 11 displayed trial cases
- 30-min path (`n_cases=15`) → 15 main (~3-4 per condition) + 1 attention check = 16 displayed trial cases
- 40-min path (`n_cases=20`) → 20 main (5 per condition) + 1 attention check = 21 displayed trial cases

### Analytical implications

The counterbalanced design enables the following analytical approaches:
- **Mixed-effects models** with participant and case as random effects, condition as fixed effect — the standard approach for within-subjects designs with counterbalancing
- **Within-participant comparisons** across conditions (each participant provides data for all 4 conditions)
- **Cross-participant comparisons** for the same case under different conditions (each case is seen under all 4 conditions across the full participant pool)
- Case difficulty and participant ability are controlled for by the random effects structure, isolating the true condition effect

## 7) Data Persistence Model (Supabase)

## Tables in use
- `study_sessions`
- `study_trials`
- `study_block_surveys`
- `study_email_subscriptions`

## `study_sessions` (written fields)
- `session_code`, `session_index`, `current_screen`, `current_case_index`, `current_block`
- profile fields: `experience_level`, `semester`, `xray_experience`, `ai_usage_general`, `ai_usage_medicine`, `ai_current_use`
- protocol fields: `time_budget_min`, `n_cases`, `consent`, `consent_timestamp`
- analytics/support fields: `baseline_accuracy`, `pre_trust_items`, `post_trust_items`, `debrief_comments`, `completed_at`, `jian_item_order`

## `study_trials` (written fields)
- identity/context: `session_id`, `case_id`, `trial_type`, `condition`, `category`
- case truth/model: `ground_truth`, `ai_preds`
- participant response: `initial_findings`, `initial_confidence`, `revised_findings`, `revised_confidence`
- ratings: `ai_helpful`, `xai_helpful`, `xai_faithful`, `xai_view_selected`, `changed_mind`
- timings/interaction: `response_time_pre_ms`, `response_time_post_ms`, `bias_banner_dismissed`, `time_on_banner_ms`

`trial_type` values used:
- `baseline`
- `main`
- `attention_check`
- (`bonus` is allowed by resume logic but current bonus submission path uses `main` because trial type is derived from category)

## `study_block_surveys`
- `session_id`, `block_number`
- `nasa_mental`, `nasa_time`, `nasa_frustration`, `trust_pulse`

## `study_email_subscriptions`
- `email`

## Migration requirement for fresh DBs
In addition to the original schema migrations, apply:

```sql
ALTER TABLE public.study_trials ADD COLUMN IF NOT EXISTS ground_truth TEXT[];
ALTER TABLE public.study_trials ADD COLUMN IF NOT EXISTS ai_preds JSONB;
```

## 8) Resume and Reliability Design Choices

- Resume first tries Supabase (`session_code`), then localStorage fallback.
- `landing` is intentionally not persisted as resumable screen.
- If an old session has `current_screen = landing`, resume falls back to `welcome`.
- Local retry queue wrapper (`withRetry`) is used for write operations.

## 9) UI and Content Design Choices (Implemented)

- Dark clinical theme across all screens
- Bilingual copy (`en`/`de`) via in-context translation dictionary
- Session code shown in header and welcome screen; copy-to-clipboard support
- In leave-confirmation modal, session code is directly clickable to copy
- Top header includes custom lung/chest icon and findings quick-reference modal

## 10) AI Model and Target Labels

**Production model:** Run 014 — DenseNet121, 6-label (test AUROC 0.8361).

Config: `configs/densenet121_6labels.yaml`
Checkpoint: `checkpoints/densenet121/run014_densenet121_6labels_ep09_val0.8038_test0.8361.pt`

### 6 target labels

| # | Label | Slug (code) |
|---|---|---|
| 1 | Cardiomegaly | `cardiomegaly` |
| 2 | Edema | `edema` |
| 3 | Consolidation | `consolidation` |
| 4 | Atelectasis | `atelectasis` |
| 5 | Pleural Effusion | `pleural_effusion` |
| 6 | Pneumothorax | `pneumothorax` |

Fracture was dropped after Run 012/013 showed unusable F1 (0.2150 / collapsed to sub-random). Pneumothorax was retained (AUROC 0.9113, F1-opt 0.5629) and serves as the primary incidental finding for the study.

### Explainability overlays

For each study image, two XAI methods produce per-label transparent RGBA overlays:
- **Grad-CAM**: `scripts/gradcam.py --study-overlays`
- **Integrated Gradients**: `scripts/integrated_gradients.py --study-overlays`

File naming: `{patient}_{study}_view1_frontal_{gradcam|intgrad}_{finding_slug}.png`

## 11) Primary vs Incidental Findings Design

This is the **core experimental design element** (per Expose.md RQ1).

### Concept

- **Primary finding**: a pathology directly related to the patient's chief complaint (the reason for the X-ray).
- **Incidental finding**: a pathology present on the image but unrelated to the referral reason.

The same image can have different primary/incidental splits depending on the clinical context. For example, an image showing both cardiomegaly and pneumothorax:
- Context "cardiac follow-up" → cardiomegaly is primary, pneumothorax is incidental
- Context "acute respiratory distress" → pneumothorax might be primary

### Implementation

Each case in `mockData.ts` has:
- `groundTruth: string[]` — actual CheXpert-verified findings on the image (fixed per image)
- `primaryFindings: string[]` — subset of groundTruth related to the clinical context
- `incidentalFindings: string[]` — remaining groundTruth findings
- `clinicalContext: string` — translation key for a bilingual clinical vignette (en/de)

Participants see:
1. The clinical context vignette (displayed above findings panel)
2. A flat checklist of 6 findings + "no finding present"
3. They are **not** told which findings are primary vs incidental

The primary/incidental distinction is used **only in analysis** to measure:
- Sensitivity for primary findings (expected to be higher)
- Sensitivity for incidental findings (the key thesis question: does AI help?)
- Whether AI conditions (B-E) improve incidental finding detection vs control (A)

### Case categories

| Category | Count | Description |
|---|---|---|
| `easy` | 4 | Single dominant finding, AI correctly identifies it |
| `hard` | 8 | Multiple findings, some primary and some incidental based on context |
| `incidental` | 8 | Pneumothorax present as incidental finding; clinical context points to different primary complaint |
| `ai_wrong` | 4 | Normal X-ray where model has false positives (atelectasis, pneumothorax) |

### Image selection

13 real CheXpert-v1.0-small frontal images selected to cover the required pathology patterns:
- 4 single-finding images (cardiomegaly, edema, pleural effusion, consolidation)
- 3 multi-finding images (all 5 core labels positive, no pneumothorax)
- 4 pneumothorax images (pneumothorax + multiple other findings)
- 2 normal images (No Finding = 1.0 in CheXpert)

All AI predictions shown to participants are the **actual Run 014 model sigmoid outputs** (rounded to integer percentages). All overlays are generated from the same model. This ensures consistency between numeric predictions and visual explanations.

## 12) Current Known Deviations vs Original Plan

1. The app currently includes **4 conditions (A, B, C, E)** — reduced from 5 in V2. Old condition D is merged into C. See §14.
2. `TIME_TO_CASES` values (10, 15, 20) are distributed across 4 blocks via `floor(nCases / 4)`.
3. The study uses 6 target labels (5 core + Pneumothorax), expanded from the original 5 to support primary/incidental finding analysis.

## 13) Practical Run Checklist

Before running participants:

- [ ] Apply all Supabase migrations (including `ground_truth` + `ai_preds` migration)
- [ ] Confirm `.env` points to target Supabase project
- [ ] Run one full pilot from `landing` to `debrief`
- [ ] Verify rows appear in:
  - [ ] `study_sessions`
  - [ ] `study_trials`
  - [ ] `study_block_surveys`
  - [ ] `study_email_subscriptions` (if email entered)
- [ ] Verify resume by copying session code, leaving, and resuming
- [ ] Verify all 13 study images + overlays are in `frontend/public/cases/`
- [ ] Verify `mockData.ts` ground truths match CheXpert CSV labels

---

## 14) V2 Study Design Changes (2026-04-27)

These changes were made to improve study completion rates and reduce participant burden.

### Motivation

Participant drop-off was observed during the study. Contributing factors:
- Too many conditions (5) meant too many block-break surveys (4 surveys of 4 questions each)
- Condition A (no AI at all) was redundant because the baseline task at the end of the study already captures unassisted performance
- Condition D (C + bias warnings) added complexity without sufficient differentiation from C

### Changes Made

| Change | Before (V1) | After (V2) |
|--------|-------------|------------|
| **Conditions** | 5 (A, B, C, D, E) | 4 (A, B, C, E) |
| **Condition A** | No AI (control) | AI predictions shown **immediately** (single phase) |
| **Condition D** | AI + heatmaps + bias warnings | **Merged into C** — bias warnings now always accompany heatmaps |
| **Blocks** | 5 | 4 |
| **Block-break surveys** | 4 | 1 (short) or 2 (medium/long) |
| **Latin square** | 5×5 | 4×4 |
| **Session index** | `hash % 5` | `hash % 4` |
| **Bias warnings** | Only shown in condition D | Shown in C and E (whenever a case has a `biasWarning`) |

### Condition A — New Behavior

Condition A now tests **anchoring by AI**: participants see AI predictions from the very start and make their assessment with AI output visible. This contrasts with B/C/E where participants form an initial opinion *before* seeing AI output (Phase 1 → Phase 2 flow).

This is scientifically more interesting than the old "no AI" control because:
- The baseline task at the end already measures unassisted performance
- Condition A now captures whether seeing AI **from the start** (potential anchoring) produces different outcomes than seeing AI **after** forming an initial opinion (conditions B/C/E)

### Backward Compatibility

- **DB schema**: No changes. The `condition` column in `study_trials` is a text field; old values `"A"` (old meaning) and `"D"` remain valid historical data.
- **Resuming old sessions**: The system detects legacy sessions by checking if any saved trial has `condition === "D"`. If so, it uses `generateCaseOrderV1()` (old 5-condition Latin square, 5 blocks) and `TOTAL_BLOCKS_V1 = 5` so the participant's remaining cases stay consistent with what they've already completed.
- **New sessions**: Always use the V2 4-condition design.
- **Bonus cases**: Updated to cycle through `[A, B, C, E, A]` instead of `[A, B, C, D, E]`.

### Files Modified

- `frontend/src/data/mockData.ts` — Latin squares, block counts, case generation, bonus conditions
- `frontend/src/context/StudyContext.tsx` — session index hash, resume logic, condition translations
- `frontend/src/screens/TrialScreen.tsx` — condition A now shows AI in Phase 1; bias warnings on C/E

---

If behavior changes in code, update this file immediately so methods documentation remains synchronized with implementation.
