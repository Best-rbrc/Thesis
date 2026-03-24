# User Study Plan — CheXStudy

**Thesis:** Explainable Vision Transformers for Radiology: Comparing Human and AI Detection of Primary and Incidental Findings in Chest X-Rays  
**Model used:** Run 010 — DenseNet121 perclass (AUROC 0.8298 on test set)

---

## Research Questions Addressed

| RQ | Question | How the study tests it |
|---|---|---|
| RQ1 | Can AI improve detection of primary and incidental findings vs. medical students? | Condition A vs. B/C/D on accuracy + incidental recall |
| RQ2 | Do visual explanations (Grad-CAM, IG) increase trust and usability vs. black-box? | Condition B vs. C |
| RQ3 | Does calibration help users judge when to trust the AI? | Correlation: self-confidence × actual accuracy per condition; Condition C vs. D |
| RQ4 | Does performance differ across subgroups, and can biases be made transparent? | Condition D (fairness banner); age/view subgroup breakdown of participant errors |
| RQ5 | Which setting achieves the best balance of accuracy, recall, efficiency, and trust? | All 4 conditions compared across all metrics |
| RQ6 | Does AI cause decision switching, and is the switching positive or negative? | Pre-AI vs. post-AI responses per trial across all AI conditions (B/C/D) |
| RQ7 | Do novices over-rely more and under-rely less than experts? | Three-way reliance taxonomy (over/under/appropriate) × experience level |

> **Why RQ6 and RQ7?** Measuring only final accuracy hides *how* participants use the AI. A null accuracy result could mean the AI was ignored (under-reliance) or that it helped and hurt equally (switching artefact that cancels out). Fogliato et al. (2022) demonstrated exactly this cancellation: overall accuracy was unchanged by AI assistance, but decomposing by switch direction revealed simultaneous helpful and harmful influence on different subgroups. Without RQ6 and RQ7, the most theoretically important finding — the expertise × condition interaction on reliance behaviour — cannot be tested (Dogru & Krämer, 2025; Nicolson et al., 2025).

---

## Participants

| Group | Target N | Background |
|---|---|---|
| No medical background | 2–3 | Control / baseline |
| Medical student — preclinical | 2–3 | Little/no X-ray exposure |
| Medical student — clinical semester | 2–3 | Some clinical X-ray exposure |
| Resident / Attending physician | 1–2 | Expert reference |

**Total: ~10 participants.** Within-subject design — every participant completes all 4 conditions.

The expertise × condition interaction is a primary finding: do novices over-rely on AI more than experts? Do doctors under-rely (ignore correct AI) because they already know where to look?

> **Why within-subject design?** A between-subject design with N=10 would leave only 2–3 participants per condition — far too few for any statistical comparison. Within-subject eliminates between-participant variance as a nuisance factor and makes individual condition effects detectable even at small N.

> **Why a baseline mini-test instead of trusting self-reported expertise?** Self-reported year of study is a weak proxy for actual radiology competence — a clinical-semester student who has rotated through radiology may have more relevant experience than one who has not. A 4-case unassisted mini-test produces a continuous *observed accuracy* score used as a covariate in all mixed models (Dogru & Krämer, 2025; Chen et al., 2025). Rainey et al. (2025) found that qualified radiographers and students differed sharply in automation bias even when their self-reported confidence was similar, highlighting the need for an objective competence measure.

---

## The 4 Conditions

| # | Name | What the participant sees |
|---|---|---|
| **A** | Human alone | X-ray image only. No AI information. |
| **B** | AI annotations (no XAI) | X-ray + AI confidence bars per label (0–100%). Black-box — no explanation of why. |
| **C** | AI + Explainability | Everything in B + Grad-CAM heatmap + Integrated Gradients overlay, togglable. |
| **D** | AI + XAI + Bias context | Everything in C + contextual banner showing patient demographics and model reliability warning based on fairness findings (e.g. "AP image · Age 72 · Model performance ~4% lower for this group"). |

**Key contrasts:**
- A → B: effect of AI assistance alone
- B → C: effect of explainability (visual heatmaps)
- C → D: effect of communicating uncertainty and bias

