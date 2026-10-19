# 🚀 MindfulMomentum — Master Project Completion Plan

> **Date:** October 19, 2026  
> **Status:** Research ✅ | Paper ✅ | Backend ✅ (Verified Running) | Frontend ✅ (Verified Running on Device)  
> **Target:** Complete all remaining project features, code refactoring, system integration, and final viva/presentation deliverables.
>
> ⚠️ **IMPORTANT:** *This is a planning document. No source code changes will be made until you review this plan and give explicit approval.*

---

## 1. 🔍 System Health & Live Verification Summary

Both backend and frontend have been compiled, executed, and verified live on your connected Android phone (**Samsung Galaxy A34 5G — `SM_A346E`** via USB):

| Component | Status | Details |
|:---|:---:|:---|
| **FastAPI Backend (`app.py`)** | 🟢 **RUNNING (Port 8000)** | GPU-accelerated on NVIDIA RTX 4060 Laptop GPU. All 6 smoke test suites (20 individual assertions) pass with 0 failures. Pre-loads RoBERTa and Sentence-BERT. |
| **Android Mobile App (`com.hpsin.healthdash`)** | 🟢 **RUNNING on Device** | Successfully built with Gradle 8.13 and Android SDK 36. Installed and launched on phone via USB. Connected to Metro bundler (`node_modules/expo-router/entry.js` bundled 2,170 modules). |
| **End-to-End API Communication** | 🟢 **VERIFIED** | The mobile app successfully calls the backend via `adb reverse` (`localhost:8000`), receives personalized ML insights for `p01` (SVM, 20 features, top driver: Moderately Active Minutes 32.54%), and renders feature importances on the physical screen. |
| **Research Experiments & Figures** | ✅ **COMPLETE** | All 5 notebooks, CSV benchmark results, and 5 active paper figures generated. |
| **Research Paper Manuscript** | ✅ **COMPLETE** | `main.tex` (711 lines) fully updated with honest PMData framing, humanized student tone, and verified references. Packaged in `docs/mindful_momentum_paper_updated.zip`. |

---

## 2. 📋 Comprehensive Inventory of Pending Work

### Part A: Frontend Core Features (Missing UI & Capabilities)
*These features are essential for a complete user experience and live demonstration.*

1. **Daily Mood Self-Report Check-In Widget (`F4`)**:
   - **Current State:** The dashboard displays readiness and metrics, but there is no interactive card for the user to report their daily mood.
   - **Plan:** Build an emoji check-in card on the Home screen (`😫 1` | `😕 2` | `😐 3` | `🙂 4` | `😊 5`).
   - **Storage:** Create `MoodLog` type and persistence methods (`readMoodLogs`, `writeMoodLog`, `getTodayMoodLog`) in `mobile-app/lib/journal-storage.ts`.
   - **Behavior:** Once logged for today, display a checkmark and the selected mood. Do not re-prompt until the next day.

2. **NLP Emotion Breakdown on Journal View (`F9`)**:
   - **Current State:** `mobile-app/app/(tabs)/journal/[date].tsx` only shows a raw 1–5 score and keyword chips, ignoring the deep NLP output.
   - **Plan:** The backend already returns `emotions: { joy, neutral, sadness }` and `semantic_themes`. Add visual probability progress bars:
     - `Joy: 98%` (green bar)
     - `Neutral: 1%` (gray bar)
     - `Sadness: 1%` (amber/red bar)
     - Semantic theme tags (e.g. `#exercise`, `#work_stress`, `#sleep_disturbance`).

3. **Weekly Mood Trend Chart (`F7`)**:
   - **Current State:** `react-native-gifted-charts` is installed, but only used for single-day metric detail bars.
   - **Plan:** Add a 7-day curved LineChart on the Dashboard displaying the user's daily self-reported mood score (1–5) over the past week, with an optional sleep duration overlay.

4. **Dynamic Greeting & Contextual Wellness Tip (`F10`)**:
   - **Current State:** Header shows static text ("Your Dashboard").
   - **Plan:** Replace with dynamic greeting based on time of day ("Good morning / afternoon / evening") and an intelligent tip derived from today's Health Connect data (e.g., sleep < 6h alerts, low step count reminders).

5. **Readiness Score Breakdown (`F11`)**:
   - **Plan:** Add a collapsible breakdown beneath the circular readiness meter displaying the weighted inputs: Steps (40%), Sleep (35%), Active Calories (25%).

6. **Historical Metric Views & Trends (`F14`)**:
   - **Plan:** In `mobile-app/app/metric/[id].tsx`, add a toggle between 7-Day and 30-Day history, plus a 7-day moving average trend line.

7. **Daily Journal Reminder Notifications (`F12`)**:
   - **Plan:** Install and configure `expo-notifications` to trigger a daily local reminder (default 9:00 PM) to complete the evening reflection.

---

### Part B: Frontend Code Quality & Architecture Refactoring
*The frontend code currently has several monolithic files with duplicate definitions.*

1. **Extract `hooks/useHealthData.ts`**:
   - `mobile-app/app/(tabs)/home.tsx` is currently 528 lines, mixing Health Connect permissions, deduplication, interval auto-syncing, and UI rendering.
   - Extract the entire data-fetching and permission engine into a reusable custom hook.

