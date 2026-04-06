import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Card, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../providers/app-theme-provider';
import { ZEN_PALETTE } from '../../../constants/zen-ui';
import { MovingZenBackground } from '../../../components/moving-zen-background';

const JOURNAL_STORAGE_KEY = '@journal_entries';

type JournalEntryValue = string | { title?: string; content?: string };
type JournalEntryMap = Record<string, JournalEntryValue>;

function normalizeEntry(value: JournalEntryValue | undefined, fallbackDate: string) {
    if (typeof value === 'string') {
        return {
            title: `Reflection on ${fallbackDate}`,
            content: value,
        };
    }

    return {
        title: value?.title?.trim() || `Reflection on ${fallbackDate}`,
        content: value?.content || '',
    };
}

export default function JournalDetailScreen() {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    const palette = isDark ? ZEN_PALETTE.dark : ZEN_PALETTE.light;
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const { date } = useLocalSearchParams<{ date?: string }>();

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const dateKey = Array.isArray(date) ? date[0] : date;

    const loadEntry = useCallback(async () => {
        if (!dateKey) return;

        try {
            const storedEntries = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
            const entries: JournalEntryMap = storedEntries ? JSON.parse(storedEntries) : {};
            const normalized = normalizeEntry(entries[dateKey], dateKey);
            setTitle(normalized.title);
            setContent(normalized.content);
        } catch (error) {
            console.error('Failed to load journal entry:', error);
        }
    }, [dateKey]);

    useEffect(() => {
        loadEntry();
    }, [loadEntry]);

    const friendlyDate = (() => {
        if (!dateKey) return 'Journal Entry';
        const dateObj = new Date(dateKey);
        dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
        return dateObj.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    })();

    const handleDelete = () => {
        if (!dateKey) return;

        Alert.alert('Delete entry?', 'This entry will be removed from your journal.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const storedEntries = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
                        const entries: JournalEntryMap = storedEntries ? JSON.parse(storedEntries) : {};
                        delete entries[dateKey];
                        await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
                        router.back();
                    } catch (error) {
                        console.error('Failed to delete entry:', error);
                    }
                },
            },
        ]);
    };

    if (!dateKey) {
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
                            onPress={() => router.push({ pathname: '/(tabs)/journal/create', params: { date: dateKey } })}
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
                        {title}
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
});