Condition D is novel — it directly operationalizes the fairness analysis results (age decline Δ=0.056, AP/PA gap Δ=0.043) into the study design.

> **Why this 4-condition ladder?** Each step isolates exactly one intervention, making causal attribution unambiguous. Rong et al. (2022) showed in a chest X-ray XAI study that XAI alone did not improve diagnostic accuracy but *did* increase trust — suggesting XAI operates through trust rather than through better comprehension of findings. The A→B→C→D ladder lets us replicate and extend that finding. Condition D is novel: no prior published study has closed the loop from a model's own fairness audit to a real-time in-interface warning presented to users.

---

## Case Selection (24 cases total)

Cases are selected from the CheXpert test set (frontal-only). Model predictions and ground truth are known for all cases. Four intentional categories:

| Category | N | Selection criteria |
|---|---|---|
| **Easy** — clear single finding | 4 | Model confidence > 0.85, single label positive, unambiguous image |
| **Hard** — subtle finding | 8 | Model correct but confidence 0.55–0.75, diagnosis not obvious |
| **Incidental** — secondary finding prominent | 8 | ≥2 positive labels; one is easy to miss; tests RQ1 incidental finding detection |
| **AI-wrong** — model confidently incorrect | 4 | Model confidence > 0.75 on a wrong label; tests over-reliance (RQ3) |

The AI-wrong cases are the most diagnostically valuable: they reveal whether XAI helps participants *override* a bad AI recommendation (Condition C/D) versus blindly deferring (Condition B).

> **Why 25% AI-wrong cases (4 of 16 in the main task)?** Rainey et al. (2025) cite Moray et al. (2000), who identified approximately 30% automation errors as the threshold at which users start to calibrate appropriate distrust of the system. Below this threshold, participants never encounter a clear reason to question the AI, so over-reliance remains latent and unmeasurable. Above ~40%, the study no longer reflects realistic deployment — typical clinical AI targets 80–90% accuracy. 25% balances ecological validity against measurability of automation bias.

Each case is assigned to exactly one condition per participant, with a Latin-square counterbalancing scheme so order effects cancel out across participants.

### Case metadata stored per case
- `case_id` — patient + study identifier
- `category` — easy / hard / incidental / ai_wrong
- `ground_truth` — per-label binary {0, 1}
- `ai_preds` — per-label sigmoid probability (Run 010 model)
- `image_path` — path to original X-ray PNG
- `gradcam_path` — pre-generated Grad-CAM overlay PNG
- `intgrad_path` — pre-generated Integrated Gradients overlay PNG
- `metadata` — Sex, Age, AP/PA (for bias banner in Condition D)

All XAI maps are **pre-generated offline** using `scripts/gradcam.py` and `scripts/integrated_gradients.py` before the study runs. No ML inference at study runtime.

---

## Adaptive Entry (Time + Experience)

Participants self-select at the start:

**Available time → number of cases:**
- 10 minutes → 8 cases (2 per condition)
- 20 minutes → 16 cases (4 per condition)
- 30 minutes → 24 cases (6 per condition)

**Experience level → tutorial depth:**
- No background / preclinical → extended tutorial with anatomy overview and label explanations
- Clinical / resident → short tutorial (UI walkthrough only)

**AI experience questionnaire (30 seconds, all participants):**
Three items added to the demographics screen to serve as covariates for trust and reliance analyses (Choudhury & Shamszare, 2026 systematic review identified prior AI experience as one of the strongest trust predictors):
1. "How often do you use AI tools (e.g. ChatGPT, image tools) in daily life?" — Never / Monthly / Weekly / Daily
2. "Have you used AI-based diagnostic or clinical tools before?" — Yes / No
3. "How well do you understand how AI makes decisions?" — 1 (Not at all) to 5 (Very well)

These are stored in the `sessions` table as `ai_usage_freq`, `ai_clinical_prior` (bool), and `ai_understanding` (int 1–5).

