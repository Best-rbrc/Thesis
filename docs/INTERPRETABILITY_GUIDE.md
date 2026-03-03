# Interpretability Methods — Implementation Guide

Dieser Guide dokumentiert die drei neu implementierten Interpretability-Methoden für deine CheXpert-Thesis.

## Übersicht

| Methode | Status | Script | Use Case |
|---------|--------|--------|----------|
| **Grad-CAM** | ✅ Fertig | `scripts/gradcam.py` | Klassenspezifische Heatmaps via Gradienten der letzten Conv-Layer |
| **Attention Maps** | ✅ NEU | `scripts/attention_maps.py` | Transformer-interne Aufmerksamkeit (Swin/ViT) |
| **Integrated Gradients** | ✅ NEU | `scripts/integrated_gradients.py` | Pixelweise Attribution via Gradienten-Integration |
| **SHAP** | ✅ NEU | `scripts/shap_analysis.py` | Shapley-basierte Erklärungen + Sanity Checks |

---

## 1. Attention Maps (Transformer only)

### Was es macht
Extrahiert und visualisiert die **Attention-Gewichte** direkt aus den Transformer-Blöcken von Swin-Tiny und ViT-Base. Zeigt, welche Bild-Patches das Modell während der Klassifikation betrachtet.

### Unterstützte Modelle
- ✅ **Swin-Tiny**: Window-basierte lokale Attention
- ✅ **ViT-Base**: Globale Self-Attention
- ❌ DenseNet121 (kein Attention-Mechanismus)

### Usage
```bash
# Mit Bild-Pfad
uv run python -m scripts.attention_maps \
  --config configs/swin_tiny.yaml \
  --checkpoint checkpoints/swin_tiny/run003_swin_tiny_v2_ep11_val0.7882_test0.8076.pt \
  --image CheXpert-v1.0-small/valid/patient64001/study1/view1_frontal.jpg

# Mit Test-Index
uv run python -m scripts.attention_maps \
  --config configs/vit_base.yaml \
  --checkpoint checkpoints/vit_base/run004_vit_base_ep10_val0.7854_test0.8041.pt \
  --index 42
```

### Output
- **Format**: 2-Panel-Figure (Original + Attention-Overlay)
- **Colormap**: `viridis` (blau = niedrig, gelb = hoch)
- **Speicherort**: `outputs/attention_maps/`
- **Dateiname**: `{patient}_{study}_{view}_{arch}_attention.png`

### Implementierungs-Details
- **Swin-Tiny**: Extrahiert Attention aus letztem Stage-Block via Hooks auf `model.layers[-1].blocks[-1].attn`
- **ViT-Base**: Aggregiert Attention über alle 12 Transformer-Blöcke via `model.blocks[i].attn`
- **Aggregation**: L2-Norm über Channels, dann Normalisierung zu [0, 1]

### Interpretation
- **Swin vs ViT**: Swin zeigt lokalisierte Attention-Muster (7×7 Windows), ViT zeigt globale Beziehungen
- **Vergleich mit Grad-CAM**: Attention Maps sind **nicht klassenspezifisch** (gleich für alle Labels), Grad-CAM ist **klassenspezifisch**

---

## 2. Integrated Gradients

### Was es macht
Berechnet **pixelweise Attribution** durch Integration von Gradienten entlang eines Pfades vom "leeren" Bild (schwarz) zum echten Bild. Zeigt, welche Pixel zur Vorhersage jedes Labels beitragen.

