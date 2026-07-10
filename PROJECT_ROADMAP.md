# 🧠 MindfulMomentum — Complete Project Roadmap

> **Mission:** Build a publishable research-grade personalized mood prediction system using wearable data and transformer-based NLP, demonstrated through a working Android app.

> **Paper Target:** Sensors (MDPI) / IEEE ICHI  
> **Timeline:** ~20 weeks total across all three phases

---

## How to Read This Document

This roadmap has three phases in execution order:
1. **Research** — Jupyter notebooks, experiments, benchmarks, paper figures
2. **Backend** — Production Python API that powers the app
3. **Frontend** — The Android app the user actually sees

Research feeds Backend. Backend feeds Frontend. **Do not skip ahead.**

```
Research Notebooks  →  Best Model Params  →  Backend Production Code
Backend API         →  JSON Responses     →  Frontend Screens
Frontend Mood Data  →  Real User Labels   →  Research Validation
```

---

# PART 1 — RESEARCH

> **What it is:** A separate `research/` folder containing Jupyter notebooks for all experiments. Nothing here touches the live app. This is where you generate the numbers, graphs, and tables that go in the paper.

## Setup First: Create the Research Folder

```
Main_Project/
├── backend/          ← Production API (untouched during research)
├── mobile-app/       ← Android app (untouched during research)
└── research/         ← NEW — create this
    ├── notebooks/
    │   ├── 01_data_exploration.ipynb
    │   ├── 02_feature_engineering.ipynb
    │   ├── 03_ml_model_comparison.ipynb
    │   ├── 04_nlp_vader_vs_bert.ipynb
    │   └── 05_fusion_experiment.ipynb
    ├── results/       ← CSVs of benchmark numbers
    ├── figures/       ← Paper-ready PNG/PDF plots
    └── requirements_research.txt
```

**research/requirements_research.txt:**
```
# All the heavy stuff lives here — not in the app backend
torch
transformers
datasets
sentence-transformers
xgboost
lightgbm
optuna
matplotlib
seaborn
scikit-learn
imbalanced-learn
pandas
jupyter
```

---

## Research Step 1 — Data Exploration

**Notebook:** `01_data_exploration.ipynb`  
**Goal:** Understand what data you actually have before modelling anything.

### What to do:
- Load all 16 participants' data
- For each participant, count how many complete days exist
- Print a "data availability matrix" — which files exist for which users
- Check the `mood` score distribution across all users (is it skewed toward high scores? That explains why binary classification was too simple)
- Check correlation matrix between all features and the mood target
- Identify which features have the most missing values (NaN)
- **Output:** `figures/data_availability.png`, `figures/mood_distribution.png`, `figures/correlation_heatmap.png`

### Key finding to look for:
The `mood` column will likely be skewed (most days rated 3–4, few rated 1 or 7). This directly justifies your 3-class target and explains why accuracy alone is misleading.

---

## Research Step 2 — Feature Engineering

**Notebook:** `02_feature_engineering.ipynb`  
**Goal:** Build the full 22+ feature dataset that the current production code ignores.

### Unused data to add:

**From `wellness.csv`:**
- `fatigue` — self-reported physical fatigue (1–7)
- `readiness` — self-reported readiness to train (1–7)
- `sleep_quality` — subjective sleep quality (1–7)
- `sleep_duration_h` — self-reported hours slept
- `soreness` — muscle soreness (1–7)
- `stress` — self-reported stress level (1–7)

**From `fitbit/`:**
- `calories.json` — total daily calories burned
- `exercise.json` — workout duration and type
- `lightly_active_minutes.json` — light movement minutes
- `moderately_active_minutes.json` — moderate activity minutes
- `very_active_minutes.json` — vigorous activity minutes
- `heart_rate.json` — compute daily HRV (Heart Rate Variability) from intraday data
- `time_in_heart_rate_zones.json` — fat burn / cardio / peak zone minutes
- `resting_heart_rate.json` — 7-day rolling average (chronic stress indicator)

**From `pmsys/srpe.csv`:**
- Session RPE (Rate of Perceived Exertion) — training load