> **Why measure AI experience separately from medical expertise?** Choudhury & Shamszare (2026) conducted a systematic review of 47 studies and found that prior AI experience is one of the strongest predictors of trust and over-reliance — independent of domain expertise. A medical student who uses ChatGPT daily may trust AI outputs more readily than an attending physician who has never interacted with an AI tool, even though the physician has far greater medical knowledge. Without this covariate, AI-familiarity effects are confounded with expertise effects, and the mixed model coefficients for both become uninterpretable.

---

## Study Flow (one session, ~45–60 min for 30-min track)

```
1. Consent + demographics (experience, year of study, AI familiarity)   [3 min]
2. Pre-survey: Trust in AI scale (Jian et al. 2000, 6 items)            [2 min]
3. Domain knowledge baseline: 4 unassisted X-ray cases                  [4 min]
   — No AI output, no feedback. Establishes continuous baseline accuracy
     as a covariate for all subsequent analyses.
   — These 4 cases are drawn from study pool; participant not told
     they are being tested (framed as "getting familiar with the viewer")
4. Tutorial: labels, UI, how to read AI bars + heatmaps                 [5 min]
   — For XAI: includes one sentence: "The highlighted region shows where
     the AI attended — it is not always the clinically relevant area.
     Use it as one signal, not as ground truth."
5. Main task: N cases across 4 condition blocks                         [25–40 min]
   — Each block: N/4 cases in one condition
   — TWO-STAGE RESPONSE PER TRIAL (see Per-Trial Protocol):
     Phase 1: image shown alone → initial answer recorded
     Phase 2: AI output revealed → participant may revise → final answer recorded
   — Between blocks: 3-item NASA-TLX + 1-item trust pulse ("The AI is reliable", 1–7)
5. Post-survey: Trust scale (repeat) + NASA-TLX + free text             [5 min]
```

### Two-Stage Response Protocol (per trial, Conditions B/C/D)

Inspired by Fogliato et al. (ACM FAccT 2022, "Who goes first?") and Rainey et al. (PLoS One 2025). Without capturing the pre-AI answer, it is impossible to distinguish:
- Cases where the participant was *already correct* before seeing the AI
- Cases where the AI *changed* their answer (decision switching)
- Whether the switch was *positive* (AI was right) or *negative* (automation bias)

**Protocol:**
1. Image displayed. No AI shown yet (even in Condition B). Response panel: 5-label checkboxes + confidence slider. Button: **"Lock in my answer →"**
2. AI output appears (confidence bars, heatmaps per condition). Labels already checked remain visible but editable. Button: **"Submit final answer →"**
3. Per-trial optional question: "Did you change your answer after seeing the AI?" — Yes / No (self-report cross-check)

This adds ~15 seconds per trial. The analytical gain is decisive switching metrics that map directly to the automation bias literature.

> **Why not just ask "did the AI help you?" at the end?** Self-reported helpfulness suffers from two problems. First, social desirability bias: participants say the AI helped even when they made no change. Second, post-hoc rationalisation: participants who followed the AI and were wrong tend to reattribute their decision as their own independent judgment. Fogliato et al. (2022) showed that studies using only post-task helpfulness ratings systematically underestimate automation bias. The two-stage protocol makes switching *observable* from the data. Rainey et al. (2025) used exactly this design and found students switched negatively (toward a wrong AI answer) at twice the rate of qualified radiographers — a difference that would have been invisible in a final-answer-only design.

> **Why show the image alone first even in Condition B (black-box AI)?** Anchoring. If AI confidence bars are visible from the start, participants anchor on them before forming any independent clinical impression. Nourani et al. (2021) demonstrated in 129-citation IUI paper that seeing AI output first biases subsequent judgments even when users are explicitly told the AI makes errors. Forcing an initial answer before AI reveal is the only way to measure the independent human baseline per trial.

---

## Per-Trial Measurements

**Primary metrics:**
- **Accuracy** per label per condition (multi-label, binary threshold 0.5)
- **Recall for incidental findings** — specifically on "incidental" category cases
- **Decision time** — timestamp on image render → "Lock in" click (pre-AI phase only, to exclude AI revelation time)

**Decision switching metrics (new — Conditions B/C/D):**
- **Decision switch rate** — % of cases where final answer ≠ initial answer
- **Positive switch rate** — AI correct, participant followed the AI (beneficial influence)
- **Negative switch rate (automation bias)** — AI wrong, participant followed anyway (Rainey et al. 2025: students switched negatively 2× more than radiographers)
- **Switch direction** — derived from `pre_ai_answers` vs. `participant_answers` vs. ground truth

