"""
mindful_nlp.py — MindfulMomentum NLP Engine (v2)

Upgrade path:
  VADER (baseline) → RoBERTa (production, GPU-accelerated) → Sentence-BERT themes
"""

import os
import time
import warnings
import torch
import nltk
from typing import Optional

warnings.filterwarnings("ignore")

# ─── NLTK fallback (still used for theme extraction) ─────────────────────────
for pkg in ("punkt", "punkt_tab", "stopwords", "vader_lexicon", "averaged_perceptron_tagger_eng"):
    nltk.download(pkg, quiet=True)

from nltk.tokenize import sent_tokenize
from nltk.corpus import stopwords

# ─── Detect GPU ────────────────────────────────────────────────────────────────
DEVICE_ID = 0 if torch.cuda.is_available() else -1
DEVICE_NAME = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
print(f"[NLP] Running on: {DEVICE_NAME}")

# ─── Lazy-load models so app startup stays fast ───────────────────────────────
_sentiment_pipe = None       # RoBERTa sentiment (3-class)
_sbert_model    = None       # Sentence-BERT for semantic themes

SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
SBERT_MODEL     = "all-MiniLM-L6-v2"

# Semantic theme prototypes — centroid sentences per theme
THEME_PROTOTYPES = {
    "sleep_disturbance": [
        "couldn't sleep last night", "tossing and turning", "woke up at 3am",
        "insomnia was bad", "kept waking up", "sleep was terrible",
    ],
    "work_stress": [
        "stressed about work", "deadline pressure", "meeting was exhausting",
        "overwhelmed with tasks", "boss was difficult", "anxious about project",
    ],
    "exercise": [
        "went to the gym", "great workout today", "ran in the morning",
        "did yoga", "lifting weights felt good", "evening walk",
    ],
    "positive_mood": [
        "feeling happy today", "great day", "everything went well",
        "feeling grateful", "laughed a lot", "very productive",
    ],
    "fatigue": [
        "feeling exhausted", "so tired today", "no energy at all",
        "could barely get out of bed", "drained and worn out",
    ],
    "social_connection": [
        "spent time with friends", "family dinner was wonderful",
        "had a great conversation", "feeling supported", "met someone new",
    ],
}


def _get_sentiment_pipe():
    global _sentiment_pipe
    if _sentiment_pipe is None:
        from transformers import pipeline
        print(f"[NLP] Loading RoBERTa sentiment model on {DEVICE_NAME}...")
        _sentiment_pipe = pipeline(
            "text-classification",
            model=SENTIMENT_MODEL,
            top_k=None,
            device=DEVICE_ID,
            local_files_only=True
        )
        print("[NLP] RoBERTa ready.")
    return _sentiment_pipe


def _get_sbert():
    global _sbert_model
    if _sbert_model is None:
        from sentence_transformers import SentenceTransformer
        print("[NLP] Loading Sentence-BERT model...")
        _sbert_model = SentenceTransformer(SBERT_MODEL, device="cuda" if DEVICE_ID == 0 else "cpu", local_files_only=True)
        print("[NLP] Sentence-BERT ready.")
    return _sbert_model


# ─── Sentiment helpers ────────────────────────────────────────────────────────

def _roberta_scores_to_emotion(all_scores: list[dict]) -> dict:
    """
    Convert RoBERTa 3-label output to structured emotion dict.
    Returns joy / neutral / sadness probabilities and a mapped 1-5 mood score.
    """
    label_map = {}
    for item in all_scores:
        label_map[item["label"].lower()] = round(item["score"], 4)

    joy     = label_map.get("positive", 0.0)
    neutral = label_map.get("neutral",  0.0)
    sadness = label_map.get("negative", 0.0)

    # Map to 1-5 using weighted emotion probabilities
    raw = (joy * 5) + (neutral * 3) + (sadness * 1)
    mood_score = max(1, min(5, round(raw)))

    return {
        "joy":     joy,
        "neutral": neutral,
        "sadness": sadness,
        "mood_score": mood_score,
    }


# ─── Semantic theme detection ─────────────────────────────────────────────────

def _detect_themes(text: str) -> list[str]:
    """
    Use Sentence-BERT cosine similarity against prototype sentences to detect
    which themes appear in the journal entry. Returns list of theme names.
    """
    import numpy as np
    from sklearn.metrics.pairwise import cosine_similarity

    model = _get_sbert()

    # Build prototype embeddings (cached implicitly by the model)
    all_themes      = list(THEME_PROTOTYPES.keys())
    proto_sentences = [s for sents in THEME_PROTOTYPES.values() for s in sents]
    proto_per_theme = [len(v) for v in THEME_PROTOTYPES.values()]

    proto_emb = model.encode(proto_sentences, convert_to_numpy=True)
    text_emb  = model.encode([text], convert_to_numpy=True)

    sims = cosine_similarity(text_emb, proto_emb)[0]  # shape: (n_protos,)

    # Average similarity per theme
    detected = []
    idx = 0
    for theme, n in zip(all_themes, proto_per_theme):
        avg_sim = float(np.mean(sims[idx: idx + n]))
        if avg_sim > 0.35:  # tuned threshold
            detected.append(theme)
        idx += n

    return detected


