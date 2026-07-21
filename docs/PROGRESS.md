# 📊 MindfulMomentum — Project Progress & Execution Plan

**Project:** MCA Major Project — Personalized Multi-Modal Mood Prediction  
**Started:** 2026-06-01  
**Last Updated:** 2026-07-20  
**Overall Status:** Research ✅ | Backend ✅ | Frontend 🔄 | Paper ⬜

## 🌟 UI Overhaul & UX Improvements (Completed)

### Completed 
- **Theme Overhaul:** Replaced generic colors and glassmorphism with the custom, solid "Everforest" palette (Light/Dark mode supported).
- **Navigation Update:** Replaced default bottom tab bar with a custom, floating pill-shaped navigation bar.
- **Settings Screen:** Moved settings to a dedicated screen accessed via profile avatar on the Home header. Profile icons removed from other screens for a cleaner UI.
- **Dashboard Customization:** Implemented a robust 2x2 grid "Edit Dashboard" mode on the Home screen. Users can long-press to reorder widgets via drag-and-drop, resize between wide/half spans, and add/remove widgets. Preferences are saved to `AsyncStorage`.
- **Header Polish:** Implemented elegant, scrollable headers across the Home, Insights, and Journal pages.
- **Journal UX:** Fixed keyboard overlay issues with `KeyboardAvoidingView` in the entry screen, moved the floating create button above the tab bar, and increased the journal list preview sizes.
- **API Flexibility:** Refactored backend URL configuration to be dynamic via the Settings screen.

### Pending / Can Be Improved
- **Animations:** Add subtle micro-interactions to buttons and cards.
- **Mood Logging UI:** The planned Mood Self-Report Widget is not yet built.
- **Error States:** Ensure network errors display gracefully with the new UI.

---

## 📁 Docs Folder Guide

All planning and tracking files live in `docs/`:

| File | Purpose |
|------|---------|
| `PROGRESS.md` | **This file** — single source of truth for what's done and what's pending |
| `BACKEND_PLAN.md` | Full technical detail for backend improvements |
| `FRONTEND_PLAN.md` | Full technical detail for frontend improvements |
| `PAPER_PLAN.md` | Section-by-section paper writing guide with timeline |
| `PROJECT_ROADMAP.md` | Original master roadmap |

---

## 🎯 Overall Completion Map

```
[✅ RESEARCH]──→[✅ BACKEND]──→[🔄 FRONTEND]──→[⬜ PAPER]
    100%             100%            30%             0%
```

---
---

# ✅ PHASE 1 — RESEARCH (COMPLETE)

*All done. Every result, figure, and CSV is saved in `research/`.*

| Task | Done On |
|------|---------|
| Setup research venv + install all packages | 2026-06-26 |
| Step 1: EDA + figures (heatmap, mood dist, availability) | 2026-06-26 |
| Step 2: Feature engineering (22+ features, 3-class target, lag vars) | 2026-06-26 |
| Step 3: ML comparison with Optuna + TimeSeriesSplit (6 models × 16 users) | 2026-06-26 |
| Step 4: VADER vs RoBERTa + GoEmotions fine-tune + Sentence-BERT clustering | 2026-06-26 |
| Step 5: Fusion ablation study + Wilcoxon test (p=0.0077) | 2026-06-26 |

**Key Finding:** Adding RoBERTa NLP emotion features improved Macro F1 from 0.674 → 0.793 (+16.3%). Statistically significant (p < 0.05).

---
---

# 🔄 PHASE 2 — APP COMPLETION PLAN

> **Strategy:** Backend first, then Frontend. The frontend improvements depend on new backend endpoints. Getting the backend solid first means the frontend work never gets blocked.

---

## ⚡ EXECUTION ORDER (Why Backend → Frontend)