> **Why decompose switching direction?** A 30% switch rate could mean the AI is very helpful (30% positive switches) or dangerous (30% negative switches — automation bias). Aggregated into net accuracy, they cancel out and produce a null result. Fogliato et al. (2022) demonstrated this cancellation empirically in a lung nodule study: overall accuracy was unchanged, but decomposing by switch direction revealed simultaneous benefit for some participants and harm for others. The decomposition is computed post-hoc from `pre_ai_answers` vs. `participant_answers` vs. `ground_truth` — no UI cost.

**Reliance taxonomy (Nicolson et al. npj Digital Medicine 2025):**
- **Over-reliance** — participant followed AI when AI was wrong (AI-wrong cases, all AI conditions)
- **Under-reliance** — participant did NOT follow AI when AI was correct (easy + hard cases, all AI conditions)
- **Appropriate reliance** — participant followed AI when correct AND overrode AI when wrong (composite, per condition)
  This three-way taxonomy is computable post-hoc from existing data fields with no UI change.

  > **Why a three-way taxonomy instead of just measuring accuracy?** Accuracy conflates two opposite failure modes: the participant who ignores correct AI advice (under-reliance — wastes the AI benefit) and the participant who follows wrong AI advice (over-reliance — automation bias, potentially harmful). An XAI intervention can *fix* one while *worsening* the other, and the net accuracy effect is zero. Nicolson et al. (2025) applied this taxonomy in a npj Digital Medicine study and found exactly this pattern: XAI reduced over-reliance but increased under-reliance among experienced clinicians — a finding completely invisible in accuracy-only analyses.

**Secondary metrics:**
- **Trust calibration** — Pearson r between self-confidence slider and actual accuracy per condition
- **XAI faithfulness rating** — per-trial (Conditions C/D): "Was the highlighted region in the right area?" (Yes / Partially / No / Not sure)
- **XAI helpfulness** — per-trial: "Did the highlighted region help?" (helped / neutral / misleading) — Conditions C/D only
- **AI helpfulness** — slider 0–100: "How helpful was the AI for this case?" — Conditions B/C/D
- **Workload** — NASA-TLX (3 condensed items) after each condition block
- **Trust pulse** — single Jian item 3 ("The system is reliable", 1–7) at end of each block; yields a 4-point trust trajectory per condition

  > **Why track trust at each block instead of just pre/post?** Rainey et al. (2025) found that trust in both student and qualified radiographer groups decreased *monotonically* across the session as participants encountered AI errors. A pre/post design captures only the net change; per-block measurement reveals *when* trust breaks down — after the first AI-wrong case? After a cluster? This is important for deployment design (e.g., whether a trust disclaimer at session start is sufficient or needs reinforcing mid-task). The single-item pulse takes under 5 seconds per block break.
- **Bias banner engagement** (Condition D only) — `bias_banner_dismissed` (bool) + `time_on_banner_ms` (dismiss time); banner requires explicit [×] click before submission; allows analysis of whether participants who read the banner (>3s) showed lower over-reliance than those who dismissed instantly (<500ms)

  > **Why require an explicit dismiss click?** Alert fatigue — dismissing warnings without reading them — is extensively documented in clinical informatics. If the banner auto-hides, we cannot distinguish participants who actually processed the warning from those who ignored it. Requiring a click and logging dwell time lets us operationalise *actual engagement* with the bias warning. This enables a key secondary analysis: does reading the banner (>3s dwell) reduce over-reliance on elderly/AP cases compared to instant dismissal (<500ms)? Without this, Condition D's effect on over-reliance cannot be attributed to the banner rather than to simple exposure.

**Post-study:**
- **Trust change** — Jian trust scale pre vs. post (6 items)
- **Free text** — open qualitative feedback on AI explanations

---

## Measurements Table

