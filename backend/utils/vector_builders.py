"""
Vector Builders — Converts clinical/genomic dictionaries into feature vectors
used by the fusion engine.
"""
import numpy as np


def build_clinical_vector(data: dict, length: int = 10) -> list[float]:
    """
    Build a normalized clinical feature vector.

    Supported keys:
        age, kps, tumor_grade, prior_treatments, performance_status,
        idh_mutation, mgmt_methylation, egfr_amplification, tp53_mutation,
        recurrent
    """
    raw = [
        # Normalize to [0, 1] ranges
        min(float(data.get("age", 50)) / 100.0, 1.0),
        min(float(data.get("kps", 70)) / 100.0, 1.0),
        float(data.get("tumor_grade", 2)) / 4.0,
        min(float(data.get("prior_treatments", 0)) / 5.0, 1.0),
        min(float(data.get("performance_status", 1)) / 4.0, 1.0),
        float(bool(data.get("idh_mutation", False))),
        float(bool(data.get("mgmt_methylation", False))),
        float(bool(data.get("egfr_amplification", False))),
        float(bool(data.get("tp53_mutation", False))),
        float(bool(data.get("recurrent", False))),
    ]

    # Pad or truncate to target length
    if len(raw) >= length:
        return raw[:length]
    return raw + [0.0] * (length - len(raw))


def build_genomic_vector(data: dict, length: int = 10) -> list[float]:
    """
    Build a genomic mutation feature vector.

    Supported keys:
        idh1, idh2, mgmt, egfr, tp53, pten, cdkn2a, rb1, nf1, tert
    """
    raw = [
        float(bool(data.get("idh1", data.get("idh", False)))),
        float(bool(data.get("idh2", False))),
        float(bool(data.get("mgmt", False))),
        float(bool(data.get("egfr", False))),
        float(bool(data.get("tp53", False))),
        float(bool(data.get("pten", False))),
        float(bool(data.get("cdkn2a", False))),
        float(bool(data.get("rb1", False))),
        float(bool(data.get("nf1", False))),
        float(bool(data.get("tert", False))),
    ]

    if len(raw) >= length:
        return raw[:length]
    return raw + [0.0] * (length - len(raw))


def build_radiomics_vector(features: dict, length: int = 100) -> list[float]:
    """
    Convert a radiomics feature dict to a fixed-length vector.
    Sorts keys for reproducible ordering.
    """
    sorted_vals = [float(v) for k, v in sorted(features.items())
                   if isinstance(v, (int, float))]

    if len(sorted_vals) >= length:
        return sorted_vals[:length]

    # Pad with zeros
    return sorted_vals + [0.0] * (length - len(sorted_vals))
