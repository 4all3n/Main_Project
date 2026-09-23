# MindfulMomentum

MindfulMomentum is a personalized wellness project that combines:

- wearable data (sleep, steps, activity, heart-rate related metrics),
- daily wellness self-reports,
- journal text analysis,
- participant-specific ML insights.

The repository has three main parts:

- `backend/`: FastAPI service for NLP + ML inference.
- `mobile-app/`: Expo React Native Android app.
- `research/`: notebooks/scripts and result artifacts used for experiments.

## What This Project Does

1. The mobile app reads Android Health Connect records and stores journal entries locally.
2. Journal text can be sent to the backend for NLP analysis.
3. The backend builds a participant-specific insight (`p01` to `p16`) from PMData-derived features.
4. Research notebooks compare model families and generate plots/tables.

## Current Architecture

```text
mobile-app (Expo, Android, Health Connect)
   |
   | HTTP
   v
backend (FastAPI)
   |- /api/health
   |- /api/analyze-journal
   |- /api/get-insight/{user_id}
   |- /api/model-info/{user_id}
   |- /api/retrain/{user_id}
   |
   v
PMData-derived files + cached model artifacts
```

## Documentation Map

- `docs/README.md`: explains which docs are current references vs planning/draft.
- `docs/workflow/backend.md`: backend architecture details.
- `docs/workflow/frontend.md`: frontend architecture details.
- `docs/paper/`: paper draft sources.

## Repository Layout

```text
.
├── backend/
│   ├── app.py
│   ├── mindful_ml.py
│   ├── mindful_nlp.py
│   ├── requirements.txt
│   ├── test_backend.py
│   ├── Data/                 # ignored, expected local dataset
│   ├── saved_models/         # ignored, generated
│   └── output_graphs/        # ignored, generated
├── mobile-app/
│   ├── app/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── (tabs)/
│   │   └── metric/
│   ├── services/
│   ├── lib/
│   ├── components/
│   ├── constants/
│   ├── providers/
│   ├── app.json
│   └── package.json
├── research/
│   ├── notebooks/
│   ├── results/
│   ├── figures/
│   ├── requirements_research.txt
│   └── generate_paper_figures.py
├── docs/
├── prepare/                  # ignored interview prep notes
└── LICENSE
```

## Backend API

### `GET /api/health`
Returns service status, version, timestamp, and GPU info.

### `POST /api/analyze-journal`
Input:

```json
{ "text": "journal text" }
```

Output (simplified):

```json
{
  "status": "success",
  "calculated_mood_score": 4,
  "emotions": { "joy": 0.62, "neutral": 0.26, "sadness": 0.12 },
  "overall_themes": ["work", "sleep"],
  "semantic_themes": ["work_stress"],
  "confidence": "medium",
  "paragraph_breakdown": []
}
```

### `GET /api/get-insight/{user_id}`
Valid users: `p01` ... `p16`.

Returns participant-specific model insight and feature importance ranking.

### `GET /api/model-info/{user_id}`
Returns cached model metadata if available.

### `POST /api/retrain/{user_id}`
Queues retraining in the background.

## NLP and ML Summary

### NLP (`backend/mindful_nlp.py`)

- RoBERTa sentiment pipeline for probability scores.
- Sentence-BERT prototype matching for semantic themes.
- Per-paragraph sentiment breakdown.
- Keyword extraction for display.

### ML (`backend/mindful_ml.py`)

- Loads and merges participant daily data.
- Engineers wearable + wellness + lag features.
- Trains participant-specific model using best config from `research/results/best_params_pXX.json`.
- Uses temporal split for evaluation and stores model artifacts in `backend/saved_models/`.

## Quick Start

## 1) Get data

This repo does not include raw PMData. Place extracted participant folders in:

- `backend/Data/p01/...`
- ...
- `backend/Data/p16/...`

Expected subfolders include `fitbit/` and `pmsys/`.

## 2) Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

Optional smoke test (server must already be running):

```bash
python test_backend.py
```

## 3) Mobile app setup

```bash
cd mobile-app
npm install
npx expo run:android
```

For subsequent runs:

```bash
npx expo start
```

Notes:

- Native build is required for Health Connect features.
- `mobile-app/lib/api.ts` supports `EXPO_PUBLIC_API_BASE_URL` override.

## 4) Research environment

```bash
cd research
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements_research.txt
```

Run notebooks/scripts in order from `research/notebooks`.

## Important Research Note

The current repository includes research outputs and draft paper sections. Some legacy docs contain older descriptions of the pipeline.

For interview/reporting accuracy:

- Use backend code as source of truth for production behavior.
- Re-run research notebooks from a clean environment before claiming final numeric results.
- Treat ablation conclusions carefully when notebook inputs include synthetic proxy features.

## Known Limitations

- No auth layer yet (demo/research API).
- Data paths and some scripts are tuned for local development.
- App still includes research/demo user switching for insights.
- Reproducibility depends on local dataset and model caches.

## License

GPL-3.0. See `LICENSE`.