| Metric | Conditions | Analysis |
|---|---|---|
| Label accuracy | A, B, C, D | Mixed ANOVA: condition × experience × AI_prior_experience |
| Incidental recall | A, B, C, D | Paired t-test: A vs. best condition |
| Decision time (pre-AI phase only) | A, B, C, D | Wilcoxon signed-rank per condition pair |
| **Decision switch rate** | B, C, D | McNemar test: switch rate per condition pair |
| **Positive switch rate** | B, C, D | % of AI-correct cases where participant followed AI |
| **Negative switch rate (automation bias)** | B, C, D | % of AI-wrong cases where participant followed AI |
| **Over-reliance** | B, C, D | Chi-squared: condition × over-reliance; expertise interaction |
| **Under-reliance** | B, C, D | Chi-squared: condition × under-reliance; expertise interaction |
| **Appropriate reliance (composite)** | B, C, D | Composite score per participant per condition |
| Trust calibration (r) | A, B, C, D | Fisher z-test across conditions |
| Trust trajectory (per-block pulse) | All blocks | Repeated measures: trust item × block × condition |
| XAI faithfulness rating | C, D | % "Correct region" per label category |
| XAI helpfulness ratings | C, D | Frequency table per label |
| NASA-TLX scores | All blocks | Repeated measures ANOVA |
| Trust scale Δ (pre vs. post) | — | Paired t-test |
| Condition D: bias banner engagement | D only | Logistic regression: time_on_banner → over-reliance |
| Condition D: bias banner effect | D only | Compare D vs. C on elderly/AP subgroup cases |
| Baseline accuracy (mini-test) | Pre-study | Covariate in all mixed models |
| AI prior experience | Covariate | Interaction term in all models |

---

## Technology Stack

| Component | Choice | Reason |
|---|---|---|
| Frontend | React + Tailwind (built in Lovable) | Fast to build, professional UI |
| Backend / DB | Supabase | No server needed, real-time, free tier sufficient for ~10 participants |
| XAI generation | Offline (existing scripts) | Avoids runtime latency; maps pre-computed for all 24 cases |
| Analysis | Python (`scripts/analyze_study_results.py`) | Reads Supabase export CSVs, produces thesis figures |

---

## Supabase Schema

### `sessions`
| column | type | notes |
|---|---|---|
| `id` | uuid PK | auto |
| `created_at` | timestamptz | auto |
| `experience_level` | text | |
| `time_budget_min` | int | 10 / 20 / 30 |
| `n_cases` | int | 8 / 16 / 24 |
| `consent` | bool | must be true |
| `ai_usage_freq` | text | `"never"` / `"monthly"` / `"weekly"` / `"daily"` |
| `ai_clinical_prior` | bool | has used AI diagnostic tools before |
| `ai_understanding` | int | self-rated AI understanding 1–5 |
| `baseline_accuracy` | float | fraction correct on 4-case unassisted mini-test |

### `trials`
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid FK → sessions | |
| `case_id` | text | e.g. `"patient35759_study9"` |
| `condition` | text | `"A"` / `"B"` / `"C"` / `"D"` |
| `case_category` | text | `"easy"` / `"hard"` / `"incidental"` / `"ai_wrong"` / `"baseline"` |
| `ground_truth` | jsonb | `{"Cardiomegaly": 1, "Edema": 0, ...}` |
| `ai_preds` | jsonb | `{"Cardiomegaly": 0.42, ...}` |
| `pre_ai_answers` | jsonb | initial response before AI revealed; null for condition A (no two-stage needed) |
| `participant_answers` | jsonb | final response after AI revealed (or only response for condition A) |
| `self_confidence` | int | 0–100 |
| `ai_helpfulness` | int | 0–100, null for condition A |
| `xai_helpful` | text | `"helped"` / `"neutral"` / `"misleading"`, null for A/B |
| `xai_faithful` | text | `"yes"` / `"partially"` / `"no"` / `"unsure"` — was heatmap region correct? null for A/B |
| `xai_view_selected` | text | last overlay tab active on submit, null for A/B |
| `changed_mind_self_report` | bool | did participant self-report changing their answer after seeing AI? |
| `response_time_pre_ms` | int | image → "Lock in" click (pre-AI reading time) |
| `response_time_post_ms` | int | AI revealed → "Submit final" click |
| `bias_banner_dismissed` | bool | did participant click [×] on banner? null for non-D conditions |
| `time_on_banner_ms` | int | time from banner appearance to dismiss click; null for non-D conditions |

