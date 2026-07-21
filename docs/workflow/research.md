# Research Context & Outcomes

This document serves as a comprehensive guide to the research methodologies, exploratory analyses, and expected academic outcomes associated with the **MindfulMomentum** project. It details the purpose of the research scripts and outlines the structure of the eventual research paper.

## 1. Research Overview

The core academic hypothesis of MindfulMomentum is that **combining passive physiological data (wearables) with active psychological data (Natural Language Processing of journals) via individualized (N-of-1) machine learning models provides a vastly superior prediction of human mood than either modality alone.**

Traditionally, psychiatry relies on retrospective, subjective mood surveys. Modern digital phenotyping relies purely on steps and sleep. This project fuses the two, using state-of-the-art transformer models (RoBERTa, SBERT) to extract high-dimensional semantic data from text, and fusing it with tabular wearable data.

---

## 2. Research File Structure and Roles

The `research/` and `research/notebooks/` directories contain the experimental pipeline. These are strictly separated from the production `backend/` code, allowing for rapid experimentation without breaking the live API.

### `01_data_exploration.ipynb` / `.py`
- **Purpose**: Initial Exploratory Data Analysis (EDA). 
- **What it does**: Loads the raw dataset containing wearable metrics (steps, heart rate, sleep) and ecological momentary assessments (EMA) of mood. It plots correlation matrices, visualizes missing data patterns, and generates time-series graphs of mood fluctuations over time.
- **Why**: To understand the underlying distribution of the data before applying machine learning. It helps identify outliers and noise.

### `02_feature_engineering.ipynb` / `.py`
- **Purpose**: Transforming raw data into predictive signals.
- **What it does**: Creates rolling averages (e.g., 3-day average sleep), calculates sleep debt, extracts day-of-week seasonality, and normalizes heart rate variability metrics. 
- **Why**: Machine learning models perform significantly better when given engineered features (like "change in steps from yesterday") rather than raw absolute values.

### `03_ml_model_comparison.ipynb` / `.py`
- **Purpose**: The core N-of-1 machine learning experiment.
- **What it does**: Trains and evaluates multiple classical algorithms (Logistic Regression, Random Forest, XGBoost, Support Vector Machines) on a per-user basis. It calculates accuracy, precision, recall, and F1-scores.
- **Why**: Proves the hypothesis that N-of-1 (individualized) models outperform population-level models, and determines which algorithm is most robust for small, noisy datasets.

### `04_nlp_vader_vs_bert.ipynb` / `.py`
- **Purpose**: Validating the choice of NLP model.
- **What it does**: Compares traditional lexicon-based sentiment analysis (VADER) against deep-learning transformer models (RoBERTa). 
- **Why**: Lexicon models struggle with sarcasm, complex sentence structures, and nuanced emotional states. This notebook quantitatively proves that RoBERTa is required for accurate journaling analysis.

### `05_fusion_experiment.ipynb` / `.py`
- **Purpose**: The ultimate proof of concept.
- **What it does**: Fuses the structured wearable data features with the unstructured NLP embeddings to predict next-day mood.
- **Why**: Demonstrates that the multimodal approach (fusion) achieves higher predictive accuracy than using wearables alone or text alone.

---

## 3. Guide to Writing the Research Paper

When you are ready to write the academic research paper, it should follow this structured outline, drawing directly from the results generated in the notebooks above.

### I. Abstract
Summarize the problem (mood tracking is subjective and retrospective), the proposed solution (multimodal fusion of wearables and NLP), the methodology (N-of-1 machine learning models), and the primary results (e.g., a X% increase in F1-score when using fusion).

### II. Introduction
- The state of digital phenotyping and mental health.
- The limitations of purely passive tracking (wearables lack context).
- The limitations of purely active tracking (journaling is sparse and burdensome).
- **Hypothesis**: Multimodal fusion using N-of-1 architecture.

### III. Methodology
- **Data Collection**: Describe the dataset, simulated or real, the frequency of sampling, and the types of wearable data collected.
- **NLP Pipeline**: Detail the use of `SamLowe/roberta-base-go_emotions`. Explain why a multi-label emotion classifier is superior to binary sentiment analysis (positive/negative). Mention the use of Sentence-BERT for semantic theme extraction. (Reference `04_nlp_vader_vs_bert.ipynb`).
- **N-of-1 Machine Learning**: Explain why individualized models were chosen over population models. Detail the feature engineering process (`02_feature_engineering.ipynb`) and the algorithms tested (`03_ml_model_comparison.ipynb`).

### IV. Results
- **Algorithm Performance**: Present tables showing the F1-scores of XGBoost vs. Random Forest across the users.
- **Feature Importance**: Highlight which features consistently drove mood predictions (e.g., Sleep vs. Steps).
- **Fusion Results**: Present the graph from `05_fusion_experiment.ipynb` showing the accuracy of Wearables-Only vs. NLP-Only vs. Fusion.

### V. Discussion
- **Clinical Implications**: How can this technology be used by therapists or individuals for preventative mental healthcare?
- **Privacy and Ethics**: Discuss the implications of edge-processing vs. cloud-processing of highly sensitive journal data.
- **Limitations**: Acknowledge the limitations of N-of-1 models (e.g., the cold start problem—the model requires 1-2 weeks of data before it becomes accurate).

### VI. Conclusion
A strong summarizing paragraph reiterating that the future of mental health technology lies in personalized, multimodal AI.

---

## 4. Expected Outcomes

By running these research notebooks and documenting the findings, the project aims to yield:
1. **A production-ready algorithmic backend** (which has already been implemented in `mindful_ml.py` based on the findings from these notebooks).
2. **A robust academic manuscript** suitable for submission to conferences or journals in the field of Digital Health, Medical Informatics, or Applied Machine Learning.
3. **Open-source contributions** in the form of a reproducible benchmark for N-of-1 multimodal mental health prediction.
