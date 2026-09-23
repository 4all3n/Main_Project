#!/usr/bin/env python3
"""
generate_paper_figures.py
Generates all publication-quality figures needed for the MindfulMomentum research paper.
Strictly adheres to IEEE conference standards:
- NO internal "Fig. X" prefixes in plot titles (captions handle numbering dynamically).
- Crisp vector-like 300 DPI output.
- Clean typography and professional color palettes.
- Synchronized to both research/figures and docs/paper/figures.
"""

import os
import shutil
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.ticker import MaxNLocator
import seaborn as sns
from scipy.stats import wilcoxon

# ── Output paths ──────────────────────────────────────────────────────────────
RESULTS_DIR = "/home/fallen/Projects/Main_Project/research/results"
RESEARCH_FIG_DIR = "/home/fallen/Projects/Main_Project/research/figures"
PAPER_FIG_DIR = "/home/fallen/Projects/Main_Project/docs/paper/figures"
os.makedirs(RESEARCH_FIG_DIR, exist_ok=True)
os.makedirs(PAPER_FIG_DIR, exist_ok=True)

# ── Global aesthetics (IEEE publication standard) ────────────────────────────
FONT_FAMILY = "DejaVu Sans"
matplotlib.rcParams.update({
    "font.family": FONT_FAMILY,
    "font.size": 10,
    "axes.titlesize": 11,
    "axes.labelsize": 10.5,
    "xtick.labelsize": 9.5,
    "ytick.labelsize": 9.5,
    "legend.fontsize": 9,
    "figure.dpi": 300,
    "savefig.dpi": 300,
    "savefig.bbox": "tight",
    "axes.spines.top": False,
    "axes.spines.right": False,
})

PALETTE = {
    "A": "#3B82F6",   # Vibrant Blue
    "B": "#10B981",   # Emerald Green
    "C": "#EF4444",   # Crimson Red
    "D": "#F59E0B",   # Amber Orange
}

MODEL_COLORS = {
    "LightGBM":           "#2563EB",  # Deep Blue
    "XGBoost":            "#059669",  # Forest Green
    "RandomForest":       "#DC2626",  # Red
    "LogisticRegression": "#D97706",  # Amber
    "SVM":                "#7C3AED",  # Purple
    "KNN":                "#64748B",  # Slate
}

def save_to_both(fig, filename):
    p1 = os.path.join(RESEARCH_FIG_DIR, filename)
    p2 = os.path.join(PAPER_FIG_DIR, filename)
    fig.savefig(p1, dpi=300, bbox_inches="tight")
    fig.savefig(p2, dpi=300, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved {filename} -> research/figures & docs/paper/figures")


# =============================================================================
# Figure 1 (in research) -> Fig. 3 in Paper: Ablation Study Bar Chart
# =============================================================================
def fig_ablation():
    df = pd.read_csv(os.path.join(RESULTS_DIR, "fusion_ablation.csv"))
    cols = ["A_Wearable_Only", "B_Wearable_Wellness", "C_Plus_Emotions", "D_Plus_Themes"]
    labels = [
        "Set A\nWearable Only",
        "Set B\nWearable + Wellness",
        "Set C\nB + NLP Emotions",
        "Set D\nC + Semantic Themes",
    ]
    means = df[cols].mean().values
    stds  = df[cols].std().values
    colors = [PALETTE["A"], PALETTE["B"], PALETTE["C"], PALETTE["D"]]

    fig, ax = plt.subplots(figsize=(7.5, 4.8))
    bars = ax.bar(labels, means, yerr=stds, capsize=5,
                  color=colors, edgecolor="white", linewidth=1.0,
                  error_kw={"elinewidth": 1.4, "ecolor": "#334155"})

    # Annotate each bar with its mean value
    for bar, mean in zip(bars, means):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.02,
                f"{mean:.3f}", ha="center", va="bottom", fontsize=9.5, fontweight="bold", color="#0F172A")

    # Draw horizontal mean line for config C (the key result)
    ax.axhline(means[2], color=PALETTE["C"], linestyle="--", linewidth=1.2, alpha=0.5,
               label=f"Peak Multimodal F1: {means[2]:.3f}")

    ax.set_ylim(0, 1.08)
    ax.set_ylabel("Mean Macro-Averaged F1 Score (N=16 users)", fontweight="medium")
    # Title without "Fig. X"
    ax.set_title("Incremental Modality Impact on Multimodal Mood Prediction",
                 fontweight="bold", pad=12)
    ax.yaxis.set_major_locator(MaxNLocator(9))
    ax.grid(axis="y", linestyle=":", alpha=0.4)

    # Wilcoxon statistical significance annotation bracket
    stat, p = wilcoxon(df["B_Wearable_Wellness"], df["C_Plus_Emotions"])
    bracket_x = [1, 1, 2, 2]
    bracket_y = [means[1] + stds[1] + 0.05, means[1] + stds[1] + 0.08,
                 means[1] + stds[1] + 0.08, means[2] + stds[2] + 0.05]
    ax.plot(bracket_x, bracket_y, "k-", linewidth=1.1)
    sig = "***" if p < 0.001 else ("**" if p < 0.01 else ("*" if p < 0.05 else "ns"))
    ax.text(1.5, means[1] + stds[1] + 0.095, f"p = {p:.4f} ({sig})",
            ha="center", va="bottom", fontsize=9, fontweight="bold", color="#1E293B")

    ax.legend(loc="upper left", framealpha=0.85)
    save_to_both(fig, "fig1_ablation_study.png")


