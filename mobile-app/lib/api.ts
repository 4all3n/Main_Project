declare const process: {
  env?: Record<string, string | undefined>;
} | undefined;

const DEFAULT_API_BASE_URL = 'http://localhost:8000'; // Using ADB Reverse port forwarding

export let API_BASE_URL =
  process?.env?.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

export function updateApiUrl(url: string) {
    API_BASE_URL = url;
}

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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased from 8s to 30s

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
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
