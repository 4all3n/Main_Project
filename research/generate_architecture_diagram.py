#!/usr/bin/env python3
"""
generate_architecture_diagram.py
Creates a publication-grade, publication-ready System Architecture diagram for MindfulMomentum.
Designed for IEEE conference papers spanning two columns (figure*).
Pixel-perfect alignment with zero overlapping text, no crossing arrows, and crisp typography.
"""

import os
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch, Rectangle

RESEARCH_FIG_PATH = "/home/fallen/Projects/Main_Project/research/figures/fig5_system_architecture.png"
PAPER_FIG_PATH = "/home/fallen/Projects/Main_Project/docs/paper/figures/fig5_system_architecture.png"

def create_system_architecture():
    # 17.0 inches wide by 7.4 inches high
    fig, ax = plt.subplots(figsize=(17.0, 7.4), dpi=300)
    ax.set_xlim(0, 17.0)
    ax.set_ylim(0, 7.4)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    FONT = "DejaVu Sans"

    STAGE_THEMES = [
        {"bg": "#F8FAFC", "border": "#2563EB", "header_bg": "#1D4ED8", "title": "#FFFFFF"},  # 1. Ingestion (Blue)
        {"bg": "#F8FAFC", "border": "#7C3AED", "header_bg": "#6D28D9", "title": "#FFFFFF"},  # 2. NLP & Signals (Purple)
        {"bg": "#F8FAFC", "border": "#0D9488", "header_bg": "#0F766E", "title": "#FFFFFF"},  # 3. Fusion (Teal)
        {"bg": "#F8FAFC", "border": "#059669", "header_bg": "#047857", "title": "#FFFFFF"},  # 4. N-of-1 ML (Emerald)
        {"bg": "#F8FAFC", "border": "#D97706", "header_bg": "#B45309", "title": "#FFFFFF"},  # 5. Serving & App (Amber)
    ]

    # Overall Diagram Header (Generous top padding)
    ax.text(8.50, 7.04, "MindfulMomentum: End-to-End Multimodal System Architecture",
            ha="center", va="center", fontsize=13.0, fontweight="bold", color="#0F172A", fontfamily=FONT)
    ax.text(8.50, 6.74, "Continuous Wearable Ingestion  •  Dual-Transformer NLP Pipeline  •  Personalized N-of-1 Machine Learning  •  FastAPI & Android Health Connect",
            ha="center", va="center", fontsize=8.6, color="#475569", fontfamily=FONT)

    # 5 Main Columns with generous 0.58 gap
    col_w = 2.76
    col_gap = 0.58
    left_margin = 0.40
    col_y = 0.35
    col_h = 6.05
    header_h = 0.52

    col_titles = [
        ("1. DATA INGESTION", "Wearables & Surveys"),
        ("2. FEATURE & NLP", "Dual Transformers & Lags"),
        ("3. MULTIMODAL FUSION", "31D Daily Matrix"),
        ("4. N-OF-1 ML ENGINE", "Bayesian Optimization"),
        ("5. SERVING & APP", "FastAPI & Health Connect")
    ]

    cols_x = [left_margin + i * (col_w + col_gap) for i in range(5)]

    # Draw Stage Containers with solid colored headers
    for i in range(5):
        cx = cols_x[i]
        theme = STAGE_THEMES[i]

        # Container Body
        box = FancyBboxPatch((cx, col_y), col_w, col_h, boxstyle="round,pad=0.0,rounding_size=0.14",
                             facecolor=theme["bg"], edgecolor=theme["border"], linewidth=1.4, zorder=1)
        ax.add_patch(box)

        # Header Bar at top of container
        hbar = FancyBboxPatch((cx, col_y + col_h - header_h), col_w, header_h,
                              boxstyle="round,pad=0.0,rounding_size=0.14",
                              facecolor=theme["header_bg"], edgecolor="none", zorder=2)
        ax.add_patch(hbar)
        ax.add_patch(Rectangle((cx, col_y + col_h - header_h), col_w, 0.15,
                               facecolor=theme["header_bg"], edgecolor="none", zorder=2))

        # Header Titles
        t_main, t_sub = col_titles[i]
        ax.text(cx + col_w/2, col_y + col_h - 0.20, t_main,
                ha="center", va="center", fontsize=8.6, fontweight="bold", color="#FFFFFF", fontfamily=FONT, zorder=3)
        ax.text(cx + col_w/2, col_y + col_h - 0.39, t_sub,
                ha="center", va="center", fontsize=7.0, color="#E2E8F0", fontfamily=FONT, zorder=3)

    # Helper: draw inner card inside a column with mathematically guaranteed zero overlaps
    def draw_card(col_idx, y_top, card_h, title, badge_text, badge_color, bullets):
        cx = cols_x[col_idx]
        x = cx + 0.12
        w = col_w - 0.24
        y = y_top - card_h

        # Card container box
        c_box = FancyBboxPatch((x, y), w, card_h, boxstyle="round,pad=0.0,rounding_size=0.09",
                               facecolor="#FFFFFF", edgecolor="#CBD5E1", linewidth=0.9, zorder=3)
        ax.add_patch(c_box)

        # Card Title (compact font if title is long to prevent badge collision)
        t_size = 7.4 if len(title) > 16 else 7.9
        ax.text(x + 0.10, y + card_h - 0.17, title,
                ha="left", va="center", fontsize=t_size, fontweight="bold", color="#1E293B", fontfamily=FONT, zorder=4)

        # Right-aligned badge
        if badge_text:
            bw = len(badge_text) * 0.048 + 0.13
            bx = x + w - bw - 0.08
            by = y + card_h - 0.25
            bh = 0.16
            b_patch = FancyBboxPatch((bx, by), bw, bh, boxstyle="round,pad=0.0,rounding_size=0.04",
                                     facecolor=badge_color, edgecolor="none", zorder=4)
            ax.add_patch(b_patch)
            ax.text(bx + bw/2, by + bh/2, badge_text,
                    ha="center", va="center", fontsize=5.9, fontweight="bold", color="#FFFFFF", fontfamily=FONT, zorder=5)

        # Divider line
        ax.plot([x + 0.08, x + w - 0.08], [y + card_h - 0.31, y + card_h - 0.31],
                color="#F1F5F9", linewidth=0.8, zorder=4)

        # Bullets
        by_start = y + card_h - 0.46
        pitch = 0.185 if len(bullets) > 6 else 0.195
        for line_idx, line in enumerate(bullets):
            is_sub = line.startswith("  ")
            indent = 0.16 if is_sub else 0.10
            f_color = "#475569" if is_sub else "#1E293B"
            f_size = 6.4 if len(line) > 26 else 6.7
            ax.text(x + indent, by_start - line_idx * pitch, line.strip(),
                    ha="left", va="center", fontsize=f_size, color=f_color, fontfamily=FONT, zorder=4)

    # -------------------------------------------------------------------------
    # COLUMN 1 CARDS (Ingestion - 4 cards, total 5.35 space, 3 gaps = 0.13 each)
    # -------------------------------------------------------------------------
    # Card 1: y_top=5.76, h=1.25 -> bottom=4.51
    draw_card(0, 5.76, 1.25, "Fitbit Sensors", "Minute Data", "#2563EB",
              ["• Steps, Calories, Active Zones",
               "• Resting Heart Rate (RHR)",
               "• Sleep Staging: Deep, REM",
               "• Inter-day Restlessness Index"])

    # Gap: 4.51 to 4.38 = 0.13
    # Card 2: y_top=4.38, h=1.22 -> bottom=3.16
    draw_card(0, 4.38, 1.22, "PMSys Wellness", "1x Daily EMA", "#0284C7",
              ["• 1-7 Likert Daily Survey",
               "• Fatigue, Stress, Readiness",
               "• Sleep Quality & Soreness",
               "• Ground-Truth Mood Anchor"])

    # Gap: 3.16 to 3.03 = 0.13
    # Card 3: y_top=3.03, h=1.08 -> bottom=1.95
    draw_card(0, 3.03, 1.08, "Training Load", "Session-RPE", "#0369A1",
              ["• Exertion Level x Duration",
               "• Daily Workout Volume",
               "• Zero on Rest Days"])

    # Gap: 1.95 to 1.82 = 0.13
    # Card 4: y_top=1.82, h=1.35 -> bottom=0.47 (Col bottom is 0.35, clear margin=0.12)
    draw_card(0, 1.82, 1.35, "Free-Text Journals", "Digital EMA", "#DC2626",
              ["• Unstructured Personal Text",
               "• Situational Triggers & Causes",
               "• Private Daily Mobile Entries",
               "• Contextual Narrative Layer"])

    # -------------------------------------------------------------------------
    # COLUMN 2 CARDS (Feature & NLP - 3 cards, 2 gaps = 0.17 each)
    # -------------------------------------------------------------------------
    # Card 1: y_top=5.76, h=1.35 -> bottom=4.41
    draw_card(1, 5.76, 1.35, "Time-Series Signals", "22 Baseline", "#64748B",
              ["• 1-Day Lags: Steps, Sleep, Fatigue",
               "• 3-Day & 7-Day Rolling Averages",
               "• Rolling Sleep Debt: (8h - duration)",
               "• Captures delayed mood kinetics"])

    # Gap: 4.41 to 4.24 = 0.17
    # Card 2: y_top=4.24, h=1.70 -> bottom=2.54
    draw_card(1, 4.24, 1.70, "RoBERTa Sentiment", "TweetEval", "#DC2626",
              ["• cardiffnlp-sentiment-latest",
               "• 512-Token Context Window",
               "• Sentence-Level Tokenization",
               "• 3D Continuous Prob Triplet:",
               "  - P(joy), P(neutral), P(sadness)",
               "• Robust to sarcasm and negation"])

    # Gap: 2.54 to 2.37 = 0.17
    # Card 3: y_top=2.37, h=1.88 -> bottom=0.49 (Col bottom is 0.35, clear margin=0.14)
    draw_card(1, 2.37, 1.88, "Sentence-BERT", "all-MiniLM", "#7C3AED",
              ["• Dense 384-dimensional space",
               "• 33 Anchors Across 6 Themes:",
               "  - Sleep, Work Stress, Exercise",
               "  - Positive, Fatigue, Social",
               "• Cosine Similarity > 0.35 cutoff",
               "• Zero-shot semantic extraction",
               "• Domain-invariant embeddings"])

    # -------------------------------------------------------------------------
    # COLUMN 3 CARDS (Multimodal Fusion - 3 cards, 2 gaps = 0.17 each)
    # -------------------------------------------------------------------------
    # Card 1: y_top=5.76, h=1.35 -> bottom=4.41
    draw_card(2, 5.76, 1.35, "Daily Synchronize", "Date Anchor", "#0D9488",
              ["• PMSys Wellness used as anchor",
               "• Minute Fitbit aggregated to daily",
               "• Three-Stage Imputation:",
               "  1) ffill -> 2) bfill -> 3) zero-fill",
               "• Guaranteed label per observation"])

    # Gap: 4.41 to 4.24 = 0.17
    # Card 2: y_top=4.24, h=1.70 -> bottom=2.54
    draw_card(2, 4.24, 1.70, "31D Feature Matrix", "Multimodal", "#0F766E",
              ["• 8 Fitbit Wearables (Set A = 8D)",
               "• 5 Wellness Scores (Set B = 13D)",
               "• 1 Session-RPE Training Load",
               "• 8 Time-Lag & Rolling Features",
               "• 3 RoBERTa Probs (Set C = 16D)",
               "• 6 SBERT Themes (Set D = 22D)",
               "• Zero-fill for absent journals"])

    # Gap: 2.54 to 2.37 = 0.17
    # Card 3: y_top=2.37, h=1.88 -> bottom=0.49
    draw_card(2, 2.37, 1.88, "Target Formulation", "Ordinal 3-Class", "#047857",
              ["• Discretized PMSys Mood Score:",
               "  - Low Mood:    Score <= 2 (14%)",
               "  - Neutral:     Score 3-4  (61%)",
               "  - High Mood:   Score >= 5 (25%)",
               "• Clinically meaningful boundary",
               "• Macro-F1 prevents class neglect",
               "• Time-ordered daily series"])

    # -------------------------------------------------------------------------
    # COLUMN 4 CARDS (N-of-1 ML Engine - 3 cards, 2 gaps = 0.17 each)
    # -------------------------------------------------------------------------
    # Card 1: y_top=5.76, h=1.35 -> bottom=4.41
    draw_card(3, 5.76, 1.35, "Temporal CV", "No Lookahead", "#059669",
              ["• 3-Fold TimeSeriesSplit Cross-Val",
               "• Strict forward arrow of time",
               "• Train: [1..t], Test: [t+1..t+k]",
               "• Prevents future data leakage",
               "• Out-of-sample evaluation"])

    # Gap: 4.41 to 4.24 = 0.17
    # Card 2: y_top=4.24, h=1.70 -> bottom=2.54
    draw_card(3, 4.24, 1.70, "Optuna Bayesian HPO", "TPE Search", "#047857",
              ["• 30 Trials per user independently",
               "• 6 Candidate Model Families:",
               "  - LightGBM (5), XGBoost (3)",
               "  - Random Forest (3), SVM (2)",
               "  - Logistic Reg (2), KNN (1)",
               "• Metric: Macro-Averaged F1",
               "• Disproves one-size-fits-all"])

    # Gap: 2.54 to 2.37 = 0.17
    # Card 3: y_top=2.37, h=1.88 -> bottom=0.49
    draw_card(3, 2.37, 1.88, "Model Registry", "7-Day TTL", "#065F46",
              ["• Per-user best_params_pXX.json",
               "• Serialized joblib model artifacts",
               "• Strict train/val fold isolation",
               "• Dynamic background retraining",
               "• Mean F1: 0.674 -> 0.793 (+0.119)",
               "• Wilcoxon Test: p=0.0077 (**)"])

    # -------------------------------------------------------------------------
    # COLUMN 5 CARDS (Serving & App - 3 cards tailored to bullet count)
    # -------------------------------------------------------------------------
    # Card 1: y_top=5.76, h=1.70 -> bottom=4.06 (7 bullets)
    draw_card(4, 5.76, 1.70, "FastAPI Gateway", "Backend v2", "#D97706",
              ["• Async REST API with Uvicorn",
               "• Lifespan model pre-warming",
               "• POST /api/analyze-journal",
               "• GET  /api/get-insight/{user_id}",
               "• GET  /api/model-info/{user_id}",
               "• POST /api/retrain/{user_id}",
               "• Async BackgroundTasks queue"])

    # Gap: 4.06 to 3.90 = 0.16
    # Card 2: y_top=3.90, h=1.50 -> bottom=2.40 (6 bullets)
    draw_card(4, 3.90, 1.50, "Health Connect", "Android Native", "#B45309",
              ["• Native Health Connect client",
               "• Privacy-first on-device hub",
               "• Cross-app step deduplication",
               "• Resolves sleep stage overlaps",
               "• 90-second background sync",
               "• Zero cloud telemetry leakage"])

    # Gap: 2.40 to 2.24 = 0.16
    # Card 3: y_top=2.24, h=1.70 -> bottom=0.54 (Col bottom is 0.35, clear margin=0.19)
    draw_card(4, 2.24, 1.70, "React Native Client", "Zen UI", "#92400E",
              ["• Cross-platform Expo 56 / RN 0.85",
               "• Everforest calming visual theme",
               "• 7-Day interactive trend charts",
               "• Real-time emotion chips & score",
               "• Actionable lifestyle guidance",
               "• Hash-based cache invalidation"])

    # -------------------------------------------------------------------------
    # INTER-COLUMN CONNECTORS (Widened 0.58 gap: zero border clipping!)
    # -------------------------------------------------------------------------
    def draw_connector(x1, y1, x2, y2, label=None, label_above=True, color="#334155"):
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="->", color=color, lw=1.2,
                                    shrinkA=2, shrinkB=2, mutation_scale=9),
                    zorder=10)
        if label:
            lx = (x1 + x2) / 2
            ly = (y1 + y2) / 2 + (0.11 if label_above else -0.11)
            ax.text(lx, ly, label, fontsize=5.8, fontweight="bold", color="#0F172A",
                    ha="center", va="center", zorder=11,
                    bbox=dict(boxstyle="round,pad=0.10", facecolor="#FFFFFF", edgecolor="#94A3B8", lw=0.5))

    # Col 1 -> Col 2
    draw_connector(cols_x[0] + col_w, 5.10, cols_x[1], 5.10, label="Raw Sensors", label_above=True)
    draw_connector(cols_x[0] + col_w, 1.15, cols_x[1], 3.40, label="Journal Text", label_above=True)
    draw_connector(cols_x[0] + col_w, 1.15, cols_x[1], 1.45)

    # Col 2 -> Col 3
    draw_connector(cols_x[1] + col_w, 5.10, cols_x[2], 5.10, label="22 Signals", label_above=True)
    draw_connector(cols_x[1] + col_w, 3.40, cols_x[2], 3.40, label="3D Emotions", label_above=True)
    draw_connector(cols_x[1] + col_w, 1.45, cols_x[2], 2.20, label="6D Themes", label_above=False)

    # Col 3 -> Col 4
    draw_connector(cols_x[2] + col_w, 5.10, cols_x[3], 5.10, label="3-Fold CV", label_above=True)
    draw_connector(cols_x[2] + col_w, 3.40, cols_x[3], 3.40, label="31D Vector", label_above=True)

    # Col 4 -> Col 5 (Parallel horizontal arrows, perfectly centered in 0.58 gap)
    draw_connector(cols_x[3] + col_w, 4.95, cols_x[4], 4.95, label="Trained Model", label_above=True)
    draw_connector(cols_x[4], 3.20, cols_x[3] + col_w, 3.20, label="Inference", label_above=False)

    plt.tight_layout(pad=0.15)
    plt.savefig(RESEARCH_FIG_PATH, dpi=300, bbox_inches="tight")
    os.makedirs(os.path.dirname(PAPER_FIG_PATH), exist_ok=True)
    plt.savefig(PAPER_FIG_PATH, dpi=300, bbox_inches="tight")
    plt.close()
    print(f"Clean architecture diagram generated:\n  - {RESEARCH_FIG_PATH}\n  - {PAPER_FIG_PATH}")

if __name__ == "__main__":
    create_system_architecture()