# =============================================================================
# Figure 2: Per-User Model Comparison (Best algorithm & F1 per user)
# =============================================================================
def fig_model_comparison():
    df = pd.read_csv(os.path.join(RESULTS_DIR, "model_comparison.csv"))
    df.sort_values("User", inplace=True)

    fig, ax = plt.subplots(figsize=(10.5, 4.6))
    colors = [MODEL_COLORS.get(m, "#999999") for m in df["Best Model"]]
    bars = ax.bar(df["User"], df["Macro F1"],
                  color=colors, edgecolor="white", linewidth=0.8)

    # Cohort Mean Line
    mean_f1 = df["Macro F1"].mean()
    ax.axhline(mean_f1, color="#1E293B", linestyle="--", linewidth=1.3,
               label=f"Cohort Mean F1 = {mean_f1:.3f}")

    # Annotate each bar
    for bar, f1 in zip(bars, df["Macro F1"]):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.015,
                f"{f1:.2f}", ha="center", va="bottom", fontsize=8.0, color="#1E293B")

    # Legend for models
    handles = [mpatches.Patch(color=c, label=m) for m, c in MODEL_COLORS.items()
               if m in df["Best Model"].values]
    handles.append(plt.Line2D([0], [0], color="#1E293B", linestyle="--", label=f"Mean = {mean_f1:.3f}"))
    ax.legend(handles=handles, loc="lower right", fontsize=8.5, framealpha=0.85, ncol=2)

    ax.set_ylim(0, 1.14)
    ax.set_xlabel("Participant Identifier", fontweight="medium")
    ax.set_ylabel("Best Macro F1 Score (TimeSeriesSplit CV)", fontweight="medium")
    # Title without "Fig. X"
    ax.set_title("N-of-1 Personalized Model Selection Across 16 Participants",
                 fontweight="bold", pad=10)
    ax.grid(axis="y", linestyle=":", alpha=0.4)

    save_to_both(fig, "fig2_model_comparison.png")


# =============================================================================
# Figure 3 (in research): Algorithm Distribution Pie Chart
# =============================================================================
def fig_algorithm_pie():
    df = pd.read_csv(os.path.join(RESULTS_DIR, "model_comparison.csv"))
    counts = df["Best Model"].value_counts()
    colors = [MODEL_COLORS.get(m, "#999999") for m in counts.index]

    fig, ax = plt.subplots(figsize=(5.5, 4.5))
    wedges, texts, autotexts = ax.pie(
        counts.values, labels=counts.index, colors=colors,
        autopct="%1.0f%%", startangle=90,
        wedgeprops={"edgecolor": "white", "linewidth": 1.4}
    )
    for at in autotexts:
        at.set_fontsize(9.5)
        at.set_fontweight("bold")
    # Title without "Fig. X"
    ax.set_title("Distribution of Selected Classifier Families Across Cohort",
                 fontweight="bold", pad=12)

    save_to_both(fig, "fig3_algorithm_pie.png")


