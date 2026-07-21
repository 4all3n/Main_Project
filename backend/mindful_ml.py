"""
mindful_ml.py — MindfulMomentum ML Engine (v2)

Changes from v1:
  - N-of-1 model selection: loads Optuna best-params per user from research/results/
  - Supports RF, XGBoost, LightGBM, Logistic Regression, SVM, KNN
  - 3-class mood target (Low / Normal / High) instead of binary
  - Full 22+ feature set (Fitbit + wellness + SRPE + lag features)
  - TimeSeriesSplit training (no random shuffle leakage)
  - Saves model metadata JSON alongside .joblib for /api/model-info
  - SMOTE applied only on training portion
"""

import os
import json
import warnings
import joblib
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

from datetime import datetime, timedelta
from sklearn.model_selection import TimeSeriesSplit
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neighbors import KNeighborsClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import f1_score, classification_report
from imblearn.over_sampling import SMOTE

warnings.filterwarnings("ignore")

# Paths
BASE_DIR        = os.path.dirname(os.path.abspath(__file__))
DATA_DIR        = os.path.join(BASE_DIR, "Data")
SAVED_DIR       = os.path.join(BASE_DIR, "saved_models")
GRAPHS_DIR      = os.path.join(BASE_DIR, "output_graphs")
RESEARCH_RESULTS = os.path.join(BASE_DIR, "..", "research", "results")

os.makedirs(SAVED_DIR,  exist_ok=True)
os.makedirs(GRAPHS_DIR, exist_ok=True)


# ─── Feature list (22 features) ──────────────────────────────────────────────

WEARABLE_FEATURES = [
    "steps", "overall_score", "deep_sleep_in_minutes",
    "resting_heart_rate", "restlessness", "very_active_minutes",
    "moderately_active_minutes", "calories",
]

WELLNESS_FEATURES = [
    "fatigue", "stress", "readiness", "sleep_quality", "sleep_duration_h",
]

LAG_FEATURES = [
    "sleep_score_yesterday", "steps_yesterday", "sleep_3d_avg",
    "fatigue_3d_mean", "stress_3d_mean", "readiness_change", "sleep_debt",
]

ALL_FEATURES = WEARABLE_FEATURES + WELLNESS_FEATURES + LAG_FEATURES


# ─── N-of-1 model loader ─────────────────────────────────────────────────────

def _load_best_params(user_id: str) -> dict | None:
    """Load Optuna best params from research/results/best_params_<user_id>.json"""
    path = os.path.join(RESEARCH_RESULTS, f"best_params_{user_id}.json")
    if os.path.exists(path):
        with open(path) as f:
            return json.load(f)
    return None


def _build_model(user_id: str) -> tuple:
    """
    Return (model_object, model_name).
    Uses Optuna best params if available, else falls back to LightGBM defaults.
    """
    cfg = _load_best_params(user_id)

    if cfg:
        name   = cfg.get("model", "LightGBM")
        params = cfg.get("params", {}).copy()
        # Fix lowercase 'c' → 'C' that Optuna sometimes saves
        if "c" in params:
            params["C"] = params.pop("c")
    else:
        name   = "LightGBM"
        params = {}

    if name == "RandomForest":
        return RandomForestClassifier(**params, random_state=42), name

    if name == "XGBoost":
        from xgboost import XGBClassifier
        return XGBClassifier(**params, random_state=42, eval_metric="mlogloss", verbosity=0), name

    if name == "LightGBM":
        from lightgbm import LGBMClassifier
        return LGBMClassifier(**params, random_state=42, verbose=-1), name

    if name == "LogisticRegression":
        return LogisticRegression(**params, max_iter=1000, random_state=42), name

    if name == "SVM":
        return SVC(**params, probability=True, random_state=42), name

    if name == "KNN":
        return KNeighborsClassifier(**params), name

    # safe fallback
    from lightgbm import LGBMClassifier
    return LGBMClassifier(random_state=42, verbose=-1), "LightGBM"


# ─── Data loading & feature engineering ──────────────────────────────────────

