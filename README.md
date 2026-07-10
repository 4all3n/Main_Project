# 🧠 MindfulMomentum

**An AI-Powered "n-of-1" Mental Wellness & Health Data Fusion System**  
*Master of Computer Applications (MCA) Major Project*

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://python.org)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%20SDK%2056-purple.svg)](https://expo.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)

---

## 📖 Project Overview

MindfulMomentum is an advanced AI-powered digital health application that bridges the gap between **objective physiological data** (sleep, steps, heart rate from wearables) and **subjective psychological states** (mood, journal sentiment).

The project consists of three tightly coupled components:

1. **Research Pipeline** — A full ML/NLP research system built over the [PMData](https://datasets.simula.no/pmdata/) dataset, producing publishable results on multi-modal mood prediction.
2. **FastAPI Backend** — A production Python server that runs personalized ML inference and NLP analysis.
3. **React Native Mobile App** — A native Android app (Expo SDK 56) that syncs health data from Android Health Connect and visualises ML-driven insights.

### Core Research Hypothesis

> *Fusing deep-learning NLP sentiment signals from daily journal entries with physiological wearable data significantly improves personalised mood prediction accuracy over wearable data alone.*

Our ablation study over 16 users confirmed this with a **Wilcoxon signed-rank test p-value of 0.0077** (p < 0.05), proving statistical significance.

---

## 🏗️ Repository Structure

```
Main_Project/
│
├── backend/                        ← Python FastAPI + AI/ML production server
│   ├── app.py                      ← API entry point (FastAPI routes)
│   ├── mindful_nlp.py              ← NLP engine (VADER sentiment + theme extraction)
│   ├── mindful_ml.py               ← ML engine (Random Forest fusion pipeline)
│   ├── requirements.txt            ← Backend Python dependencies
│   ├── Data/                       ← PMData research dataset CSVs (git-ignored)
│   │   └── pmdata/
│   │       └── pXX/                ← Per-user folders (p01 – p16)
│   │           ├── fitbit/         ← Fitbit physiological logs (sleep, steps, HR)
│   │           ├── pmsys/          ← Wellness self-report CSVs (srpe.csv etc.)
│   │           └── wellness.csv    ← Daily mood + wellness questionnaire
│   ├── saved_models/               ← Serialized per-user ML models (git-ignored)
│   └── output_graphs/              ← Generated confusion matrices + feature charts (git-ignored)
│
├── mobile-app/                     ← React Native (Expo SDK 56) Android app
│   ├── app/                        ← File-based routing via expo-router
│   │   ├── (tabs)/
│   │   │   ├── home.tsx            ← Dashboard: Health Connect sync, readiness score
│   │   │   ├── insights.tsx        ← ML insight viewer: top driver, feature importance
│   │   │   └── journal/            ← Journal screens: list, create/edit, view + NLP
│   │   └── metric/[id].tsx         ← Metric drill-down with historical bar chart
│   ├── lib/
│   │   └── api.ts                  ← ⚠️ Backend base URL config (MUST change this!)
│   ├── services/
│   │   └── mindfulApi.ts           ← API service layer (typed fetch wrappers)
│   ├── providers/                  ← React context providers
│   ├── components/                 ← Reusable UI components
│   ├── hooks/                      ← Custom React hooks
│   ├── constants/                  ← App-wide constants (colors, config)
│   ├── assets/                     ← App icons, splash screen, fonts
│   ├── app.json                    ← Expo config + Android permissions
│   ├── package.json
│   └── tsconfig.json
│
├── research/                       ← Standalone ML/NLP research pipeline
│   ├── notebooks/                  ← Jupyter notebooks (also available as .py scripts)
│   │   ├── 01_data_exploration.py/.ipynb     ← EDA: distributions, correlations
│   │   ├── 02_feature_engineering.py/.ipynb  ← Feature creation: lag, rolling, SRPE
│   │   ├── 03_ml_model_comparison.py/.ipynb  ← Optuna hyperparameter tuning, N-of-1
│   │   ├── 04_nlp_vader_vs_bert.py/.ipynb    ← VADER vs. RoBERTa vs. Sentence-BERT
│   │   └── 05_fusion_experiment.py/.ipynb    ← Ablation study + Wilcoxon test
│   ├── figures/                    ← Generated publication-ready figures (PNG)
│   │   ├── data_availability.png
│   │   ├── mood_distribution.png
│   │   ├── correlation_heatmap.png
│   │   ├── model_comparison_bar.png
│   │   └── fusion_ablation_bar.png
│   ├── results/                    ← CSV result tables + per-user JSON model configs
│   │   ├── model_comparison.csv
│   │   ├── nlp_comparison.csv
│   │   ├── fusion_ablation.csv
│   │   └── best_params_pXX.json   ← Optuna best hyperparameters per user (p01–p16)
│   ├── fine_tuned_model/           ← Saved fine-tuned RoBERTa weights (git-ignored)
│   ├── requirements_research.txt   ← Research-only Python dependencies
│   └── .venv/                      ← Research virtual environment (git-ignored)
│
├── BACKEND_PLAN.md                 ← Detailed backend implementation roadmap
├── FRONTEND_PLAN.md                ← Detailed frontend implementation roadmap
├── PROJECT_ROADMAP.md              ← Master project roadmap (research → backend → frontend)
├── LICENSE                         ← GNU GPL v3
└── README.md                       ← This file
```

---

## 🔬 Research Results

The research pipeline (`research/`) implements a full empirical study.

### Experiment 1: Personalized Model Selection (N-of-1)

Using `TimeSeriesSplit` cross-validation (to prevent data leakage) and Optuna hyperparameter tuning, we trained and evaluated 6 model families (Random Forest, XGBoost, LightGBM, Logistic Regression, SVM, KNN) for each of the 16 PMData users independently:

| User | Best Model | Macro F1 |
|------|-----------|---------|
| p01 | LightGBM | 0.654 |
| p02 | LightGBM | 1.000 |
| p03 | RandomForest | 0.653 |
| p04 | LightGBM | 0.377 |
| p05 | XGBoost | 0.752 |
| p06 | XGBoost | 1.000 |
| p07 | LogisticRegression | 0.737 |
| p08 | RandomForest | 0.504 |
| p09 | XGBoost | 0.612 |
| p10 | XGBoost | 0.598 |
| p11 | LightGBM | 0.830 |
| p12 | KNN | 0.829 |
| p13 | LogisticRegression | 0.476 |
| p14 | RandomForest | 1.000 |
| p15 | SVM | 0.602 |
| p16 | LightGBM | 0.483 |

**Finding:** No single model wins across users — this validates the need for the **n-of-1 personalized architecture**.

### Experiment 2: NLP Ablation Study (Core Research Contribution)

We tested four incremental feature set configurations on all 16 personalized models:

| Configuration | Features | Mean Macro F1 |
|--------------|---------|--------------|
| **A** — Wearable Only | Fitbit sensors only (steps, sleep, HR, calories, activity) | 0.630 |
| **B** — Wearable + Wellness | A + self-report surveys (fatigue, stress, readiness, sleep quality) | 0.674 |
| **C** — B + NLP Emotions | B + RoBERTa-derived emotion probabilities (joy, sadness, anger) | **0.793** |
| **D** — C + Semantic Themes | C + Sentence-BERT journal topic clusters | 0.791 |

**Statistical Test:** Wilcoxon signed-rank (B vs C): **p = 0.0077 < 0.05**  
**Conclusion:** Adding deep-learning NLP features provides a statistically significant **+11.9% absolute improvement** in mood prediction F1.

---

## ⚙️ Prerequisites

### Backend & Research
| Tool | Version |
|------|---------|
| Python | **3.11+** |
| pip / venv | any |

### Mobile App
| Tool | Version |
|------|---------|
| Node.js | **18+** |
| npm | **9+** |
| Expo CLI | Installed via `npx` (no global install needed) |
| Android SDK | API Level 26+ (Android 8.0 Oreo+) |
| Android Device / Emulator | Android 8.0+ with Health Connect installed |

> **⚠️ Important:** The app uses `react-native-health-connect` which requires a **native development build**. It will **NOT** work in the standard Expo Go app. See Step 4 below.

---

## 🚀 Setup & Run Guide

### Step 1 — Clone the repository

```bash
git clone <repo-url>
cd Main_Project
```

---

### Step 2 — Download the PMData Dataset

The raw dataset is not included in the repository (it's ~1 GB). Download it from the official source and place it at the correct path.

1. Download from: **https://datasets.simula.no/pmdata/**
2. Extract the archive so the structure looks like:

```
backend/Data/pmdata/p01/wellness.csv
backend/Data/pmdata/p01/fitbit/
backend/Data/pmdata/p01/pmsys/srpe.csv
...
backend/Data/pmdata/p16/
```

---

### Step 3 — Backend Setup

```bash
cd backend

# Create a virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate          # Linux / macOS (bash/zsh)
source .venv/bin/activate.fish     # Linux / macOS (fish shell)
# .venv\Scripts\activate           # Windows PowerShell

# Install all dependencies
pip install -r requirements.txt

# Download required NLTK data (first-time only)
python3 -c "import nltk; nltk.download('averaged_perceptron_tagger_eng'); nltk.download('stopwords')"
```

#### Start the backend server

```bash
# Make sure you are inside backend/ with .venv activated
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The API is now live at `http://localhost:8000`.  
Verify it works:
```bash
curl http://localhost:8000/api/get-insight/p01
```

---

### Step 4 — Mobile App Setup

```bash
cd mobile-app

# Install JavaScript dependencies
npm install
```

#### ⚠️ Configure the Backend URL

Open [`mobile-app/lib/api.ts`](mobile-app/lib/api.ts) and set the IP to your **computer's local Wi-Fi IP address**:

```typescript
// mobile-app/lib/api.ts
const DEFAULT_API_BASE_URL = 'http://YOUR_COMPUTER_IP:8000';
// Example: const DEFAULT_API_BASE_URL = 'http://192.168.0.122:8000';
```

**How to find your computer's IP:**
- **Linux/macOS:** `hostname -I` → use the first IP shown
- **Windows:** `ipconfig` → look for "IPv4 Address"
- **Quick way:** Look at the Expo terminal output → `› Metro: exp://YOUR_IP:8081`

> **Rules:**
> - Physical Android phone → use **computer's local Wi-Fi IP** (e.g. `192.168.0.122`)
> - Android Emulator only → use `10.0.2.2` instead
> - Phone and computer **must be on the same Wi-Fi network**

#### Build & Install the Native App (First Time Only)

Because the app uses native Android modules, a **native build** is required — you cannot use Expo Go.

```bash
cd mobile-app

# Compiles native Android code with Gradle and installs on device
# Requires Android SDK + a connected device (USB debugging on) or running emulator
npx expo run:android
```

This takes a few minutes the first time. The compiled `.apk` is installed directly on your device.

#### All Subsequent Runs

```bash
cd mobile-app
npx expo start
# Then press 'a' to open on Android
```

---

### Step 5 — Research Environment Setup (Optional)

The `research/` directory has its own isolated virtual environment and dependencies separate from the production backend.

```bash
cd research

# Create the research virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate

# Install all research dependencies
pip install -r requirements_research.txt

# (Optional) Install Jupyter kernel to run .ipynb files
pip install jupyter
```

#### Run the notebooks

```bash
# Option A — Run as plain Python scripts
cd research/notebooks
python 01_data_exploration.py
python 02_feature_engineering.py
python 03_ml_model_comparison.py
python 04_nlp_vader_vs_bert.py
python 05_fusion_experiment.py

# Option B — Open as Jupyter Notebooks
cd research
jupyter notebook
```

> **Note:** Notebooks must be run in order (01 → 05) as each step generates output files consumed by the next.

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/api/analyze-journal` | NLP analysis on journal text (sentiment + themes) |
| `GET` | `/api/get-insight/{user_id}` | ML insight for a user (mood driver, feature importances) |

### Example — Analyze a journal entry

```bash
curl -X POST http://localhost:8000/api/analyze-journal \
  -H "Content-Type: application/json" \
  -d '{"text": "Today was stressful but I managed to go for a walk. Feeling a bit better."}'
```

**Response:**
```json
{
  "mood_score": 3.2,
  "sentiment": "mixed",
  "themes": ["stress", "walk", "better", "feeling", "managed"]
}
```

### Example — Get ML insight

```bash
curl http://localhost:8000/api/get-insight/p01
```

**Response:**
```json
{
  "user_id": "p01",
  "top_driver": "deep_sleep_in_minutes",
  "mood_class": "Normal",
  "feature_importances": { "deep_sleep_in_minutes": 0.31, "steps": 0.22, ... }
}
```

**Valid user IDs:** `p01` through `p16` (corresponding to PMData participants)

---

## 🤖 AI Models

### NLP Engine — `mindful_nlp.py`
- **Sentiment analysis:** VADER lexicon-based analyzer; processes text sentence-by-sentence to avoid dilution
- **Mood scoring:** Maps compound VADER score to a **1–5 scale** (Very Negative → Very Positive)
- **Theme extraction:** NLTK POS tagging identifies the top 5 emotionally significant nouns and adjectives

### ML Fusion Engine — `mindful_ml.py`
- **Algorithm:** Random Forest Classifier (production) — upgradeable to personalized LightGBM/XGBoost per-user
- **Dataset:** Fuses PMData Fitbit physiological logs + daily wellness self-reports
- **Features (22+):** Includes lag variables and rolling averages: `sleep_debt`, `fatigue_3d_mean`, `stress_trend`, `readiness_change`, SRPE load metrics
- **Target:** 3-class mood system: `Low`, `Normal`, `High`
- **Class balancing:** Dynamic SMOTE oversampling for sparse/imbalanced labels
- **Personalization:** Per-user model files saved to `backend/saved_models/` — instant inference on subsequent calls
- **Feature importance:** Returns the single top biological driver of mood for that user

### Research NLP Models — `research/`
- **RoBERTa (`cardiffnlp/twitter-roberta-base-sentiment-latest`):** Pre-trained transformer for nuanced sentiment (handles sarcasm, negation)
- **Fine-tuned RoBERTa:** Trained on GoEmotions dataset (28 emotion classes); weights saved to `research/fine_tuned_model/`
- **Sentence-BERT (`all-MiniLM-L6-v2`):** Generates semantic embeddings; K-Means clustering extracts journal themes (sleep disturbance, work stress, exercise)

---

## 📱 App Screens

| Screen | File | Description |
|--------|------|-------------|
| **Dashboard** | `app/(tabs)/home.tsx` | Real-time health metrics from Android Health Connect (steps, calories, sleep stages, resting heart rate). Pull-to-refresh. Composite readiness score. Auto-syncs on focus. |
| **Insights** | `app/(tabs)/insights.tsx` | Per-user ML mood insight: top biological driver, feature importance bar chart, model input snapshot. User ID switcher for all 16 demo users. |
| **Journal List** | `app/(tabs)/journal/` | All saved journal entries sorted newest-first. Swipe-to-delete, tap to view. |
| **Journal Create/Edit** | `app/(tabs)/journal/create.tsx` | Write or edit a journal entry with title, body text area, and date picker. |
| **Journal View** | `app/(tabs)/journal/[id].tsx` | Full entry with auto-triggered NLP analysis on open (mood score 1–5 + keyword themes). Analysis result is cached in AsyncStorage — only re-runs if the text changes. |
| **Metric Detail** | `app/metric/[id].tsx` | Drill-down for any health metric with a 7-day historical bar chart. |

---

## 🔧 Things You Need to Change

| File | What to Change | When |
|------|---------------|------|
| `mobile-app/lib/api.ts` | `DEFAULT_API_BASE_URL` — set to your computer's LAN IP | Every time you switch networks or change devices |
| `mobile-app/app.json` | `android.package` — reverse domain name | When publishing to the Play Store |
| `mobile-app/app.json` | `name` / `slug` | When renaming the app |
| `backend/requirements.txt` | Add packages | When extending the backend ML pipeline |
| `research/requirements_research.txt` | Add packages | When adding new research experiments |

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| `fetch failed` / API spinners never stop | Backend is not running, or the IP in `mobile-app/lib/api.ts` is wrong. Start the server (`uvicorn app:app --host 0.0.0.0 --port 8000`) and verify the IP matches your computer's current Wi-Fi IP. |
| `react-native-health-connect not linked` | You are running in Expo Go. Run `npx expo run:android` to build and install the full native dev client. |
| `spawn adb ENOENT` | Android SDK is not on your `PATH`. Set `ANDROID_HOME` to your SDK directory and add `$ANDROID_HOME/platform-tools` to `PATH`. |
| White screen on launch | Clear the Metro cache: `npx expo start --clear` |
| ML model error for a specific user | That user may have insufficient data in the PMData CSVs. Try `p01` (most data). |
| Backend crash on startup | Run `pip install -r requirements.txt` inside `backend/` with venv activated. Confirm Python version is 3.11+. |
| `ModuleNotFoundError` in research scripts | Run `pip install -r requirements_research.txt` inside `research/` with the research `.venv` activated. |
| Research notebook step fails | Notebooks must run in order (01 → 05). Make sure earlier steps generated their output files in `research/results/`. |
| `HfUriError` from HuggingFace datasets | Use the full `namespace/dataset-name` format, e.g. `google-research-datasets/go_emotions`. |
| Fine-tuned model not found | Run `04_nlp_vader_vs_bert.py` first — it downloads and saves the model to `research/fine_tuned_model/`. |

---

## 📦 Dependencies

### Backend (`backend/requirements.txt`)
```
fastapi
uvicorn
scikit-learn
pandas
numpy
nltk
imbalanced-learn
```

### Mobile App (key packages from `mobile-app/package.json`)
| Package | Purpose |
|---------|---------|
| `expo` (SDK 56) | Core framework |
| `expo-router` | File-based navigation |
| `react-native-health-connect` | Android Health Connect API |
| `@react-native-async-storage/async-storage` | Local data persistence |
| `react-native-gifted-charts` | Health metric bar charts |

### Research (`research/requirements_research.txt`)
| Package | Purpose |
|---------|---------|
| `torch` + `transformers` | RoBERTa fine-tuning & inference |
| `sentence-transformers` | Sentence-BERT semantic embeddings |
| `datasets` + `accelerate` | HuggingFace dataset loading & training |
| `xgboost` + `lightgbm` | Gradient boosting model comparison |
| `optuna` | Hyperparameter tuning |
| `scikit-learn` | ML pipeline, cross-validation, metrics |
| `imbalanced-learn` | SMOTE class balancing |
| `pandas` + `numpy` | Data manipulation |
| `matplotlib` + `seaborn` | Figure generation |
| `jupytext` | Sync `.py` ↔ `.ipynb` notebooks |
| `nltk` | VADER sentiment, POS tagging |

---

## 🔬 Dataset

This project uses the [**PMData**](https://datasets.simula.no/pmdata/) open research dataset — a longitudinal dataset of Fitbit physiological data and daily wellness self-reports from 16 athletic participants collected over several months.

**Citation:**
> Thambawita, V., Hicks, S., Borgli, H., et al. (2020). PMData: a sports logging dataset. *Proceedings of the 11th ACM Multimedia Systems Conference (MMSys '20)*. ACM.

- 16 participants (`p01` – `p16`)
- Data modalities: Fitbit (sleep stages, steps, heart rate, calories, active minutes) + daily wellness survey (mood, fatigue, stress, readiness, sleep quality) + SRPE training load
- Place at: `backend/Data/pmdata/`

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0**. See [LICENSE](LICENSE) for full details.
