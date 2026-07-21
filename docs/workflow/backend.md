# Backend Workflow & Architecture

This document comprehensively outlines the backend architecture of the **MindfulMomentum** project. It covers the data flow, endpoints, data processing, the machine learning (ML) models, the Natural Language Processing (NLP) models, the reasons behind architectural choices, and the specific roles of all backend files.

## 1. System Overview

The backend is built using **FastAPI** in Python. It acts as the intelligent core of the MindfulMomentum mobile app, responsible for running deep learning models for NLP and personalized machine learning models for mood prediction. 

By offloading the heavy computational lifting (such as loading Transformer models like RoBERTa and SBERT) to this backend, the mobile application can remain lightweight and responsive, while still benefiting from state-of-the-art AI.

### Core Technologies
- **Framework**: FastAPI (for high-performance, async API routing)
- **Machine Learning**: `scikit-learn`, `xgboost`, `pandas`, `numpy` (for N-of-1 personalized models)
- **Deep Learning / NLP**: `torch` (PyTorch), `transformers` (HuggingFace), `sentence-transformers`
- **Server**: Uvicorn (ASGI web server)

---

## 2. File Structure and Roles

The `backend` directory contains the following critical components:

- **`app.py`**
  The entry point of the FastAPI application. It defines the REST API endpoints, handles request validation using Pydantic models, coordinates background tasks, and manages the lifecycle of the application (such as pre-warming NLP models into memory on startup so the first request is instant).
  
- **`mindful_nlp.py`**
  Contains all the Natural Language Processing logic. This file wraps the HuggingFace models. It handles:
  - Text chunking (splitting journal entries into sentences and paragraphs).
  - Emotion classification using a fine-tuned RoBERTa model (`SamLowe/roberta-base-go_emotions`).
  - Semantic theme extraction using Sentence-BERT (SBERT).
  
- **`mindful_ml.py`**
  Responsible for the N-of-1 personalized machine learning pipelines. It fetches individual user datasets, engineers features, trains individualized models (like Random Forests or XGBoost classifiers), caches the trained models, and generates insights (e.g., "On days you sleep less than 6 hours, your mood drops").

- **`test_backend.py`**
  A test suite to ensure the API endpoints are functioning correctly.

- **`start.sh`**
  A bash script to install dependencies, activate virtual environments, and launch the Uvicorn server in a production-ready state.

- **`requirements.txt`**
  Lists all the Python dependencies required to run the backend (e.g., `torch`, `fastapi`, `transformers`).

- **`/Data`**
  Contains anonymized CSV files containing historical wearable data and mood scores for simulated/real test users (`p01` to `p16`).

- **`/saved_models`**
  A directory where the individualized `.pkl` (pickle) machine learning models are cached after training, avoiding the need to retrain the model on every single API request.

---

## 3. Detailed Data Flow

### 3.1. NLP Data Flow (Journaling)
When a user writes a journal entry on the mobile app, the following data flow occurs:

1. **Client Request**: The mobile app POSTs the text payload to `/api/analyze-journal`.
2. **Validation**: `app.py` validates the request using the `JournalEntry` Pydantic model (ensuring it is not empty and under 10,000 characters).
3. **NLP Processing (`mindful_nlp.py`)**:
   - The text is chunked into paragraphs.
   - The **RoBERTa** model predicts the emotion distribution (e.g., Joy: 40%, Sadness: 10%, Neutral: 50%).
   - A deterministic formula converts these emotion probabilities into a single numerical **Calculated Mood Score** (e.g., 6.5/10).
   - The **Sentence-BERT (SBERT)** model compares the text embeddings to a predefined list of semantic themes (e.g., "Work Stress", "Family", "Health") and returns the highest matching themes.
4. **Response**: A JSON response containing the calculated mood, emotion probabilities, themes, and a paragraph-by-paragraph breakdown is returned to the frontend.

### 3.2. ML Data Flow (Insights)
When a user navigates to the Insights tab:

1. **Client Request**: The mobile app GETs `/api/get-insight/{user_id}`.
2. **Caching Check (`mindful_ml.py`)**: The backend checks if a cached model for this specific user exists in `/saved_models`. 
   - If the model is fresh, it loads the pickle file.
   - If the model is missing or stale, it trains a new model on the fly.
3. **Feature Engineering**: The user's historical data from `/Data/{user_id}.csv` is loaded into a Pandas DataFrame. Features like "sleep debt", "rolling average steps", and "day of week" are calculated.
4. **Prediction & Extraction**: The individualized model predicts today's likely mood. More importantly, it extracts feature importances (e.g., determining that for *this specific user*, "Sleep" is the #1 driver of mood).
5. **Background Task**: `app.py` uses FastAPI's `BackgroundTasks` to schedule a model retrain for the *next* time, ensuring the current API response remains extremely fast.
6. **Response**: A JSON payload with the insight text, the top mood driver, and the model's accuracy (F1 score) is returned.

---

## 4. Why This Architecture?

### Why N-of-1 Models?
Human psychology and physiology are highly individualized. A population-level model (training one giant model on all users) often fails because what makes one person happy (e.g., a vigorous 10km run) might make another person exhausted and irritable. By training **N-of-1 models** (a unique model per user), the backend provides deeply personalized, actionable insights.

### Why FastAPI?
FastAPI is built on Starlette and Pydantic, making it one of the fastest Python web frameworks available. It natively supports `async`/`await` and background tasks. The background task feature is critical for our ML pipeline: we can return cached ML predictions to the user immediately, while retraining their personalized model in the background, resulting in zero perceived latency.

### Why Pre-warm Models?
In `app.py`, the `lifespan` context manager loads the multi-gigabyte RoBERTa and SBERT models into RAM/VRAM *before* the server starts accepting requests. If we loaded them dynamically on the first request, the user would experience a massive 5-10 second timeout. Pre-warming ensures 100ms latency for all NLP requests.

## 5. Security and Scaling

- **Stateless NLP**: The NLP endpoint is entirely stateless. We can horizontally scale the FastAPI workers and place them behind a load balancer without any issues.
- **Stateful ML Caching**: The ML models are cached as pickle files. In a true distributed production environment, these would be saved to an S3 bucket or a shared Redis cluster instead of the local filesystem.
- **Input Validation**: Pydantic strictly validates all incoming JSON, preventing injection attacks and oversized payloads (capped at 10,000 characters) that could cause Out-Of-Memory (OOM) errors on the GPU.