### Lag features to engineer:
```python
# Sleep debt — how tired are you from recent nights?
df['sleep_3d_avg']         = df['overall_score'].rolling(3).mean()
df['sleep_7d_avg']         = df['overall_score'].rolling(7).mean()
df['sleep_score_yesterday'] = df['overall_score'].shift(1)

# Activity carry-over
df['steps_yesterday']      = df['steps'].shift(1)
df['steps_3d_avg']         = df['steps'].rolling(3).mean()

# Wellness trend
df['fatigue_yesterday']    = df['fatigue'].shift(1)
df['stress_yesterday']     = df['stress'].shift(1)
df['fatigue_3d_avg']       = df['fatigue'].rolling(3).mean()
```

### Target variable — switch to 3-class:
```python
def mood_to_class(score):
    if score <= 2: return 'Low'
    if score <= 4: return 'Neutral'
    return 'High'

df['mood_class'] = df['mood'].apply(mood_to_class)
```

**Output:** A clean function `build_feature_dataset(user_id)` that any subsequent notebook can import.  
Save the merged dataset for each user to `results/features_p01.csv`, etc.

---

## Research Step 3 — ML Model Comparison

**Notebook:** `03_ml_model_comparison.ipynb`  
**Goal:** Find the best classifier across all 16 users. This becomes **Table 2** in the paper.

### Cross-validation — MUST use TimeSeriesSplit:
```python
from sklearn.model_selection import TimeSeriesSplit
# NOT train_test_split — mood data is temporal, random shuffling leaks the future
tscv = TimeSeriesSplit(n_splits=5)
```

### Models to compare:
| Model | Library | Notes |
|-------|---------|-------|
| Random Forest | scikit-learn | Current baseline |
| XGBoost | xgboost | Usually best on small tabular data |
| LightGBM | lightgbm | Faster XGBoost variant |
| Logistic Regression | scikit-learn | Linear baseline |
| SVM (RBF kernel) | scikit-learn | Classical benchmark |
| K-Nearest Neighbours | scikit-learn | Simplest baseline |

### Hyperparameter tuning with Optuna (better than GridSearchCV):
```python
import optuna

def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 100, 500),
        'max_depth': trial.suggest_int('max_depth', 2, 10),
        'min_samples_split': trial.suggest_int('min_samples_split', 2, 20),
    }
    model = RandomForestClassifier(**params, random_state=42)
    # cross-validate with tscv, return macro F1
    ...

study = optuna.create_study(direction='maximize')
study.optimize(objective, n_trials=100)
```

### Metrics to report for each model:
```python
from sklearn.metrics import (
    classification_report, roc_auc_score,
    matthews_corrcoef, ConfusionMatrixDisplay
)
```

- **Macro F1** (main metric — unbiased across class sizes)
- **Per-class Precision, Recall, F1**
- **ROC-AUC** (one-vs-rest for 3 classes)
- **Matthews Correlation Coefficient** (best for imbalanced)
- **Confusion Matrix heatmap**

### Output:
- `results/model_comparison.csv` — all models × all users × all metrics
- `figures/model_comparison_bar.png` — mean F1 across 16 users, error bars showing std
- `figures/confusion_matrix_best_model.png` — for the paper

**Save best model params** for each user to `results/best_params_p01.json`, etc. These get hardcoded into the production `backend/`.

---

## Research Step 4 — NLP: VADER vs. Transformers

**Notebook:** `04_nlp_vader_vs_bert.ipynb`  
**Goal:** Prove that transformer-based NLP outperforms VADER for mood estimation from journal text. This becomes **Table 3** in the paper.

### Why VADER is not enough for a paper:
- Rule-based system from 2014, no context understanding
- Fails on sarcasm: *"Oh great, another Monday"* → scores Positive
- Fails on negation: *"I don't feel happy at all"* → may score Positive
- Single compound score — no emotion granularity

### Step 4A — Use Pre-trained RoBERTa (Zero Training, Quick Win):
```python
from transformers import pipeline

sentiment_pipe = pipeline(
    "text-classification",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    return_all_scores=True,
    device=-1  # CPU
)
# Trained on 124 million tweets. Runs ~80ms per entry on CPU.
```

Run this on the `googledocs/reporting.csv` journal entries in PMData. Compare its output to the `mood` ground truth from `wellness.csv`.

### Step 4B — Fine-tune for Emotion Probabilities (Main Contribution):
Fine-tune `roberta-base` on the **GoEmotions dataset** (Google, 58k Reddit comments, 28 emotion labels). Use Google Colab free GPU — takes ~30 minutes.

