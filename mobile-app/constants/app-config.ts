/**
 * constants/app-config.ts — Global Application Configuration & Defaults
 */

import { HealthData, MoodOption, WidgetConfig } from '../types';

// Biometric Goals
export const STEP_GOAL = 10_000;
export const SLEEP_GOAL_HOURS = 8;
export const ACTIVE_CALORIES_GOAL = 600;

// Health Connect Synchronization Timers
export const SYNC_LAG_MS = 120_000; // 2 minute lag to avoid partially-written records
export const AUTO_SYNC_INTERVAL_MS = 90_000; // 90 seconds periodic background poll
export const INITIAL_SYNC_DELAY_MS = 5_000; // 5 seconds initial delay before periodic loop

// Participant & Storage Defaults
export const DEFAULT_USER_ID = 'p01';
export const DEFAULT_NOTIFICATION_HOUR = 21; // 9:00 PM evening habit reminder

// Initial Blank Biometric State
export const INITIAL_HEALTH_DATA: HealthData = {
  steps: 0,
  activeCalories: 0,
  totalCalories: 0,
  distance: 0,
  heartRate: null,
  sleepMinutes: 0,
  stressLevel: 0,
  bloodOxygen: 0,
};

// Fixed Dashboard Widgets
export const FIXED_WIDGETS: WidgetConfig[] = [
  { id: 'sleep', wide: false },
  { id: 'distance', wide: false },
  { id: 'steps', wide: false },
  { id: 'totalEnergy', wide: false },
  { id: 'stress', wide: false },
  { id: 'bloodOxygen', wide: false },
  { id: 'heartRate', wide: true },
];

// 5-Point Likert Scale Mood Options
export const MOOD_OPTIONS: MoodOption[] = [
  { score: 1, emoji: '😫', label: 'Rough' },
  { score: 2, emoji: '😕', label: 'Low' },
  { score: 3, emoji: '😐', label: 'Okay' },
  { score: 4, emoji: '🙂', label: 'Good' },
  { score: 5, emoji: '😊', label: 'Great' },
];
