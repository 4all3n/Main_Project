import AsyncStorage from '@react-native-async-storage/async-storage';

export const JOURNAL_STORAGE_KEY = '@journal_entries';

type LegacyJournalEntryValue = string | { title?: string; content?: string };
type LegacyJournalEntryMap = Record<string, LegacyJournalEntryValue>;

import {
  EmotionBreakdown,
  JournalAnalysisCache,
  JournalEntryRecord,
  MoodLog,
} from '../types';

export {
  EmotionBreakdown,
  JournalAnalysisCache,
  JournalEntryRecord,
  MoodLog,
};

export const MOOD_STORAGE_KEY = '@mood_logs';

function normalizeDateKey(date: Date) {
  return date.toLocaleDateString('en-CA');
}

export function buildJournalSourceHash(title: string | undefined, content: string) {
  const source = `${(title || '').trim()}\n${content.trim()}`;
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return String(hash);
}

export function createJournalId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLegacyEntry(value: LegacyJournalEntryValue | undefined) {
  if (typeof value === 'string') {
    return {
      title: '',
      content: value,
    };
  }

  return {
    title: value?.title?.trim() || '',
    content: value?.content || '',
  };
}

function migrateLegacyMap(entries: LegacyJournalEntryMap): JournalEntryRecord[] {
  const now = new Date().toISOString();

  return Object.keys(entries).map((dateKey) => {
    const normalized = normalizeLegacyEntry(entries[dateKey]);
    const parsedDate = new Date(dateKey);
    const date = Number.isNaN(parsedDate.getTime()) ? normalizeDateKey(new Date()) : normalizeDateKey(parsedDate);

    return {
      id: `legacy-${dateKey}`,
      date,
      title: normalized.title,
      content: normalized.content,
      createdAt: now,
      updatedAt: now,
    };
  });
}

function isJournalEntryRecordArray(input: unknown): input is JournalEntryRecord[] {
  return Array.isArray(input);
}

export async function readJournalEntries() {
  const storedEntries = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
  if (!storedEntries) {
    return [] as JournalEntryRecord[];
  }

  const parsed = JSON.parse(storedEntries) as unknown;

  if (isJournalEntryRecordArray(parsed)) {
    return parsed;
  }

  const migrated = migrateLegacyMap(parsed as LegacyJournalEntryMap);
  await writeJournalEntries(migrated);
  return migrated;
}

export async function writeJournalEntries(entries: JournalEntryRecord[]) {
  await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
}

export async function upsertJournalEntry(entry: JournalEntryRecord) {
  const entries = await readJournalEntries();
  const index = entries.findIndex((item) => item.id === entry.id);

  if (index >= 0) {
    entries[index] = entry;
  } else {
    entries.push(entry);
  }

  await writeJournalEntries(entries);
  return entries;
}

export function getTodayDateKey(): string {
  return normalizeDateKey(new Date());
}

export async function readMoodLogs(): Promise<MoodLog[]> {
  const raw = await AsyncStorage.getItem(MOOD_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function writeMoodLogs(logs: MoodLog[]): Promise<void> {
  await AsyncStorage.setItem(MOOD_STORAGE_KEY, JSON.stringify(logs));
}

export async function saveTodayMood(score: number): Promise<MoodLog> {
  const today = getTodayDateKey();
  const logs = await readMoodLogs();
  const existingIndex = logs.findIndex((item) => item.date === today);
  const newLog: MoodLog = {
    date: today,
    score,
    loggedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    logs[existingIndex] = newLog;
  } else {
    logs.push(newLog);
  }

  await writeMoodLogs(logs);
  return newLog;
}

export async function getTodayMoodLog(): Promise<MoodLog | null> {
  const today = getTodayDateKey();
  const logs = await readMoodLogs();
  return logs.find((item) => item.date === today) || null;
}

export async function getRecentMoodLogs(days = 7): Promise<MoodLog[]> {
  const logs = await readMoodLogs();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (days - 1));
  cutoff.setHours(0, 0, 0, 0);

  return logs
    .filter((log) => new Date(log.date).getTime() >= cutoff.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

