# 📱 MindfulMomentum — Frontend Improvement Plan

> **Goal:** Transform the current working prototype into a polished, research-demonstrable mobile app that showcases the backend's AI capabilities clearly and is worthy of inclusion in a published paper.

---

## Current State Audit

### What Exists
| Screen | Status | Issues |
|--------|--------|--------|
| `home.tsx` — Dashboard | ✅ Working | Health Connect syncs live; readiness score works; but data disappears if backend is off |
| `insights.tsx` — ML Insights | ✅ Working | Shows backend results; but hardcoded demo users (p01–p16) — not the real user's data |
| `journal/index.tsx` — Journal List | ✅ Working | Loads correctly; pull-to-refresh works |
| `journal/create.tsx` — Journal Write | ✅ Working | Save/edit/date-picker all work |
| `journal/[date].tsx` — Journal View | ✅ Working | NLP analysis runs; but error state just says "Keep wearing your watch" even for network errors |
| `metric/[id].tsx` — Metric Detail | ✅ Working | Shows bar chart for past 7 days; limited to steps/sleep/HR/calories |

### What is Missing (Critical Gaps)
1. **No onboarding** — user opens app cold, no explanation of what anything does
2. **No real user identity** — the "Insights" tab shows PMData demo users, not the actual user
3. **No historical trends** — dashboard shows only today; no weekly/monthly view
4. **No mood tracking UI** — the app writes journals but never lets the user self-report their mood score (1–5) explicitly
5. **No notification system** — no reminders to journal daily
6. **No backend connection status** — if the server is offline, nothing tells the user why
7. **No data export** — user cannot get their own journal data out
8. **Insights page is confusing** — showing "P01 through P16" selector makes no sense to a real user
9. **No settings screen** — no way to change name, theme preference, backend URL, or clear data
10. **App name is wrong** — `app.json` says "MyNewProject"; `home.tsx` says "MindfulMomentum" — they need to match

---

## Phase 1 — Core UX Fixes (Do These First)

### 1.1 Fix the App Name & Identity
- `app.json`: change `name` from `"MyNewProject"` to `"MindfulMomentum"`
- `app.json`: change `slug` to `"mindful-momentum"`
- Add a proper `description` field

### 1.2 Connection Status Banner
The app currently freezes with spinners when the backend is offline, then shows a confusing timeout error. Replace this with a graceful status indicator:

