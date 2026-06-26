# 🧠 MindfulMomentum

**An AI-Powered "n-of-1" Mental Wellness & Health Data Fusion Architecture**  
*Master of Computer Applications (MCA) Major Project*

---

## 📖 Project Overview

MindfulMomentum is an advanced digital health application that bridges the gap between objective physiological data (sleep, steps, heart rate) and subjective psychological states (mood, journal entries).

Unlike generic health apps, this architecture uses an **n-of-1 Machine Learning approach** — it trains an individualized Random Forest model *per user* to discover the unique biological drivers of that person's mood, while NLP extracts emotional themes from daily journals.

---

## 🏗️ System Architecture

```
Main_Project/
├── backend/            ← Python FastAPI + AI/ML models
│   ├── app.py          ← API server entry point
│   ├── mindful_nlp.py  ← VADER sentiment & theme extraction
│   ├── mindful_ml.py   ← Random Forest ML pipeline
│   ├── Data/           ← PMData training datasets (CSV)
│   ├── saved_models/   ← Serialized (pickled) per-user models
│   ├── output_graphs/  ← Generated confusion matrix & feature graphs
│   └── requirements.txt
└── mobile-app/         ← React Native (Expo SDK 56) frontend
    ├── app/            ← File-based routing (expo-router)
    │   ├── (tabs)/
    │   │   ├── home.tsx        ← Dashboard (Health Connect sync)
    │   │   ├── insights.tsx    ← ML Insight viewer
    │   │   └── journal/        ← Journal list, create, view screens
    │   └── metric/[id].tsx     ← Metric detail drill-down
    ├── lib/api.ts      ← ⚠️  Backend URL config (change this!)
    ├── services/
    │   └── mindfulApi.ts
    └── app.json        ← Expo config + Android permissions
```

---

## ⚙️ Prerequisites

### Backend
| Tool | Minimum Version |
|------|----------------|
| Python | 3.11+ |
| pip / venv | any |

### Mobile App
| Tool | Minimum Version |
|------|----------------|
| Node.js | 18+ |
| npm | 9+ |
| Expo CLI | (installed via npx, no global install needed) |
| Android device / emulator | Android 8.0+ (API 26+) |

> **Note:** The app uses `react-native-health-connect` which requires a **native development build**. It will NOT work in the standard Expo Go app.

---

## 🚀 Setup & Run Guide

### Step 1 — Clone and enter the project

```bash
git clone <repo-url>
cd Main_Project
```

---

### Step 2 — Backend Setup

```bash
cd backend

# Create a virtual environment
python3 -m venv .venv

# Activate it
source .venv/bin/activate          # Linux / macOS (bash/zsh)
source .venv/bin/activate.fish     # Linux / macOS (fish shell)
# .venv\Scripts\activate           # Windows

# Install all dependencies
pip install -r requirements.txt

# Download required NLTK data (first-time only)
python3 -c "import nltk; nltk.download('averaged_perceptron_tagger_eng'); nltk.download('stopwords')"
```

#### Start the backend server

```bash
# Must be inside backend/ with .venv activated
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

The API will be live at `http://localhost:8000`.  
Verify it works: `curl http://localhost:8000/api/get-insight/p01`

---

### Step 3 — Mobile App Setup

```bash
cd mobile-app

# Install JS dependencies
npm install
```

#### ⚠️ Configure the Backend URL

Open `mobile-app/lib/api.ts` and update the IP address to match **your computer's local Wi-Fi IP**:

```typescript
// mobile-app/lib/api.ts
const DEFAULT_API_BASE_URL = 'http://YOUR_COMPUTER_IP:8000';
```

**How to find your computer's IP:**
- **Linux/macOS:** Run `hostname -I` in a terminal — use the first IP shown
- **Windows:** Run `ipconfig` → look for "IPv4 Address"  
- **Quick way:** The IP shows up in the Expo terminal when you run `npx expo start` → look for `› Metro: exp://YOUR_IP:8081`

> **Rules:**
> - Physical Android phone → use your **computer's local Wi-Fi IP** (e.g. `192.168.0.122`)
> - Android Emulator only → use `10.0.2.2` instead
> - Phone and computer **must be on the same Wi-Fi network**

---

### Step 4 — Build & Run the Mobile App

