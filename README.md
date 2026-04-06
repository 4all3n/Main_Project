# 🧠 MindfulMomentum

**An AI-Powered "n-of-1" Mental Wellness & Health Data Fusion Architecture**
*Master of Computer Applications (MCA) Major Project*

---

## 📖 Project Overview
MindfulMomentum is an advanced digital health application designed to bridge the gap between objective physiological data (sleep, steps, heart rate) and subjective psychological states (mood, journal entries). 

Unlike generic health apps that offer one-size-fits-all advice, this architecture utilizes an **n-of-1 Machine Learning approach**. It trains individualized Random Forest models on a per-user basis to discover the unique biological drivers of a specific user's mood, while utilizing advanced Natural Language Processing (NLP) to extract emotional themes from daily journals.

---

## 🚀 Current Project Status: 75% Implementation Phase
The project is currently in the late stages of development, with a **100% feature-complete Python/AI Backend**. Development is actively focused on React Native frontend integration.

### ✅ Completed Milestones (Backend & AI)
* **NLP Pipeline:** Built a robust VADER-based sentiment analysis engine.
* **Theme Extraction:** Implemented NLTK Part-of-Speech (POS) tagging and frequency counting to extract core Nouns and Adjectives from journals.
* **ML Data Fusion:** Successfully merged asynchronous PMData (Fitbit logs + Wellness surveys) into a unified time-series dataset.
* **Feature Engineering:** Implemented lag variables and rolling averages to account for biological realities like "Sleep Debt."
* **Data Balancing:** Integrated Dynamic SMOTE to synthesize minority class data and fix "lazy" predictions caused by human logging habits.
* **Production Scaling:** Built a FastAPI server with Joblib model serialization to prevent server throttling during inference.
* **Defensive Programming:** Implemented edge-case handling for sparse datasets (users with < 5 days of data or zero mood variance).

### ⏳ Upcoming Milestones (Frontend & UI)
* Build the React Native (Expo) visual shell.
* Establish asynchronous API calls (Fetch/Axios) between the mobile app and FastAPI.
* Render the dynamic ML Insight Dashboard and Journal input screens.

---

## 🏗️ System Architecture

The project follows a decoupled, modular architecture to ensure scalability and separation of concerns.

### 1. The Frontend (Mobile App)
* **Framework:** React Native (Expo)
* **Functionality:** Collects daily journal text, passively syncs with wearable health data (simulated via PMData for V1), and renders personalized insights.

### 2. The Backend (API Server)
* **Framework:** Python FastAPI
* **Functionality:** Acts as the bridge between the mobile app and the AI models. Handles data routing, error handling, and JSON serialization.

### 3. Model 1: The NLP Engine (`mindful_nlp.py`)
* **Libraries:** NLTK, VADER Lexicon, Regex.
* **Capabilities:** * Breaks massive text blocks into sentences to prevent **Sentiment Dilution**.
  * Uses `RegexpTokenizer` to strip complex punctuation and mobile keyboard characters.
  * Grades overall mood on a 1-to-5 scale.
  * Uses POS Tagging to isolate the Top 5 emotional drivers (Themes) for the day.

### 4. Model 2: The ML Correlation Engine (`mindful_ml.py`)
* **Libraries:** Pandas, Scikit-Learn, Imbalanced-Learn, Joblib, Seaborn.
* **Capabilities:**
  * Fuses historical health data and applies Hyperparameter Tuning to a `RandomForestClassifier`.
  * Evaluates feature importance to find the #1 biological driver of the user's mood (e.g., "Restlessness").
  * Generates visual Confusion Matrices and Feature Importance graphs.
  * Serializes (Pickles) the trained model for instantaneous future API responses.

---

## 🔌 API Documentation

The FastAPI server exposes the following endpoints for the React Native client:

### `POST /api/analyze-journal`
Analyzes raw journal text to quantify mood and extract themes.
* **Request Body:** `{"text": "string"}`
* **Response:**
  ```json
  {
    "status": "success",
    "calculated_mood_score": 3,
    "overall_themes": ["work", "exhausted", "exams"],
    "paragraph_breakdown": [...]
  }