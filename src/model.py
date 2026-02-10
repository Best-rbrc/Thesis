"""Model definitions for CheXpert classification."""

import torch.nn as nn
from torchvision import models


def build_model(cfg: dict) -> nn.Module:
    """Build a classification model from config.

    Replaces the final classifier layer with one that outputs
    `num_classes` logits (one per target pathology).

    Args:
        cfg: Parsed YAML config.

    Returns:
        A PyTorch model ready for training.
    """
    model_cfg = cfg["model"]
    arch = model_cfg["architecture"]
    pretrained = model_cfg["pretrained"]
    num_classes = model_cfg["num_classes"]

    if arch == "densenet121":
        weights = models.DenseNet121_Weights.DEFAULT if pretrained else None
        model = models.densenet121(weights=weights)
        in_features = model.classifier.in_features
        model.classifier = nn.Linear(in_features, num_classes)

    elif arch == "resnet50":
        weights = models.ResNet50_Weights.DEFAULT if pretrained else None
        model = models.resnet50(weights=weights)
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, num_classes)

    else:
        raise ValueError(f"Unsupported architecture: {arch}")

    return model
