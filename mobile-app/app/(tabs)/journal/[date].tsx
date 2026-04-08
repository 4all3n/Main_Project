import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../providers/app-theme-provider';
import { ZEN_PALETTE } from '../../../constants/zen-ui';
import { MovingZenBackground } from '../../../components/moving-zen-background';
import { MindfulAPI } from '../../../services/mindfulApi';
import { buildJournalSourceHash, readJournalEntries, writeJournalEntries } from '../../../lib/journal-storage';

export default function JournalDetailScreen() {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    const palette = isDark ? ZEN_PALETTE.dark : ZEN_PALETTE.light;
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { date } = useLocalSearchParams<{ date?: string }>();

    const [entryId, setEntryId] = useState('');
    const [entryLoading, setEntryLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [entryDate, setEntryDate] = useState('');
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [analysisResult, setAnalysisResult] = useState<{ moodScore: number; themes: string[] } | null>(null);

    const dateKey = Array.isArray(date) ? date[0] : date;

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
                setAnalysisResult(null);
                setAnalysisError('Journal entry not found.');
                return;
            }

            setEntryId(selectedEntry.id);
            setTitle(selectedEntry.title || '');
            setContent(selectedEntry.content || '');
            setEntryDate(selectedEntry.date);

            const sourceHash = buildJournalSourceHash(selectedEntry.title, selectedEntry.content || '');
            if (selectedEntry.analysis && selectedEntry.analysis.sourceHash === sourceHash) {
                setAnalysisResult({
                    moodScore: selectedEntry.analysis.moodScore,
                    themes: selectedEntry.analysis.themes,
                });
                setAnalysisError(null);
            } else {
                setAnalysisResult(null);
            }
        } catch (error) {
            console.error('Failed to load journal entry:', error);
        } finally {
            setEntryLoading(false);
        }
    }, [dateKey]);

    useEffect(() => {
        loadEntry();
    }, [loadEntry]);

    useEffect(() => {
        let cancelled = false;

        const runAnalysis = async () => {
            if (!dateKey || !entryId || !content.trim()) {
                setAnalysisResult(null);
                setAnalysisError(null);
                setAnalysisLoading(false);
                return;
            }

            const sourceHash = buildJournalSourceHash(title, content);
            const existingEntries = await readJournalEntries();
            const existingEntry = existingEntries.find((entry) => entry.id === entryId);
            if (existingEntry?.analysis?.sourceHash === sourceHash) {
                setAnalysisResult({
                    moodScore: existingEntry.analysis.moodScore,
                    themes: existingEntry.analysis.themes,
                });
                setAnalysisError(null);
                setAnalysisLoading(false);
                return;
            }

            setAnalysisLoading(true);
            setAnalysisError(null);

            try {
                const analysis = await MindfulAPI.analyzeJournal(content);
                if (cancelled) {
                    return;
                }

                if (analysis.status === 'success') {
                    const nextSourceHash = buildJournalSourceHash(title, content);
                    setAnalysisResult({
                        moodScore: analysis.calculated_mood_score ?? 3,
                        themes: analysis.overall_themes ?? [],
                    });

                    const entries = await readJournalEntries();
                    const index = entries.findIndex((entry) => entry.id === entryId);
                    if (index >= 0) {
                        entries[index] = {
                            ...entries[index],
                            analysis: {
                                sourceHash: nextSourceHash,
                                moodScore: analysis.calculated_mood_score ?? 3,
                                themes: analysis.overall_themes ?? [],
                                analyzedAt: new Date().toISOString(),
                            },
                        };
                        await writeJournalEntries(entries);
                    }
                } else {
                    throw new Error(analysis.message || 'Unable to analyze this journal entry right now.');
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                setAnalysisResult(null);
                setAnalysisError(error instanceof Error ? error.message : 'Keep wearing your watch. We need a little more data to analyze this entry.');
            } finally {
                if (!cancelled) {
                    setAnalysisLoading(false);
                }
            }
        };

        runAnalysis();

        return () => {
            cancelled = true;
        };
    }, [dateKey, entryId, title, content]);

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
                    <IconButton icon="arrow-left" iconColor={theme.colors.onBackground} onPress={() => router.back()} />
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
                    <IconButton icon="arrow-left" iconColor={theme.colors.onBackground} onPress={() => router.back()} />
                </View>
                <View style={styles.center}>
                    <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>Journal entry not found.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <MovingZenBackground />

            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <IconButton icon="arrow-left" iconColor={theme.colors.onBackground} onPress={() => router.back()} />
                <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
                    Entry
                </Text>
                <View style={styles.headerActions}>
                    <Surface style={[styles.actionChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.58)' }]} elevation={0}>
                        <IconButton
                            icon="pencil-outline"
                            iconColor={theme.colors.primary}
                            size={22}
                            onPress={() => router.push({ pathname: '/(tabs)/journal/create', params: { date: entryId } })}
                            style={styles.actionIcon}
                        />
                    </Surface>
                    <Surface style={[styles.actionChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.58)' }]} elevation={0}>
                        <IconButton
                            icon="trash-can-outline"
                            iconColor="#FF8C6B"
                            size={22}
                            onPress={handleDelete}
                            style={[styles.actionIcon, styles.deleteIcon]}
                        />
                    </Surface>
                </View>
            </View>

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}>
                <Surface style={[styles.hero, { backgroundColor: 'transparent', borderColor: palette.glassBorder }]} elevation={0}>
                    <BlurView intensity={isDark ? 16 : 32} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, styles.surfaceFill]} />
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.surfaceFill, { backgroundColor: palette.glass }]} />
                    <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.9, fontSize: 11 }}>
                        {friendlyDate}
                    </Text>
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 6, fontWeight: '600' }}>
                        {title.trim() ? title : 'Untitled entry'}
                    </Text>
                    <View style={styles.heroMetaRow}>
                        <Surface style={[styles.metaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.58)' }]} elevation={0}>
                            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                {content.trim() ? `${content.trim().split(/\s+/).length} words` : 'Empty entry'}
                            </Text>
                        </Surface>
                    </View>
                </Surface>

                <Card mode="contained" style={[styles.card, { borderColor: palette.glassBorder, backgroundColor: 'transparent' }]}>
                    <BlurView intensity={isDark ? 14 : 28} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, styles.surfaceFill]} />
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.surfaceFill, { backgroundColor: palette.glass }]} />
                    <Card.Content style={{ paddingVertical: 16, paddingHorizontal: 14 }}>
                        <Text variant="bodySmall" style={{ color: theme.colors.primary, marginBottom: 8, letterSpacing: 0.7, textTransform: 'uppercase' }}>
                            Journal text
                        </Text>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 24 }}>
                            {content || 'No text saved for this date yet.'}
                        </Text>
                    </Card.Content>
                </Card>

                <Card mode="contained" style={[styles.card, { borderColor: palette.glassBorder, backgroundColor: 'transparent', marginTop: 12 }]}>
                    <BlurView intensity={isDark ? 14 : 28} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, styles.surfaceFill]} />
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.surfaceFill, { backgroundColor: palette.glass }]} />
                    <Card.Content style={{ paddingVertical: 16, paddingHorizontal: 14 }}>
                        <Text variant="bodySmall" style={{ color: theme.colors.primary, marginBottom: 8, letterSpacing: 0.7, textTransform: 'uppercase' }}>
                            Journal analysis
                        </Text>

                        {analysisLoading ? (
                            <View style={styles.analysisLoadingRow}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 10 }}>
                                    Analyzing your entry...
                                </Text>
                            </View>
                        ) : analysisError ? (
                            <View style={styles.analysisErrorCard}>
                                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                                    Keep wearing your watch
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 6, lineHeight: 20 }}>
                                    {analysisError}
                                </Text>
                            </View>
                        ) : analysisResult ? (
                            <View style={styles.analysisResultWrap}>
                                <Surface style={[styles.scoreBadge, { backgroundColor: theme.colors.primary }]} elevation={0}>
                                    <Text variant="titleMedium" style={{ color: theme.colors.onPrimary, fontWeight: '800' }}>
                                        {analysisResult.moodScore}/5
                                    </Text>
                                </Surface>

                                <View style={styles.themeWrap}>
                                    {analysisResult.themes.length > 0 ? (
                                        analysisResult.themes.map((themeName) => (
                                            <Surface key={themeName} style={[styles.themeChip, { backgroundColor: palette.glass }]} elevation={0}>
                                                <Text variant="labelSmall" style={{ color: theme.colors.onSurface }}>
                                                    {themeName}
                                                </Text>
                                            </Surface>
                                        ))
                                    ) : (
                                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                            No dominant themes were detected.
                                        </Text>
                                    )}
                                </View>
                            </View>
                        ) : (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, lineHeight: 20 }}>
                                No journal text available to analyze.
                            </Text>
                        )}
                    </Card.Content>
                </Card>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 6,
    },
    headerSpacer: {
        width: 40,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginRight: 0,
    },
    actionChip: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    actionIcon: {
        margin: 0,
    },
    deleteIcon: {
        marginLeft: 3,
        marginTop: 0,
    },
    surfaceFill: {
        borderRadius: 16,
    },
    content: {
        paddingHorizontal: 16,
        paddingTop: 10,
    },
    hero: {
        borderRadius: 16,
        padding: 12,
        borderWidth: 0.8,
        marginBottom: 12,
        overflow: 'hidden',
    },
    heroMetaRow: {
        marginTop: 10,
        flexDirection: 'row',
    },
    metaChip: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    card: {
        borderRadius: 16,
        borderWidth: 0.8,
        overflow: 'hidden',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    analysisLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    analysisErrorCard: {
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    analysisResultWrap: {
        gap: 12,
    },
    scoreBadge: {
        alignSelf: 'flex-start',
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    themeWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    themeChip: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
});