# Frontend Workflow & Architecture

This document completely details the frontend architecture of the **MindfulMomentum** mobile application. It covers the framework choices, state management, UI/UX design paradigms, data fetching mechanisms (specifically Health Connect and API integration), and the folder structure.

## 1. System Overview

The frontend is a cross-platform mobile application built using **React Native** and **Expo**. It serves as the primary interface for users to track their daily physiological metrics (via wearables) and their psychological metrics (via journaling), fusing them together to provide actionable insights.

### Core Technologies
- **Framework**: React Native with Expo Router (file-based routing)
- **Language**: TypeScript
- **Health Data Integration**: `react-native-health-connect` (Android)
- **UI & Theming**: `react-native-paper`, custom Everforest color scheme, `react-native-reanimated`
- **Charting & Visualizations**: `react-native-svg`, `react-native-chart-kit`

---

## 2. File Structure and Roles

The `mobile-app` directory follows a modern Expo Router file-based routing architecture:

- **`/app`**
  The root directory for all screens.
  - **`_layout.tsx`**: The root layout wrapping the entire app. It configures the Theme Provider, SafeArea context, and handles global font loading.
  - **`/(tabs)`**: The main bottom tab navigator.
    - **`_layout.tsx`**: Defines the Bottom Tabs (Home, Journal, Insights, Settings) and handles the custom tab bar UI.
    - **`home.tsx`**: The Dashboard screen. Fetches and aggregates Health Connect data.
    - **`journal.tsx`**: Displays a list of past journal entries.
    - **`new-entry.tsx`**: The screen for writing a new journal entry and sending it to the NLP backend.
    - **`insight.tsx`**: Displays ML-generated personalized insights and model metrics.
    - **`settings.tsx`**: User preferences, profile, and theme toggling.

- **`/components`**
  Reusable UI elements.
  - **`CircularMeter.tsx`**: A custom SVG-based circular progress ring used on the Home screen to display step goals and heart rate data.
  
- **`/constants`**
  - **`theme.ts`**: Contains the hardcoded **Everforest** color palettes (Light and Dark). Everforest is a green-based, low-contrast, highly aesthetic color scheme designed to reduce eye strain, aligning perfectly with the app's mental health focus.
  
- **`/hooks`**
  - **`use-theme-color.ts`**: A custom hook that allows components to dynamically adapt to the system's light/dark mode changes in real-time.

- **`/providers`**
  - **`app-theme-provider.tsx`**: A React Context provider that manages the global theme state and integrates with `react-native-paper`'s theming engine.

---

## 3. Detailed Data Flow

### 3.1. Health Data Fetching (Home Screen)
The app relies heavily on on-device physiological data rather than forcing the user to manually input their metrics.

1. **Permission Request**: When `home.tsx` mounts, it calls `requestPermission` from `react-native-health-connect` to ask the user for read access to Steps, Distance, Total Calories, Active Calories, Sleep, Heart Rate, Blood Oxygen, and Stress.
2. **Data Aggregation**: The app calls `aggregateRecord` and `readRecords`. It defines a `timeRangeFilter` spanning from midnight of the current day to the current moment.
3. **State Updates**: The raw data (e.g., thousands of step events) is summed up, averaged, and transformed into a clean `HealthData` interface. 
4. **UI Rendering**: The UI is updated. The dashboard is constructed using a Flexbox grid (`styles.grid`). The widgets are strictly ordered (Sleep, Distance, Steps, Burn, Stress, Blood Oxygen) with Heart Rate as a full-width card spanning the bottom.
5. **Auto-sync**: To keep the dashboard feeling "alive", a `setInterval` runs every 90 seconds in the background to silently re-fetch Health Connect data.

### 3.2. NLP API Integration (Journal Screen)
1. **User Input**: The user types a journal entry in `new-entry.tsx`.
2. **Network Request**: The app makes a `POST` request to the backend's `/api/analyze-journal` endpoint, sending the text payload.
3. **Awaiting Response**: An `ActivityIndicator` displays while the backend processes the text through the RoBERTa and SBERT models.
4. **Data Presentation**: The API returns emotion percentages (e.g., 80% joy, 20% neutral), thematic tags, and a calculated mood score. The frontend parses this and immediately updates the UI to show the user the psychological breakdown of their text.

### 3.3. ML Insights (Insight Screen)
1. **Network Request**: `insight.tsx` mounts and GETs `/api/get-insight/p01`. 
2. **Data Presentation**: The screen renders a highly stylized Card showing the primary insight (e.g., "Your mood is heavily impacted by your Sleep"). It also contains a "Model Info" section that details the backend ML model's accuracy, algorithm type (e.g., XGBoost), and training date.

---

## 4. UI/UX and Design Philosophy

### The Everforest Theme
Mental health applications must avoid looking like clinical dashboards or aggressive fitness trackers. We chose the **Everforest** theme because of its warm, organic, and earthy tones. It completely avoids jarring primary colors (pure reds or blues). 

### Animations and Polished UI
The app avoids cheap "glassmorphic" trends that clutter the UI. Instead, it relies on flat, solid surfaces with mathematically precise border radii (typically 20px - 28px). 
- **Typography**: Uses `react-native-paper`'s typography scale to ensure consistent hierarchy (e.g., `headlineMedium` for titles, `bodySmall` for helper text).
- **Icons**: Heavily utilizes `@expo/vector-icons` (Ionicons) for recognizable, clean iconography inside perfectly rounded square bubbles.

## 5. Future Scalability

- **State Management**: Currently, state is managed locally via `useState` and context. As the app grows to include historical charting, implementing a robust global store (like Redux Toolkit or Zustand) and a caching layer (like React Query) will be necessary.
- **Offline Mode**: The Journaling NLP currently requires an internet connection. Future versions could integrate extremely quantized NLP models using React Native's JSI (JavaScript Interface) to run entirely offline, maximizing privacy.