- Add a `useBackendStatus` hook that pings `/api/health` on mount and every 30 seconds
- If offline: show a subtle amber banner at the top of Insights and Journal screens: `"Offline — analysis unavailable"`
- If online: show nothing (don't clutter the UI with "Connected" messages)

```typescript
// hooks/useBackendStatus.ts
export function useBackendStatus() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  useEffect(() => {
    const check = async () => {
      try {
        await fetch(`${API_BASE_URL}/api/health`, { signal: AbortSignal.timeout(3000) });
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);
  return isOnline;
}
```

### 1.3 Fix the Insights Screen — Remove Demo User Selector
The P01–P16 selector makes no sense for a real user. This was only there for development testing.

**Replace with:** A single insight view for the logged-in user. For the research paper demo, hardcode to `p01` by default and add a subtle developer toggle (long-press the title) to switch users. This way the research demo still works but normal users see a clean UI.

### 1.4 Standardize Error Messages
All error states currently show *"Keep wearing your watch"* — even network errors. Fix to show context-specific messages:
- Network timeout → *"Backend server is offline. Start the server to see your analysis."*
- No data for user → *"Not enough data yet. Keep logging your journal daily."*
- Server error → *"Something went wrong on the server. Try again later."*

---

## Phase 2 — Missing Core Features

### 2.1 Mood Self-Report Widget (Research-Critical)

This is the most important missing feature for the paper. The backend uses `mood` scores from PMData (1–7 scale from the wellness survey), but the real user has no way to submit their own mood score.

**Build a daily mood check-in widget** on the Home dashboard:

```
┌─────────────────────────────────┐
│  How are you feeling today?     │
│                                 │
│  😫  😕  😐  🙂  😊            │
│   1   2   3   4   5            │
│                                 │
│         [Log my mood]           │
└─────────────────────────────────┘
```

- Store in AsyncStorage alongside journal entries: `{ date: '2025-06-26', moodScore: 4, loggedAt: '...' }`
- Show a checkmark on the widget after the user logs for today
- Send to backend with the daily journal for fusion (future — Phase 3)

**Why this matters for the paper:** It completes the data loop. The paper can say: *"the app collects real-time mood self-reports from users, which are fused with wearable data for personalized prediction."*

### 2.2 Weekly Mood Trend Chart
Add a 7-day mood history chart to the Dashboard or a new "Progress" tab:

- X-axis: last 7 days
- Y-axis: mood score 1–5 (from the self-report widget)
- Overlay: average sleep score for same days (dual-axis)

**Library already installed:** `react-native-gifted-charts` (used in metric detail) — just add a line chart variant.

This visualization directly supports the paper's claim that wearable data correlates with mood.

### 2.3 Settings Screen

A minimal settings screen accessible from the Dashboard header:

| Setting | What it does |
|---------|-------------|
| Display name | Shown on Dashboard header ("Good morning, Fallen") |
| Theme | Light / Dark / System (already implemented, just needs a UI) |
| Backend URL | Let power users change the IP without editing code |
| Clear all data | Wipes AsyncStorage — useful for demos and testing |
| App version | Shows version from `app.json` |

**Route:** `/settings` — accessible via gear icon in Dashboard top bar.

### 2.4 Daily Journal Reminder (Push Notification)
Use `expo-notifications` to schedule a daily local notification:

```typescript
import * as Notifications from 'expo-notifications';

await Notifications.scheduleNotificationAsync({
  content: {
    title: 'Time to reflect 📓',
    body: 'Write today\'s journal entry for your daily insight.',
  },
  trigger: {
    hour: 21,  // 9 PM default, user-configurable in Settings
    minute: 0,
    repeats: true,
  },
});
```

This completes the daily habit loop that the entire app is built around.

---

## Phase 3 — Dashboard Improvements

### 3.1 Historical Metric Charts (Replace 7-Day Steps Only)
The metric detail screen (`metric/[id].tsx`) currently shows a 7-day bar chart for all metrics. Improve it:

- Add a **30-day view toggle** alongside the 7-day view
- Add a **trend line** overlay (simple 7-day moving average) to show direction
- Add **goal line** for steps (10,000) and sleep (8h) — show when the user consistently hits goals

### 3.2 Dashboard Greeting & Contextual Tip
Replace the static headline *"Breathe. Move. Balance."* with dynamic, context-aware content:

```typescript
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getContextualTip = (data: HealthData) => {
  if (data.sleepMinutes < 360) return '💤 You got less than 6h sleep — take it easy today.';
  if (data.steps < 3000 && new Date().getHours() > 14) return '🚶 You\'re below 3,000 steps. A short walk will boost your mood.';
  if (data.heartRate?.avg && data.heartRate.avg > 90) return '❤️ Your resting HR is elevated. Consider a breathing exercise.';
  return '✨ You\'re on track today. Keep it up!';
};
```

### 3.3 Readiness Score Breakdown
The circular readiness score is a black box. Add a tappable breakdown below it:

```
┌─ Readiness: 74% ────────────────┐
│  Steps      ████████░░  82%     │
│  Sleep      ███████░░░  70%     │
│  Active cal ██████░░░░  60%     │
└──────────────────────────────────┘
```

---

## Phase 4 — Research Demo Enhancements

These features exist solely to make the app suitable for demonstrating in the paper and at a viva.

### 4.1 "Research Mode" Toggle (Long Press Easter Egg)
Long-pressing the "Journal Insights" title on the Insights screen reveals the P01–P16 user switcher (currently always visible). In normal mode, show only the personal user's data.

### 4.2 Model Info Card on Insights Screen
After the main insight card, show a compact model metadata card:

```
┌─ Model Information ──────────────┐
│  Algorithm    Random Forest       │
│  Training days  87               │
│  Accuracy      78.4%             │
│  F1 Score      0.77              │
│  Last trained  3 days ago        │
└──────────────────────────────────┘
```

This data comes from the new `/api/model-info/{user_id}` endpoint (in the backend plan). Directly usable as a screenshot in the paper.

### 4.3 NLP Analysis Detail Expansion
The journal analysis card currently just shows a mood score (e.g. `4/5`) and theme chips. Expand it to show:

- Emotion breakdown bar: `Joy 72% | Sadness 8% | Anger 3% | Fear 12%` (from the new RoBERTa model)
- Confidence indicator: `High confidence` / `Low confidence` based on model certainty
- Comparison to previous entry: `↑ Mood improved from 3/5 yesterday`

---

## Phase 5 — Code Quality & Architecture

### 5.1 Move Hardcoded Values to Constants
```typescript
// constants/app-config.ts
export const APP_CONFIG = {
  STEP_GOAL: 10000,
  SLEEP_GOAL_HOURS: 8,
  ACTIVE_CALORIES_GOAL: 600,
  SYNC_LAG_MS: 120_000,
  AUTO_SYNC_INTERVAL_MS: 90_000,
  JOURNAL_REMINDER_HOUR: 21,
  MAX_JOURNAL_LENGTH: 10000,
} as const;
```

### 5.2 Extract Health Data Fetching into a Custom Hook
`home.tsx` is 726 lines — the health fetching logic should be in its own hook:

```typescript
// hooks/useHealthData.ts
export function useHealthData() {
  const [data, setData] = useState<HealthData>(INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // ... all the fetch logic moved here
  return { data, loading, refreshing, refresh };
}
```

### 5.3 Extract Journal Analysis into a Custom Hook
`journal/[date].tsx` mixes data loading + NLP analysis + UI in one 434-line file. Split into:

```typescript
// hooks/useJournalAnalysis.ts
export function useJournalAnalysis(entryId: string, content: string, title: string) {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  // ... all the NLP fetch logic
  return { analysisResult, analysisLoading, analysisError };
}
```

### 5.4 TypeScript Types in a Central File
Duplicate type definitions exist in multiple files. Centralize:

```typescript
// types/index.ts
export type JournalEntry = { ... };
export type HealthData = { ... };
export type InsightResponse = { ... };
export type MoodLog = { date: string; score: number; loggedAt: string };
```

---

## Phase 6 — Polish (Before Paper Submission)

| Item | Detail |
|------|--------|
| **App icon** | Current icon is the default Expo logo. Design a proper icon. |
| **Splash screen** | Customize with app name and color scheme |
| **Empty states** | All empty states currently just show an icon + text. Make them warmer with an illustration |
| **Loading skeletons** | Replace `ActivityIndicator` with skeleton shimmer placeholders for cards that are loading |
| **Haptic feedback** | Add `expo-haptics` on save, delete, and mood-log actions — makes the app feel premium |
| **Keyboard handling** | Journal create screen needs `KeyboardAvoidingView` — keyboard currently covers the text input on some devices |

---

## 📅 Execution Timeline

| Week | Task |
|------|------|
| **Week 1** | Fix app name, connection status hook, standardize error messages |
| **Week 2** | Mood self-report widget (most important feature) |
| **Week 3** | Settings screen + daily notification reminder |
| **Week 4** | Weekly mood trend chart on Dashboard |
| **Week 5** | Model info card on Insights; fix Insights demo user selector |
| **Week 6** | Contextual Dashboard greeting + readiness breakdown |
| **Week 7** | Code refactor: custom hooks, central types, constants file |
| **Week 8** | NLP emotion breakdown on journal view (requires backend Phase 2 to be done) |
| **Week 9** | Polish: skeleton loaders, haptics, empty states, keyboard fix |
| **Week 10** | App icon, splash screen, final QA pass |

---

## 📊 Frontend vs. Backend Priority

| Priority | Item | Reason |
|----------|------|--------|
| 🔴 High | Mood self-report widget | Core data collection — needed for paper |
| 🔴 High | Connection status + error messages | UX is broken without this |
| 🟡 Medium | Settings screen | Needed to change backend URL without code edits |
| 🟡 Medium | Weekly trend chart | Good paper screenshot, shows insight over time |
| 🟡 Medium | Custom hooks + code cleanup | Required before adding more features cleanly |
| 🟢 Low | Notifications | Nice to have, not needed for paper |
| 🟢 Low | Polish (haptics, skeletons) | Final step before demo |

---

## 🔗 Frontend ↔ Backend Dependency Map

| Frontend Feature | Requires Backend |
|-----------------|-----------------|
| Connection status banner | `GET /api/health` |
| Mood self-report logging | Local only (AsyncStorage) |
| Weekly mood trend chart | Local only (AsyncStorage) |
| NLP emotion breakdown | Updated `POST /api/analyze-journal` returning emotion probabilities |
| Model info card | `GET /api/model-info/{user_id}` (new endpoint) |
| Real user insights (not p01–p16) | User mood data sent to backend for training |