### `post_survey`
| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `session_id` | uuid FK | |
| `block_index` | int | 1–4 for NASA-TLX breaks; 0 = pre-study trust; 5 = post-study trust |
| `nasa_mental` | int | 0–20 |
| `nasa_time` | int | 0–20 |
| `nasa_frustration` | int | 0–20 |
| `trust_pulse` | int | 1–7, single item "The AI is reliable" — recorded at blocks 1–4 only; null for pre/post |
| `trust_items` | jsonb | Jian 6-item scores (pre or post study only; null for blocks 1–4) |
| `free_text` | text | optional, post-study only |

---

## Web App Design

### Visual Design Language

- **Theme:** Dark clinical — radiologists read in dark rooms. Not a dashboard.
- **Background:** `#0A0E1A` (near-black navy)
- **Surface cards:** `#111827`
- **Borders:** `#1F2937`, 1px, no shadows
- **Primary:** `#3B82F6` (blue — trust, clinical)
- **Positive finding:** `#10B981` (muted green)
- **Uncertain / warning:** `#F59E0B` (amber)
- **Font:** Inter only (400 / 500 / 600), no decorative fonts
- **Buttons:** flat, `border-radius: 8px`, no gradients, no pill shapes
- **Icons:** Lucide monochrome

### Screen Overview

**Screen 1 — Welcome**
- Logo lockup: `[lung icon] CheXStudy`
- Segmented time selector: `[ 10 min ] [ 20 min ] [ 30 min ]`
- Experience level: vertical radio list with descriptions
- Consent checkbox (required)
- `"Begin Study →"` CTA button

**Screen 2 — Tutorial**
- Two-column: steps left (60%), X-ray viewer right (40%)
- Step 1: 5 label cards with descriptions and prevalence bars
- Step 2: AI confidence bar demo
- Step 3: Grad-CAM + Integrated Gradients static example with annotations
- Extended version for novices: anatomy overview panel (Step 0)

**Screen 3 — Main Trial**
- Top bar: `"Case 4 of 16"` + progress line + optional timer
- Left 60%: X-ray viewer, black background
  - Conditions C/D: overlay toggle bar at bottom — `[ Original ] [ Grad-CAM ] [ Int. Gradients ]`
  - Condition D only: amber bias banner above image
- Right 40%: response panel
  - AI confidence bars (Conditions B/C/D)
  - Checkbox grid for 5 labels
  - Self-confidence slider (0–100)
  - AI helpfulness slider (Conditions B/C/D)
  - XAI helpfulness toggle (Conditions C/D)
  - `"Submit & next →"` (disabled until ≥1 label checked or "No Finding" selected)

**Screen 4 — Between-block break**
- `"End of Block 2 of 4"`
- 3-item NASA-TLX sliders
- `"Continue →"`

**Screen 5 — Debrief**
- Trust in AI scale (6 items, 7-point Likert)
- Free text field
- `"Submit & finish"`
- Confirmation: `"Thank you. Your responses have been saved."`

---

## Condition D — Bias Banner Logic

Based on fairness analysis results (Run 010 test set):

| Condition | Trigger | Banner text |
|---|---|---|
| AP image + age > 65 | Both | `"⚠ AP image · Patient age: [X] · Model performance is ~8% lower for elderly bedside patients"` |
| AP image only | View only | `"⚠ AP (bedside) image · Model performance is ~4% lower for AP vs. PA images"` |
| Age > 80 only | Age only | `"⚠ Patient age: [X] · Model performance is ~5% lower for patients over 80"` |
| PA image + age ≤ 40 | Neither | No banner shown |

Banner style: `background: #292524`, `border-left: 3px solid #F59E0B`, text `#FCD34D`, 13px Inter 400.

---

## Key Expected Takeaways

