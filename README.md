# 🧠 NeuroDigital Twin (NDT)

> **An AI-powered neuro-oncology research platform that builds a living, patient-specific computational model of a brain tumor — tracking how it grows, predicting how it responds to therapy, and optimizing treatment strategy using Reinforcement Learning.**

---

## What Is a Digital Twin?

A **digital twin** is a dynamic, continuously-updated computational replica of a real physical system. In oncology, a *neuro-digital twin* is a patient-specific mathematical model of a tumor that:

- Is **calibrated** from the patient's own MRI scans (not population averages)
- **Incorporates** their genomic markers, tumor texture, and clinical status
- Can be **simulated forward in time** under different therapy scenarios
- Gets **updated** every time a new scan is available

The NDT platform automates the entire workflow — from raw DICOM/NIfTI upload to a fully simulated, explainable treatment recommendation — in a single unified system.

---

## How the Platform Works — End to End

### Step 1 — MRI Upload & Preprocessing

The clinician or researcher uploads one or more MRI scans in **DICOM series** or **NIfTI** format through the web interface.

Behind the scenes:
- DICOM files are loaded using `pydicom`, sorted by `InstanceNumber`, and assembled into a 3D volume
- NIfTI files are loaded with `nibabel`, extracting voxel spacing from the affine matrix
- The volume is normalized per-slice using z-score normalization on non-zero voxels
- The resulting `numpy` array of shape `(D, H, W)` is handed to the segmentor

**Endpoint:** `POST /upload`

---

### Step 2 — 3D U-Net Tumor Segmentation

The preprocessed volume is passed through a **3D U-Net** (loaded from MONAI), a deep neural network specifically designed for 3D volumetric segmentation.

The architecture:
- **Encoder:** 4 downsampling blocks at spatial resolutions (128→64→32→16→8) using stride-2 convolutions
- **Bottleneck:** 256 channels at the coarsest resolution
- **Decoder:** 4 upsampling blocks with skip connections from the encoder (U-shaped)
- **Output:** Two-channel softmax map over the target volume → `(background, tumor)` probability per voxel

After thresholding at 0.5, the raw binary mask is resized back to the original MRI dimensions.

**Demo mode:** If no pretrained weights are found, the model runs with random initialization, producing a plausible-shaped mask in the brain center for testing.

**Outputs:**
- Binary segmentation mask `(D, H, W)` — uint8
- Tumor volume in mm³ and cc (derived from voxel spacing × number of tumor voxels)
- AI confidence score (mean softmax probability inside the tumor mask)

---

### Step 3 — Radiomic Feature Extraction

Once the tumor mask is available, the system extracts **quantitative imaging biomarkers** from the MRI using `PyRadiomics`. These features go far beyond what the human eye can see.

**Feature categories:**

| Category | What it measures | Clinical relevance |
|----------|-----------------|-------------------|
| **Shape** | Elongation, sphericity, surface-volume ratio | Irregular tumors are often more aggressive |
| **First-Order Statistics** | Intensity entropy, skewness, kurtosis, energy | Heterogeneous intensity suggests necrosis or variable cellularity |
| **GLCM Texture** | Contrast, correlation, dissimilarity, homogeneity | Texture heterogeneity correlates with proliferation rate |
| **GLRLM / GLSZM** | Run-length and size-zone matrices | Captures macro-texture patterns across regions |

Each feature is mapped to a human-readable clinical label and interpretation note by the `feature_labels.py` module. The frontend displays them as color-coded bars (green = normal range, amber = slight divergence, red = significantly abnormal).

**Endpoint:** `POST /upload?extract_radiomics=true` or `POST /interpret`

---

### Step 4 — Multi-Modal Fusion (Patient State Vector)

Clinical decisions are never made from a single data source. The **Fusion Engine** combines three data modalities into a single compact representation:

```
Radiomics features (N floats)    ──┐
Clinical data     (age, KPS, ...) ─┤→ 3-branch MLP → 64-dim Patient State Vector (PSV)
Genomic markers   (IDH, MGMT, ...) ┘
```

Implementation:
- Each branch is a 2-layer MLP with ReLU activation
- Branch outputs (each 32-dim) are **concatenated** and passed through a final projection layer
- The 64-dimensional output is the **Patient State Vector** — a compact, information-rich embedding of the patient's complete tumor profile

