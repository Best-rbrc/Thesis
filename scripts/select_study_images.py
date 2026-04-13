"""
Select candidate CheXpert images for the user study.
Finds images matching required pathology patterns, runs Run 014 model
inference to get real 6-label predictions.
"""
import argparse, os, yaml, torch
import pandas as pd
import numpy as np
from pathlib import Path

LABELS_6 = ["Cardiomegaly", "Edema", "Consolidation", "Atelectasis",
            "Pleural Effusion", "Pneumothorax"]
SLUG = {l: l.lower().replace(" ", "_") for l in LABELS_6}


def query_candidates(csv_path):
    df = pd.read_csv(csv_path)
    df = df[df["Frontal/Lateral"] == "Frontal"].copy()
    results = {}

    for label in LABELS_6:
        others = [l for l in LABELS_6 if l != label]
        mask = (df[label] == 1.0)
        for o in others:
            mask &= (df[o] != 1.0)
        cands = df[mask].copy()
        cands["_n_uncertain"] = sum((cands[o] == -1.0).astype(int) for o in others)
        cands = cands.sort_values("_n_uncertain").head(20)
        results[f"easy_{SLUG[label]}"] = cands

    pos_counts = sum((df[l] == 1.0).astype(int) for l in LABELS_6)
    mask_hard = (pos_counts >= 2) & (df["Pneumothorax"] != 1.0)
    cands_hard = df[mask_hard].copy()
    cands_hard["_n_pos"] = pos_counts[mask_hard]
    cands_hard = cands_hard.sort_values("_n_pos", ascending=False).head(50)
    results["hard_multi"] = cands_hard

    mask_ptx = (df["Pneumothorax"] == 1.0)
    other_pos = sum((df[l] == 1.0).astype(int) for l in LABELS_6 if l != "Pneumothorax")
    mask_inc = mask_ptx & (other_pos >= 1)
    cands_inc = df[mask_inc].copy()
    cands_inc["_n_pos"] = other_pos[mask_inc] + 1
    cands_inc = cands_inc.sort_values("_n_pos", ascending=False).head(50)
    results["incidental_ptx"] = cands_inc

    mask_norm = (df["No Finding"] == 1.0)
    results["normal"] = df[mask_norm].head(20)

    print("\n=== Candidate counts ===")
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
    parser.add_argument("--top-n", type=int, default=5)
    args = parser.parse_args()

    with open(args.config) as f:
        cfg = yaml.safe_load(f)

    train_csv = cfg["data"].get("train_csv", "")
    if not os.path.exists(train_csv):
        train_csv = os.path.join(cfg["data"]["data_dir"], "train.csv")

    print(f"Searching: {train_csv}")
    results = query_candidates(train_csv)

    all_paths = []
    candidate_info = []
    categories_to_check = {
        "easy_cardiomegaly": 3, "easy_edema": 3, "easy_consolidation": 3,
        "easy_pleural_effusion": 3, "easy_pneumothorax": 2,
        "hard_multi": 8, "incidental_ptx": 10, "normal": 5,
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

    seen = set()
    unique_paths, unique_info = [], []
    for p, info in zip(all_paths, candidate_info):
        if p not in seen:
            seen.add(p)
            unique_paths.append(p)
            unique_info.append(info)

    print(f"\nRunning inference on {len(unique_paths)} unique images...")
    preds = run_inference(unique_paths, args.config, args.checkpoint)

    print("\n" + "=" * 100)
    print("  CANDIDATE IMAGES FOR USER STUDY")
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


if __name__ == "__main__":
    main()