| Reason | Detail |
|--------|--------|
| Frontend needs `/api/health` | Connection status banner can't work without it |
| Frontend needs `/api/model-info` | Model card on Insights screen needs this endpoint |
| Frontend needs updated NLP response | Emotion breakdown in journal view needs `joy`, `sadness`, `anger` fields |
| Backend is smaller scope | Backend = ~4 files to change; Frontend = ~10 screens + hooks |
| Paper depends on backend | RoBERTa must be production-ready before paper screenshots |

---

## 🔧 BACKEND TASKS

### B1. Add `/api/health` Endpoint
**Priority:** 🔴 Critical — unblocks frontend connection banner  
**File:** `backend/app.py`  
**Status:** ⬜ Not started

```python
@app.get("/api/health")
def health_check():
    return {"status": "ok", "version": "2.0", "timestamp": datetime.now().isoformat()}
```

---

### B2. Add Input Validation
**Priority:** 🔴 Critical — currently accepts empty text and crashes  
**File:** `backend/app.py`, `mindful_nlp.py`  
**Status:** ⬜ Not started  

- Reject empty journal text
- Reject text > 10,000 characters
- Return structured error JSON (not bare Python exception)

---

### B3. Replace VADER with RoBERTa in Production
**Priority:** 🔴 Critical — VADER is our *baseline to beat*, not the contribution  
**File:** `backend/mindful_nlp.py`  
**Status:** ⬜ Not started  

- Load `cardiffnlp/twitter-roberta-base-sentiment-latest`
- Return `joy`, `sadness`, `anger` emotion probabilities alongside mood score
- Updated response shape:
  ```json
  {
    "mood_score": 4.2,
    "sentiment": "positive",
    "emotions": { "joy": 0.72, "sadness": 0.08, "anger": 0.03 },
    "overall_themes": ["sleep", "stress", "workout"]
  }
  ```

---

### B4. Upgrade ML to N-of-1 Best Models
**Priority:** 🟡 High — paper requires per-user best model, not a generic RF  
**File:** `backend/mindful_ml.py`  
**Status:** ⬜ Not started  

- Load `research/results/best_params_pXX.json` for each user
- Instantiate the correct model class (LightGBM / XGBoost / RF) per user
- Retrain if no saved model exists for that user

---

### B5. Add `/api/model-info/{user_id}` Endpoint
**Priority:** 🟡 High — needed for Model Info Card in the app  
**File:** `backend/app.py`  
**Status:** ⬜ Not started  

- Return: algorithm name, training days, Macro F1, last trained date
- Read from model metadata JSON stored alongside `.joblib` file

---

### B6. Add Sentence-BERT Theme Extraction
**Priority:** 🟢 Medium — upgrade from POS-tag themes to semantic clustering  
**File:** `backend/mindful_nlp.py`  
**Status:** ⬜ Not started  

- Replace NLTK POS tagging with `all-MiniLM-L6-v2` + K-Means clustering
- Return semantic theme labels in the journal analysis response

---

### B7. Async Background Retraining
**Priority:** 🟢 Low — performance improvement, not functionally blocking  
**File:** `backend/app.py`  
**Status:** ⬜ Not started  

- Return cached insight immediately
- Trigger background retrain if model is older than 7 days

---

### Backend Completion Checklist

| Task | Priority | Status | Done On |
|------|----------|--------|---------|
| B1 — `/api/health` endpoint | 🔴 Critical | ✅ | 2026-07-16 |
| B2 — Input validation | 🔴 Critical | ✅ | 2026-07-16 |
| B3 — Replace VADER with RoBERTa (GPU) | 🔴 Critical | ✅ | 2026-07-16 |
| B4 — N-of-1 best model per user | 🟡 High | ✅ | 2026-07-16 |
| B5 — `/api/model-info` endpoint | 🟡 High | ✅ | 2026-07-16 |
| B6 — Sentence-BERT theme extraction | 🟢 Medium | ✅ | 2026-07-16 |
| B7 — Async background retrain | 🟢 Low | ✅ | 2026-07-16 |

---
---

## 📱 FRONTEND TASKS

> **Order within frontend:** Critical fixes first → Core missing features → Polish

---