```python
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer

dataset = load_dataset("google-research-datasets/go_emotions", "simplified")
# Map 28 labels → 6 basic emotions: joy, sadness, anger, fear, surprise, disgust
```

**Output of fine-tuned model per journal entry:**
```json
{
  "joy": 0.72, "sadness": 0.08, "anger": 0.03,
  "fear": 0.12, "surprise": 0.04, "disgust": 0.01
}
```

Save fine-tuned model to `research/fine_tuned_model/` — this will later be copied to `backend/`.

### Step 4C — Semantic Theme Extraction (Replace POS Tagging):
```python
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

model = SentenceTransformer('all-MiniLM-L6-v2')  # Tiny (80MB), fast, excellent
embeddings = model.encode(sentences)
clusters = KMeans(n_clusters=5).fit(embeddings)
```

This catches that *"couldn't sleep"*, *"tossing and turning"*, *"3am again"* are all **sleep disturbance** — which POS frequency counting completely misses.

### Comparison table for the paper:
| Metric | VADER | RoBERTa (pre-trained) | RoBERTa (fine-tuned) |
|--------|-------|----------------------|---------------------|
| Correlation with mood ground truth | ~ | ~ | ~ |
| Sarcasm detection | ✗ | Partial | ✓ |
| Negation handling | Partial | ✓ | ✓ |
| Emotion granularity | 1 score | 3 labels | 6 emotions |
| Latency (CPU) | ~2ms | ~80ms | ~85ms |

Fill in the correlation numbers from your experiment.

---

## Research Step 5 — NLP × ML Fusion Experiment

**Notebook:** `05_fusion_experiment.ipynb`  
**Goal:** Prove that adding journal-derived emotion features improves wearable-based mood prediction. This is **the novel finding** — the core contribution of the paper.

### Ablation study design:

| Model | Features | Expected Macro F1 |
|-------|----------|------------------|
| **Baseline A** | Wearable only (8 features) | ~62% |
| **Baseline B** | Wearable + self-report wellness (14 features) | ~70% |
| **Proposed C** | B + NLP emotion scores (20 features) | ~77% |
| **Proposed D** | C + semantic theme clusters (25 features) | ~80% |

Run all four across all 16 users with TimeSeriesSplit CV. Report mean ± std F1.

**If C > B > A, you have the finding:**  
*"Journal-derived emotion features significantly improve mood prediction over wearable data alone (p < 0.05)."*

Run a Wilcoxon signed-rank test to confirm statistical significance (small N, non-parametric):
```python
from scipy.stats import wilcoxon
stat, p = wilcoxon(f1_scores_baseline_A, f1_scores_proposed_C)
```

### Output:
- `results/fusion_ablation.csv`
- `figures/fusion_ablation_bar.png` — bar chart showing F1 for A/B/C/D
- `figures/feature_importance_fused.png` — which NLP features mattered most

---

## Research Deliverables Checklist

- [ ] `figures/data_availability.png`
- [ ] `figures/mood_distribution.png`
- [ ] `figures/correlation_heatmap.png`
- [ ] `results/model_comparison.csv`
- [ ] `figures/model_comparison_bar.png`
- [ ] `figures/confusion_matrix_best_model.png`
- [ ] `results/best_params_p*.json` (for all 16 users)
- [ ] Fine-tuned RoBERTa model saved
- [ ] `results/nlp_comparison.csv`
- [ ] `results/fusion_ablation.csv`
- [ ] `figures/fusion_ablation_bar.png`

---

# PART 2 — BACKEND

> **What it is:** The production FastAPI server that the Android app calls. Built using the winning parameters and models found in research. No experiments here — only clean, deployable code.

**Do research first. Then port the winners here.**

---

## Backend Step 1 — Expand the ML Pipeline

**File:** `backend/mindful_ml.py`  
**Change:** Use all 22+ features found in the research notebooks.

### What to update:
```python
features = [
    # Wearable (objective)
    'steps', 'overall_score', 'deep_sleep_in_minutes',
    'resting_heart_rate', 'restlessness',
    'very_active_minutes', 'moderately_active_minutes',
    'calories',

    # Self-report (subjective)
    'fatigue', 'stress', 'readiness', 'sleep_quality',

    # Engineered lag features
    'sleep_score_yesterday', 'steps_yesterday',
    'sleep_3d_avg', 'fatigue_3d_avg', 'stress_yesterday',
]
```

