"""
Feature label mappings — translates PyRadiomics key names into
clinician-readable labels with clinical significance notes.
"""

# Map from radiomics key → (human label, clinical significance)
FEATURE_LABELS: dict[str, tuple[str, str]] = {
    # Shape features
    "shape_Elongation": (
        "Tumor Shape Irregularity",
        "Higher values indicate irregular, non-spherical tumor shape.",
    ),
    "shape_Sphericity": (
        "Tumor Sphericity",
        "Lower values suggest irregular morphology, associated with aggressiveness.",
    ),
    "shape_SurfaceVolumeRatio": (
        "Surface-to-Volume Ratio",
        "High ratio may indicate diffuse infiltration.",
    ),
    "shape_MeshVolume": (
        "Tumor Mesh Volume",
        "3D volume estimate from surface mesh.",
    ),
    "shape_Maximum3DDiameter": (
        "Maximum Tumor Diameter (3D)",
        "Largest 3D extent of the tumor in mm.",
    ),

    # First-order statistics
    "firstorder_Entropy": (
        "Tumor Heterogeneity (Entropy)",
        "Higher entropy = greater internal complexity. Associated with aggressiveness.",
    ),
    "firstorder_Kurtosis": (
        "Signal Intensity Outliers (Kurtosis)",
        "High kurtosis = heavy tails in intensity distribution.",
    ),
    "firstorder_Skewness": (
        "Intensity Asymmetry (Skewness)",
        "Positive skew = longer tail toward high intensities.",
    ),
    "firstorder_Energy": (
        "Signal Energy",
        "Total imaging signal within the tumor region.",
    ),
    "firstorder_Mean": (
        "Mean Tumor Intensity",
        "Average pixel intensity inside tumor mask.",
    ),
    "firstorder_Std": (
        "Intensity Standard Deviation",
        "Spread of intensity values inside tumor.",
    ),

    # GLCM texture features
    "glcm_Contrast": (
        "Texture Aggressiveness (Contrast)",
        "High contrast = sharp intensity transitions, often seen in aggressive tumors.",
    ),
    "glcm_Correlation": (
        "Texture Pattern Regularity",
        "Higher correlation = more regular texture patterns.",
    ),
    "glcm_Dissimilarity": (
        "Tissue Heterogeneity",
        "Higher dissimilarity = more diverse texture (heterogeneous tumor).",
    ),
    "glcm_Entropy": (
        "Textural Complexity",
        "Higher = more disorganized internal structure.",
    ),
    "glcm_Homogeneity": (
        "Tissue Uniformity",
        "Lower homogeneity suggests necrotic or infiltrated zones.",
    ),
}

# Short interpretation thresholds (simplified, not clinically validated)
THRESHOLDS = {
    "shape_Sphericity": {"low": (0.0, 0.5, "Irregular — possible infiltration"), "high": (0.5, 1.0, "Regular shape")},
    "firstorder_Entropy": {"low": (0.0, 4.0, "Low heterogeneity"), "high": (4.0, 10.0, "High heterogeneity — aggressive")},
    "glcm_Contrast": {"low": (0.0, 100.0, "Smooth texture"), "high": (100.0, 999.0, "High contrast — aggressive")},
}


def get_label(feature_key: str) -> str:
    """Return human-readable label for a radiomics feature key."""
    entry = FEATURE_LABELS.get(feature_key)
    if entry:
        return entry[0]
    return feature_key.replace("_", " ").title()


def get_clinical_note(feature_key: str) -> str:
    """Return clinical significance note for a feature."""
    entry = FEATURE_LABELS.get(feature_key)
    if entry:
        return entry[1]
    return "No clinical interpretation available."


def interpret_features(features: dict) -> list[dict]:
    """
    Return a list of interpreted feature dicts for the frontend panel.

    Args:
        features: Raw radiomic feature dict {key: float}

    Returns:
        List of {key, label, value, note}
    """
    results = []
    for key, val in features.items():
        if not isinstance(val, (int, float)):
            continue
        results.append({
            "key": key,
            "label": get_label(key),
            "value": round(float(val), 4),
            "note": get_clinical_note(key),
        })
    return sorted(results, key=lambda x: x["label"])
