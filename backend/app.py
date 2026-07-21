"""
app.py — MindfulMomentum FastAPI Backend (v2)

Endpoints:
  GET  /api/health                    → server status + GPU info
  POST /api/analyze-journal           → RoBERTa NLP analysis
  GET  /api/get-insight/{user_id}     → N-of-1 ML personalized insight
  GET  /api/model-info/{user_id}      → cached model metadata
  POST /api/retrain/{user_id}         → force-retrain a user's model
"""

import torch
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

from mindful_nlp import analyze_journal, _get_sentiment_pipe, _get_sbert
from mindful_ml  import generate_personalized_insight, get_model_info, retrain_if_stale

# ─── App startup / shutdown ────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    gpu = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    print(f"\n{'='*50}")
    print(f"  MindfulMomentum Backend v2 — Starting up")
    print(f"  Device : {gpu}")
    print(f"  Time   : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}\n")

    # Pre-warm both NLP models so the first API request is instant
    print("[Startup] Pre-loading RoBERTa sentiment model...")
    _get_sentiment_pipe()
    print("[Startup] Pre-loading Sentence-BERT model...")
    _get_sbert()
    print("[Startup] All models ready.\n")

    yield
    print("\n[Server] Shutting down.")


app = FastAPI(
    title="MindfulMomentum API",
    version="2.0.0",
    description="Personalized mood prediction via wearable fusion + transformer NLP",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request / Response models ─────────────────────────────────────────────────

class JournalEntry(BaseModel):
    text: str

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Journal text cannot be empty.")
        if len(v) > 10_000:
            raise ValueError("Journal text exceeds 10,000 character limit.")
        return v


# ─── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health_check():
    """
    Lightweight health check — the mobile app pings this every 30 seconds
    to show the connection status banner.
    """
    cuda_available = torch.cuda.is_available()
    return {
        "status":    "ok",
        "version":   "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "gpu": {
            "available":  cuda_available,
            "name":       torch.cuda.get_device_name(0) if cuda_available else None,
            "memory_mb":  round(torch.cuda.get_device_properties(0).total_memory / 1024**2)
                          if cuda_available else None,
        },
    }


@app.post("/api/analyze-journal")
def process_journal(entry: JournalEntry, background_tasks: BackgroundTasks):
    """
    Run RoBERTa NLP pipeline on a journal entry.
    Returns emotion probabilities, mood score, semantic themes, and paragraph breakdown.
    """
    result = analyze_journal(entry.text)

    return {
        "status":               "success",
        "calculated_mood_score": result["calculated_mood_score"],
        "emotions":             result["emotions"],           # joy / neutral / sadness
        "overall_themes":       result["overall_themes"],    # keyword list
        "semantic_themes":      result["semantic_themes"],   # SBERT theme names
        "confidence":           result["confidence"],
        "paragraph_breakdown":  result["paragraph_breakdown"],
        "latency_ms":           result.get("latency_ms"),
    }


@app.get("/api/get-insight/{user_id}")
def process_insight(user_id: str, background_tasks: BackgroundTasks):
    """
    Return N-of-1 ML insight for a user.
    Serves cached result instantly; queues background retrain if model is stale.
    """
    valid = [f"p{i:02d}" for i in range(1, 17)]
    if user_id not in valid:
        raise HTTPException(status_code=400, detail=f"Invalid user_id. Valid: p01–p16.")

    result = generate_personalized_insight(user_id)

    if "error" in result:
        raise HTTPException(status_code=422, detail=result.get("message", result["error"]))

    # Schedule background retrain for next call — keeps response fast
    background_tasks.add_task(retrain_if_stale, user_id)

    return {"status": "success", "data": result}


@app.get("/api/model-info/{user_id}")
def model_info(user_id: str):
    """
    Return cached model metadata (algorithm, F1, training date, days used).
    Used by the app's Model Info Card on the Insights screen.
    """
    info = get_model_info(user_id)
    if info is None:
        raise HTTPException(
            status_code=404,
            detail=f"No trained model found for {user_id}. Call /api/get-insight/{user_id} first."
        )
    return {"status": "success", "data": info}


@app.post("/api/retrain/{user_id}")
def force_retrain(user_id: str, background_tasks: BackgroundTasks):
    """
    Force-retrain the model for a user (runs in background, returns immediately).
    """
    valid = [f"p{i:02d}" for i in range(1, 17)]
    if user_id not in valid:
        raise HTTPException(status_code=400, detail="Invalid user_id.")

    background_tasks.add_task(generate_personalized_insight, user_id, True)
    return {
        "status":  "accepted",
        "message": f"Retraining started for {user_id} in the background."
    }


# ─── Dev runner ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)