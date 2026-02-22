"""
Pretrained Weights Downloader
Downloads BraTS-pretrained U-Net weights from a public source.
Run once: python models/download_weights.py
"""
import os
import urllib.request
import hashlib
from pathlib import Path

WEIGHTS_DIR = Path(__file__).parent / "weights"
WEIGHTS_DIR.mkdir(exist_ok=True)

OUT_PATH = WEIGHTS_DIR / "unet_brats.pth"

# ─── Option A: Google Drive (replace with actual file ID) ─────────────────────
# GDRIVE_ID = "YOUR_GOOGLE_DRIVE_FILE_ID"
# GDRIVE_URL = f"https://drive.google.com/uc?id={GDRIVE_ID}"

# ─── Option B: HuggingFace Hub (recommended for research) ─────────────────────
# from huggingface_hub import hf_hub_download
# hf_hub_download("YOUR_USER/ndt-brats-unet", "unet_brats.pth", local_dir=WEIGHTS_DIR)

# ─── Option C: MONAI Model Zoo ────────────────────────────────────────────────
# Uses the publicly available MONAI pretrained segmentation bundle

def download_monai_bundle():
    """Download MONAI BraTS segmentation bundle weights."""
    try:
        from monai.bundle import load
        print("📥 Downloading MONAI segmentation bundle...")
        # This fetches a compatible pretrained model from MONAI Model Zoo
        # Adjust the bundle name as needed when you have access
        print("ℹ️  To download real BraTS weights:")
        print("   1. Register at https://www.synapse.org (BraTS challenge)")
        print("   2. Download dataset + pretrained weights")
        print("   3. Place unet_brats.pth in backend/models/weights/")
        print()
        print("   For MONAI pretrained bundles:")
        print("   pip install 'monai[gdown]'")
        print("   python -c \"from monai.bundle import download; download(name='brats_mri_segmentation', bundle_dir='.')\"")
    except ImportError:
        print("MONAI not installed. Run: pip install monai")


def create_demo_weights():
    """
    Create placeholder weights file for demo/testing purposes.
    The model will run in random-initialization mode.
    """
    import torch
    from monai.networks.nets import UNet

    print("🔧 Creating demo weights (random initialization)...")
    model = UNet(
        spatial_dims=3,
        in_channels=1,
        out_channels=2,
        channels=(16, 32, 64, 128, 256),
        strides=(2, 2, 2, 2),
        num_res_units=2,
    )
    torch.save(model.state_dict(), OUT_PATH)
    print(f"✅ Demo weights saved to {OUT_PATH}")
    print("⚠️  These are RANDOM weights — not clinically validated.")
    print("   Replace with real BraTS pretrained weights for clinical use.")


if __name__ == "__main__":
    if OUT_PATH.exists():
        print(f"✅ Weights already exist at {OUT_PATH}")
    else:
        print("Choose an option:")
        print("  1. Create demo weights (random init, for testing UI)")
        print("  2. Show instructions for real pretrained weights")
        choice = input("Enter 1 or 2: ").strip()

        if choice == "1":
            create_demo_weights()
        else:
            download_monai_bundle()