def _load_and_engineer(user_id: str) -> pd.DataFrame | None:
    """
    Load all data sources and engineer the full 22+ feature set.
    Returns a sorted, merged DataFrame or None on failure.
    """
    user_dir = os.path.join(DATA_DIR, user_id)

    try:
        wellness_df = pd.read_csv(os.path.join(user_dir, "pmsys", "wellness.csv"))
        sleep_df    = pd.read_csv(os.path.join(user_dir, "fitbit", "sleep_score.csv"))
        steps_df    = pd.read_json(os.path.join(user_dir, "fitbit", "steps.json"))
    except FileNotFoundError as e:
        print(f"[ML] Missing data for {user_id}: {e}")
        return None

    # ── Date alignment ────────────────────────────────────────────────────────
    wellness_df["Date"] = pd.to_datetime(wellness_df["effective_time_frame"]).dt.date
    sleep_df["Date"]    = pd.to_datetime(sleep_df["timestamp"]).dt.date
    steps_df["Date"]    = pd.to_datetime(steps_df["dateTime"]).dt.date
    steps_df["steps"]   = steps_df["value"].astype(int)
    daily_steps         = steps_df.groupby("Date")["steps"].sum().reset_index()

    # ── Optional Fitbit enrichment ────────────────────────────────────────────
    def _load_json_metric(filename: str, value_col: str = "value") -> pd.DataFrame | None:
        path = os.path.join(user_dir, "fitbit", filename)
        if not os.path.exists(path):
            return None
        try:
            df = pd.read_json(path)
            df["Date"] = pd.to_datetime(df["dateTime"]).dt.date
            df[value_col] = pd.to_numeric(df["value"], errors="coerce")
            return df.groupby("Date")[value_col].sum().reset_index()
        except Exception:
            return None

    def _load_csv_metric(filename: str, date_col: str, value_col: str, alias: str | None = None) -> pd.DataFrame | None:
        path = os.path.join(user_dir, "fitbit", filename)
        if not os.path.exists(path):
            return None
        try:
            df = pd.read_csv(path)
            df["Date"] = pd.to_datetime(df[date_col]).dt.date
            out = df.groupby("Date")[value_col].mean().reset_index()
            if alias:
                out = out.rename(columns={value_col: alias})
            return out
        except Exception:
            return None

    # ── Merge core tables ─────────────────────────────────────────────────────
    df = pd.merge(wellness_df, sleep_df,    on="Date", how="inner")
    df = pd.merge(df,          daily_steps, on="Date", how="inner")

    # Optional: calories, active minutes, resting HR
    for fname, vcol, alias in [
        ("calories.json",                  "calories",                     "calories"),
        ("very_active_minutes.json",       "very_active_minutes",          "very_active_minutes"),
        ("moderately_active_minutes.json", "moderately_active_minutes",    "moderately_active_minutes"),
        ("lightly_active_minutes.json",    "lightly_active_minutes",       "lightly_active_minutes"),
    ]:
        extra = _load_json_metric(fname, vcol)
        if extra is not None:
            extra = extra.rename(columns={vcol: alias})
            df = pd.merge(df, extra, on="Date", how="left")

    rhr = _load_csv_metric("resting_heart_rate.csv", "Date", "value", "resting_heart_rate")
    if rhr is not None:
        df = pd.merge(df, rhr, on="Date", how="left")

    # SRPE
    srpe_path = os.path.join(user_dir, "pmsys", "srpe.csv")
    if os.path.exists(srpe_path):
        try:
            srpe = pd.read_csv(srpe_path)
            srpe["Date"] = pd.to_datetime(srpe["effective_time_frame"]).dt.date
            srpe = srpe.groupby("Date")["srpe"].mean().reset_index()
            df = pd.merge(df, srpe, on="Date", how="left")
        except Exception:
            pass

    df = df.sort_values("Date").reset_index(drop=True)

    # ── Wellness feature normalisation ────────────────────────────────────────
    for col in ["fatigue", "stress", "readiness", "sleep_quality"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    if "duration" in df.columns:
        df["sleep_duration_h"] = pd.to_numeric(df["duration"], errors="coerce") / 60
    elif "sleep_duration_h" not in df.columns:
        df["sleep_duration_h"] = np.nan

    # ── Lag features ──────────────────────────────────────────────────────────
    df["sleep_score_yesterday"] = df["overall_score"].shift(1)
    df["steps_yesterday"]       = df["steps"].shift(1)
    df["sleep_3d_avg"]          = df["overall_score"].rolling(3).mean()
    df["fatigue_3d_mean"]       = df["fatigue"].rolling(3).mean()    if "fatigue"  in df.columns else np.nan
    df["stress_3d_mean"]        = df["stress"].rolling(3).mean()     if "stress"   in df.columns else np.nan
    df["readiness_change"]      = df["readiness"].diff()             if "readiness" in df.columns else np.nan
    df["sleep_debt"]            = (8.0 - df["sleep_duration_h"].fillna(7)).clip(lower=0).rolling(7).sum()

    df = df.bfill().ffill()

    # ── 3-class mood target ───────────────────────────────────────────────────
    df["mood_class"] = df["mood"].apply(
        lambda x: "Low" if x <= 2 else ("High" if x >= 4 else "Normal")
    )

    return df


# ─── Training ─────────────────────────────────────────────────────────────────

def _train_and_save(df: pd.DataFrame, user_id: str) -> dict:
    """
    Train the N-of-1 best model using TimeSeriesSplit, save to disk with metadata.
    Returns metadata dict.
    """
    available = [f for f in ALL_FEATURES if f in df.columns]
    X = df[available].copy()
    y = df["mood_class"]

    le = LabelEncoder()
    y_enc = le.fit_transform(y)

    imputer = SimpleImputer(strategy="mean")
    X_imp   = imputer.fit_transform(X)

    # TimeSeriesSplit — use last fold for evaluation
    tscv = TimeSeriesSplit(n_splits=min(3, len(df) // 5))
    train_idx, test_idx = list(tscv.split(X_imp))[-1]

    X_train, X_test = X_imp[train_idx], X_imp[test_idx]
    y_train, y_test = y_enc[train_idx], y_enc[test_idx]

    # SMOTE on training fold only
    if len(np.unique(y_train)) > 1:
        min_class = np.bincount(y_train).min()
        k = max(1, min(5, min_class - 1))
        try:
            sm = SMOTE(k_neighbors=k, random_state=42)
            X_train, y_train = sm.fit_resample(X_train, y_train)
        except Exception:
            pass

    model, model_name = _build_model(user_id)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    macro_f1 = round(float(f1_score(y_test, y_pred, average="macro", zero_division=0)), 4)

    # Feature importances (works natively for tree models; permutation importance otherwise)
    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_.tolist()
    else:
        from sklearn.inspection import permutation_importance
        try:
            r = permutation_importance(model, X_test, y_test, n_repeats=5, random_state=42)
            # Clip negative importances to 0 for display
            importances = np.maximum(0, r.importances_mean).tolist()
        except Exception as e:
            print(f"[ML] Permutation importance failed: {e}")
            importances = [0.0] * len(available)

    metadata = {
        "user_id":        user_id,
        "algorithm":      model_name,
        "trained_at":     datetime.now().isoformat(),
        "features_used":  available,
        "data_days_used": int(len(df)),
        "macro_f1":       macro_f1,
        "classes":        le.classes_.tolist(),
        "importances":    importances,
    }

    # Save artefacts
    prefix = os.path.join(SAVED_DIR, user_id)
    joblib.dump(model,   f"{prefix}_model.joblib")
    joblib.dump(imputer, f"{prefix}_imputer.joblib")
    joblib.dump(le,      f"{prefix}_le.joblib")
    with open(f"{prefix}_meta.json", "w") as f:
        json.dump(metadata, f, indent=2)

    # Feature importance bar chart
    _save_importance_chart(user_id, available, importances)

    print(f"[ML] {user_id} trained ({model_name}) | Macro F1: {macro_f1} | Days: {len(df)}")
    return metadata


def _save_importance_chart(user_id: str, features: list, importances: list):
    try:
        fi_df = pd.DataFrame({"Feature": features, "Importance": importances})
        fi_df = fi_df.sort_values("Importance", ascending=False).head(15)
        plt.figure(figsize=(10, 6))
        sns.barplot(x="Importance", y="Feature", data=fi_df, palette="viridis")
        plt.title(f"Top Feature Importances — {user_id}")
        plt.tight_layout()
        plt.savefig(os.path.join(GRAPHS_DIR, f"feature_importance_{user_id}.png"))
        plt.close()
    except Exception as e:
        print(f"[ML] Chart error for {user_id}: {e}")


# ─── Staleness check ─────────────────────────────────────────────────────────

def _model_is_stale(user_id: str, max_age_days: int = 7) -> bool:
    meta_path = os.path.join(SAVED_DIR, f"{user_id}_meta.json")
    if not os.path.exists(meta_path):
        return True
    try:
        with open(meta_path) as f:
            meta = json.load(f)
        trained_at = datetime.fromisoformat(meta["trained_at"])
        return datetime.now() - trained_at > timedelta(days=max_age_days)
    except Exception:
        return True


# ─── Public API ──────────────────────────────────────────────────────────────

def get_model_info(user_id: str) -> dict | None:
    """Return stored model metadata for /api/model-info endpoint."""
    meta_path = os.path.join(SAVED_DIR, f"{user_id}_meta.json")
    if not os.path.exists(meta_path):
        return None
    try:
        with open(meta_path) as f:
            meta = json.load(f)
        # Compute human-readable last-trained
        trained_at = datetime.fromisoformat(meta["trained_at"])
        delta      = datetime.now() - trained_at
        if   delta.days == 0: last_trained = "Today"
        elif delta.days == 1: last_trained = "Yesterday"
        else:                 last_trained = f"{delta.days} days ago"
        meta["last_trained_human"] = last_trained
        return meta
    except Exception:
        return None


def generate_personalized_insight(user_id: str, force_retrain: bool = False) -> dict:
    """
    Main entry point for /api/get-insight/{user_id}.

    1. Load and engineer full feature set
    2. Train (or load cached) N-of-1 best model
    3. Return insight dict with feature importances and latest values
    """
    df = _load_and_engineer(user_id)
    if df is None:
        return {"error": f"Data for {user_id} not found.",
                "message": f"Could not load data files for participant {user_id}."}

    if len(df) < 5:
        return {"error": "Not enough data.",
                "message": f"{user_id} only has {len(df)} days of data. Need at least 5."}

    if len(df["mood_class"].unique()) < 2:
        return {"error": "No mood variance.",
                "message": f"{user_id} has only one mood class. The model needs variation to learn."}

    # Train if not cached or stale
    prefix     = os.path.join(SAVED_DIR, user_id)
    model_file = f"{prefix}_meta.json"

    if force_retrain or not os.path.exists(model_file) or _model_is_stale(user_id):
        metadata = _train_and_save(df, user_id)
    else:
        print(f"[ML] Loading cached model for {user_id}...")
        with open(model_file) as f:
            metadata = json.load(f)

    # Build feature importance list
    features    = metadata.get("features_used", [])
    importances = metadata.get("importances", [])
    fi_pairs    = sorted(zip(features, importances), key=lambda x: x[1], reverse=True)

    fi_list = [
        {"feature": feat.replace("_", " ").title(), "raw_name": feat,
         "impact_percent": round(imp * 100, 2)}
        for feat, imp in fi_pairs
    ]

    top_feature     = fi_list[0]["feature"] if fi_list else "Sleep"
    top_impact      = fi_list[0]["impact_percent"] if fi_list else 0.0
    insight_message = (
        f"Based on your data, your {top_feature} is the #1 driver of your mood — "
        f"accounting for {top_impact:.1f}% of the model's decision."
    )

    # Latest values for the app's input snapshot
    available = [f for f in features if f in df.columns]
    latest_row = df[available].iloc[-1].to_dict()
    latest_values = {k: round(float(v), 2) if pd.notna(v) else None for k, v in latest_row.items()}

    return {
        "user_id":               user_id,
        "algorithm":             metadata.get("algorithm", "Unknown"),
        "macro_f1":              metadata.get("macro_f1", 0.0),
        "data_days_used":        metadata.get("data_days_used", len(df)),
        "trained_at":            metadata.get("trained_at", ""),
        "top_feature":           top_feature,
        "top_feature_impact_percent": top_impact,
        "insight_message":       insight_message,
        "feature_importances":   fi_list,
        "latest_feature_values": latest_values,
    }


def retrain_if_stale(user_id: str):
    """Background task: silently retrain if model is older than 7 days."""
    if _model_is_stale(user_id):
        df = _load_and_engineer(user_id)
        if df is not None and len(df) >= 5:
            _train_and_save(df, user_id)