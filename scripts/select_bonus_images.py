"""
Select 5 NEW candidate CheXpert images for the bonus round.
Excludes all patients already used in the main study, then finds candidates
across categories: easy, hard, incidental, and ai_wrong (normal).
Runs Run 014 model inference to get real 6-label predictions.
"""
import argparse, os, yaml, torch
import pandas as pd
import numpy as np
from pathlib import Path

LABELS_6 = ["Cardiomegaly", "Edema", "Consolidation", "Atelectasis",
            "Pleural Effusion", "Pneumothorax"]
SLUG = {l: l.lower().replace(" ", "_") for l in LABELS_6}

# All patients already used in the main study (baseline + FIXED_10/15/20 + attention check)
USED_PATIENTS = {
    "patient21795",  # baseline + attention check
    "patient37124",  # fx-01
    "patient00008",  # fx-02
    "patient59546",  # fx-03
    "patient31804",  # fx-04
    "patient05319",  # fx-05
    "patient36698",  # fx-06
    "patient34852",  # fx-07
    "patient38933",  # fx-08
    "patient00001",  # fx-09
    "patient00004",  # fx-10
    "patient49165",  # fx-11
    "patient48367",  # fx-12
    "patient32710",  # fx-13
    "patient25296",  # fx-14
    "patient04050",  # fx-16
    "patient28936",  # fx-17
    "patient05067",  # fx-18
    "patient37577",  # fx-19
    "patient00005",  # fx-20
}


def extract_patient_id(path):
    """Extract 'patientXXXXX' from a CheXpert path."""
    for part in Path(path).parts:
        if part.startswith("patient"):
            return part
    return None


def query_candidates(csv_path):
    df = pd.read_csv(csv_path)
    df = df[df["Frontal/Lateral"] == "Frontal"].copy()

    # Exclude already-used patients
    df["_patient"] = df["Path"].apply(extract_patient_id)
    before = len(df)
    df = df[~df["_patient"].isin(USED_PATIENTS)].copy()
    print(f"Excluded {before - len(df)} rows from {len(USED_PATIENTS)} used patients. {len(df)} candidates remain.")

    results = {}

    # EASY: single dominant finding (one label = 1.0, others != 1.0)
    for label in LABELS_6:
        if label == "Pneumothorax":
            continue  # skip ptx for easy category
        others = [l for l in LABELS_6 if l != label]
        mask = (df[label] == 1.0)
        for o in others:
            mask &= (df[o] != 1.0)
        cands = df[mask].copy()
        cands["_n_uncertain"] = sum((cands[o] == -1.0).astype(int) for o in others)
        cands = cands.sort_values("_n_uncertain").head(15)
        results[f"easy_{SLUG[label]}"] = cands

    # HARD: multiple findings, no pneumothorax
    pos_counts = sum((df[l] == 1.0).astype(int) for l in LABELS_6)
    mask_hard = (pos_counts >= 3) & (df["Pneumothorax"] != 1.0)
    cands_hard = df[mask_hard].copy()
    cands_hard["_n_pos"] = pos_counts[mask_hard]
    cands_hard = cands_hard.sort_values("_n_pos", ascending=False).head(30)
    results["hard_multi"] = cands_hard

    # INCIDENTAL: pneumothorax + at least 1 other positive
    mask_ptx = (df["Pneumothorax"] == 1.0)
    other_pos = sum((df[l] == 1.0).astype(int) for l in LABELS_6 if l != "Pneumothorax")
    mask_inc = mask_ptx & (other_pos >= 1)
    cands_inc = df[mask_inc].copy()
    cands_inc["_n_pos"] = other_pos[mask_inc] + 1
    cands_inc = cands_inc.sort_values("_n_pos", ascending=False).head(30)
    results["incidental_ptx"] = cands_inc

    # NORMAL: No Finding = 1.0
    mask_norm = (df["No Finding"] == 1.0)
    results["normal"] = df[mask_norm].head(15)

    print("\n=== Candidate counts (after exclusions) ===")
    for k, v in results.items():
        print(f"  {k}: {len(v)} candidates")
    return results


