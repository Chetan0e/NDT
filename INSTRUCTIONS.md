# 🧠 NeuroDigital Twin (NDT) — Complete Project Instructions

> **⚠️ RESEARCH & INVESTIGATIONAL USE ONLY**
> This platform is designed exclusively for in-silico research, education, and computational oncology demonstration. It has **not** been cleared or approved by the FDA, EMA, or any equivalent regulatory body for clinical diagnostic or treatment decision-making. All outputs are illustrative and must not be used as the basis for any real patient care decisions.

---

## 📑 Table of Contents

1. [What Is NDT?](#1-what-is-ndt)
2. [System Requirements](#2-system-requirements)
3. [Project Structure](#3-project-structure)
4. [Environment Setup](#4-environment-setup)
   - [Step 1 — Clone & Navigate](#step-1--clone--navigate)
   - [Step 2 — Python Virtual Environment](#step-2--python-virtual-environment)
   - [Step 3 — Install Python Dependencies](#step-3--install-python-dependencies)
   - [Step 4 — Configure Environment Variables](#step-4--configure-environment-variables)
   - [Step 5 — Install Frontend Dependencies](#step-5--install-frontend-dependencies)
5. [Running the Platform](#5-running-the-platform)
   - [Option A — 1-Click Windows Launcher (Recommended)](#option-a--1-click-windows-launcher-recommended)
   - [Option B — npm Cross-Platform Start](#option-b--npm-cross-platform-start)
   - [Option C — Manual Start (Full Control)](#option-c--manual-start-full-control)
   - [Option D — Docker Compose (GPU or CPU)](#option-d--docker-compose-gpu-or-cpu)
6. [First Launch Checklist](#6-first-launch-checklist)
7. [Using the Platform — Module-by-Module Guide](#7-using-the-platform--module-by-module-guide)
   - [Dashboard](#71-executive-dashboard)
   - [Patient Directory](#72-patient-directory)
   - [MRI Upload & AI Segmentation](#73-mri-upload--ai-segmentation)
   - [3D WebGL Viewer](#74-3d-webgl-viewer)
   - [Radiomics Analysis](#75-radiomics-analysis)
   - [Digital Twin ODE Simulator](#76-digital-twin-ode-simulator)
   - [RL Therapy Optimizer](#77-rl-therapy-optimizer)
   - [Growth Analysis](#78-growth-analysis)
   - [Survival Analysis](#79-survival-analysis)
   - [Tumor Board Reports](#710-tumor-board-reports)
   - [System Settings](#711-system-settings)
8. [Preloaded Clinical Cases](#8-preloaded-clinical-cases)
9. [API Reference](#9-api-reference)
10. [Running Tests](#10-running-tests)
11. [Configuration Reference](#11-configuration-reference)
12. [Troubleshooting](#12-troubleshooting)
13. [Security & Privacy Notes](#13-security--privacy-notes)
14. [Key Files Quick Reference](#14-key-files-quick-reference)

---

## 1. What Is NDT?

**NeuroDigital Twin (NDT)** is a full-stack AI-powered neuro-oncology research platform. It constructs a living, patient-specific computational replica (a "Digital Twin") of high-grade and low-grade gliomas. The platform:

- **Segments** MRI volumes using a 3D U-Net deep learning model (MONAI/PyTorch)
- **Extracts** over 100 quantitative radiomic biomarkers (PyRadiomics)
- **Fuses** multi-modal data (imaging + genomic + clinical) into a 64-dimensional Patient State Vector
- **Simulates** tumor growth using a calibrated Ordinary Differential Equation (ODE) model
- **Optimizes** therapy schedules using Proximal Policy Optimization (PPO) Reinforcement Learning
- **Predicts** survival using Cox Proportional Hazard + Weibull actuarial models
- **Visualizes** everything in a modern React + Three.js 3D WebGL dashboard

---

## 2. System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10 / macOS 12 / Ubuntu 20.04 | Windows 11 / Ubuntu 22.04 |
| **Python** | 3.11 | 3.11 or 3.12 |
| **Node.js** | 18.x | 20 LTS |
| **RAM** | 8 GB | 16 GB+ |
| **Storage** | 4 GB free | 10 GB+ (for model weights & data) |
| **GPU** | Optional | NVIDIA GPU + CUDA 12.1+ (for fast 3D U-Net inference) |
| **Browser** | Chrome 110+ / Firefox 110+ | Chrome or Edge (latest) — required for WebGL 3D |

> **Note on GPU:** The platform runs fully on CPU by default. GPU is optional but significantly accelerates the 3D U-Net segmentation step (from ~30s to ~2–3s per volume). Set `DEVICE=cuda` in your `.env` file to enable it.

---

## 3. Project Structure

```
NeuroDigital Twin (NDT)/
│
├── 📄 INSTRUCTIONS.md          ← You are here — the complete guide
├── 📄 README.md                ← Technical overview and math foundations
├── 📄 requirements.txt         ← Python dependencies
├── 📄 start.bat                ← 1-click Windows launcher
├── 📄 package.json             ← Root npm scripts (cross-platform start)
├── 📄 docker-compose.yml       ← Docker Compose (backend + frontend)
├── 📄 Dockerfile               ← Backend container definition
├── 📄 .env.example             ← Environment variable template
├── 📄 train.py                 ← (Optional) Model fine-tuning script
├── 📄 conftest.py              ← Pytest root configuration
├── 📄 pytest.ini               ← Test runner settings
│
├── 🗂️ backend/
│   ├── app.py                  ← FastAPI application entry point
│   ├── config.py               ← All configuration (paths, DB, device)
│   ├── database.py             ← SQLAlchemy ORM models and DB init
│   ├── seed_data.py            ← Clinical cohort demo data seeder
│   ├── generate_meshes.py      ← 3D mesh geometry pre-generation
│   │
│   ├── 🗂️ routes/              ← API endpoint handlers
│   │   ├── upload.py           ← MRI upload, segmentation, radiomics
│   │   ├── predict.py          ← Growth prediction (linear/exponential)
│   │   ├── patient.py          ← Patient CRUD operations
│   │   ├── features.py         ← Radiomics label interpretation
│   │   ├── fusion.py           ← Multi-modal fusion → PSV
│   │   ├── twin.py             ← ODE simulation, therapy comparison
│   │   ├── rl.py               ← PPO RL therapy optimizer
│   │   ├── survival.py         ← Cox PH + Weibull survival
│   │   ├── analytics.py        ← Reports, cohort stats, tumor board
│   │   └── seed.py             ← Demo seeding & synthetic MRI endpoint
│   │
│   ├── 🗂️ models/              ← AI model implementations
│   │   ├── segmentor.py        ← 3D U-Net singleton (MONAI)
│   │   ├── fusion.py           ← 3-branch MLP fusion network
│   │   ├── predictor.py        ← Growth regression models
│   │   ├── rl_agent.py         ← PPO agent + Gymnasium env
│   │   ├── survival.py         ← Cox PH + Weibull survival engine
│   │   ├── twin.py             ← ODE tumor growth dynamics
│   │   ├── twin_builder.py     ← Digital Twin factory
│   │   ├── download_weights.py ← Auto-download pretrained weights
│   │   └── weights/            ← Model weight files (.pth)
│   │
│   ├── 🗂️ utils/               ← Processing utilities
│   │   ├── brats_loader.py     ← BraTS 2021 dataset loader
│   │   ├── dicom_loader.py     ← DICOM series reader
│   │   ├── radiomics_engine.py ← PyRadiomics feature extractor
│   │   ├── clinical_interpretation.py ← Human-readable feature labels
│   │   ├── feature_labels.py   ← Feature name mapping dictionary
│   │   ├── fit_growth.py       ← ODE parameter calibration (curve_fit)
│   │   ├── vector_builders.py  ← Patient State Vector construction
│   │   └── volume.py           ← Voxel volume computation utilities
│   │
│   └── 🗂️ data/                ← Data directory (BraTS, uploads, etc.)
│
├── 🗂️ frontend/
│   ├── package.json            ← React dependencies
│   └── src/
│       ├── App.js              ← Root component + navigation router
│       ├── api.js              ← All API calls to backend
│       ├── api.test.js         ← Frontend API unit tests
│       ├── index.css           ← Global styles & clinical design tokens
│       ├── index.js            ← React DOM root entry
│       ├── 🗂️ components/
│       │   ├── Dashboard.js    ← Executive KPI dashboard
│       │   ├── PatientPanel.js ← Patient directory & management
│       │   ├── Upload.js       ← MRI drag-and-drop upload
│       │   ├── Viewer3D.js     ← Three.js WebGL 3D brain viewer
│       │   ├── Radiomics.js    ← Radiomic biomarker explorer
│       │   ├── TwinSimulator.js← ODE Digital Twin simulator
│       │   ├── RLOptimizer.js  ← RL therapy optimizer UI
│       │   ├── Graph.js        ← Growth analysis & forecasting
│       │   ├── Survival.js     ← Kaplan-Meier survival curves
│       │   ├── Reports.js      ← Clinical tumor board reports
│       │   ├── Settings.js     ← Platform diagnostics & settings
│       │   ├── HowToUse.js     ← Interactive clinical workflow guide
│       │   └── Logo.js         ← SVG logo component
│       ├── 🗂️ constants/       ← Clinical constants & defaults
│       └── 🗂️ utils/           ← Frontend helper utilities
│
└── 🗂️ tests/
    ├── __init__.py
    └── test_api.py             ← 24-test automated suite
```

---

## 4. Environment Setup

### Step 1 — Clone & Navigate

```bash
# If you cloned from git:
git clone <your-repo-url>
cd "NeuroDigital Twin (NDT)"
```

Or simply open a terminal in the project root directory.

---

### Step 2 — Python Virtual Environment

Create and activate a Python virtual environment. This isolates the project's dependencies from your system Python.

**Windows (PowerShell or CMD):**
```cmd
python -m venv .venv
.venv\Scripts\activate
```

**macOS / Linux (bash/zsh):**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

> ✅ Your terminal prompt should change to show `(.venv)` when the environment is active.

---

### Step 3 — Install Python Dependencies

With your virtual environment active:

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

> **Important:** `pyradiomics` is installed directly from GitHub source, which requires `git` to be installed on your system and may take a few minutes. If you encounter build errors, ensure you have C++ build tools installed (Visual Studio Build Tools on Windows, or `build-essential` on Ubuntu).

**GPU users** — install the CUDA version of PyTorch first, before the rest:
```bash
# Example for CUDA 12.1:
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
```

---

### Step 4 — Configure Environment Variables

```bash
# Copy the template
cp .env.example .env    # macOS/Linux
copy .env.example .env  # Windows CMD
```

Then open `.env` and configure as needed:

```ini
# ── REQUIRED ──────────────────────────────────────
SECRET_KEY=your-32-char-random-secret-here

# ── DEVICE ────────────────────────────────────────
DEVICE=cpu          # Change to 'cuda' if you have an NVIDIA GPU

# ── DATABASE ──────────────────────────────────────
DATABASE_URL=sqlite:///./backend/ndt.db
# For PostgreSQL (optional, production use):
# DATABASE_URL=postgresql://ndt:password@localhost/ndt

# ── PATHS ─────────────────────────────────────────
UPLOAD_DIR=./uploads
BRATS_ROOT=./data/BraTS2021        # Only needed if using real BraTS data

# ── MODEL WEIGHTS ─────────────────────────────────
SEGMENTOR_WEIGHTS=./backend/models/weights/unet_brats.pth

# ── SERVER ────────────────────────────────────────
API_HOST=0.0.0.0
API_PORT=8000
```

> **Note:** If no `.env` file exists, the platform uses safe defaults (CPU mode, SQLite database). The `.env` file is optional for getting started.

---

### Step 5 — Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

This downloads React, Three.js, Recharts, Lucide icons, and all other UI dependencies into `frontend/node_modules/`.

---

## 5. Running the Platform

### Option A — 1-Click Windows Launcher (Recommended)

Double-click **`start.bat`** in the project root, or run from CMD:
```cmd
start.bat
```

This opens two separate command windows:
- **NDT Backend** — FastAPI server on `http://localhost:8000`
- **NDT Frontend** — React dashboard on `http://localhost:3000`

---

### Option B — npm Cross-Platform Start

From the project root (works on Windows, macOS, Linux):
```bash
npm install         # Install concurrently (first time only)
npm start           # Starts backend + frontend together
```

---

### Option C — Manual Start (Full Control)

Open **two separate terminals** in the project root.

**Terminal 1 — Backend:**
```bash
# Activate virtual environment
.venv\Scripts\activate     # Windows
source .venv/bin/activate  # macOS/Linux

# Start FastAPI
cd backend
uvicorn app:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm start
```

---

### Option D — Docker Compose (GPU or CPU)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) or Docker Engine (Linux).

```bash
# GPU-accelerated (requires NVIDIA Container Toolkit):
docker-compose up --build

# CPU-only mode:
DEVICE=cpu docker-compose up --build

# Run in background (detached mode):
docker-compose up --build -d

# Stop all containers:
docker-compose down
```

---

## 6. First Launch Checklist

After starting the platform, verify everything is working:

| Step | Action | Expected Result |
|------|--------|-----------------|
| ✅ 1 | Open `http://localhost:8000/health` | `{"status": "healthy", ...}` |
| ✅ 2 | Open `http://localhost:8000/docs` | Interactive Swagger API explorer |
| ✅ 3 | Open `http://localhost:3000` | NDT Dashboard loads with 3D brain |
| ✅ 4 | Navigate to **Clinical → Patients** | 5 demo patients listed (NDT-001 to NDT-005) |
| ✅ 5 | Click on any patient | Patient profile loads with molecular markers |
| ✅ 6 | Navigate to **Clinical → MRI Upload** | Upload panel visible with "Load Sample MRI" button |
| ✅ 7 | Click **Load Sample MRI** | Segmentation completes, tumor volume displayed |
| ✅ 8 | Navigate to **AI Analysis → Digital Twin** | ODE simulation runs, 4 trajectory curves appear |

> **Auto-seeding:** On the very first startup with an empty database, the backend automatically seeds the 5 demo clinical cases. You will see `Auto-seeding clinical demo cohort...` in the backend terminal. This is normal.

---

## 7. Using the Platform — Module-by-Module Guide

### 7.1 Executive Dashboard

**Navigate to:** `Overview → Dashboard`

The dashboard is your central command center. It shows:

- **KPI Cards:** Live values for Tumor Volume (cc), Growth Rate (α), Radiomics Risk Score, PSV Dimension, and Median OS (months)
- **Live 3D Brain Model:** WebGL-rendered anatomical model with tumor overlay (top right)
- **Growth Trajectory Chart:** Historical + predicted tumor volume over time
- **RL Optimization History:** Therapy schedule recommended by the AI optimizer

**How to use:**
1. Select a patient from the **Patient Directory** sidebar or from the **Patients** tab
2. Return to Dashboard — all KPIs update automatically for the selected patient
3. Hover over chart data points for detailed tooltips

---

### 7.2 Patient Directory

**Navigate to:** `Clinical → Patients`

Manage the full clinical cohort:

- **Search:** Type in the search box to filter patients by name, ID, or diagnosis
- **Filter by Grade:** Click WHO Grade buttons to filter by tumor grade
- **View Patient:** Click any row to select the patient and load their full profile
- **Edit Patient:** Click the ✏️ edit icon on any row to modify demographics or molecular markers
- **Add Patient:** Click **"+ New Patient"** to create a fresh clinical record
- **Delete Patient:** Click the 🗑️ icon (requires confirmation)
- **Re-seed Cohort:** Click **"Reset Cohort"** to restore the 5 demo patients (all custom records will be cleared)

**Patient fields you can edit:**
- Name, Age, Sex
- WHO Grade (1–4)
- KPS Score (0–100)
- Extent of Resection (biopsy / partial / gross total)
- Molecular markers: IDH mutation, MGMT methylation, EGFR amplification, TP53 status

---

### 7.3 MRI Upload & AI Segmentation

**Navigate to:** `Clinical → MRI Upload`

The upload module runs the full AI segmentation pipeline:

**Using Real MRI Files:**
1. Drag-and-drop a `.dcm`, `.nii`, `.nii.gz`, or `.mha` file onto the dropzone
2. Select the patient this scan belongs to (dropdown)
3. Toggle **"Extract Radiomics"** to also compute radiomic features (adds ~10–30s)
4. Click **Upload & Analyze**
5. Results show: tumor volume (cc + mm³), segmentation confidence, subregion breakdown

**Using the 1-Click Sample MRI (Recommended for testing):**
1. Click the **"Load Sample MRI"** button
2. The backend generates a synthetic 128×128×64 volumetric scan and runs the full pipeline
3. You get real segmentation output without needing any MRI files

**Pipeline that runs under the hood:**
```
File Upload → DICOM/NIfTI Parser → Intensity Normalization
→ 3D U-Net Segmentation → Voxel Volume Calculation
→ PyRadiomics Feature Extraction → Results Returned
```

> **File size limit:** Up to 500 MB per upload. Configurable via `MAX_UPLOAD_SIZE_MB` in `.env`.

---

### 7.4 3D WebGL Viewer

**Navigate to:** `Clinical → Segmentation`

Interactive Three.js 3D brain anatomical viewer:

| Control | Action |
|---------|--------|
| **Left-click drag** | Rotate the 3D brain model |
| **Scroll wheel** | Zoom in/out |
| **Right-click drag** | Pan the view |
| **Axial/Coronal/Sagittal buttons** | Snap to anatomical plane views |
| **Tumor Opacity slider** | Adjust tumor mask visibility |
| **Reset Camera** | Return to default orientation |

The viewer renders:
- **Brain anatomy** — semi-transparent gray mesh
- **Tumor subregions** — color-coded (enhancing core: red, necrosis: yellow, edema: blue)
- **Orientation gizmo** — L/R/A/P/S/I labels

> WebGL requires a modern browser. If the 3D viewer is blank, check that hardware acceleration is enabled in your browser settings.

---

### 7.5 Radiomics Analysis

**Navigate to:** `AI Analysis → Radiomics`

Explores the 100+ quantitative imaging biomarkers computed by PyRadiomics:

- **Feature Groups:** Shape & Morphology, First-Order Intensity Statistics, GLCM Texture, GLRLM, GLSZM
- **Interpretation Colors:** Each feature value is color-coded against normal ranges (green = normal, yellow = borderline, red = abnormal)
- **Search & Filter:** Type a feature name to filter the list
- **Clinical Labels:** Raw PyRadiomics keys are automatically translated to human-readable clinical descriptions

**Key features to watch:**
| Feature | Clinical Significance |
|---------|----------------------|
| `shape_Sphericity` | Tumor shape regularity (higher = more spherical = better prognosis) |
| `firstorder_Entropy` | Intra-tumoral heterogeneity (higher = more aggressive) |
| `glcm_Homogeneity` | Tissue texture uniformity |
| `firstorder_Kurtosis` | Intensity distribution peakedness |

---

### 7.6 Digital Twin ODE Simulator

**Navigate to:** `AI Analysis → Digital Twin`

Simulates future tumor growth under 4 therapy regimens simultaneously:

| Regimen | Therapy Intensity (T) | Description |
|---------|----------------------|-------------|
| **Surveillance** | T = 0.0 | No treatment — natural growth |
| **TMZ Low-dose** | T = 1.0 | Temozolomide monotherapy |
| **Stupp Protocol** | T = 2.0 | TMZ + concurrent radiotherapy (standard of care) |
| **Multi-modal** | T = 3.0 | TMZ + RT + bevacizumab (aggressive) |

**Controls:**
- **Simulation Days:** Adjust the forecast horizon (30–365 days)
- **Run Simulation:** Triggers ODE solver for the selected patient
- **Compare All Therapies:** Runs all 4 regimens in parallel and overlays trajectories

**The ODE model:**
```
dV/dt = α·V·(1 - V/K) - β·T(t)·V + ε(t)
```
Parameters α (growth rate) and K (carrying capacity) are automatically calibrated from the patient's longitudinal scan history.

---

### 7.7 RL Therapy Optimizer

**Navigate to:** `AI Analysis → Therapy Optimizer`

Finds the optimal day-by-day therapy intensity schedule using Reinforcement Learning:

**Settings:**
- **Toxicity Budget (λ):** Slider from 0.5 (aggressive tumor control) to 3.0 (gentle, low toxicity). Lower values allow higher-intensity therapy.
- **Treatment Horizon:** Number of days the RL agent plans over
- **Algorithm:** PPO (AI-optimized) or Heuristic (rule-based baseline for comparison)

**How to use:**
1. Ensure a patient is selected (from the Patients tab)
2. Adjust Toxicity Budget to match clinical constraints
3. Click **"Optimize Therapy"**
4. Review the daily therapy intensity chart and the AI's reasoning summary

**Interpreting results:**
- The optimizer outputs a day-by-day intensity schedule (`0.0` to `3.0`)
- High intensity periods = aggressive treatment phases
- Rest periods = toxicity recovery intervals
- Total cumulative toxicity is displayed alongside the optimal schedule

---

### 7.8 Growth Analysis

**Navigate to:** `AI Analysis → Growth Analysis`

Performs longitudinal volume tracking and statistical forecasting:

- **Historical Chart:** Plots all recorded scan volumes over time with date labels
- **Regression Model:** Automatically selects the best-fitting model:
  - **Linear regression** — for stable, slow-growing tumors
  - **Exponential regression** — for rapidly progressing tumors
- **Forecasts:** Generates +30, +60, and +90 day volume predictions with confidence intervals
- **Growth Rate Metrics:** Displays calculated α (proliferation rate), doubling time estimate, and R² goodness-of-fit

---

### 7.9 Survival Analysis

**Navigate to:** `AI Analysis → Survival Analysis`

Generates actuarial survival curves using Cox PH + Weibull models:

- **Kaplan-Meier Curve:** Patient-specific survival probability S(t) over time (months)
- **95% Confidence Interval:** Shaded band around the primary KM curve
- **Benchmark Comparisons:** Overlays 4 published reference cohorts:
  - Stupp 2005 GBM (historical standard)
  - TCGA-GBM (genomic cohort)
  - IDH-mutant Grade 3 (favorable)
  - Recurrent GBM (poor prognosis)
- **Hazard Breakdown Table:** Shows each molecular marker's individual contribution to the overall hazard ratio
- **Key Statistics:** Median OS (months), 6-month survival %, 12-month survival %, 24-month survival %

**Prognostic factors incorporated:**
- IDH1/2 mutation status (HR ≈ 0.45 if mutated — protective)
- MGMT methylation (HR ≈ 0.60 if methylated — protective)
- EGFR amplification (HR ≈ 1.40 — adverse)
- KPS Score (continuous)
- Patient age (continuous)
- Extent of resection (biopsy / partial / gross total)

---

### 7.10 Tumor Board Reports

**Navigate to:** `Reporting → Reports`

Generates a complete multidisciplinary Clinical Tumor Board Summary:

**Report sections include:**
1. Patient demographics and molecular profile
2. Longitudinal scan history with volume progression table
3. Digital Twin ODE simulation summary
4. RL therapy optimization recommendation
5. Actuarial survival statistics with Weibull parameters
6. Clinical attestation signature block

**Export options:**
- **Print / Save as PDF:** Click "Print Report" — browser print dialog opens with print-optimized CSS layout
- **Export JSON:** Downloads the full report data as a structured `.json` file
- **Copy to Clipboard:** Copies the plain-text summary

> For the best PDF output, use Chrome or Edge → Print → "Save as PDF" → Set margins to "Minimum" and enable "Background graphics."

---

### 7.11 System Settings

**Navigate to:** `Reporting → Settings`

Platform diagnostics and configuration:

- **API Ping:** Tests round-trip latency to the backend (click "Ping API")
- **Model Status:** Shows which AI models are loaded and ready
- **Database Info:** Displays patient count, scan count, database size
- **Database Reset:** Wipes all data and re-seeds the 5 demo patients (⚠️ irreversible)
- **Simulation Defaults:** Configure default ODE parameters (α₀, K, β, noise σ)
- **Device Info:** Shows whether CPU or GPU is in use for model inference

---

## 8. Preloaded Clinical Cases

The platform comes pre-loaded with 5 realistic demo cases covering the full spectrum of glioma pathology:

| ID | Patient | Age | Grade | Molecular | Scan History | Status |
|----|---------|-----|-------|-----------|--------------|--------|
| **NDT-001** | Marcus Vance | 58M | IV (GBM) | IDHwt / MGMT− | 32.4 → 41.2 → 52.8 cc | Rapid progression |
| **NDT-002** | Elena Rostova | 34F | II | IDHmut / MGMT+ | 14.2 → 15.1 → 16.0 cc | Indolent / favorable |
| **NDT-003** | David Chen | 47M | III | IDHmut / MGMT− | 21.5 → 25.8 cc | Moderate progression |
| **NDT-004** | Sarah Jenkins | 62F | IV (GBM) | IDHwt / MGMT+ | 45.0 → 31.2 → 22.8 cc | Therapy responder |
| **NDT-005** | Arthur Pendelton | 71M | IV (Recurrent) | IDHwt / EGFR+ | 18.6 → 28.4 cc | Relapse after treatment |

**Recommended exploration order:**
1. Start with **NDT-001** (classic aggressive GBM — worst prognosis baseline)
2. Compare with **NDT-002** (young IDH-mutant — favorable prognosis contrast)
3. Explore **NDT-004** (therapy responder — observe Digital Twin calibration to shrinking tumor)
4. Try **NDT-005** (recurrent + EGFR — see how RL optimizer responds to aggressive phenotype)

---

## 9. API Reference

The full interactive API documentation is available at **`http://localhost:8000/docs`** (Swagger UI) and **`http://localhost:8000/redoc`** (ReDoc).

### Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Platform status and module list |
| `GET` | `/health` | Health check + timestamp |
| `GET` | `/pipeline` | Full 7-stage AI pipeline spec |
| `POST` | `/seed` | Seed / reset demo patient cohort |
| `POST` | `/sample/mri` | Generate synthetic MRI + run full pipeline |
| `POST` | `/upload` | Upload real DICOM/NIfTI → segment → radiomics |
| `POST` | `/predict` | Longitudinal growth prediction (linear/exponential) |
| `GET` | `/patients` | Get all patients with scan history |
| `POST` | `/patient/create` | Create new patient record |
| `GET` | `/patient/{id}` | Get single patient + full scan list |
| `PUT` | `/patient/{id}` | Update patient data |
| `DELETE` | `/patient/{id}` | Delete patient and all scans |
| `POST` | `/scan/save` | Append new scan volume to patient history |
| `POST` | `/interpret` | Map radiomic keys → clinical labels |
| `POST` | `/fusion` | Compute 64-dim Patient State Vector |
| `POST` | `/simulate` | Run ODE Digital Twin simulation |
| `POST` | `/compare-therapies` | Simulate all 4 regimens in parallel |
| `POST` | `/optimize` | PPO RL therapy schedule optimization |
| `POST` | `/survival/predict` | Actuarial survival + KM curve |
| `GET` | `/survival/reference` | Published reference KM cohort data |
| `GET` | `/analytics/overview` | Platform-wide statistics summary |
| `GET` | `/analytics/patient/{id}/report` | Full clinical tumor board report |
| `POST` | `/analytics/cohort` | Filter cohort by biomarker criteria |

### Example API Calls

```bash
# Health check
curl http://localhost:8000/health

# Get all patients
curl http://localhost:8000/patients

# Run Digital Twin simulation for patient NDT-001
curl -X POST http://localhost:8000/simulate \
  -H "Content-Type: application/json" \
  -d '{"patient_id": "NDT-001", "days": 180, "therapy_intensity": 2.0}'

# Predict survival for a patient
curl -X POST http://localhost:8000/survival/predict \
  -H "Content-Type: application/json" \
  -d '{"patient_id": "NDT-001", "age": 58, "kps": 70, "idh_mutant": false, "mgmt_methylated": false}'
```

---

## 10. Running Tests

NDT includes an automated test suite covering all 24 API endpoints and core AI components.

### Full Test Suite

```bash
# Make sure virtual environment is active and backend is NOT running
.venv\Scripts\activate           # Windows
source .venv/bin/activate        # macOS/Linux

# Run all tests with verbose output
pytest tests/ -v --tb=short
```

**Expected output:**
```
tests/test_api.py::test_health_check PASSED
tests/test_api.py::test_root_endpoint PASSED
tests/test_api.py::test_pipeline_spec PASSED
... (21 more tests)
======================= 24 passed in 5.98s =======================
```

### Individual Test Categories

```bash
# Run only health/status tests
pytest tests/ -v -k "health or root or pipeline"

# Run only patient CRUD tests
pytest tests/ -v -k "patient"

# Run only AI pipeline tests (segmentation, RL, survival)
pytest tests/ -v -k "upload or optimize or survival"

# Run with full traceback on failures
pytest tests/ -v --tb=long
```

### Frontend Tests

```bash
cd frontend
npm test              # Run React component tests (watch mode)
npm test -- --watchAll=false  # Run once and exit
npm run build         # Verify production build compiles without errors
```

---

## 11. Configuration Reference

All configuration is managed through environment variables (`.env` file) or `backend/config.py`.

| Variable | Default | Description |
|----------|---------|-------------|
| `DEVICE` | `cpu` | Inference device: `cpu` or `cuda` |
| `DATABASE_URL` | `sqlite:///./backend/ndt.db` | SQLAlchemy database connection string |
| `SECRET_KEY` | `change-me-in-production` | Application secret (used for security tokens) |
| `UPLOAD_DIR` | `./uploads` | Directory for storing uploaded MRI files |
| `BRATS_ROOT` | `./data/brats` | Path to BraTS 2021 dataset (optional) |
| `SEGMENTOR_WEIGHTS` | `./backend/models/weights/unet_brats.pth` | Path to pretrained U-Net weights |
| `API_HOST` | `0.0.0.0` | Host for FastAPI to bind |
| `API_PORT` | `8000` | Port for FastAPI server |
| `MAX_UPLOAD_SIZE_MB` | `500` | Maximum MRI file upload size |
| `SEGMENTOR_IN_CHANNELS` | `1` | U-Net input channels (1 = grayscale MRI) |

---

## 12. Troubleshooting

### Backend Won't Start

**Problem:** `ModuleNotFoundError` or import errors on startup  
**Fix:** Ensure your virtual environment is activated before running uvicorn:
```bash
.venv\Scripts\activate     # Windows
source .venv/bin/activate  # macOS/Linux
cd backend
uvicorn app:app --reload --port 8000
```

---

**Problem:** `Address already in use` — port 8000 is occupied  
**Fix:**
```bash
# Windows — find and kill the process using port 8000
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

---

**Problem:** `pyradiomics` fails to install  
**Fix on Windows:** Install Visual Studio Build Tools (C++ compiler required):
- Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Install **"Desktop development with C++"** workload
- Re-run `pip install -r requirements.txt`

**Fix (alternative):** Use conda-forge if you have Anaconda:
```bash
conda install -c conda-forge pyradiomics
```

---

**Problem:** Database is empty / patients not showing  
**Fix:** Manually trigger the seeder via API:
```bash
curl -X POST http://localhost:8000/seed
```
Or from the UI: **Settings → Database Reset → Re-seed Demo Data**

---

### Frontend Won't Start

**Problem:** `npm start` fails with `node_modules` errors  
**Fix:** Delete and reinstall:
```bash
cd frontend
rm -rf node_modules package-lock.json   # macOS/Linux
rd /s /q node_modules                   # Windows CMD
npm install
npm start
```

---

**Problem:** Frontend shows "Cannot connect to backend" or API calls fail  
**Fix:** Ensure the backend is running at `http://localhost:8000`. Check `frontend/src/api.js` — the `BASE_URL` should be set to `http://localhost:8000`.

---

**Problem:** 3D WebGL viewer shows a blank black canvas  
**Fix:**  
1. Ensure hardware acceleration is enabled in your browser (Chrome: Settings → System → "Use hardware acceleration")  
2. Try a different browser (Chrome or Edge recommended)  
3. Check the browser console (F12) for WebGL errors  

---

**Problem:** `Sample MRI` button returns an error  
**Fix:** This is usually a timeout on slow machines. The backend is running a full U-Net forward pass on CPU. Wait 30–60 seconds and retry. For faster results, enable GPU mode (`DEVICE=cuda` in `.env`).

---

### Docker Issues

**Problem:** `docker-compose up` fails with GPU errors  
**Fix:** Use CPU mode:
```bash
DEVICE=cpu docker-compose up --build
```

**Problem:** Frontend container can't reach backend  
**Fix:** The `REACT_APP_API_URL` in `docker-compose.yml` should match. In Docker, use the service name as host. Check that both containers are on the `ndt-net` network.

---

### Common PyTorch / MONAI Issues

**Problem:** `CUDA out of memory`  
**Fix:** The 3D U-Net processes large volumetric tensors. Reduce input resolution or switch to CPU mode (`DEVICE=cpu`).

**Problem:** MONAI model gives random/garbage segmentation output  
**Fix:** The pretrained weights file may be missing or corrupted. Check that `backend/models/weights/unet_brats.pth` exists. If missing, run:
```bash
cd backend
python models/download_weights.py
```

---

## 13. Security & Privacy Notes

> **⚠️ This platform is NOT HIPAA-compliant for real patient data in its default configuration.**

- **De-identification:** When you upload a DICOM file, the platform strips PHI tags from the DICOM header before processing. However, the raw uploaded file is stored in `./uploads/` — ensure this directory is appropriately secured if used in any institutional context.
- **No authentication:** The API has no authentication by default. All endpoints are publicly accessible. Do not expose port 8000 to the internet in this configuration.
- **SQLite database:** The default SQLite database (`backend/ndt.db`) stores patient records in a local file with no encryption. For production or sensitive research use, switch to PostgreSQL with appropriate access controls.
- **Secret key:** Change `SECRET_KEY` in `.env` to a random 32-character string before any deployment beyond your local machine.
- **Research only:** All 5 pre-seeded patient records are entirely synthetic (fictional). No real patient data is included in this repository.

---

## 14. Key Files Quick Reference

| File | Purpose | When to Edit |
|------|---------|--------------|
| [`backend/app.py`](backend/app.py) | FastAPI app entry point, middleware, routers | Adding new routers, global middleware |
| [`backend/config.py`](backend/config.py) | All configuration variables | Adding new config options |
| [`backend/database.py`](backend/database.py) | SQLAlchemy ORM models, DB session | Adding new database tables/columns |
| [`backend/seed_data.py`](backend/seed_data.py) | Demo cohort data | Changing demo patients or scan data |
| [`backend/models/segmentor.py`](backend/models/segmentor.py) | 3D U-Net model definition | Changing model architecture |
| [`backend/models/rl_agent.py`](backend/models/rl_agent.py) | PPO agent + Gymnasium environment | Modifying reward function, action space |
| [`backend/models/survival.py`](backend/models/survival.py) | Cox PH + Weibull survival model | Updating hazard ratios, survival params |
| [`backend/models/twin.py`](backend/models/twin.py) | ODE tumor growth model | Modifying the growth ODE equations |
| [`backend/utils/radiomics_engine.py`](backend/utils/radiomics_engine.py) | PyRadiomics feature extraction | Adding/removing radiomic features |
| [`frontend/src/App.js`](frontend/src/App.js) | Navigation, routing, global state | Adding new pages/tabs |
| [`frontend/src/api.js`](frontend/src/api.js) | All frontend API calls | Adding new API integrations |
| [`frontend/src/index.css`](frontend/src/index.css) | Global dark theme styles | UI style changes |
| [`tests/test_api.py`](tests/test_api.py) | Automated test suite | Adding new endpoint tests |
| [`.env.example`](.env.example) | Environment variable template | Adding new config options |
| [`docker-compose.yml`](docker-compose.yml) | Container orchestration | Deployment configuration |
| [`requirements.txt`](requirements.txt) | Python dependencies | Adding new Python packages |

---

## Access URLs Summary

| Service | URL |
|---------|-----|
| **React Dashboard** | http://localhost:3000 |
| **FastAPI Backend** | http://localhost:8000 |
| **Swagger API Docs** | http://localhost:8000/docs |
| **ReDoc API Docs** | http://localhost:8000/redoc |
| **Health Check** | http://localhost:8000/health |
| **Pipeline Spec** | http://localhost:8000/pipeline |

---

*NeuroDigital Twin (NDT) — Accelerating Computational Oncology, One Patient at a Time.*

*For questions, contributions, or issues, refer to the project repository or open an issue with full logs from both terminal windows.*