Because this app uses native Android modules, you must do a **native build** — not use Expo Go.

#### First time (compiles native Android code with Gradle):

```bash
cd mobile-app
npx expo run:android
```

This installs the full native dev build on your connected device or emulator. It takes a few minutes the first time and requires the Android SDK to be installed.

#### All subsequent runs (reuses the installed native build):

```bash
cd mobile-app
npx expo start
```

Then press `a` to open on Android.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze-journal` | NLP sentiment analysis on journal text |
| `GET`  | `/api/get-insight/{user_id}` | Runs ML pipeline, returns mood insight |

### Example — analyze a journal entry
```bash
curl -X POST http://localhost:8000/api/analyze-journal \
  -H "Content-Type: application/json" \
  -d '{"text": "Today was stressful but I managed to go for a walk."}'
```

### Example — get ML insight for a user
```bash
curl http://localhost:8000/api/get-insight/p01
```

Valid user IDs: `p01` through `p16` (from the PMData research dataset included in `backend/Data/`)

---

## 🤖 AI Models

### Model 1: NLP Engine (`mindful_nlp.py`)
- **Sentiment:** VADER-based; splits text into sentences to avoid sentiment dilution
- **Scoring:** Grades mood on a **1–5 scale**
- **Themes:** NLTK POS tagging extracts the Top 5 emotional keyword themes (nouns + adjectives)

### Model 2: ML Correlation Engine (`mindful_ml.py`)
- **Algorithm:** Random Forest Classifier with hyperparameter tuning
- **Data:** Fuses PMData Fitbit logs + wellness surveys into a unified time-series
- **Features:** Lag variables and rolling averages (e.g. "Sleep Debt")
- **Balancing:** Dynamic SMOTE to fix sparse/imbalanced mood labels
- **Output:** Top biological driver of mood + % feature importance rankings
- **Caching:** Models serialized to `saved_models/` — instant response on subsequent calls

---

## 📱 App Screens

| Screen | Description |
|--------|-------------|
| **Dashboard** | Real-time health metrics (steps, calories, sleep, heart rate) via Android Health Connect. Pull-to-refresh. Composite readiness score. |
| **Insights** | Per-user ML insight: top mood driver, feature importances, model input snapshot. Switcher for all 16 demo users. |
| **Journal List** | All saved journal entries sorted newest-first. Edit or delete from the list. |
| **Journal Create/Edit** | Write or edit a journal entry with a title, body, and date picker. |
| **Journal View** | Entry detail with auto-triggered NLP analysis (mood score + themes). Analysis is cached — only re-runs if the entry text changes. |
| **Metric Detail** | Drill-down for each health metric with a historical bar chart. |

---

## 🔧 Things You May Need to Change

| File | What to change | When |
|------|---------------|------|
| `mobile-app/lib/api.ts` | `DEFAULT_API_BASE_URL` | Every time you switch Wi-Fi networks or devices |
| `mobile-app/app.json` | `android.package` | When publishing to the Play Store |
| `mobile-app/app.json` | `name` / `slug` | When publishing / renaming the app |
| `backend/requirements.txt` | Add packages | When extending the ML pipeline |

---

## 🛠️ Troubleshooting

| Problem | Fix |
|---------|-----|
| `fetch failed` / spinners never stop | Backend is not running, or the IP in `lib/api.ts` is wrong. Start the server and verify the IP matches your computer's current Wi-Fi address. |
| `react-native-health-connect not linked` | You are running in Expo Go. Run `npx expo run:android` to build the native dev client instead. |
| `spawn adb ENOENT` | Android SDK is not on your PATH. Set `ANDROID_HOME` to your SDK path and add `$ANDROID_HOME/platform-tools` to `PATH`. |
| White screen on launch | Clear the Metro cache: `npx expo start --clear` |
| ML model error for a specific user | That user may have fewer than 5 days of data in the PMData CSV. Try a different user ID (`p01`–`p16`). |
| Backend crash on startup | Run `pip install -r requirements.txt` again and confirm your Python version is 3.11+. |

---

## 🔬 Dataset

This project uses the [PMData](https://datasets.simula.no/pmdata/) open research dataset — a longitudinal dataset of Fitbit physiological data and daily wellness self-reports from 16 participants over several months. The data lives in `backend/Data/`.