| Finding | Measurement |
|---|---|
| AI improves incidental finding recall | Condition A vs. B/C/D on incidental cases |
| XAI helps novices more than experts | Condition × experience interaction on accuracy |
| Participants over-rely on AI on AI-wrong cases | Over-reliance index: Condition B > C > D |
| Bias banner reduces over-reliance for elderly/AP cases | Condition D vs. C on that specific subgroup |
| Trust calibration (r) improves with XAI | Condition A/B lower r than C/D |
| Decision time decreases with AI assistance | Condition A slowest |
| Global trust in AI increases post-study | Pre vs. post Jian scale Δ |

---

## Scientific Design Rationale — Summary Table

Quick-reference for the thesis Methods chapter. Each non-obvious design decision with its evidence base.

| Design decision | Why | Key source(s) |
|---|---|---|
| Within-subject, 4 conditions | Maximises power at N=10; eliminates between-person variance | Standard experimental design |
| 4-case baseline mini-test | Replaces self-reported expertise with observed radiology accuracy as a continuous covariate | Dogru & Krämer (2025); Chen et al. (2025) |
| Two-stage response protocol (lock-in before AI reveal) | Makes decision switching observable, not self-reported; prevents anchoring from the start | Fogliato et al. (2022); Rainey et al. (2025); Nourani et al. (2021) |
| 25% AI-wrong cases | Threshold at which users begin to calibrate appropriate distrust; fewer = automation bias invisible | Moray et al. (2000) via Rainey et al. (2025) |
| Three-way reliance taxonomy (over / under / appropriate) | Accuracy conflates two opposite failure modes; XAI can fix one while worsening the other | Nicolson et al. (2025); Dogru & Krämer (2025) |
| Switch direction decomposition (positive vs. negative) | Aggregated switch rate cancels beneficial and harmful influence into a null result | Fogliato et al. (2022) |
| AI experience questionnaire (3 items) | Prior AI experience predicts trust independently of domain expertise; confound must be measured | Choudhury & Shamszare (2026) |
| Per-block trust pulse (1 Jian item) | Captures trust decay trajectory, not just net change; reveals when trust breaks down mid-session | Rainey et al. (2025); Jian et al. (2000) |
| XAI faithfulness rating per trial ("right region?") | GradCAM is spatially coarse; participant perception of heatmap quality is an independent outcome | Saporta et al. (2022); Rainey et al. (2025) |
| XAI tutorial disclosure ("not always the right area") | Ethically required given known limitations; sets realistic expectations | Saporta et al. (2022) |
| Bias banner requires explicit [×] dismiss | Distinguishes real engagement from alert fatigue; dwell time predicts reliance reduction | Alert fatigue literature; Rainey et al. (2025) |
| Condition D banner content derived from own fairness audit | Ecologically valid — values match actual model performance gaps measured on test set | Own ANALYSIS.md (age Δ=0.056, AP/PA Δ=0.043) |
| Self-report switch cross-check | Social desirability check: compares claimed vs. observed switching | Fogliato et al. (2022) |

---

## Implementation Checklist

- [ ] `scripts/prepare_study_cases.py` — select 24 cases, run XAI scripts, write `study/data/cases.json`
- [ ] Supabase project: create tables `sessions`, `trials`, `post_survey`
- [ ] Lovable app: 5 screens, Supabase integration, 4-condition trial logic
- [ ] Latin-square counterbalancing: condition order randomized per session
- [ ] `scripts/analyze_study_results.py` — reads Supabase export, produces thesis figures
- [ ] Pilot test: 1 full session end-to-end, verify all data written to Supabase
- [ ] Recruit participants
- [ ] Run study
- [ ] Analyze results

---

## References

All sources cited in the design of this study. Ordered alphabetically by first author.

**Chen, J., Liao, Q. V., Wortman Vaughan, J., & Tan, C. (2025).** Appropriate reliance on AI for prostate MRI diagnosis: Expertise moderates over-reliance. *arXiv preprint arXiv:2502.03482.* Demonstrates that medical experts and novices differ in reliance behaviour even when using the same AI interface; motivates the expertise x condition interaction as primary analysis and the baseline mini-test as an objective competence measure.