Switch target to 3-class:
```python
df['mood_class'] = df['mood'].apply(
    lambda x: 'Low' if x <= 2 else ('High' if x >= 5 else 'Neutral')
)
```

Replace `train_test_split` with `TimeSeriesSplit`.

Use the best algorithm and hyperparameters from `research/results/best_params_p*.json`.

---

## Backend Step 2 — Upgrade the NLP Pipeline

**File:** `backend/mindful_nlp.py`  
**Change:** Replace VADER with the fine-tuned RoBERTa model from research.

### Phase A (deploy first — pre-trained, no training needed):
```python
from transformers import pipeline

_sentiment_pipe = None

def get_sentiment_pipeline():
    global _sentiment_pipe
    if _sentiment_pipe is None:
        _sentiment_pipe = pipeline(
            "text-classification",
            model="cardiffnlp/twitter-roberta-base-sentiment-latest",
            return_all_scores=True,
            device=-1
        )
    return _sentiment_pipe
```

Load once at startup, reuse on every request. Much faster than recreating per call.

### Phase B (deploy after fine-tuning in research):
Load the fine-tuned model from `backend/fine_tuned_model/`:
```python
model_path = os.path.join(base_dir, 'fine_tuned_model')
_sentiment_pipe = pipeline("text-classification", model=model_path,
                           return_all_scores=True, device=-1)
```

### Updated API response:
```python
return {
    "calculated_mood_score": mapped_mood_score,    # 1–5 (backwards compat)
    "overall_themes": top_overall_themes,           # existing
    "paragraph_breakdown": paragraph_breakdown,     # existing
    "emotion_scores": {                             # NEW — from RoBERTa
        "joy": 0.72,
        "sadness": 0.08,
        "anger": 0.03,
        "fear": 0.12,
        "surprise": 0.04,
        "disgust": 0.01
    }
}
```

---

## Backend Step 3 — New API Endpoints

**File:** `backend/app.py`

### 3.1 Health check endpoint (most important — fix infinite loading spinners):
```python
from datetime import datetime

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "version": "2.0",
        "timestamp": datetime.now().isoformat()
    }
```

### 3.2 Model metadata endpoint (for paper demo card in the app):
```python
@app.get("/api/model-info/{user_id}")
def get_model_info(user_id: str):
    metadata_path = os.path.join(base_dir, 'saved_models', f'meta_{user_id}.json')
    if not os.path.exists(metadata_path):
        raise HTTPException(status_code=404, detail="No model found for this user")
    with open(metadata_path) as f:
        return json.load(f)
```

### 3.3 Input validation on journal endpoint:
```python
from pydantic import validator

class JournalEntry(BaseModel):
    text: str

    @validator('text')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError('Journal text cannot be empty')
        if len(v) > 10000:
            raise ValueError('Max 10,000 characters')
        return v.strip()
```

---

## Backend Step 4 — Model Metadata Versioning

Each time a model is trained, save a metadata file alongside it:
```python
import json
metadata = {
    "user_id": user_id,
    "algorithm": "RandomForest",
    "trained_at": datetime.now().isoformat(),
    "data_days_used": int(len(merged_df)),
    "best_params": best_params,          # from Optuna
    "cv_folds": 5,
    "mean_f1_macro": round(mean_f1, 4),
    "model_version": "2.0"
}
with open(f'saved_models/meta_{user_id}.json', 'w') as f:
    json.dump(metadata, f, indent=2)
```

---

## Backend Step 5 — Async Non-Blocking Inference

The current ML pipeline blocks the server thread for several seconds during training. Use background tasks:

```python
from fastapi import BackgroundTasks
import asyncio

model_cache: dict = {}

@app.get("/api/get-insight/{user_id}")
async def process_insight(user_id: str, background_tasks: BackgroundTasks):
    if user_id in model_cache:
        return model_cache[user_id]     # Instant cached response
    result = await asyncio.to_thread(generate_personalized_insight, user_id)
    model_cache[user_id] = result
    return result
```

---

## Backend Deliverables Checklist

