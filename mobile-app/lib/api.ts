import AsyncStorage from '@react-native-async-storage/async-storage';

declare const process: {
  env?: Record<string, string | undefined>;
} | undefined;

export const BACKEND_URL_STORAGE_KEY = '@backend_url';
export const DEFAULT_API_BASE_URL =
  process?.env?.EXPO_PUBLIC_API_BASE_URL?.trim() || 'http://10.47.120.152:8000';

export let API_BASE_URL = DEFAULT_API_BASE_URL;

// Load saved custom URL on launch
AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY)
  .then((stored) => {
    if (stored && stored.trim()) {
      API_BASE_URL = stored.trim().replace(/\/+$/, '');
    }
  })
  .catch(() => {});

export async function updateApiUrl(url: string) {
  const clean = url.trim().replace(/\/+$/, '');
  API_BASE_URL = clean;
  try {
    await AsyncStorage.setItem(BACKEND_URL_STORAGE_KEY, clean);
  } catch (e) {
    console.error('Failed to save backend URL to AsyncStorage:', e);
  }
}

export type JournalAnalysisResponse = {
  status: 'success' | 'error';
  calculated_mood_score?: number;
  emotions?: {
    joy: number;
    neutral: number;
    sadness: number;
  };
  overall_themes?: string[];
  semantic_themes?: string[];
  confidence?: number;
  latency_ms?: number;
  paragraph_breakdown?: unknown[];
  message?: string;
};

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

export async function getApiBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (stored && stored.trim()) {
      API_BASE_URL = stored.trim().replace(/\/+$/, '');
      return API_BASE_URL;
    }
  } catch {}
  return API_BASE_URL || DEFAULT_API_BASE_URL;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = await getApiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased from 8s to 30s

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(init?.headers || {}),
      },
      signal: controller.signal,
      ...init,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    let body: any = null;

    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    if (!response.ok) {
      const message =
        body?.message || body?.detail || `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    return body as T;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError' || (error.message && error.message.toLowerCase().includes('canceled'))) {
      throw new Error('Connection timed out. Please check if the backend server is running.');
    }
    throw error;
  }
}

export async function analyzeJournal(text: string) {
  return requestJson<JournalAnalysisResponse>('/api/analyze-journal', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export async function getInsight(userId: string) {
  return requestJson<InsightResponse>(`/api/get-insight/${encodeURIComponent(userId)}`);
}
export async function getModelInfo(userId: string) {
  return requestJson<any>(`/api/model-info/${encodeURIComponent(userId)}`);
}
