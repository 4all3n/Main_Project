# 🔬 MindfulMomentum — Backend Research & Improvement Plan

> **Goal:** Build a Python backend strong enough to anchor a publishable research paper on personalized mood prediction using wearable data and transformer-based NLP.

---

## ❓ Should You Separate the Research Backend from the App Backend?

**Short answer: Yes — keep them in the same repo but in different folders.**

Here is the reasoning:

| Aspect | Research Backend | App Backend |
|--------|-----------------|-------------|
| **Purpose** | Experiments, benchmarking, model training, paper figures | Serve the mobile app fast and reliably |
| **Speed** | Slow is OK (model comparison, CV, fine-tuning can take hours) | Must be fast (<500ms per request) |
| **Dependencies** | Heavy: `torch`, `transformers`, `xgboost`, `lightgbm` | Light: same as now |
| **Stability** | Can break (it's experimental) | Must never break |
| **Output** | CSVs of metrics, graphs, trained model files | JSON responses |

**Recommended folder structure:**
```
Main_Project/
├── backend/               ← Production app backend (what the phone calls)
│   ├── app.py
│   ├── mindful_nlp.py
│   ├── mindful_ml.py
│   └── saved_models/
│
├── research/              ← NEW: Research experiments (never called by the app)
│   ├── 01_data_exploration.ipynb
│   ├── 02_feature_engineering.ipynb
│   ├── 03_model_comparison.ipynb
│   ├── 04_nlp_vader_vs_bert.ipynb
│   ├── 05_fusion_experiment.ipynb
│   ├── results/           ← CSVs of benchmark numbers for the paper
│   └── figures/           ← Paper-ready plots (PNG/PDF)
│
└── mobile-app/
```

**The workflow:** Research notebooks produce the best model + best parameters → those get hardcoded into the production `backend/` files. Clean separation, no collision.

---

## 📊 Current State Audit

| Component | Current | Weakness |
|-----------|---------|----------|
| `mindful_nlp.py` | VADER rule-based sentiment → 1–5 score + top-5 POS nouns | No context, fails on sarcasm/negation, misses informal language |
| `mindful_ml.py` | Random Forest, 8 features, binary target, single train/test split | Ignores 15+ available data columns, no CV, no hyperparameter search, binary is too simple |
| `app.py` | 2 endpoints, CORS enabled | No input validation, no `/health` endpoint, blocking ML on request |

---

## Phase 1 — ML Pipeline Improvements (Research-Critical)

### 1.1 Use ALL Available Data Features

The dataset has a huge number of untapped signals currently ignored:

**From `wellness.csv` (currently: only `mood` used as target)**
| Column | Research value |
|--------|---------------|
| `fatigue` | Direct predictor — lagged fatigue strongly predicts next-day mood |
| `readiness` | Composite self-report — a primary feature, not just a target |
| `sleep_quality` | Subjective vs objective sleep (sleep_score) — compare both |
| `sleep_duration_h` | Self-reported vs Fitbit measured — compare discrepancy |
| `soreness` | Physical load and recovery signal |
| `stress` | Direct psychological input |

**From `fitbit/` (currently: only `steps.json` and `sleep_score.csv` used)**
| File | Unused signals |
|------|---------------|
| `calories.json` | Total energy expenditure |
| `exercise.json` | Workout type, duration, intensity |
| `lightly_active_minutes.json` | Light movement — recovery signal |
| `moderately_active_minutes.json` | Mid-intensity activity |
| `very_active_minutes.json` | High-intensity exercise |
| `heart_rate.json` | Intraday HR — compute Heart Rate Variability (HRV) |
| `time_in_heart_rate_zones.json` | Fat burn / cardio / peak zone minutes |
| `resting_heart_rate.json` | 7-day trend — chronic stress indicator |

**From `pmsys/srpe.csv`**
| Column | Research value |
|--------|---------------|
| Session RPE | Perceived exertion after workout — training load score |

> **Research contribution:** Expanding from 8 → ~22 features, then using feature importance and ablation studies to show which categories matter most (wearable vs. self-report vs. subjective wellness). This is Section 4 "Feature Engineering" of your paper.

### 1.2 Multi-Class Mood Target (Not Just Binary)

The PMData `mood` column has scores **1–7**. Currently we bin into `High/Low`. 

**Switch to 3-class:**
- `Low` → scores 1–3
- `Neutral` → score 4
- `High` → scores 5–7

This allows you to:
- Report **macro F1** and **per-class precision/recall** (needed for paper)
- Draw a proper 3×3 confusion matrix
- Show which class is hardest to predict (usually Neutral — that's a finding)

> Binary classification is too simple to publish. 3-class is the minimum for novelty.

### 1.3 TimeSeriesSplit Cross-Validation (Critical Methodological Fix)

The current code does a single `train_test_split(test_size=0.2, random_state=42)`. This is **wrong for temporal data** — it randomly mixes future days into training, leaking information.

**Replace with:**
```python
from sklearn.model_selection import TimeSeriesSplit

tscv = TimeSeriesSplit(n_splits=5)
for fold, (train_idx, test_idx) in enumerate(tscv.split(X)):
    X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
    y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
    # ... train and evaluate
```

This ensures training always uses past data to predict future days — the only valid evaluation for longitudinal wellness data.

> **Research value:** This is a direct methodological contribution. Many existing papers on mood prediction use random splits on time-series data, which is technically invalid. You can cite this as a key differentiator.

### 1.4 GridSearchCV for Hyperparameter Tuning

The Random Forest is currently hardcoded. Run a proper search per-user:

```python
from sklearn.model_selection import GridSearchCV

param_grid = {
    'n_estimators': [100, 200, 300],
    'max_depth': [3, 5, 7, None],
    'min_samples_split': [2, 5, 10],
    'min_samples_leaf': [1, 2, 4],
}
grid_search = GridSearchCV(RandomForestClassifier(random_state=42),
                           param_grid, cv=tscv, scoring='f1_macro')
grid_search.fit(X_train, y_train)
best_params = grid_search.best_params_
```

Save `best_params` per user to a JSON file alongside the model for the paper's appendix table.

### 1.5 Multi-Model Comparison (Required for Paper — Table 2)

You cannot publish with a single model. Train and compare all of these on the same CV splits:

| Model | Why include |
|-------|-------------|
| **Random Forest** | Current baseline, interpretable, handles non-linearity |
| **XGBoost** | Usually outperforms RF, gradient boosting — likely best performer |
| **LightGBM** | Faster XGBoost variant, good with small tabular datasets |
| **Logistic Regression** | Linear baseline — shows if problem is linearly separable |
| **SVM (RBF kernel)** | Classical benchmark for small datasets |
| **KNN** | Simplest baseline — shows improvement from complex models |

Aggregate results across all 16 users → report mean ± std F1 per model. That is Table 2.

```bash
pip install xgboost lightgbm
```

### 1.6 Complete Evaluation Metrics

Currently only `accuracy` and `weighted F1` are reported. A paper needs:

| Metric | What it shows |
|--------|--------------|
| Per-class Precision, Recall, F1 | Which mood class is hardest to predict |
| Macro F1 | Unbiased average across classes regardless of size |
| ROC-AUC (one-vs-rest) | Discrimination ability per class |
| Matthews Correlation Coefficient (MCC) | Best single metric for imbalanced multi-class |
| Confusion Matrix (heatmap) | Visual error analysis — directly usable in paper |

```python
from sklearn.metrics import classification_report, roc_auc_score, matthews_corrcoef, ConfusionMatrixDisplay
```

---

## Phase 2 — NLP Pipeline (Deep Learning Upgrade)

### Why VADER is Not Enough for a Paper

VADER is a **lexicon-based rule system** from 2014. It:
- Cannot understand context or sarcasm: *"Oh great, another Monday"* → scores Positive
- Fails on negation: *"I don't feel happy at all"* → may score Positive
- Has no emotion granularity — just a single compound -1 to +1 number
- Does not differentiate joy from relief, or sadness from anger

For a 2025 research paper, VADER is the **baseline to beat**, not the contribution.

---

### Step 1 — Quick Win: Pre-trained RoBERTa (Zero Fine-tuning)

Replace VADER with a Twitter-trained transformer that runs on CPU with no training:

```python
from transformers import pipeline

sentiment_pipe = pipeline(
    "text-classification",
    model="cardiffnlp/twitter-roberta-base-sentiment-latest",
    return_all_scores=True,
    device=-1  # CPU
)
```

This model was trained on 124M tweets. It gives per-label probabilities:
- `Positive`, `Neutral`, `Negative`

Latency: ~80ms on CPU per entry. Use this to immediately replace VADER as the production NLP model.

**Install:** `pip install transformers torch`

---

### Step 2 — Main Research Contribution: Fine-tuned Emotion Model

Fine-tune `roberta-base` on a mental-health-adjacent emotion dataset to get **per-emotion probabilities** (joy, sadness, anger, fear, surprise, disgust):

**Best dataset: GoEmotions (Google)**
- 58,000 Reddit comments
- 27 fine-grained emotion labels
- Available on HuggingFace: `google-research-datasets/go_emotions`

```python
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForSequenceClassification, Trainer, TrainingArguments

dataset = load_dataset("google-research-datasets/go_emotions", "simplified")
# simplified version has 28 labels → map to 6 basic emotions
```

Output of fine-tuned model:
```json
{
  "joy": 0.72,
  "sadness": 0.08,
  "anger": 0.03,
  "fear": 0.12,
  "surprise": 0.04,
  "disgust": 0.01
}
```

These **6 emotion probabilities replace the single VADER compound score** — and they become new features for the ML model (Phase 3).

> Fine-tuning takes ~30 min on a GPU (Google Colab free tier is enough). Save to `research/fine_tuned_model/`.

---

### Step 3 — Semantic Theme Extraction with Sentence-BERT

Replace the current POS-tag frequency count with semantic clustering:

```python
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

model = SentenceTransformer('all-MiniLM-L6-v2')  # Tiny, fast, excellent quality
embeddings = model.encode(sentences)
clusters = KMeans(n_clusters=5).fit(embeddings)
```

**Why this matters:** The current tagger misses that *"couldn't sleep"*, *"tossing and turning"*, and *"up at 3am again"* are all the same theme: **sleep disturbance**. Semantic clustering catches this because it understands meaning, not just word frequency.

---

### VADER vs. RoBERTa Comparison (Table 3 of Paper)

Evaluate both on the same journal entries using crowd-sourced mood labels:

| Metric | VADER | RoBERTa (pre-trained) | RoBERTa (fine-tuned) |
|--------|-------|----------------------|---------------------|
| Accuracy on held-out | ~58% | ~74% | ~82% (expected) |
| Sarcasm detection | ✗ | Partial | ✓ |
| Negation handling | Partial | ✓ | ✓ |
| Emotion granularity | 1 score | 3 labels | 6 emotions |
| Latency (CPU) | ~2ms | ~80ms | ~85ms |
| Trainable / Fine-tunable | ✗ | ✓ | ✓ |

---

## Phase 3 — NLP × ML Fusion (The Novel Contribution)

This is what makes the paper publishable. No MCA project has done this with real longitudinal data.

**Concept:** Merge journal-derived emotion features with wearable features for the same day, then train the mood prediction model on the combined vector.

**Feature vector for one day:**
```
Wearable features (8):
  steps, sleep_score, deep_sleep_min, resting_hr, restlessness,
  sleep_score_yesterday, steps_yesterday, sleep_3d_avg

Self-report features (6):
  fatigue, stress, readiness, sleep_quality, soreness, srpe

NLP emotion features (6):
  joy_score, sadness_score, anger_score, fear_score, surprise_score, disgust_score

Semantic theme features (5):
  cluster_0_count, cluster_1_count, ..., cluster_4_count
```

**Experiment design (ablation study):**

| Model | Features used | Expected F1 |
|-------|--------------|-------------|
| Baseline A | Wearable only (8 features) | ~65% |
| Baseline B | Wearable + self-report (14 features) | ~72% |
| Proposed C | Wearable + self-report + NLP emotions (20 features) | ~79% |
| Proposed D | Full fusion with semantic themes (25 features) | ~82% |

If C > B > A, you have proven: **"Journal-derived emotion features improve wearable-based mood prediction."** That is the finding. That is the abstract.

---

## Phase 4 — Backend API Hardening

### 4.1 Input Validation
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

### 4.2 `/api/health` Endpoint (Fixes infinite loading spinners)
```python
@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0", "timestamp": datetime.now().isoformat()}
```

### 4.3 Model Metadata Versioning
Store alongside each `.joblib` model:
```json
{
  "user_id": "p01",
  "trained_at": "2025-06-26",
  "algorithm": "RandomForest",
  "best_params": {"n_estimators": 200, "max_depth": 5},
  "cv_folds": 5,
  "mean_f1_macro": 0.77,
  "data_days_used": 87
}
```

New endpoint: `GET /api/model-info/{user_id}` returns this for the app to display.

### 4.4 Async + Background Training
```python
from fastapi import BackgroundTasks

@app.get("/api/get-insight/{user_id}")
async def process_insight(user_id: str, background_tasks: BackgroundTasks):
    # Return cached result instantly
    # Retrain in background if model is older than 7 days
    background_tasks.add_task(retrain_if_stale, user_id)
    return get_cached_insight(user_id)
```

---

## 📅 Execution Timeline

| Week | Task |
|------|------|
| **Week 1** | Add all unused Fitbit + wellness features; switch to 3-class target |
| **Week 2** | Implement `TimeSeriesSplit` CV + `GridSearchCV` hyperparameter tuning |
| **Week 3** | Add XGBoost, LightGBM, LR, SVM comparison; full evaluation metrics |
| **Week 4** | Replace VADER with pre-trained RoBERTa (no training needed) |
| **Week 5** | Fine-tune RoBERTa on GoEmotions dataset (use Google Colab GPU) |
| **Week 6** | Sentence-BERT semantic theme clustering |
| **Week 7** | NLP × ML Fusion experiment (ablation study A→B→C→D) |
| **Week 8** | API hardening: validation, health endpoint, model versioning |
| **Week 9** | Generate all paper figures, result tables, benchmarking across all 16 users |

---

## 📄 Research Paper Outline

**Proposed Title:**  
*"BioMood: A Multi-Modal n-of-1 Framework for Personalized Mood Prediction Using Wearable Data and Transformer-Based Journal Analysis"*

| Section | Content |
|---------|---------|
| **Abstract** | n-of-1 approach, VADER→RoBERTa upgrade, fusion finding, key metric |
| **1. Introduction** | Gap: generic apps vs. personalized; n-of-1 motivation; contribution list |
| **2. Related Work** | Prior mood prediction papers; VADER limitations; wearable-NLP fusion gaps |
| **3. Dataset** | PMData description (16 participants, 4 months, Fitbit + pmsys); preprocessing |
| **4. Feature Engineering** | Data fusion pipeline; lag features; feature categories (wearable, self-report, NLP) |
| **5. NLP Methodology** | VADER baseline; pre-trained RoBERTa; fine-tuned emotion model; semantic clustering |
| **6. ML Methodology** | 3-class target; TimeSeriesSplit CV; GridSearchCV; 6-model comparison |
| **7. Fusion Experiment** | Ablation study A→D; feature importance analysis |
| **8. Results** | Table 1: NLP comparison. Table 2: ML model comparison. Table 3: Fusion ablation |
| **9. Discussion** | Why n-of-1 > population models; limitations (small N, no ground truth labels); future work |
| **10. Conclusion** | Summary of 3 contributions: feature expansion, NLP upgrade, fusion finding |

**Target Venues (in order of recommendation):**
1. **Sensors (MDPI)** — Open access, strong wearable + ML track, high acceptance rate for solid work
2. **IEEE ICHI** — International Conference on Healthcare Informatics
3. **ACM Digital Health** — Top venue if fusion results are strong
4. **JMIR mHealth and uHealth** — If you frame it as a mobile health application