# ─── Per-paragraph breakdown ──────────────────────────────────────────────────

def _analyze_paragraph(pipe, paragraph: str, stop_words: set) -> dict:
    """Score a single paragraph with RoBERTa and extract keywords."""
    sentences = sent_tokenize(paragraph)
    if not sentences:
        return {"text": paragraph, "emotions": {}, "mood_score": 3, "keywords": []}

    joy_sum = neutral_sum = sadness_sum = 0.0
    for sent in sentences:
        results = pipe(sent[:512])   # RoBERTa max 512 tokens
        em = _roberta_scores_to_emotion(results[0])
        joy_sum     += em["joy"]
        neutral_sum += em["neutral"]
        sadness_sum += em["sadness"]

    n = len(sentences)
    avg_emotions = {
        "joy":     round(joy_sum     / n, 4),
        "neutral": round(neutral_sum / n, 4),
        "sadness": round(sadness_sum / n, 4),
    }
    raw = (avg_emotions["joy"] * 5) + (avg_emotions["neutral"] * 3) + (avg_emotions["sadness"] * 1)
    mood_score = max(1, min(5, round(raw)))

    # Simple keyword extraction (non-stopword words > 3 chars)
    words = [
        w.lower() for w in paragraph.split()
        if len(w) > 3 and w.lower().strip(".,!?") not in stop_words
    ]
    from collections import Counter
    keywords = [w for w, _ in Counter(words).most_common(5)]

    return {
        "text":      paragraph,
        "emotions":  avg_emotions,
        "mood_score": mood_score,
        "keywords":  keywords,
    }


# ─── Public API ───────────────────────────────────────────────────────────────

def analyze_journal(journal_text: str) -> dict:
    """
    Full NLP analysis pipeline:
      1. RoBERTa emotion scoring (GPU-accelerated)
      2. Sentence-BERT semantic theme detection
      3. Per-paragraph breakdown

    Returns a structured dict ready for the FastAPI response.
    """
    start = time.time()
    stop_words = set(stopwords.words("english"))
    paragraphs = [p.strip() for p in journal_text.split("\n") if p.strip()]

    if not paragraphs:
        return {
            "calculated_mood_score": 3,
            "emotions":              {"joy": 0.0, "neutral": 1.0, "sadness": 0.0},
            "overall_themes":        [],
            "semantic_themes":       [],
            "paragraph_breakdown":   [],
            "confidence":            "low",
        }

    pipe = _get_sentiment_pipe()

    # --- Overall emotion on the full text (truncated to 512 tokens) -----------
    full_text_short = " ".join(paragraphs)[:1024]
    overall_results = pipe(full_text_short[:512])
    overall_emotion = _roberta_scores_to_emotion(overall_results[0])

    # --- Per-paragraph breakdown ----------------------------------------------
    breakdown = []
    for para in paragraphs:
        breakdown.append(_analyze_paragraph(pipe, para, stop_words))

    # --- Semantic theme detection on full text --------------------------------
    semantic_themes = _detect_themes(full_text_short)

    # --- Keyword themes (union of paragraph keywords) -------------------------
    from collections import Counter
    all_keywords: list[str] = []
    for p in breakdown:
        all_keywords.extend(p.get("keywords", []))
    top_keywords = [w for w, _ in Counter(all_keywords).most_common(5)]

    # --- Confidence: based on how dominant the winning emotion is -------------
    top_score = max(overall_emotion["joy"], overall_emotion["neutral"], overall_emotion["sadness"])
    if   top_score > 0.70: confidence = "high"
    elif top_score > 0.45: confidence = "medium"
    else:                  confidence = "low"

    latency_ms = round((time.time() - start) * 1000, 1)

    print(
        f"\n[NLP] Mood={overall_emotion['mood_score']}/5 | "
        f"Joy={overall_emotion['joy']:.2f} Sad={overall_emotion['sadness']:.2f} | "
        f"Themes={semantic_themes} | {latency_ms}ms"
    )

    return {
        "calculated_mood_score": overall_emotion["mood_score"],
        "emotions": {
            "joy":     overall_emotion["joy"],
            "neutral": overall_emotion["neutral"],
            "sadness": overall_emotion["sadness"],
        },
        "overall_themes":      top_keywords,
        "semantic_themes":     semantic_themes,
        "paragraph_breakdown": [
            {
                "paragraph_number": i + 1,
                "text":             p["text"],
                "mood_score":       p["mood_score"],
                "emotions":         p["emotions"],
                "themes":           p["keywords"],
            }
            for i, p in enumerate(breakdown)
        ],
        "confidence": confidence,
        "latency_ms": latency_ms,
    }