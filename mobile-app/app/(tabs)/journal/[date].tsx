import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EverforestDark, EverforestLight } from '../../../constants/theme';
import { useJournalAnalysis } from '../../../hooks/useJournalAnalysis';
import { readJournalEntries, writeJournalEntries } from '../../../lib/journal-storage';
import { useAppTheme } from '../../../providers/app-theme-provider';

export default function JournalDetailScreen() {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const ef = isDark ? EverforestDark : EverforestLight;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();

  const [entryId, setEntryId] = useState('');
  const [entryLoading, setEntryLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState('');

  const dateKey = Array.isArray(date) ? date[0] : date;

  // Custom NLP Analysis Hook (Task 2.3)
  const { analysisResult, analysisLoading, analysisError, reAnalyze } = useJournalAnalysis(
    entryId,
    title,
    content
  );

  const loadEntry = useCallback(async () => {
    if (!dateKey) return;

    try {
      const entries = await readJournalEntries();
      const selectedEntry = entries.find((entry) => entry.id === dateKey);
      if (!selectedEntry) {
        setEntryId('');
        setTitle('');
        setContent('');
        setEntryDate('');
        return;
      }

      setEntryId(selectedEntry.id);
      setTitle(selectedEntry.title || '');
      setContent(selectedEntry.content || '');
      setEntryDate(selectedEntry.date);
    } catch (error) {
      console.error('Failed to load journal entry:', error);
    } finally {
      setEntryLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  const friendlyDate = (() => {
    if (!entryDate) return 'Journal Entry';
    const dateObj = new Date(entryDate);
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  })();

  const handleDelete = () => {
    if (!entryId) return;

    Alert.alert('Delete entry?', 'This entry will be removed from your journal.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const entries = await readJournalEntries();
            const nextEntries = entries.filter((entry) => entry.id !== entryId);
            await writeJournalEntries(nextEntries);
            router.back();
          } catch (error) {
            console.error('Failed to delete entry:', error);
          }
        },
      },
    ]);
  };

  if (entryLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.onBackground} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  if (!dateKey || !entryId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.onBackground} />
          </TouchableOpacity>
        </View>
        <View style={styles.center}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
            Journal entry not found.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Top nav bar: back + edit + delete */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.onBackground} />
        </TouchableOpacity>
        <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
          Entry
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}
            onPress={() => router.push({ pathname: '/(tabs)/journal/create', params: { date: entryId } })}
          >
            <Ionicons name="pencil-outline" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionChip, { backgroundColor: isDark ? ef.bg_red : ef.bg_red }]}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={20} color={ef.red} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 60 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero block: date + title + word count */}
        <View style={[styles.hero, { backgroundColor: isDark ? ef.bg1 : ef.bg0, borderColor: isDark ? ef.bg4 : ef.bg3 }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.9 }}>
            {friendlyDate}
          </Text>
          <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, marginTop: 6, fontWeight: '700' }}>
            {title.trim() ? title : 'Untitled entry'}
          </Text>
          <View style={[styles.metaChip, { backgroundColor: isDark ? ef.bg3 : ef.bg2, alignSelf: 'flex-start', marginTop: 10 }]}>
            <Text variant="labelSmall" style={{ color: isDark ? ef.grey1 : ef.grey2 }}>
              {content.trim() ? `${content.trim().split(/\s+/).length} words` : 'Empty entry'}
            </Text>
          </View>
        </View>

        {/* Journal body text */}
        <View style={[styles.card, { backgroundColor: isDark ? ef.bg1 : ef.bg0, borderColor: isDark ? ef.bg4 : ef.bg3 }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.primary, marginBottom: 10, letterSpacing: 0.7, textTransform: 'uppercase' }}>
            Journal text
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
            {content || 'No text saved for this date yet.'}
          </Text>
        </View>

        {/* AI analysis card */}
        <View style={[styles.card, { backgroundColor: isDark ? ef.bg1 : ef.bg0, borderColor: isDark ? ef.bg4 : ef.bg3, marginTop: 12 }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.primary, marginBottom: 10, letterSpacing: 0.7, textTransform: 'uppercase' }}>
            Journal analysis
          </Text>

          {analysisLoading ? (
            <View style={styles.analysisLoadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{ color: isDark ? ef.grey1 : ef.grey2, marginLeft: 10 }}>
                Analyzing your entry…
              </Text>
            </View>
          ) : analysisError ? (
            <View style={[styles.analysisErrorCard, { backgroundColor: isDark ? ef.bg2 : ef.bg2 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                  Analysis Notice
                </Text>
                <TouchableOpacity onPress={() => reAnalyze()} style={styles.retryBtn}>
                  <Ionicons name="refresh" size={14} color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700', marginLeft: 4 }}>
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
              <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 6, lineHeight: 20 }}>
                {analysisError}
              </Text>
            </View>
          ) : analysisResult ? (
            <View style={styles.analysisResultWrap}>
              <View style={styles.scoreRow}>
                <View style={[styles.scoreBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>
                    {Number(analysisResult.moodScore).toFixed(1)} / 5
                  </Text>
                </View>
                {analysisResult.latencyMs ? (
                  <View style={[styles.latencyBadge, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                    <Ionicons name="flash" size={13} color={theme.colors.primary} />
                    <Text variant="labelSmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginLeft: 4 }}>
                      {Math.round(analysisResult.latencyMs)}ms GPU
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* RoBERTa Emotion Breakdown Bars */}
              {analysisResult.emotions ? (
                <View style={styles.emotionsContainer}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    RoBERTa Emotion Distribution
                  </Text>

                  {/* Joy Bar */}
                  <View style={styles.emotionBarRow}>
                    <View style={styles.emotionLabelRow}>
                      <Text variant="bodySmall" style={{ color: ef.green, fontWeight: '700' }}>😊 Joy</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                        {Math.round(analysisResult.emotions.joy * 100)}%
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                      <View style={[styles.barFill, { width: `${Math.min(Math.max(Math.round(analysisResult.emotions.joy * 100), 2), 100)}%`, backgroundColor: ef.green }]} />
                    </View>
                  </View>

                  {/* Neutral Bar */}
                  <View style={styles.emotionBarRow}>
                    <View style={styles.emotionLabelRow}>
                      <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, fontWeight: '700' }}>😐 Neutral</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                        {Math.round(analysisResult.emotions.neutral * 100)}%
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                      <View style={[styles.barFill, { width: `${Math.min(Math.max(Math.round(analysisResult.emotions.neutral * 100), 2), 100)}%`, backgroundColor: isDark ? ef.grey1 : ef.grey2 }]} />
                    </View>
                  </View>

                  {/* Sadness Bar */}
                  <View style={styles.emotionBarRow}>
                    <View style={styles.emotionLabelRow}>
                      <Text variant="bodySmall" style={{ color: ef.red, fontWeight: '700' }}>😔 Sadness</Text>
                      <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                        {Math.round(analysisResult.emotions.sadness * 100)}%
                      </Text>
                    </View>
                    <View style={[styles.barTrack, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                      <View style={[styles.barFill, { width: `${Math.min(Math.max(Math.round(analysisResult.emotions.sadness * 100), 2), 100)}%`, backgroundColor: ef.red }]} />
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Sentence-BERT Semantic Categories */}
              {analysisResult.semanticThemes && analysisResult.semanticThemes.length > 0 ? (
                <View style={{ marginTop: 6 }}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Semantic Categories
                  </Text>
                  <View style={styles.themeWrap}>
                    {analysisResult.semanticThemes.map((tag) => (
                      <View key={tag} style={[styles.semanticChip, { backgroundColor: isDark ? ef.bg3 : ef.bg2, borderColor: theme.colors.primary }]}>
                        <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                          #{tag}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              {/* Key Topics */}
              <View style={{ marginTop: 6 }}>
                <Text variant="labelSmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Extracted Topics
                </Text>
                <View style={styles.themeWrap}>
                  {analysisResult.themes.length > 0 ? (
                    analysisResult.themes.map((themeName) => (
                      <View key={themeName} style={[styles.themeChip, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurface }}>
                          {themeName}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2 }}>
                      No dominant topics detected.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, lineHeight: 20 }}>
              No journal text available to analyze.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  hero: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  metaChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  analysisLoadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  analysisErrorCard: { borderRadius: 12, padding: 12 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  analysisResultWrap: { gap: 14 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scoreBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  latencyBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  emotionsContainer: { marginVertical: 4, gap: 10 },
  emotionBarRow: { gap: 4 },
  emotionLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden', width: '100%' },
  barFill: { height: '100%', borderRadius: 4 },
  semanticChip: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  themeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  themeChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
});