The PSV can be used for:
- Patient similarity search (find the most similar cases in a database)
- As the initial state for the RL agent's environment
- For downstream classification / risk tasks

**Endpoint:** `POST /fusion`

---

### Step 5 — Tumor Growth Prediction

The growth predictor fits two regression models to the patient's historical scan volumes:

**Model 1 — Linear Regression:**
```
V(t) = mt + b   where m = growth rate [cc/day]
```

**Model 2 — Exponential (Malthusian) Regression:**
```
V(t) = V₀ · e^(rt)   where r = intrinsic growth rate
```

The **auto-selection** criterion: the model with higher R² is chosen, unless the exponential R² exceeds the linear R² by less than 0.05 (to avoid overfitting on noisy data).

Predictions are returned for days +30, +60, +90 from the last scan date, annotated with trend labels: `Stable / Slow Growth / Moderate Growth / Rapid Growth / Aggressive Growth`.

**Endpoint:** `POST /predict`

---

### Step 6 — Digital Twin ODE Simulation

This is the mathematical core of the platform. The tumor's future behavior is simulated using a **personalized logistic growth ordinary differential equation** with therapy dampening:

```
dV/dt = α · V · (1 - V/K) - β · T
```

| Parameter | Meaning | Estimated from |
|-----------|---------|---------------|
| `α` (alpha) | Intrinsic growth rate | Fitted to patient's scan history |
| `K` | Carrying capacity (max tumor size) | Estimated as 10× initial volume |
| `β` (beta) | Treatment response coefficient | Fixed at 0.01 × therapy level |
| `T` | Therapy intensity | External input (0–3 scale) |

The `TwinBuilder` class estimates `α` and `K` by fitting the logistic model to the patient's actual scan data using `scipy.optimize.curve_fit`.

**Simulation modes:**
- **Single therapy:** Run with a constant therapy level T for N days
- **Therapy schedule:** Pass a per-day array of therapy values to simulate dynamic treatment regimens
- **Comparison mode:** Run four parallel simulations (T=0, 1, 2, 3) and return all trajectories

Optional **biological noise** (Gaussian) can be added to simulate measurement variability.

**Endpoints:** `POST /simulate`, `POST /compare-therapies`

---

### Step 7 — RL Therapy Optimization

The RL optimizer finds the **optimal therapy sequence** over a horizon of N days using either:

#### Option A — Heuristic Optimizer (fast, deterministic)
Evaluates all therapy levels (0, 0.5, 1.0, ..., 3.0) by running the digital twin simulation for each and selecting the strategy that achieves the best tumor reduction within the toxicity budget.

#### Option B — PPO Reinforcement Learning Agent (advanced)
A **Proximal Policy Optimization (PPO)** agent from `stable-baselines3` is trained inside a custom `gymnasium.Env`:

**Environment design:**
- **State space:** `[current_volume, days_remaining, last_therapy, cumulative_toxicity]` (4D continuous)
- **Action space:** Continuous therapy intensity between 0 and 3
- **Reward function:** `−ΔV/V₀ − 0.1 × T` (penalizes volume growth AND excessive therapy)
- **Episode length:** N days, reset with randomized initial conditions for generalization

The trained agent produces a **day-by-day therapy schedule** rather than a single constant level, enabling adaptive dosing strategies.

**Clinical explanation generation:** Each recommendation is automatically annotated with plain-English reasoning (e.g., *"Aggressive therapy selected: rapid tumor growth α=0.048 requires maximum suppression; MGMT methylation suggests chemotherapy responsiveness."*)

**Endpoint:** `POST /optimize`

---

### Step 8 — Survival Prediction

The survival predictor estimates **overall survival probability** using hazard ratios derived from major glioma clinical trials and genomic databases:

**Source literature:** Stupp et al. (NEJM 2005), TCGA-GBM (2008), EORTC 26981, Brennan et al. (Cell 2013)

**Modeling approach:**

1. **Cumulative Hazard Accumulation (Cox PH-inspired):**
   Each clinical/genomic factor contributes a multiplicative hazard ratio (HR) to the baseline hazard. The cumulative HR adjusts the baseline median OS of 14.6 months (Stupp chemo+RT arm):
   ```
   HR_total = HR_IDH × HR_MGMT × HR_EGFR × HR_KPS × HR_Age × HR_EOR × ...
   Adjusted Median OS = 14.6 / HR_total
   ```

