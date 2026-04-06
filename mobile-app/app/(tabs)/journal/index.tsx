import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../providers/app-theme-provider';
import { ZEN_PALETTE } from '../../../constants/zen-ui';
import { MovingZenBackground } from '../../../components/moving-zen-background';

// We pull from the same storage key as the editor
const JOURNAL_STORAGE_KEY = '@journal_entries';

type JournalEntryValue = string | { title?: string; content?: string };
type JournalEntry = { date: string; title: string; content: string };

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

export default function JournalListScreen() {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    const palette = isDark ? ZEN_PALETTE.dark : ZEN_PALETTE.light;
    const insets = useSafeAreaInsets();
    const router = useRouter();
    
    // entries format: [{ date: '2023-10-25', content: '...' }, ...]
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadEntries = async () => {
        setRefreshing(true);
        try {
            const storedEntries = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
            if (storedEntries) {
                const parsed = JSON.parse(storedEntries);
                // Convert mapping { "YYYY-MM-DD": "content" } to sorted array array
                const entriesArray = Object.keys(parsed).map(dateKey => ({
                    date: dateKey,
                    ...normalizeEntry(parsed[dateKey] as JournalEntryValue, dateKey),
                }));
                // Sort descending (newest first)
                entriesArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setEntries(entriesArray);
            } else {
                setEntries([]);
            }
        } catch (error) {
            console.error('Failed to load journal entries:', error);
        } finally {
            setRefreshing(false);
        }
    };

    // Reload the list every time the user navigates back to this screen
    useFocusEffect(
        useCallback(() => {
            loadEntries();
        }, [])
    );

    const openEntry = (date: string) => {
        router.push({ pathname: '/(tabs)/journal/[date]', params: { date } });
    };

    const editEntry = (date: string) => {
        router.push({ pathname: '/(tabs)/journal/create', params: { date } });
    };

    const deleteEntry = (date: string) => {
        Alert.alert('Delete journal entry?', 'This will remove the entry for this date.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const storedEntries = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
                        const parsed = storedEntries ? JSON.parse(storedEntries) : {};
                        delete parsed[date];
                        await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(parsed));
                        setEntries((current) => current.filter((entry) => entry.date !== date));
                    } catch (error) {
                        console.error('Failed to delete journal entry:', error);
                    }
                },
            },
        ]);
    };

    const renderItem = ({ item }: { item: JournalEntry }) => {
        // Format the date header
        const dateObj = new Date(item.date);
        // Correct time zone shifting for ISO parsing
        dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
        
        const friendlyDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });
        const preview = item.content.length > 120 ? `${item.content.slice(0, 120)}...` : item.content;

        return (
            <Pressable onPress={() => openEntry(item.date)} style={({ pressed }) => [{ opacity: pressed ? 0.88 : 1 }]}> 
                <Surface style={[styles.card, { backgroundColor: 'transparent', borderColor: palette.glassBorder }]} elevation={0}>
                    <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]} />
                    <View style={styles.cardContent}>
                        <View style={styles.cardHeader}>
                            <View>
                                <Text variant="labelMedium" style={{ color: theme.colors.primary, letterSpacing: 0.8, textTransform: 'uppercase', fontSize: 11 }}>
                                    {friendlyDate.split(' ')[0]}
                                </Text>
                                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 4, fontWeight: '600' }}>
                                    {item.title}
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 3 }}>
                                    {friendlyDate.substring(friendlyDate.indexOf(' ') + 1)}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={theme.colors.outline} opacity={0.5} />
                        </View>

                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, lineHeight: 20 }} numberOfLines={3}>
                            {preview}
                        </Text>

                        <View style={styles.actionRow}>
                            <TouchableRipple onPress={() => editEntry(item.date)} borderless style={styles.actionButton}>
                                <View style={styles.actionButtonInner}>
                                    <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                                    <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 6 }}>Edit</Text>
                                </View>
                            </TouchableRipple>
                            <TouchableRipple onPress={() => deleteEntry(item.date)} borderless style={styles.actionButton}>
                                <View style={styles.actionButtonInner}>
                                    <Ionicons name="trash-outline" size={14} color="#FF8C6B" />
                                    <Text variant="labelSmall" style={{ color: '#FF8C6B', marginLeft: 6 }}>Delete</Text>
                                </View>
                            </TouchableRipple>
                        </View>
                    </View>
                </Surface>
            </Pressable>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <MovingZenBackground />

            <View style={[styles.headerContainer, { paddingTop: insets.top + 20 }]}> 
                <Text variant="labelLarge" style={{ color: theme.colors.primary, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                    Reflect
                </Text>
                <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '800', marginTop: 6 }}>
                    Journal History
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                    Your daily reflections and metrics.
                </Text>
            </View>

            {entries.length === 0 && !refreshing ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="journal-outline" size={64} color={theme.colors.outline} />
                    <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 16, fontWeight: '700' }}>
                        No entries yet.
                    </Text>
                    <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                        Tap the + button below to write your first daily reflection.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item) => item.date}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={loadEntries} tintColor={theme.colors.primary} />
                    }
                />
            )}

            <Surface style={[styles.composeWrap, { borderColor: palette.glassBorder, bottom: insets.bottom + 62 }]} elevation={0}>
                <BlurView intensity={isDark ? 24 : 44} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]} />
                <TouchableRipple style={styles.composeButton} onPress={() => router.push('/(tabs)/journal/create')} borderless>
                    <View style={[styles.composeInner, { backgroundColor: theme.colors.primary }]}> 
                        <Ionicons name="create-outline" size={18} color={theme.colors.onPrimary} />
                    </View>
                </TouchableRipple>
            </Surface>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 180,
    },
    card: {
        borderRadius: 18,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 0.8,
        backgroundColor: 'transparent',
    },
    cardContent: {
        padding: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 12,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: 14,
        gap: 8,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    actionButtonInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    composeWrap: {
        position: 'absolute',
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 999,
        overflow: 'hidden',
        borderWidth: 0.8,
    },
    composeButton: {
        flex: 1,
        borderRadius: 999,
    },
    composeInner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
