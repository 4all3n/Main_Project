import AsyncStorage from '@react-native-async-storage/async-storage';

export const JOURNAL_STORAGE_KEY = '@journal_entries';

type LegacyJournalEntryValue = string | { title?: string; content?: string };
type LegacyJournalEntryMap = Record<string, LegacyJournalEntryValue>;

export type JournalAnalysisCache = {
  sourceHash: string;
  moodScore: number;
  themes: string[];
  analyzedAt: string;
};

export type JournalEntryRecord = {
  id: string;
  date: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  analysis?: JournalAnalysisCache;
};

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
