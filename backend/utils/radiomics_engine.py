"""
Radiomics Feature Extraction Engine
Uses PyRadiomics to compute quantitative tumor biomarkers from MRI + mask.
Falls back to synthetic mock features when PyRadiomics is not installed.
"""
import numpy as np
import tempfile
import logging
import os

logger = logging.getLogger(__name__)


class RadiomicsEngine:
    """
    Extracts radiomic features including:
    - Shape features (elongation, sphericity, surface area)
    - First-order statistics (entropy, kurtosis, energy)
    - GLCM texture features (contrast, correlation, dissimilarity)
    - GLRLM run-length features
    """

    def __init__(self):
        self._available = self._check_pyradiomics()
        self._extractor = self._init_extractor() if self._available else None
        # If extractor init returned None despite pyradiomics being importable,
        # disable real extraction so mock is used instead.
        if self._extractor is None:
            self._available = False

    @staticmethod
    def _check_pyradiomics() -> bool:
        try:
            import radiomics  # noqa
            return True
        except ImportError:
            logger.warning(
                "PyRadiomics not installed — using synthetic mock features. "
                "Install with: pip install pyradiomics"
            )
            return False

    @staticmethod
    def _init_extractor():
        """
        Initialise PyRadiomics extractor with shape + first-order + select GLCM features.
        Compatible with PyRadiomics 3.x (enableFeatureClassByName) and older dict-style API.
        Falls back to None on any error so the engine gracefully uses mock features.
        """
        try:
            from radiomics import featureextractor
            extractor = featureextractor.RadiomicsFeatureExtractor()

            # Start from a clean slate
            extractor.disableAllFeatures()

            # PyRadiomics 3.x API: enable each class separately
            # enableFeatureClassByName(className, featureNames=None)
            # Passing None (or no second arg) enables all features in that class.
            try:
                extractor.enableFeatureClassByName("shape")
                extractor.enableFeatureClassByName("firstorder")
                extractor.enableFeatureClassByName("glcm")
            except AttributeError:
                # Older PyRadiomics used a different API — fall back to enableAllFeatures
                extractor.enableAllFeatures()

            return extractor

        except Exception as exc:
            logger.warning(
                "PyRadiomics extractor init failed (%s) — will use mock features.", exc
            )
            return None

    def extract(self, volume: np.ndarray, mask: np.ndarray) -> dict:
        """
        Extract radiomic features from volume + binary mask.

        Args:
            volume: 3D numpy array, float32
            mask:   Binary mask, uint8

        Returns:
            dict of feature_name → float value
        """
        if not self._available or self._extractor is None:
            return self._mock_features(volume, mask)

        return self._pyradiomics_extract(volume, mask)

    def _pyradiomics_extract(self, volume: np.ndarray, mask: np.ndarray) -> dict:
        import SimpleITK as sitk

        img_sitk = sitk.GetImageFromArray(volume.astype(np.float32))
        msk_sitk = sitk.GetImageFromArray((mask > 0).astype(np.uint8))

        # Write to temp files (PyRadiomics requires file paths)
        with (
            tempfile.NamedTemporaryFile(suffix=".nii.gz", delete=False) as img_f,
            tempfile.NamedTemporaryFile(suffix=".nii.gz", delete=False) as msk_f,
        ):
            sitk.WriteImage(img_sitk, img_f.name)
            sitk.WriteImage(msk_sitk, msk_f.name)

            try:
                result = self._extractor.execute(img_f.name, msk_f.name)
            finally:
                os.unlink(img_f.name)
                os.unlink(msk_f.name)

        # Filter to numeric values only, strip "original_" prefix for readability
        features = {}
        for k, v in result.items():
            if isinstance(v, (int, float)):
                clean_key = k.replace("original_", "")
                features[clean_key] = round(float(v), 6)

        return features

    @staticmethod
    def _mock_features(volume: np.ndarray, mask: np.ndarray) -> dict:
        """Generate plausible synthetic radiomic features based on mask stats."""
        if mask.sum() == 0:
            tumor_vals = np.array([0.0])
        else:
            tumor_vals = volume[mask > 0]

        return {
            "shape_Elongation": round(float(np.random.uniform(0.4, 0.9)), 4),
            "shape_Sphericity": round(float(np.random.uniform(0.3, 0.85)), 4),
            "shape_SurfaceVolumeRatio": round(float(np.random.uniform(0.1, 0.5)), 4),
            "firstorder_Mean": round(float(tumor_vals.mean()), 4),
            "firstorder_Std": round(float(tumor_vals.std()), 4),
            "firstorder_Entropy": round(float(np.random.uniform(3.5, 6.5)), 4),
            "firstorder_Kurtosis": round(float(np.random.uniform(1.5, 4.0)), 4),
            "firstorder_Skewness": round(float(np.random.uniform(-1.0, 1.5)), 4),
            "firstorder_Energy": round(float(np.sum(tumor_vals ** 2)), 4),
            "glcm_Contrast": round(float(np.random.uniform(50, 300)), 4),
            "glcm_Correlation": round(float(np.random.uniform(0.5, 0.99)), 4),
            "glcm_Dissimilarity": round(float(np.random.uniform(2, 15)), 4),
            "glcm_Entropy": round(float(np.random.uniform(3, 8)), 4),
            "glcm_Homogeneity": round(float(np.random.uniform(0.1, 0.6)), 4),
        }


# Singleton
radiomics_engine = RadiomicsEngine()