2. **Weibull Survival Curve:**
   Once the adjusted median is known, a Weibull distribution with shape parameter k=1.5 (typical for GBM) generates the full survival probability curve:
   ```
   S(t) = exp(-(t/λ)^k)   where λ = median / ln(2)^(1/k)
   ```

3. **Outputs:** Median OS, 95% CI, 1/2-year survival probabilities, Kaplan-Meier curve (dict), risk stratification (Low / Intermediate / High / Very High), favorable/adverse factor lists.

**Reference curves:** Population-level KM curves for 4 GBM molecular subtypes are provided for comparison.

**Endpoint:** `POST /survival/predict`

---

## Clinical Data Model

The platform stores all data in **SQLite** (development) or **PostgreSQL** (production) via SQLAlchemy ORM:

```
Patient
├── Demographics (age, gender, KPS score)
├── Diagnosis (grade, diagnosis text)
├── Genomics (IDH, MGMT, EGFR, TP53 mutation status)
└── Clinical history (prior treatments)

Scan (linked to Patient by patient_id)
├── Date and modality
├── Tumor volumes (mm³, cc, subregions)
├── Radiomics feature blob (JSON)
└── Patient State Vector (JSON, 64 floats)

GrowthRecord
├── Growth parameters (α, K, β)
├── 30/60/90-day predictions
└── Simulation trajectory

TherapySimulation
├── Best therapy found
├── Volume reduction %
└── Full strategy comparison JSON
```

---

## AI Models — Technical Details

### 3D U-Net Segmentor

| Property | Value |
|----------|-------|
| Framework | MONAI + PyTorch |
| Architecture | 3D U-Net with residual units |
| Input | (1, 128, 128, 64) — single-channel MRI |
| Output | (2, 128, 128, 64) — background/tumor softmax |
| Channels | 16 → 32 → 64 → 128 → 256 |
| Skip connections | Yes (U-Net style) |
| Pretrained on | BraTS2021 (download via `download_weights.py`) |

### Fusion MLP

| Property | Value |
|----------|-------|
| Radiomics branch | 512-dim input → 64-dim (2 layers + ReLU) |
| Clinical branch | 32-dim input → 32-dim (2 layers + ReLU) |
| Genomic branch | 16-dim input → 32-dim (2 layers + ReLU) |
| Fusion | Concatenate (128-dim) → Linear → 64-dim PSV |
| Output | 64-dimensional Patient State Vector |

### RL Environment

| Property | Value |
|----------|-------|
| Framework | Gymnasium |
| State space | Box(4,) — continuous [0, ∞) |
| Action space | Box(1,) — therapy ∈ [0, 3] |
| Reward | `-ΔV/V₀ - 0.1·T` |
| Episodes | 10,000 training steps |
| Algorithm | PPO (stable-baselines3) with MlpPolicy |

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Platform status & module list |
| `GET` | `/health` | Health check |
| `GET` | `/pipeline` | Full pipeline stage specification |
| `POST` | `/upload` | Upload MRI → segment → volume → radiomics |
| `POST` | `/predict` | Tumor growth prediction (30/60/90d) |
| `POST` | `/simulate` | Digital twin ODE simulation |
| `POST` | `/compare-therapies` | Compare all therapy levels in parallel |
| `POST` | `/optimize` | RL therapy optimization |
| `POST` | `/fusion` | Build 64-dim Patient State Vector |
| `POST` | `/interpret` | Interpret radiomics keys → clinical labels |
| `POST` | `/patient/create` | Create patient record |
| `GET` | `/patient/{id}` | Get patient + scan history |
| `DELETE` | `/patient/{id}` | Delete patient record |
| `GET` | `/patients` | List all patients |
| `POST` | `/scan/save` | Save scan results to DB |
| `POST` | `/survival/predict` | Predict overall survival curve |
| `GET` | `/survival/reference` | Population KM reference curves |
| `GET` | `/analytics/overview` | Platform-wide aggregate statistics |
| `GET` | `/analytics/patient/{id}/report` | Full single-patient clinical report |
| `POST` | `/analytics/cohort` | Filter and analyze a patient cohort |

Full interactive API documentation: `http://localhost:8000/docs`

---

## Installation & Running

### Prerequisites

- Python 3.11+
- Node.js 20+
- (Optional) NVIDIA GPU with CUDA 12.1 for fast segmentation

### Quick Start — Local

