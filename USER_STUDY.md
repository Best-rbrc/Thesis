# User Study Specification (Current Implementation)

This document reflects the **current implemented behavior** of the frontend and Supabase integration in this repository.
It replaces the earlier aspirational plan and is intended to be used as the ground-truth methods spec for pilot runs.

## 1) Study Goal

Evaluate how AI assistance affects chest X-ray decision-making across different UI conditions:
- condition A: no AI assistance
- condition B: AI confidence bars
- condition C: AI confidence bars + explainability overlays
- condition D: AI confidence bars + explainability overlays + bias warning banner
- condition E: explainability overlays only (no numeric AI confidence bars)

## 2) Implemented Screen Flow

Exact runtime flow in the app:

1. `landing`
2. `consent`
3. `welcome` (demographics + time budget)
4. `interface-tutorial` (4-step preparation: anatomy overview, 5 findings with examples, findings checkboxes, confidence slider; **no AI content**)
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
- `interface-tutorial` (pre-baseline): 4 steps — (1) anatomy orientation, (2) the 5 findings with expandable clinical detail and example images, (3) how to use the findings checkboxes, (4) how to use the confidence slider. Contains **no AI-related content**, so it cannot prime AI-biased responses. Showing anatomy and findings before the baseline is scientifically sound: participants need to know what they are looking for; the restriction applies only to AI exposure.
- `tutorial` (post-baseline): 2 steps — (1) AI confidence bars, (2) heatmap overlays and bias warnings. Shown **after** the baseline so that AI content never contaminates the unassisted baseline measurement.

Notes:
- Session can be resumed via 6-character session code.
- Back button is suppressed during study flow.
- App persists both to Supabase and localStorage fallback.

## 3) Two-Stage Trial Protocol (Implemented)

For non-control cases (`condition !== "A"`):

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

For control cases (`condition === "A"`):
- single-phase submission (no AI reveal step)

Captured timing:
- `response_time_pre_ms`
- `response_time_post_ms` (phase 2 only)

## 4) Condition Behavior in UI

- **A**: no AI predictions, no overlays, no bias banner
- **B**: AI prediction bars in phase 2
- **C**: AI prediction bars + overlay switch (`original`, `gradcam`, `intgrad`)
- **D**: same as C + dismissible bias warning banner
- **E**: overlays only (no numeric AI bars), still phase-2 review

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

### Time budget mapping
Configured mapping in code:
- 10 min -> `n_cases = 8`
- 20 min -> `n_cases = 16`
- 30 min -> `n_cases = 24`

### Main-case generation
`generateCaseOrder(sessionIndex, nCases)` currently:
- uses 5-condition Latin-square order (`A..E`)
- computes `casesPerCondition = floor(nCases / 5)`
- assigns that many cases per condition
- then inserts one attention-check case into middle 60%

### Block size
- `casesPerBlock = floor(nCases / 4)`
- block transitions happen after every `casesPerBlock` submitted cases

### Important implementation implications
Because of `floor(nCases / 5)` with 5 conditions:
- 10-min path (`n_cases=8`) -> 5 main + 1 attention check = 6 displayed trial cases
- 20-min path (`n_cases=16`) -> 15 main + 1 attention check = 16 displayed trial cases
- 30-min path (`n_cases=24`) -> 20 main + 1 attention check = 21 displayed trial cases

So the displayed trial count does **not** always equal `n_cases`.

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

## 10) Current Known Deviations vs Original Plan

1. The app currently includes **5 conditions (A-E)**, while earlier plans often described 4.
2. Case-count math is driven by 5-condition allocation (`floor(nCases / 5)`), which reduces displayed trial cases for 10-min and 30-min tracks.
3. Mock case assets are still placeholder image URLs in `src/data/mockData.ts` (real CheXpert case pack not wired yet).
4. Overlay visuals in trial are currently synthetic gradients unless real per-case overlay assets are connected.

## 11) Practical Run Checklist

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
- [ ] Replace placeholder case/image assets if running final study

---

If behavior changes in code, update this file immediately so methods documentation remains synchronized with implementation.
