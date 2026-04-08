declare const process: {
  env?: Record<string, string | undefined>;
} | undefined;

const DEFAULT_API_BASE_URL = 'https://burro-ready-strictly.ngrok-free.app';

export const API_BASE_URL =
  process?.env?.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

export type JournalAnalysisResponse = {
  status: 'success' | 'error';
  calculated_mood_score?: number;
  overall_themes?: string[];
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

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  });

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