def run_inference(image_paths, config_path, checkpoint_path):
    from src.utils import load_config
    from src.model import build_model
    from src.dataset import get_valid_transforms, get_cxr_valid_transforms
    from PIL import Image

    cfg = load_config(config_path)
    cfg["model"]["pretrained"] = False
    model = build_model(cfg)
    ckpt = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    model.load_state_dict(ckpt["model_state_dict"])
    model.eval()

    is_cxr = cfg["data"].get("cxr_pretrained", False)
    img_size = cfg["data"].get("image_size", 224)
    transform = get_cxr_valid_transforms(img_size) if is_cxr else get_valid_transforms(img_size)

    all_preds = {}
    for p in image_paths:
        img = Image.open(p).convert("RGB")
        tensor = transform(img).unsqueeze(0)
        with torch.no_grad():
            logits = model(tensor)
            probs = torch.sigmoid(logits).cpu().numpy()[0]
        all_preds[p] = {LABELS_6[i]: float(probs[i]) for i in range(len(LABELS_6))}
    return all_preds


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--checkpoint", required=True)
    parser.add_argument("--top-n", type=int, default=5,
                        help="Top N per category to run inference on")
    args = parser.parse_args()

    with open(args.config) as f:
        cfg = yaml.safe_load(f)

    train_csv = cfg["data"].get("train_csv", "")
    if not os.path.exists(train_csv):
        train_csv = os.path.join(cfg["data"]["data_dir"], "train.csv")

    print(f"Searching: {train_csv}")
    results = query_candidates(train_csv)

    # Collect top candidates per category for inference
    all_paths = []
    candidate_info = []
    categories_to_check = {
        "easy_cardiomegaly": 3,
        "easy_edema": 3,
        "easy_consolidation": 3,
        "easy_pleural_effusion": 3,
        "hard_multi": 8,
        "incidental_ptx": 8,
        "normal": 5,
    }

    for cat, n in categories_to_check.items():
        if cat not in results or len(results[cat]) == 0:
            print(f"  SKIP {cat}: no candidates")
            continue
        subset = results[cat].head(n)
        for _, row in subset.iterrows():
            path = row["Path"]
            if not os.path.isabs(path):
                path = os.path.join(os.getcwd(), path)
            if os.path.exists(path):
                all_paths.append(path)
                gt = {l: row.get(l, float("nan")) for l in LABELS_6}
                candidate_info.append({
                    "path": path, "category": cat,
                    "sex": row.get("Sex", "?"), "age": row.get("Age", "?"),
                    "ap_pa": row.get("AP/PA", "?"), "ground_truth": gt,
                })

    # Deduplicate
    seen = set()
    unique_paths, unique_info = [], []
    for p, info in zip(all_paths, candidate_info):
        if p not in seen:
            seen.add(p)
            unique_paths.append(p)
            unique_info.append(info)

    print(f"\nRunning inference on {len(unique_paths)} unique images...")
    preds = run_inference(unique_paths, args.config, args.checkpoint)

    # Print results grouped by category
    print("\n" + "=" * 100)
    print("  BONUS ROUND CANDIDATE IMAGES (patients NOT in main study)")
    print("=" * 100)

    by_cat = {}
    for info in unique_info:
        cat = info["category"]
        by_cat.setdefault(cat, []).append(info)

    for cat in sorted(by_cat.keys()):
        print(f"\n--- {cat.upper()} ---")
        for info in by_cat[cat]:
            p = info["path"]
            pred = preds.get(p, {})
            gt = info["ground_truth"]
            parts = Path(p).parts
            patient = [x for x in parts if x.startswith("patient")]
            patient_str = patient[0] if patient else "?"
            study = [x for x in parts if x.startswith("study")]
            study_str = study[0] if study else "?"
            gt_pos = [SLUG[l] for l in LABELS_6 if gt.get(l) == 1.0]
            gt_unc = [SLUG[l] for l in LABELS_6 if gt.get(l) == -1.0]

            # Score: how "good" is this candidate?
            # For easy: dominant finding should be >70%, others <50%
            # For hard: multiple findings >50%
            # For incidental: ptx should have a prediction
            # For normal: all predictions should be moderate (some FP potential)

            print(f"\n  {patient_str}/{study_str} ({info['sex']}, {info['age']}, {info['ap_pa']})")
            print(f"    GT positive: {', '.join(gt_pos) if gt_pos else 'none'}")
            if gt_unc:
                print(f"    GT uncertain: {', '.join(gt_unc)}")
            print(f"    Model predictions:")
            for l in LABELS_6:
                conf = pred.get(l, 0) * 100
                gt_val = gt.get(l, float("nan"))
                marker = ""
                if gt_val == 1.0 and conf < 50:
                    marker = " <-- MISS"
                elif gt_val == 0.0 and conf > 50:
                    marker = " <-- FALSE POS"
                print(f"      {SLUG[l]:20s}: {conf:5.1f}%{marker}")

    print("\n" + "=" * 100)
    print("  RECOMMENDATION: Pick 5 cases for bonus round")
    print("  Target mix: 1 easy, 1 hard, 1 incidental, 1 ai_wrong, 1 easy/hard")
    print("  Each bonus case gets a fixed condition (A, B, C, D, E)")
    print("=" * 100)


if __name__ == "__main__":
    main()
