

# Add Note: Model Shows Where It Looks, Not What It Outputs

## What
Add a clarifying note in two places:
1. **Consent Screen** — in the "Purpose & Procedure" section, add a sentence explaining that participants will see where the model focuses (heatmaps) but not the model's raw output/predictions in the explanation view.
2. **Tutorial Screen Step 4** (Heatmaps & Warnings) — add a note clarifying the distinction: heatmaps show *where* the model looks, not *what* the model predicts.

## Changes

### `src/screens/ConsentScreen.tsx`
- In the "Purpose & Procedure" section (lines 55–57), append a sentence in both EN and DE:
  - EN: "In some conditions, you will see heatmaps highlighting where the AI model focuses its attention — these show where the model looks, not what it predicts."
  - DE: "In einigen Bedingungen sehen Sie Heatmaps, die zeigen, worauf das KI-Modell seine Aufmerksamkeit richtet — diese zeigen, wo das Modell hinschaut, nicht was es vorhersagt."

### `src/context/StudyContext.tsx`
- Update the `tutorial.step4.heatmap.desc` translation to include the clarification that heatmaps show where the model looks, not what it outputs.

### `src/screens/TutorialScreen.tsx`
- No structural changes needed — the updated translation string will flow through automatically.

## Scope
2 files modified, ~4 lines changed total.