- [ ] `mindful_ml.py` updated with all 22+ features
- [ ] `mindful_ml.py` using 3-class target
- [ ] `mindful_ml.py` using TimeSeriesSplit CV
- [ ] `mindful_ml.py` using best params from research
- [ ] `mindful_nlp.py` using pre-trained RoBERTa (Phase A)
- [ ] `mindful_nlp.py` using fine-tuned RoBERTa (Phase B)
- [ ] `mindful_nlp.py` returning `emotion_scores` in response
- [ ] `GET /api/health` endpoint
- [ ] `GET /api/model-info/{user_id}` endpoint
- [ ] Input validation on `POST /api/analyze-journal`
- [ ] Model metadata JSON saved per user
- [ ] Async inference with `asyncio.to_thread`

---

# PART 3 — FRONTEND

> **What it is:** The Android app. Built after the backend is stable. Frontend improvements are driven by what the backend now returns and what the paper needs to demonstrate.

---

## Frontend Step 1 — Critical Fixes (Do First, Block Everything Else)

### 1.1 Fix App Name
`app.json`:
```json
{
  "expo": {
    "name": "MindfulMomentum",
    "slug": "mindful-momentum"
  }
}
```

### 1.2 Backend Connection Status Hook
New file: `mobile-app/hooks/useBackendStatus.ts`

```typescript
import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../lib/api';

export function useBackendStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`,
          { signal: AbortSignal.timeout(3000) });
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  return isOnline;
}
```

Use this in `insights.tsx` and `journal/[date].tsx` to show a banner:
```tsx
{isOnline === false && (
  <View style={styles.offlineBanner}>
    <Text>⚠️ Backend offline — analysis unavailable</Text>
  </View>
)}
```

### 1.3 Standardize Error Messages

Replace every instance of *"Keep wearing your watch"* with context-specific messages. In `journal/[date].tsx` and `insights.tsx`, update the catch blocks:

```typescript
const getErrorMessage = (error: unknown): string => {
  const msg = error instanceof Error ? error.message : '';
  if (msg.includes('timed out') || msg.includes('timeout'))
    return 'Backend server is offline. Start the server to see your analysis.';
  if (msg.includes('Not enough data'))
    return 'Not enough data yet. Keep logging your journal daily.';
  return 'Something went wrong. Please try again.';
};
```

### 1.4 Fix Insights Demo User Selector

The P01–P16 chips make no sense to a normal user. Replace with:
- Default: show `p01` data with no selector visible
- Long-press on the "Journal Insights" title to reveal the selector (developer Easter egg)

```tsx
const [devMode, setDevMode] = useState(false);
// ...
<Text onLongPress={() => setDevMode(true)}>Journal Insights</Text>
{devMode && <UserSwitcher ... />}
```

---

## Frontend Step 2 — Mood Self-Report Widget

**This is the most important frontend feature for the paper.**

**File:** New `mobile-app/components/mood-checkin-widget.tsx`  
**Location:** On the Dashboard (`home.tsx`), below the hero readiness card.

### UI:
```
┌─────────────────────────────────────┐
│  How are you feeling today?  ✓ Done │
│                                     │
│  😫    😕    😐    🙂    😊        │
│   1     2     3     4     5        │
└─────────────────────────────────────┘
```

### Storage — new type in `journal-storage.ts`:
```typescript
export type MoodLog = {
  date: string;       // 'YYYY-MM-DD'
  score: number;      // 1–5
  loggedAt: string;   // ISO timestamp
};

export const MOOD_LOG_KEY = '@mood_logs';

export async function readMoodLogs(): Promise<MoodLog[]> { ... }
export async function writeMoodLog(log: MoodLog): Promise<void> { ... }
export async function getTodayMoodLog(): Promise<MoodLog | null> { ... }
```

### Behaviour:
- If already logged today → show checkmark + selected emoji, no re-log
- On select → haptic feedback + save to AsyncStorage
- Widget shows on Dashboard every day until logged

**Why this matters for the paper:** This is the real-user data collection mechanism. The paper can say: *"The app collects daily mood self-reports (1–5) from the user, which are stored locally and fused with wearable data for personalized ML prediction."*

---

## Frontend Step 3 — Weekly Mood Trend Chart

**File:** Add a section to `home.tsx` below the metric grid, or a new "Trends" tab.

Use `react-native-gifted-charts` (already installed) with a LineChart:

```tsx
import { LineChart } from 'react-native-gifted-charts';