**Choudhury, A., & Shamszare, H. (2026).** Trust in AI-based clinical decision support systems: A systematic review of human factors. *IISE Transactions on Healthcare Systems Engineering.* Systematic review of 47 studies identifying prior AI experience and transparency as the strongest predictors of appropriate trust, independent of domain expertise. Justifies the AI experience questionnaire as a required covariate in all models.

**Dogru, A., & Kramer, N. C. (2025).** Appropriate reliance on AI: The role of domain expertise and self-confidence. *Journal of Decision Systems.* Establishes that self-confidence (not just expertise) moderates over-reliance; motivates the per-trial confidence slider and the baseline mini-test to disentangle competence from confidence.

**Fogliato, R., Chappidi, S., Lungren, M., Fisher, P., Wilson, A., Fitzke, M., ... & Nushi, B. (2022).** Who goes first? Influences of human-AI interaction on lung nodule detection. *ACM Conference on Fairness, Accountability, and Transparency (FAccT 2022).* [136 citations] Seminal demonstration that presenting AI output before human judgment causes anchoring, and that aggregated accuracy hides simultaneous positive and negative switching. Direct basis for the two-stage response protocol and the switch direction decomposition.

**Jian, J.-Y., Bisantz, A. M., & Drury, C. G. (2000).** Foundations for an empirically determined scale of trust in automated systems. *International Journal of Cognitive Ergonomics, 4*(1), 53-71. 6-item trust scale used pre/post study; item 3 ("The system is reliable") used as the per-block trust pulse.

**Moray, N., Inagaki, T., & Itoh, M. (2000).** Adaptive automation, trust, and self-confidence in fault management of time-critical tasks. *Journal of Experimental Psychology: Applied, 6*(3), 199-217. Established approximately 30% automation error rate as the threshold for appropriate distrust calibration. Cited in Rainey et al. (2025); basis for the 25% AI-wrong case ratio.

**Nicolson, A., Dowling, J., & Sheridan, C. (2025).** Beyond accuracy: Measuring appropriate reliance on clinical AI systems. *npj Digital Medicine.* Introduces and validates the three-way reliance taxonomy (over/under/appropriate) in a clinical AI context; shows XAI reduced over-reliance but increased under-reliance in experienced clinicians, a result invisible in accuracy-only analyses.

**Nourani, M., Roy, C., Block, J. E., Honeycutt, E. D., Rahman, T., Ragan, E. D., & Gogate, V. (2021).** Anchoring bias affects mental models of explainable AI systems. *ACM International Conference on Intelligent User Interfaces (IUI 2021).* [129 citations] Demonstrates that seeing AI output first biases subsequent human judgments even when users are told the AI makes errors. Justifies showing the image alone before AI reveal in the two-stage protocol.

**Rainey, C., England, A., Rawlings, D., Jennings, B., McEntee, M. F., & Payne, R. (2025).** Decision switching and automation bias in AI-assisted chest radiograph interpretation: A comparative study of students and qualified radiographers. *PLOS ONE.* Most directly analogous study to this thesis. Uses the two-stage protocol, per-block trust measurement, and automation bias quantification. Key findings: students switched negatively 2x more than radiographers; trust decreased monotonically across session; heatmaps alone initially decreased accuracy before binary score rescued performance.

**Rong, Y., Leemann, T., Nguyen, T.-T., Fiedler, L., Unhelkar, V., Seidel, T., ... & Buettner, R. (2022).** Towards human-centered explainable AI: A survey of user studies for model explanations. *ACM CHI Workshop on Human-Centered XAI.* Chest X-ray XAI user study showing XAI increased trust but not diagnostic accuracy; radiologists agreed with AI on only 46.4% of cases. Motivates measuring trust and accuracy as separate dependent variables.

**Saporta, A., Gui, X., Agrawal, A., Pareek, A., Truong, S. Q. H., Nguyen, C. D. T., ... & Lungren, M. P. (2022).** Benchmarking saliency methods for chest X-ray interpretation. *Nature Machine Intelligence, 4*, 867-878. Systematic evaluation showing GradCAM is spatially coarse and frequently highlights plausible-looking but diagnostically incorrect regions. Basis for the XAI faithfulness rating per trial and the tutorial disclosure that heatmaps are approximations.