```bash
# 1. Clone and enter
git clone <your-repo>
cd "NeuroDigital Twin (NDT)"

# 2. Python virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
source .venv/bin/activate  # macOS/Linux

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. (Optional) Download pretrained segmentation weights
python backend/models/download_weights.py

# 5. Start backend API  (from repo root)
cd backend
uvicorn app:app --reload --port 8000

# 6. Start frontend (new terminal, from repo root)
cd frontend
npm install
npm start
```

Open **http://localhost:3000** for the dashboard.
Open **http://localhost:8000/docs** for the full interactive API explorer.

### Docker (GPU-accelerated)

```bash
# Build and launch both services (requires NVIDIA Docker runtime for GPU)
docker-compose up --build

# CPU-only (no GPU required)
DEVICE=cpu docker-compose up --build
```

Services:
- Backend:  http://localhost:8000
- Frontend: http://localhost:3000

### Running Tests

```bash
# From repo root
pip install pytest pytest-asyncio
cd backend
pytest ../tests/ -v --tb=short
```

---

## Uploading Your First MRI

1. Navigate to **MRI Upload** tab in the dashboard
2. Drag and drop a DICOM directory (zipped) or a NIfTI `.nii.gz` file
3. Toggle **Extract Radiomics** if you want quantitative feature analysis
4. Click **Upload & Segment** — the 3D U-Net runs and returns volume + confidence
5. Switch to **3D Viewer** to see the tumor rendered in 3D space
6. Go to **Growth Analysis** and click **Refresh Prediction** for 90-day forecast
7. Go to **Digital Twin** → select therapy level → **Run Simulation**
8. Go to **RL Optimizer** → choose Heuristic or PPO → **Optimize Therapy**
9. Go to **Survival** → fill in molecular markers → **Predict Survival**

---

## Interpreting Results

### Tumor Volume
- **< 10 cc:** Small, often surgically accessible
- **10–50 cc:** Medium; surgery + adjuvant therapy standard
- **> 50 cc:** Large; likely affecting eloquent areas; palliative context

### Growth Rate (α)
- **< 0.01/day:** Slow growth — surveillance possible
- **0.01–0.03/day:** Moderate growth — standard Stupp protocol
- **> 0.03/day:** Rapid growth — aggressive multi-modal therapy warranted

### Risk Level
| Level | Meaning |
|-------|---------|
| Low | Estimated OS > 24 months |
| Intermediate | Estimated OS 14–24 months |
| High | Estimated OS 8–14 months |
| Very High | Estimated OS < 8 months |

### Radiomics Entropy
- **< 4.0:** Homogeneous tumor — potentially lower grade or well-responding to therapy
- **4.0–6.0:** Moderate heterogeneity — typical GBM
- **> 6.0:** High heterogeneity — suggests necrosis, aggressive phenotype

---

## Calibration & Accuracy

All mathematical models are calibrated using **actual patient scan data**:

- The **growth predictor** fits a new regression curve each time it is invoked — it adapts to each patient's specific volume history
- The **digital twin** estimates `α` and `K` by minimizing squared residuals between the logistic model output and the observed scan volumes
- The **survival predictor** uses hazard ratios validated in trials with thousands of GBM patients

The platform automatically improves as more scans are added for a patient — each new scan refines the model parameters.

---

## Disclaimer

> **NeuroDigital Twin is a research and demonstration platform. It is not approved for clinical decision-making, has not been validated on prospective patient cohorts, and does not replace the clinical judgment of a qualified neuro-oncologist or radiation oncologist. All survival estimates, therapy recommendations, and simulation outputs are intended solely for research purposes.**

The survival hazard ratios are derived from published literature and represent population averages — individual patient outcomes depend on many factors not captured in this model.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI 0.110 + Uvicorn |
| AI Framework | PyTorch 2.2 + MONAI 1.3 |
| Segmentation | 3D U-Net (MONAI) |
| Classical ML | scikit-learn, scipy |
| Radiomics | PyRadiomics 3.1 |
| RL | Gymnasium 0.29 + Stable-Baselines3 2.2 |
| Database | SQLAlchemy 2.0 (SQLite / PostgreSQL) |
| Frontend | React 18 + Chart.js + Three.js |
| 3D Graphics | Three.js + WebGL |
| Containerization | Docker + docker-compose |
| Testing | pytest + FastAPI TestClient |

---

*NeuroDigital Twin — Building computational models of cancer, one patient at a time.*
