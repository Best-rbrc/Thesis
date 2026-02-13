# Exposé

**Explainable Vision Transformers for Radiology: Comparing Human and AI Detection of Primary and Incidental Findings in Chest X-Rays**

*Quelle: Exposé.pdf*

---

## Introduction

Artificial intelligence (AI) is increasingly applied in medicine, both in clinical research and medical education. Radiology, in particular, offers great potential for AI assistance: chest X-rays are a key diagnostic tool but require high expertise and constant attention. Even experienced radiologists may miss relevant findings under time pressure.

Traditionally, the clinical focus lies on the primary finding (e.g., pneumonia). Yet incidental findings (e.g., cardiomegaly, pleural effusion, tumor suspicion) are often equally critical but frequently overlooked. An AI system could provide a double safety net - improving accuracy for primary findings while highlighting incidental ones. This dual role requires models that are not only accurate but also interpretable and trustworthy for medical users. For such systems to be adopted in clinical or educational settings, their results must be reliable, explainable, and transparent regarding uncertainty and bias.

While convolutional neural networks (CNNs) remain the dominant standard in chest X-ray analysis, Vision Transformers (ViTs) have recently emerged as a promising alternative. Through their global self-attention mechanisms, Vision Transformers can relate features across the entire image, going beyond the local receptive fields of CNNs. Despite this potential, they are still underexplored in radiology - particularly concerning explainability and human-AI collaboration.

This thesis explores how explainable AI can support the detection of both primary and incidental findings in chest X-rays, how its diagnostic performance compares to that of medical students, and how explainability and uncertainty communication influence trust and collaboration between humans and AI.

---

## Research Questions

1. **Performance:** Can an AI improve detection of primary and incidental findings compared to medical students?
2. **Explainability:** Do visual explanations (e.g., Grad-CAM, SHAP, Attention Maps) enhance trust and usability compared to "black-box" AI?
3. **Uncertainty & Trust:** Does improving the calibration of the model's confidence scores (e.g., via temperature scaling) help users judge when to trust the AI's predictions?
4. **Fairness:** Does performance differ across subgroups (e.g., sex, age, device), and can such biases be made transparent?
5. **Human-AI Collaboration:** Which setting achieves the best balance of accuracy, recall, efficiency, and trust?
   - Human alone
   - AI alone
   - Human + AI (without XAI)
   - Human + AI (with XAI)

---

## Methodology

### Data

Public chest X-ray datasets (e.g. CheXpert subset [Irvin et al., 2019], ChestMNIST, MIMIC-CXR) will be explored; the final choice will depend on label availability and licensing.

### Model

Transfer learning with Vision Transformers (e.g. ViT-B/16 [Dosovitskiy et al., 2020], Swin Transformer [Liu et al., 2021]), pretrained on ImageNet and fine-tuned on the chest X-ray datasets. Evaluation will be based on AUROC and F1-score per label. Model calibration will be performed using temperature scaling [Guo et al., 2017] or Monte Carlo dropout.

### Explainability

Grad-CAM [Selvaraju et al., 2017], Integrated Gradients, SHAP with sanity checks, and Attention Maps for Transformer-based models; integration in prototype (Tjoa & Guan, 2020).

### Small User Study

Around 10 medical students/doctors, within-subject design across 4 conditions. Metrics: accuracy, recall for incidental findings, trust, decision time.

---

## Expected Results

- AI is expected to achieve higher sensitivity for primary findings and to detect more incidental findings compared to medical students.
- Explainability is hypothesized to increase trust and perceived usefulness.
- Uncertainty calibration improves trust alignment.
- Bias analysis reveals subgroup differences transparently.
- Human + AI with XAI provides the most effective collaboration.

---

## Contribution

- **Technical:** Development of an explainable, calibrated multi-label AI prototype.
- **Empirical:** Systematic comparison of human vs. AI diagnostic performance.
- **Societal:** Supports responsible integration of AI into medical education and clinical practice - not as a replacement, but as a complement to human expertise.

---

## References

- Aburass, S., Dorgham, O., Al Shaqsi, J., Abu Rumman, M., & Al-Kadi, O. (2025). Vision Transformers in medical imaging: A comprehensive review of advancements and applications across multiple diseases. *Journal of Imaging Informatics in Medicine*. https://doi.org/10.1007/s10278-025-01481-y
- Cirillo, D., Catuara-Solarz, S., Morey, C., Guney, E., Subirats, L., Mellino, S., … & Valencia, A. (2020). Sex and gender differences and biases in artificial intelligence for biomedicine and healthcare. *npj Digital Medicine*, 3(1), 81. https://doi.org/10.1038/s41746-020-0288-5
- Dosovitskiy, A., Beyer, L., Kolesnikov, A., Weissenborn, D., Zhai, X., Unterthiner, T., … & Houlsby, N. (2020). An image is worth 16x16 words: Transformers for image recognition at scale. *International Conference on Learning Representations (ICLR)*. https://arxiv.org/abs/2010.11929
- Guo, C., Pleiss, G., Sun, Y., & Weinberger, K. Q. (2017). On calibration of modern neural networks. *Proceedings of the 34th International Conference on Machine Learning (ICML)*, 1321–1330. https://arxiv.org/abs/1706.04599
- Irvin, J., Rajpurkar, P., Ko, M., Yu, Y., Ciurea-Ilcus, S., Chute, C., … & Ng, A. Y. (2019). CheXpert: A large chest radiograph dataset with uncertainty labels and expert comparison. *Proceedings of the AAAI Conference on Artificial Intelligence (AAAI)*, 33(01), 590–597. https://doi.org/10.48550/arXiv.1901.07031
- Oakden-Rayner, L. (2023). Exploring the chest x-ray screening potential of artificial intelligence: A clinical perspective. *Current Radiology Reports*, 11, 192–199. https://doi.org/10.1007/s13665-023-00334-9
- Liu, Z., Lin, Y., Cao, Y., Hu, H., Wei, Y., Zhang, Z., … & Guo, B. (2021). Swin Transformer: Hierarchical vision transformer using shifted windows. *Proceedings of the IEEE/CVF International Conference on Computer Vision (ICCV)*, 10012–10022. https://arxiv.org/abs/2103.14030
- Rajpurkar, P., Irvin, J., Zhu, K., Yang, B., Mehta, H., Duan, T., … & Ng, A. Y. (2017). CheXNet: Radiologist-level pneumonia detection on chest X-rays with deep learning. *arXiv preprint*. https://doi.org/10.48550/arXiv.1711.05225
- Selvaraju, R. R., Cogswell, M., Das, A., Vedantam, R., Parikh, D., & Batra, D. (2017). Grad-CAM: Visual explanations from deep networks via gradient-based localization. *Proceedings of the IEEE International Conference on Computer Vision (ICCV)*, 618–626. https://arxiv.org/abs/1610.02391
- Tjoa, E., & Guan, C. (2020). A survey on explainable artificial intelligence (XAI): Toward medical XAI. *IEEE Transactions on Neural Networks and Learning Systems*, 32(11), 4793–4813. https://doi.org/10.1109/TNNLS.2020.3027314
