/**
 * types/index.ts — Central TypeScript Type Definitions for MindfulMomentum
 */

//  Health & Biometric Data Types 

export interface HealthData {
  steps: number;
  activeCalories: number;
  totalCalories: number;
  distance: number;
  heartRate: { min: number; max: number; avg: number } | null;
  sleepMinutes: number;
  stressLevel: number;
  bloodOxygen: number;
}

export interface WidgetConfig {
  id: string;
  wide: boolean; // true = full width, false = half width
}

//  Mood Logging Types 

export interface MoodLog {
  date: string; // YYYY-MM-DD
  score: number; // 1 to 5
  loggedAt: string; // ISO timestamp
  notes?: string;
}

export interface MoodOption {
  score: number;
  emoji: string;
  label: string;
}

//  NLP & Journal Types 

export interface EmotionBreakdown {
  joy: number;
  neutral: number;
  sadness: number;
}

export interface JournalAnalysisCache {
  sourceHash: string;
  moodScore: number;
  themes: string[];
  semanticThemes?: string[];
  emotions?: EmotionBreakdown;
  confidence?: number;
  latencyMs?: number;
  analyzedAt: string;
}

export interface JournalEntryRecord {
  id: string;
  date: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  analysis?: JournalAnalysisCache;
}

//  Backend API Response Types 

export interface JournalAnalysisResponse {
  status: 'success' | 'error';
  calculated_mood_score?: number;
  emotions?: EmotionBreakdown;
  overall_themes?: string[];
  semantic_themes?: string[];
  confidence?: number;
  latency_ms?: number;
  paragraph_breakdown?: unknown[];
  message?: string;
}

export type InsightResponse =
  | {
      status: 'success';
      data: {
        user_id: string;
        top_feature: string;
        top_feature_impact_percent?: number;
        insight_message: string;
        graphs_generated: boolean;
        data_days_used?: number;
        latest_feature_values?: Record<string, number>;
        feature_importances?: Array<{
          feature: string;
          impact_percent: number;
        }>;
      };
    }
  | {
      status: 'error';
      message: string;
    };

export interface ModelInfoData {
  user_id?: string;
  algorithm?: string;
  best_f1?: number;
  data_days_used?: number;
  trained_at?: string;
  last_trained_human?: string;
}

export interface ModelInfoResponse {
  status: 'success' | 'error';
  data?: ModelInfoData;
  algorithm?: string;
  best_f1?: number;
  last_trained_human?: string;
  message?: string;
}