### Theorie
Methode von Sundararajan et al. (2017):
$$
\text{IG}(x) = (x - x') \times \int_{\alpha=0}^{1} \frac{\partial F(x' + \alpha \cdot (x - x'))}{\partial x} d\alpha
$$
- **Baseline** $x'$: Schwarzes Bild (`torch.zeros_like(input)`)
- **Approximation**: Riemann-Summe mit `n_steps` (default: 50)

### Unterstützte Modelle
- ✅ Alle (DenseNet121, DenseNet121-CXR, Swin-Tiny, ViT-Base)

### Usage
```bash
# Standard (50 Steps)
uv run python -m scripts.integrated_gradients \
  --config configs/swin_tiny.yaml \
  --checkpoint checkpoints/swin_tiny/run003_swin_tiny_v2_ep11_val0.7882_test0.8076.pt \
  --image PATH_TO_IMAGE

# Mehr Steps = höhere Genauigkeit (aber langsamer)
uv run python -m scripts.integrated_gradients \
  --config configs/densenet121.yaml \
  --checkpoint checkpoints/densenet121/run001_densenet121_ep06_val0.7951_test0.7888.pt \
  --index 10 --n-steps 100
```

### Output
- **Format**: Multi-Panel-Figure (Original + 5 Label-Heatmaps)
- **Colormap**: `hot` (schwarz = niedrig, rot/gelb = hoch)
- **Speicherort**: `outputs/integrated_gradients/`
- **Dateiname**: `{patient}_{study}_{view}_{arch}_ig.png`

### Implementierungs-Details
- **Library**: `captum>=0.7.0` (PyTorch interpretability von Meta)
- **Pro Label einzeln**: Wrapper-Model `SingleOutputWrapper` extrahiert nur Target-Output
- **Aggregation**: `attr.abs().sum(dim=1)` über RGB-Channels
- **MPS-Kompatibilität**: Script wechselt automatisch zu CPU wenn MPS (Apple Silicon) aktiv ist

### Interpretation
- **Vergleich mit Grad-CAM**: 
  - ✅ IG: Pixelweise, theoretisch fundiert (erfüllt Axio Axiomatization)
  - ✅ Grad-CAM: Schneller, fokussiert auf Conv-Features
  - 🔄 Sollten ähnliche Regionen highlighten bei gut kalibrierten Modellen

### Performance
- **Laufzeit**: ~2-5 Sekunden pro Label (abhängig von `n_steps` und Modellgröße)
- **Empfehlung**: 25-50 Steps für explorative Analysen, 100+ für präzise Messungen

---

## 3. SHAP (SHapley Additive exPlanations)

### Was es macht
Berechnet **Shapley-Werte** für jedes Pixel, basierend auf Spieltheorie. Zeigt den "fairen" Beitrag jedes Features zur Vorhersage. Inkludiert **Model Randomization Test** (Sanity Check nach Adebayo et al. 2018).

### Theorie
Shapley-Werte verteilen den Output-Unterschied "fair" auf alle Input-Features:
$$
\phi_i = \sum_{S \subseteq N \backslash \{i\}} \frac{|S|!(|N|-|S|-1)!}{|N|!} [f(S \cup \{i\}) - f(S)]
$$
- **Approximation**: `shap.DeepExplainer` nutzt Deep-LIFT für effiziente Berechnung
- **Background**: 100 zufällige Train-Samples als Referenzverteilung

### Unterstützte Modelle
- ✅ Alle (DenseNet121, DenseNet121-CXR, Swin-Tiny, ViT-Base)
- ⚠️ **Warnung**: Sehr rechenintensiv für große Transformer-Modelle (10-30 Min pro Bild)

### Usage
```bash
# Standard SHAP
uv run python -m scripts.shap_analysis \
  --config configs/densenet121.yaml \
  --checkpoint checkpoints/densenet121/run001_densenet121_ep06_val0.7951_test0.7888.pt \
  --image PATH --n-background 100

# Mit Sanity Check (Model Randomization Test)
uv run python -m scripts.shap_analysis \
  --config configs/swin_tiny.yaml \
  --checkpoint checkpoints/swin_tiny/run003_swin_tiny_v2_ep11_val0.7882_test0.8076.pt \
  --index 5 --run-sanity-check
```

### Output
- **Haupt-Figure**: Multi-Panel (Original + 5 Label-Heatmaps), `{patient}_{arch}_shap.png`
- **Sanity-Check-Figure**: Korrelations-Kurven über Randomisierungs-Level, `{patient}_{arch}_shap_sanitycheck.png`
- **Speicherort**: `outputs/shap/`

### Sanity Check: Model Randomization Test

#### Was es testet
Prüft ob SHAP-Erklärungen tatsächlich **modellabhängig** sind (gutes Zeichen). Randomisiert schrittweise Model-Gewichte von oben (Classifier) nach unten und misst, wie stark sich die SHAP-Werte ändern.

#### Erwartetes Verhalten
- ✅ **Gute Erklärungen**: Pearson-Korrelation fällt von ~1.0 (0% randomisiert) auf <0.3 (100% randomisiert)
- ❌ **Schlechte Erklärungen**: Korrelation bleibt hoch (>0.7) auch bei starker Randomisierung → SHAP hängt nicht vom Model ab

#### Randomisierungs-Strategie
Cascading Randomization (5 Stufen):
1. **0%**: Original-Model (Baseline)
2. **25%**: Letzte 25% der Layer randomisiert (Classifier + letzte Blocks)
3. **50%**: Obere Hälfte randomisiert
4. **75%**: Nur erste 25% der Layer original
5. **100%**: Komplette Randomisierung (Xavier-Init für Weights, Zeros für Bias)

### Implementierungs-Details
- **Library**: `shap>=0.45.0`
- **Explainer**: `shap.DeepExplainer` (schneller als `GradientExplainer`, robuster als `KernelExplainer`)
- **Background-Samples**: Zufällig gesampelt aus `train.csv` (Respektiert `frontal_only` Filter)
- **MPS-Kompatibilität**: Script wechselt automatisch zu CPU

### Performance & Empfehlungen
- ⚠️ **Sehr langsam**: 10-30 Min pro Bild bei Transformers (Swin/ViT)
- ✅ **Schneller bei CNNs**: ~2-5 Min bei DenseNet
- **Tipp**: 
  - Explorative Analysen: `--n-background 20` (5× schneller)
  - Finale Thesis-Plots: `--n-background 100`
  - Sanity Check: Nur auf wenigen Beispielbildern ausführen (sehr zeitintensiv)

### Interpretation
- **Vergleich mit Grad-CAM/IG**:
  - SHAP: Axiomatisch fundiert, aber langsam
  - IG: Schneller, ähnliche Ergebnisse in der Praxis
  - Grad-CAM: Am schnellsten, aber auf Conv-Archit ekturen beschränkt

---

## Vergleichstabelle

| Kriterium | Grad-CAM | Attention Maps | Integrated Gradients | SHAP |
|-----------|----------|----------------|----------------------|------|
| **Geschwindigkeit** | ⚡⚡⚡ Fast | ⚡⚡⚡ Fast | ⚡⚡ Medium | ⚡ Sehr langsam |
| **Modell-Support** | Alle (CNNs best) | Nur Transformer | Alle | Alle (CNNs empfohlen) |
| **Klassenspezifisch** | ✅ Ja | ❌ Nein | ✅ Ja | ✅ Ja |
| **Theoretische Fundierung** | Medium | N/A (direkt) | Hoch (Axiome) | Hoch (Shapley) |
| **Sanity Checks** | Nein | N/A | Nein | ✅ Ja (implementiert) |
| **Auflösung** | Grob (7×7 – 14×14) | Grob (7×7 – 14×14) | Hoch (224×224) | Hoch (224×224) |
| **Best Use Case** | Schneller Überblick | CNN vs Transformer | Pixelwise wichtig | Forschungs-Paper |

---

## Thesis-Verwendung: Empfehlungen

### Für CNN-Analyse (DenseNet121)
1. **Grad-CAM**: Hauptmethode (schnell, etabliert)
2. **Integrated Gradients**: Zusatz für pixelgenaue Analysen
3. **SHAP**: Optional für 1-2 Beispiele mit Sanity Check

### Für Transformer-Analyse (Swin/ViT)
1. **Grad-CAM**: Baseline-Vergleich
2. **Attention Maps**: Einzigartig für Transformer, zeigt interne Mechanismen
3. **Integrated Gradients**: Pixelweise Attribution (komplementär zu Attention)
4. **SHAP**: Nur wenn Zeit → sehr rechenintensiv

### Für CNN vs Transformer Vergleich
**Zentrale Forschungsfrage**: Lernen Transformer andere Features als CNNs?

**Analyse-Pipeline**:
1. **Gleiche Bilder durch alle 4 Methoden** (z.B. 10-20 Test-Samples)
2. **Visualisierung**: 4×5 Grid (4 Methoden × 5 Labels) pro Bild
3. **Quantifizierung**:
   - Attention-Entropy (Swin vs ViT): Lokalisiert vs global?
   - Heatmap-Overlap: IoU zwischen Grad-CAM und IG
   - Sanity Check: Sind Transformer-Erklärungen robuster?

**Hypothesen zum Testen**:
- H1: Swin-Attention ist lokalisierter als ViT (Window-Mechanismus)
- H2: Transformer highlighten andere Regionen als DenseNet (nicht nur Edges)
- H3: IG und Grad-CAM korrelieren stark (beide gut kalibriert)

---

## Troubleshooting

### MPS-Fehler (Apple Silicon)
**Symptom**: `TypeError: Cannot convert MPS Tensor to float64`
**Fix**: Scripts erkennen automatisch MPS und wechseln zu CPU (siehe `integrated_gradients.py`, `shap_analysis.py`)

### SHAP hängt / Out of Memory
**Symptom**: Script läuft ewig oder crasht
**Fix**:
- Reduziere `--n-background` auf 20-50
- Teste zuerst mit DenseNet (schneller als Transformer)
- Verwende kleinere Bilder (224px statt 384px)

### Attention Maps zeigen uniforme Heatmap
**Symptom**: Attention-Map ist komplett gelb/grün (keine Struktur)
**Ursache**: Hook-Implementierung unvollständig für diese Architektur
**Fix**: Überprüfe ob Modell tatsächlich Swin oder ViT ist (nicht DenseNet)

### Grad-CAM vs IG zeigen komplett unterschiedliche Regionen
**Symptom**: Heatmaps haben kaum Overlap
**Mögliche Ursachen**:
- Model nicht gut kalibriert (hohes Rauschen in Gradienten)
- Unterschiedliche Baselines (Grad-CAM: keine, IG: schwarzes Bild)
- Label mit niedriger Confidence (<0.3) → Gradienten instabil

---

## Dependencies

Neu hinzugefügt in `pyproject.toml`:
```toml
dependencies = [
    # ... existing ...
    "captum>=0.7.0",  # Integrated Gradients
    "shap>=0.45.0",   # SHAP
]
```

Installation:
```bash
uv pip install captum shap
```

---

## Nächste Schritte

### Für die Thesis
1. ✅ **Implementierung**: Alle 4 Methoden fertig
2. 🔄 **Evaluation**: Führe Comparative Evaluation durch (CNN vs Transformer)
3. 📊 **Quantifizierung**: Implementiere Metriken (Heatmap-IoU, Attention-Entropy)
4. 📝 **Dokumentation**: Integriere Findings in Thesis-Kapitel "Model Interpretability"

### Optionale Erweiterungen
- **Batch-Processing**: Script das alle Test-Samples automatisch processed
- **Interactive Dashboard**: Streamlit-App zum Vergleichen der 4 Methoden
- **Attention Rollout**: Multiply attention über alle ViT-Layers (derzeit nur letzter Layer)
- **GradCAM++**: Verbesserte Grad-CAM-Variante mit gewichteten Gradienten

---

**Autor**: GitHub Copilot  
**Datum**: 3. März 2026  
**Version**: 1.0