// Build last 7 days of mood data from AsyncStorage
const moodData = last7Days.map(date => ({
  value: moodLogs.find(l => l.date === date)?.score ?? 0,
  label: shortDateLabel(date),
}));

<LineChart
  data={moodData}
  color={theme.colors.primary}
  dataPointsColor={theme.colors.primary}
  maxValue={5}
  noOfSections={5}
  curved
/>
```

This chart becomes a key screenshot in the paper — it visually shows mood trends over time, which is the entire point of the system.

---

## Frontend Step 4 — Model Info Card on Insights Screen

Calls the new `GET /api/model-info/{user_id}` backend endpoint.

```tsx
// In insights.tsx — add below the summary card
{modelInfo && (
  <Card>
    <Card.Content>
      <Text>Algorithm: {modelInfo.algorithm}</Text>
      <Text>Training days: {modelInfo.data_days_used}</Text>
      <Text>Accuracy: {modelInfo.mean_f1_macro * 100}% F1</Text>
      <Text>Last trained: {formatRelativeDate(modelInfo.trained_at)}</Text>
    </Card.Content>
  </Card>
)}
```

This is a direct paper screenshot — it shows the ML system is live and personalised per user.

---

## Frontend Step 5 — NLP Emotion Breakdown on Journal View

Calls the updated `POST /api/analyze-journal` that now returns `emotion_scores`.

**In `journal/[date].tsx`**, add an emotion bar section below the mood score and themes:

```tsx
{analysisResult?.emotionScores && (
  <View style={styles.emotionBars}>
    {Object.entries(analysisResult.emotionScores).map(([emotion, score]) => (
      <View key={emotion} style={styles.emotionRow}>
        <Text>{emotion}</Text>
        <View style={[styles.bar, { width: `${score * 100}%` }]} />
        <Text>{Math.round(score * 100)}%</Text>
      </View>
    ))}
  </View>
)}
```

**Emotion → emoji mapping for the UI:**
```typescript
const EMOTION_EMOJI: Record<string, string> = {
  joy: '😊', sadness: '😢', anger: '😠',
  fear: '😨', surprise: '😲', disgust: '🤢',
};
```

---

## Frontend Step 6 — Settings Screen

**File:** `mobile-app/app/settings.tsx`  
**Route:** `/settings` — add a gear icon to the Dashboard top bar.

| Setting | Component | Storage |
|---------|-----------|---------|
| Display name | TextInput | AsyncStorage `@user_name` |
| Theme | Segmented buttons (Light/Dark/System) | existing theme provider |
| Backend URL | TextInput | AsyncStorage `@backend_url` |
| Notification reminder | TimePicker + toggle | AsyncStorage `@reminder_time` |
| Clear all data | Destructive button | clears all AsyncStorage keys |
| App version | Static text | from `expo-constants` |

---

## Frontend Step 7 — Daily Journal Reminder

```typescript
// lib/notifications.ts
import * as Notifications from 'expo-notifications';