### F1. Fix App Name
**Priority:** 🔴 Critical — `app.json` still says "MyNewProject"  
**File:** `mobile-app/app.json`  
**Status:** ⬜ Not started  

Change:
- `name`: `"MyNewProject"` → `"MindfulMomentum"`
- `slug`: any → `"mindful-momentum"`
- Add `description` field

---

### F2. Connection Status Banner
**Priority:** 🔴 Critical — app freezes silently when backend is offline  
**Files:** New `hooks/useBackendStatus.ts`, `insights.tsx`, `journal/[date].tsx`  
**Status:** ⬜ Not started  
**Depends on:** B1 (`/api/health`)

- Ping `/api/health` on mount and every 30 seconds
- Show amber banner: `"Backend offline — analysis unavailable"` when server is down
- Show nothing when online (don't clutter UI)

---

### F3. Fix Error Messages
**Priority:** 🔴 Critical — all errors say "Keep wearing your watch" including network errors  
**Files:** `insights.tsx`, `journal/[date].tsx`, `home.tsx`  
**Status:** ⬜ Not started  

| Error Condition | Message to Show |
|----------------|----------------|
| Network timeout | "Backend server is offline. Start the server to see your analysis." |
| No data for user | "Not enough data yet. Keep logging your journal daily." |
| Server 500 error | "Something went wrong on the server. Try again later." |

---

### F4. Mood Self-Report Widget
**Priority:** 🔴 Critical — core feature for paper; users can't log mood anywhere  
**Files:** `home.tsx`, new `hooks/useMoodLog.ts`  
**Status:** ⬜ Not started  

- Daily emoji 1–5 rating widget on dashboard
- Storage: `AsyncStorage` key `mood_logs` → `[{ date, moodScore, loggedAt }]`
- Shows checkmark after today's mood is logged
- Doesn't ask again if already logged today

```
How are you feeling today?
😫   😕   😐   🙂   😊
 1    2    3    4    5
```

---

### F5. Fix Insights Screen — Hide Demo Selector
**Priority:** 🔴 Critical — P01–P16 selector is confusing and unprofessional  
**File:** `insights.tsx`  
**Status:** ⬜ Not started  

- Remove visible P01–P16 user dropdown
- Default to `p01` for demo
- Add long-press easter egg on title → reveals the selector (for research/demo use only)

---

### F6. Settings Screen
**Priority:** 🟡 High — currently can't change backend URL without editing code  
**Files:** New `app/settings.tsx`, gear icon in dashboard header  
**Status:** ⬜ Not started  

Settings to include:
| Setting | Storage |
|---------|---------|
| Display name | AsyncStorage |
| Backend URL | AsyncStorage (overrides hardcoded IP) |
| Theme (Light/Dark/System) | AsyncStorage |
| Clear all data | Wipes AsyncStorage |
| App version | Read from `app.json` |

---

### F7. Weekly Mood Trend Chart
**Priority:** 🟡 High — good paper screenshot; shows mood correlates with health data  
**File:** `home.tsx` or new `Progress` section  
**Status:** ⬜ Not started  

- 7-day line chart: mood score from self-report (F4)
- Overlay: average sleep score same days
- Library already installed: `react-native-gifted-charts`

---

### F8. Model Info Card on Insights
**Priority:** 🟡 High — makes the AI transparent; great for paper screenshots  
**File:** `insights.tsx`  
**Status:** ⬜ Not started  
**Depends on:** B5 (`/api/model-info`)

```
┌─ Model Information ───────────────┐
│  Algorithm    LightGBM            │
│  Training days  87                │
│  Macro F1      0.83               │
│  Last trained  3 days ago         │
└───────────────────────────────────┘
```

---

### F9. NLP Emotion Breakdown in Journal View
**Priority:** 🟡 High — shows depth of AI; direct paper screenshot  
**File:** `app/(tabs)/journal/[date].tsx`  
**Status:** ⬜ Not started  
**Depends on:** B3 (RoBERTa response with emotion fields)

- Emotion bar: `Joy 72% | Sadness 8% | Anger 3%`
- Mood change vs. previous entry: `↑ Improved from 3/5 yesterday`
- Confidence tag: High / Medium / Low based on emotion certainty

---

### F10. Dynamic Dashboard Greeting & Contextual Tip
**Priority:** 🟡 High — makes app feel alive and personal  
**File:** `home.tsx`  
**Status:** ⬜ Not started  

- Replace static "Breathe. Move. Balance." with:
  - Time-based greeting: "Good morning / afternoon / evening, [Name]"
  - Data-driven tip: e.g. "You got < 6h sleep — take it easy today" or "You're below 3,000 steps — a short walk will help"

---

### F11. Readiness Score Breakdown
**Priority:** 🟢 Medium — makes the circular score less of a black box  
**File:** `home.tsx`  
**Status:** ⬜ Not started  

- Tappable breakdown below readiness circle:
  ```
  Steps        ████████░░  82%
  Sleep        ███████░░░  70%
  Active cal   ██████░░░░  60%
  ```

---

### F12. Daily Journal Reminder Notification
**Priority:** 🟢 Medium — completes the daily habit loop  
**File:** New notification setup in `app/_layout.tsx` or `providers/`  
**Status:** ⬜ Not started  

- `expo-notifications` → daily 9 PM local notification
- User-configurable time in Settings (F6)

---

### F13. Code Refactor — Custom Hooks & Central Types
**Priority:** 🟢 Medium — required before the codebase gets too messy to extend  
**Status:** ⬜ Not started  

- [ ] `hooks/useHealthData.ts` — extract 700+ lines of health fetch logic from `home.tsx`
- [ ] `hooks/useJournalAnalysis.ts` — extract NLP analysis from `journal/[date].tsx`
- [ ] `types/index.ts` — centralize `JournalEntry`, `HealthData`, `InsightResponse`, `MoodLog`
- [ ] `constants/app-config.ts` — step goal, sleep goal, sync intervals, reminder hour

---

### F14. 30-Day View & Trend Line on Metric Charts
**Priority:** 🟢 Medium — richer data visualisation  
**File:** `app/metric/[id].tsx`  
**Status:** ⬜ Not started  

- Toggle: 7-day / 30-day view
- Overlay a 7-day moving average trend line
- Show goal line for steps (10k) and sleep (8h)

---

### F15. Polish — Final App Quality Pass
**Priority:** 🟢 Low — do last, before paper submission / demo  
**Status:** ⬜ Not started  

- [ ] App icon — replace default Expo icon with custom MindfulMomentum icon
- [ ] Splash screen — customize with app branding
- [ ] Loading skeletons — replace `ActivityIndicator` spinners with shimmer placeholders
- [ ] Haptic feedback (`expo-haptics`) — on save, delete, mood log
- [ ] Keyboard avoiding view — journal create screen keyboard covers input on some devices
- [ ] Empty state illustrations — warmer, more descriptive empty states

---

### Frontend Completion Checklist

| Task | Priority | Status | Done On |
|------|----------|--------|---------|
| F1 — Fix app name | 🔴 Critical | ✅ | 2026-07-16 |
| F2 — Connection status banner | 🔴 Critical | ✅ | 2026-07-16 |
| F3 — Fix error messages | 🔴 Critical | ✅ | 2026-07-16 |
| F4 — Mood self-report widget | 🔴 Critical | ⬜ | — |
| F5 — Fix Insights demo selector | 🔴 Critical | ✅ | 2026-07-16 |
| F6 — Settings screen | 🟡 High | ⬜ | — |
| F7 — Weekly mood trend chart | 🟡 High | ⬜ | — |
| F8 — Model info card | 🟡 High | ✅ | 2026-07-16 |
| F9 — NLP emotion breakdown | 🟡 High | ⬜ | — |
| F10 — Dynamic greeting & contextual tip | 🟡 High | ⬜ | — |
| F11 — Readiness score breakdown | 🟢 Medium | ⬜ | — |
| F12 — Daily journal reminder | 🟢 Medium | ⬜ | — |
| F13 — Code refactor (hooks + types) | 🟢 Medium | ⬜ | — |
| F14 — 30-day chart + trend line | 🟢 Medium | ⬜ | — |
| F15 — Polish (icon, skeleton, haptics) | 🟢 Low | ⬜ | — |

---
---

# ⬜ PHASE 3 — RESEARCH PAPER (NOT STARTED)

*All data is ready. Only writing remains.*

| Task | Status | Done On |
|------|--------|---------|
| Decide target venue (ask guide) | ⬜ | — |
| Create Overleaf project (IEEE template) | ⬜ | — |
| Draw system architecture diagram (draw.io) | ⬜ | — |
| Write Abstract | ⬜ | — |
| Write Section 1: Introduction | ⬜ | — |
| Write Section 2: Related Work | ⬜ | — |
| Write Section 3: Dataset & Features | ⬜ | — |
| Write Section 4: Methodology | ⬜ | — |
| Write Section 5: Results | ⬜ | — |
| Write Section 6: Discussion | ⬜ | — |
| Write Section 7: Conclusion | ⬜ | — |
| Collect 20–25 References (Zotero) | ⬜ | — |
| Write Acknowledgements | ⬜ | — |
| Submit draft to guide | ⬜ | — |
| Incorporate guide feedback | ⬜ | — |
| Final submission to venue | ⬜ | — |

*See `docs/PAPER_PLAN.md` for section-by-section writing guide with all result numbers.*

---
---

# 📅 Execution Timeline

```
JULY 2026
Week 1 (Jul 16–20)  ──→  Backend Critical: B1, B2, B3 (health endpoint, validation, RoBERTa)
Week 2 (Jul 21–27)  ──→  Backend High:     B4, B5 (N-of-1 ML, model-info endpoint)
Week 3 (Jul 28–Aug 3) ─→  Frontend Critical: F1, F2, F3, F4, F5 (app name, banner, errors, mood widget, insights fix)

AUGUST 2026
Week 4 (Aug 4–10)   ──→  Frontend High:    F6, F7, F8, F9, F10 (settings, chart, model card, NLP emotions, greeting)
Week 5 (Aug 11–17)  ──→  Paper Writing:    Overleaf setup, architecture diagram, Introduction, Related Work
Week 6 (Aug 18–24)  ──→  Paper Writing:    Dataset, Methodology, Results sections
Week 7 (Aug 25–31)  ──→  Paper Writing:    Discussion, Conclusion, References — submit draft to guide

SEPTEMBER 2026
Week 8 (Sep 1–7)    ──→  Guide Feedback:   Incorporate changes
Week 9 (Sep 8–14)   ──→  Frontend Medium:  F11–F14 (refactor, 30-day charts, notifications)
Week 10 (Sep 15–21) ──→  Backend Medium:   B6, B7 (Sentence-BERT, async retrain)
Week 11 (Sep 22–28) ──→  Frontend Polish:  F15 (icon, skeleton, haptics, keyboard)
Week 12 (Sep 29+)   ──→  Final submission to venue
```

---

## 🔗 Key File Paths

| What | Where |
|------|-------|
| Backend server | `backend/app.py` |
| NLP engine | `backend/mindful_nlp.py` |
| ML engine | `backend/mindful_ml.py` |
| Dashboard screen | `mobile-app/app/(tabs)/home.tsx` |
| Insights screen | `mobile-app/app/(tabs)/insights.tsx` |
| Journal view | `mobile-app/app/(tabs)/journal/` |
| Backend URL config | `mobile-app/lib/api.ts` ← change this when switching Wi-Fi |
| Research figures | `research/figures/` |
| Research results | `research/results/` |
| Per-user best model configs | `research/results/best_params_pXX.json` |
| Fine-tuned RoBERTa | `research/fine_tuned_model/` |

---

*Update this file every time a task is completed — change ⬜ to ✅ and add the date.*