2. **Extract `hooks/useJournalAnalysis.ts`**:
   - `mobile-app/app/(tabs)/journal/[date].tsx` mixes AsyncStorage loading, source-hash caching, backend API calls, and layout rendering.
   - Extract the analysis and caching state into a dedicated hook.

3. **Centralize Types (`mobile-app/types/index.ts`)**:
   - Currently, `JournalEntry`, `HealthData`, `InsightResponse`, and `WidgetConfig` are duplicated across multiple screen files.
   - Consolidate all TypeScript interfaces into a clean, shared definitions file.

4. **Centralize App Constants (`mobile-app/constants/app-config.ts`)**:
   - Extract hardcoded targets (`STEP_GOAL = 10000`, `SLEEP_GOAL_HOURS = 8`, `ACTIVE_CALORIES_GOAL = 600`, sync intervals) into a configurable constants module.

---

### Part C: Frontend Branding & Polish
1. **Custom Branding Assets**:
   - Replace default blue Expo icon and splash screen in `mobile-app/assets/images/` with custom MindfulMomentum branding.
2. **Loading Skeletons & Haptics**:
   - Replace generic spinners with smooth card skeleton placeholders.
   - Add haptic feedback (`expo-haptics`) to mood rating clicks and journal save actions.

---

### Part D: Backend Refinements & Integration Loop
*Closing the gap between the mobile app and the machine learning pipeline.*

1. **Cross-Validated Mean F1 (`mindful_ml.py`)**:
   - Currently, `_train_and_save` evaluates only on the final TimeSeriesSplit fold. Update it to compute the mean Macro F1 across all 3 folds to strictly match the research methodology described in the paper.
2. **Live Mobile User Pipeline (`POST /api/sync-user-data`)**:
   - Currently, the backend only knows about participants `p01`–`p16`.
   - Add an endpoint that allows the mobile app to sync the actual user's daily health summary + journal emotion scores + daily mood rating to train an N-of-1 model specifically for the phone's owner.
3. **Automated Unit Tests (`pytest`)**:
   - Add automated test coverage with `httpx` and `fastapi.testclient` that can execute without having to manually keep the server running in another terminal.
4. **Containerization**:
   - Add `Dockerfile` and `docker-compose.yml` for 1-command reproducible backend deployment.

---

### Part E: Academic & Presentation Deliverables
1. **Overleaf PDF Verification**:
   - Compile `docs/mindful_momentum_paper_updated.zip` on Overleaf and verify page count and column balance.
2. **Review 3 / Final Viva Presentation**:
   - Build the final project slide deck in `Idea/` highlighting the verified live mobile app demo, system architecture, and research findings.
3. **Demo Script & Video Recording**:
   - Step-by-step presentation walkthrough showcasing:
     - Android Health Connect live sync.
     - Journal text input -> RoBERTa GPU emotion extraction.
     - N-of-1 personalized ML model training and driver attribution.

---

## 3. 🗓️ Recommended Execution Roadmap

We propose executing this work in 4 clean, testable phases:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Core Mobile Features (Mood Widget, Emotion Bars, Trend Chart) │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 2: Frontend Architecture (Hooks, Central Types & Config)         │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 3: Backend Refinement & Real-Time User Sync Loop                 │
├────────────────────────────────────────────────────────────────────────┤
│ Phase 4: Polish, Branding Assets & Final Viva Deliverables             │
└────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: Core Mobile Experience (Immediate Priority)
- **Task 1.1:** Add `MoodLog` storage helper functions to `mobile-app/lib/journal-storage.ts`.
- **Task 1.2:** Build the Mood Self-Report Check-In Widget on `mobile-app/app/(tabs)/home.tsx`.
- **Task 1.3:** Build the RoBERTa Emotion Breakdown Bars in `mobile-app/app/(tabs)/journal/[date].tsx`.
- **Task 1.4:** Build the 7-day Mood Trend LineChart on `mobile-app/app/(tabs)/home.tsx`.

### Phase 2: Architecture & Clean Code
- **Task 2.1:** Create `mobile-app/types/index.ts` and `mobile-app/constants/app-config.ts`.
- **Task 2.2:** Extract `mobile-app/hooks/useHealthData.ts`.
- **Task 2.3:** Extract `mobile-app/hooks/useJournalAnalysis.ts`.
- **Task 2.4:** Add dynamic greeting and contextual health tips to `home.tsx`.

### Phase 3: Backend Refinements & Closed-Loop Sync
- **Task 3.1:** Update `backend/mindful_ml.py` to calculate proper 3-fold cross-validated mean F1.
- **Task 3.2:** Implement `POST /api/sync-user-data` in `backend/app.py` for live mobile user data ingestion.
- **Task 3.3:** Add automated `pytest` test suite in `backend/tests/`.

### Phase 4: Polish & Academic Completion
- **Task 4.1:** Update app icon and splash screen assets.
- **Task 4.2:** Add haptic feedback and skeleton loaders.
- **Task 4.3:** Prepare final Review 3 / Viva presentation slides in `Idea/`.

---

## 4. 🐚 Fish Shell Quick Reference for Local Terminal

When running commands manually in your local **fish** terminal:

```fish
# Activate Python Virtual Environment (Fish shell)
cd /home/fallen/Projects/Main_Project/backend
source .venv/bin/activate.fish

# Start Backend Server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Start Frontend Metro Bundler (in mobile-app/)
cd /home/fallen/Projects/Main_Project/mobile-app
npx expo start
```