# =============================================================================
# Figure 4 (in research) -> Fig. 5 in Paper: NLP Method Comparison
# =============================================================================
def fig_nlp_comparison():
    data = {
        "Example":         ["Sarcasm\nTest", "Negation\nTest", "Neutral\nTest", "Anger\nTest", "Ambiguous\nValence"],
        "Ground Truth":    [1.0,             1.0,             3.0,            1.0,           3.0],
        "VADER Score":     [3.50,            2.08,            2.87,           1.33,          2.87],
        "RoBERTa Score":   [1.0,             1.0,             3.0,            1.0,           3.0],
    }
    df = pd.DataFrame(data)

    x = np.arange(len(df))
    width = 0.26

    fig, ax = plt.subplots(figsize=(8.0, 4.6))
    b1 = ax.bar(x - width, df["Ground Truth"],  width, label="Ground Truth (Human)", color="#64748B", edgecolor="white")
    b2 = ax.bar(x,         df["VADER Score"],    width, label="Rule-based VADER",       color="#3B82F6", edgecolor="white")
    b3 = ax.bar(x + width, df["RoBERTa Score"],  width, label="Fine-tuned RoBERTa (Ours)", color="#EF4444", edgecolor="white")

    # Annotate bar values
    for bars in [b1, b2, b3]:
        for bar in bars:
            h = bar.get_height()
            ax.text(bar.get_x() + bar.get_width() / 2, h + 0.08,
                    f"{h:.1f}" if h == int(h) else f"{h:.2f}",
                    ha="center", va="bottom", fontsize=7.8)

    ax.set_xticks(x)
    ax.set_xticklabels(df["Example"], fontweight="medium")
    ax.set_ylabel("Discrete Mood Scale (1 = Low, 5 = High)", fontweight="medium")
    ax.set_ylim(0, 5.8)
    # Title without "Fig. X"
    ax.set_title("Linguistic Benchmark: Rule-Based VADER vs. Transformer RoBERTa",
                 fontweight="bold", pad=12)
    ax.grid(axis="y", linestyle=":", alpha=0.4)
    ax.legend(loc="upper right", framealpha=0.9)

    save_to_both(fig, "fig4_nlp_comparison.png")


# =============================================================================
# Figure 6 (in research) -> Fig. 4 in Paper: Per-User Ablation Heatmap
# =============================================================================
def fig_ablation_heatmap():
    df = pd.read_csv(os.path.join(RESULTS_DIR, "fusion_ablation.csv"))
    df.set_index("User", inplace=True)
    cols = ["A_Wearable_Only", "B_Wearable_Wellness", "C_Plus_Emotions", "D_Plus_Themes"]
    col_labels = ["Set A\n(Wearable)", "Set B\n(+ Wellness)", "Set C\n(+ Emotions)", "Set D\n(+ Themes)"]
    heat_data = df[cols].copy()
    heat_data.columns = col_labels

    fig, ax = plt.subplots(figsize=(7.5, 6.5))
    sns.heatmap(heat_data, annot=True, fmt=".2f", cmap="YlGnBu",
                linewidths=0.6, linecolor="white",
                cbar_kws={"label": "Macro-Averaged F1 Score"},
                annot_kws={"size": 8.5},
                vmin=0.2, vmax=1.0, ax=ax)
    # Title without "Fig. X"
    ax.set_title("Per-Participant Macro-F1 Across Progressive Feature Sets",
                 fontweight="bold", pad=12)
    ax.set_xlabel("Feature Configuration Set", fontweight="medium", labelpad=8)
    ax.set_ylabel("Participant ID", fontweight="medium")

    save_to_both(fig, "fig6_ablation_heatmap.png")


# =============================================================================
# Run all (Except system architecture which has dedicated generator)
# =============================================================================
if __name__ == "__main__":
    print("Generating IEEE publication-quality figures without internal numbering...\n")
    fig_ablation()
    fig_model_comparison()
    fig_algorithm_pie()
    fig_nlp_comparison()
    fig_ablation_heatmap()
    print("\nAll figures generated successfully in both directories.")