export async function scheduleJournalReminder(hour = 21, minute = 0) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to reflect 📓',
      body: "Write today's journal entry for your daily wellness insight.",
    },
    trigger: { hour, minute, repeats: true },
  });
}
```

Add `expo-notifications` to `package.json`. Trigger permission request on first app open. Let users configure the time in Settings.

---

## Frontend Step 8 — Code Quality Cleanup

Do this last — after all features are built. It makes the code maintainable but changes no behaviour.

### 8.1 Extract health data into a hook:
```typescript
// hooks/useHealthData.ts
export function useHealthData() {
  const [data, setData] = useState<HealthData>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // move all fetchHealthData logic here
  return { data, loading, refreshing, refresh };
}
```

`home.tsx` is currently 726 lines — after this hook extraction it should be ~350 lines.

### 8.2 Extract journal analysis into a hook:
```typescript
// hooks/useJournalAnalysis.ts
export function useJournalAnalysis(entryId: string, content: string, title: string) {
  // move all NLP fetch + cache logic here
  return { analysisResult, analysisLoading, analysisError };
}
```

### 8.3 Central types file:
```typescript
// types/index.ts
export type JournalEntry = { ... };
export type HealthData = { ... };
export type MoodLog = { ... };
export type InsightResponse = { ... };
export type ModelInfo = { ... };
```

### 8.4 Central constants file:
```typescript
// constants/app-config.ts
export const APP_CONFIG = {
  STEP_GOAL: 10_000,
  SLEEP_GOAL_HOURS: 8,
  ACTIVE_CALORIES_GOAL: 600,
  SYNC_LAG_MS: 120_000,
  MAX_JOURNAL_LENGTH: 10_000,
  DEFAULT_REMINDER_HOUR: 21,
} as const;
```

---

## Frontend Deliverables Checklist

- [ ] App name fixed in `app.json`
- [ ] `useBackendStatus` hook created and wired to Insights + Journal screens
- [ ] Error messages context-specific (not all "Keep wearing your watch")
- [ ] Insights demo user selector hidden (long-press Easter egg)
- [ ] Mood self-report widget built and stored in AsyncStorage
- [ ] Weekly mood trend chart on Dashboard
- [ ] Model info card on Insights screen
- [ ] NLP emotion breakdown on Journal view
- [ ] Settings screen with all options
- [ ] Daily journal reminder notification
- [ ] `useHealthData` hook (home.tsx refactor)
- [ ] `useJournalAnalysis` hook (journal/[date].tsx refactor)
- [ ] Central `types/index.ts`
- [ ] Central `constants/app-config.ts`

---

# MASTER TIMELINE

| Week | Phase | Task |
|------|-------|------|
| 1 | **Research** | Folder setup + data exploration notebook |
| 2 | **Research** | Feature engineering notebook (all 22+ features) |
| 3 | **Research** | ML model comparison (6 models × 16 users × TimeSeriesSplit) |
| 4 | **Research** | Hyperparameter tuning with Optuna |
| 5 | **Research** | NLP: VADER baseline + pre-trained RoBERTa comparison |
| 6 | **Research** | Fine-tune RoBERTa on GoEmotions (use Google Colab GPU) |
| 7 | **Research** | Sentence-BERT semantic theme clustering |
| 8 | **Research** | Fusion experiment (ablation study A→B→C→D) |
| 9 | **Research** | Generate all paper figures, run stats (Wilcoxon tests) |
| 10 | **Backend** | Update ML pipeline with all features + 3-class target + TimeSeriesSplit |
| 11 | **Backend** | Port winning model params from research → production |
| 12 | **Backend** | Replace VADER with pre-trained RoBERTa (Phase A) |
| 13 | **Backend** | Port fine-tuned RoBERTa → production (Phase B) |
| 14 | **Backend** | New endpoints: `/api/health`, `/api/model-info/{user_id}` |
| 15 | **Backend** | Input validation, model metadata versioning, async inference |
| 16 | **Frontend** | Critical fixes: app name, connection status, error messages |
| 17 | **Frontend** | Mood self-report widget + weekly trend chart |
| 18 | **Frontend** | Model info card + emotion breakdown on journal view |
| 19 | **Frontend** | Settings screen + daily notification |
| 20 | **Frontend** | Code cleanup (hooks, types, constants) + final QA |

---

# PAPER STRUCTURE

**Proposed Title:**  
*"BioMood: A Multi-Modal n-of-1 Framework for Personalized Mood Prediction Using Wearable Data and Transformer-Based Journal Analysis"*

| Section | Source material |
|---------|----------------|
| Abstract | Numbers from fusion experiment (best Δ F1 vs baseline) |
| 1. Introduction | Problem motivation, n-of-1 argument, 3 contributions listed |
| 2. Related Work | Prior mood prediction papers, VADER limitations, wearable-NLP gaps |
| 3. Dataset | PMData description from Step 1 notebook |
| 4. Feature Engineering | Tables from Step 2 notebook |
| 5. NLP Methodology | VADER vs RoBERTa from Step 4 notebook |
| 6. ML Methodology | Model comparison from Step 3 notebook |
| 7. Fusion Experiment | Ablation study from Step 5 notebook |
| 8. Results | **Table 1:** NLP comparison. **Table 2:** ML model comparison. **Table 3:** Fusion ablation |
| 9. Discussion | Why n-of-1 > population models, limitations, future work |
| 10. Conclusion | 3 contributions: feature expansion, NLP upgrade, fusion finding |

**Target journals:**
1. **Sensors (MDPI)** — best fit, open access, wearable + ML track, strong impact factor
2. **IEEE ICHI** — top conference for healthcare informatics
3. **JMIR mHealth and uHealth** — if framed as a mobile health app paper
