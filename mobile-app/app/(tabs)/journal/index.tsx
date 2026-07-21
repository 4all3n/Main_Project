/**
 * Journal List Screen — shows all journal entries in Everforest card style.
 * Header scrolls with content. FAB (write button) sits above nav bar.
 * No glassmorphism, no animated background.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../../providers/app-theme-provider';
import { EverforestLight, EverforestDark } from '../../../constants/theme';
import { readJournalEntries, writeJournalEntries } from '../../../lib/journal-storage';

type JournalEntry = {
    id: string;
    date: string;
    title?: string;
    content: string;
    createdAt: string;
    updatedAt: string;
};

export default function JournalListScreen() {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    const ef = isDark ? EverforestDark : EverforestLight;
    const insets = useSafeAreaInsets();
    const router = useRouter();

    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    /** Load & sort entries by most-recently updated */
    const loadEntries = async () => {
        setRefreshing(true);
        try {
            const arr = await readJournalEntries();
            arr.sort((a, b) =>
                new Date(b.updatedAt || b.createdAt).getTime() -
                new Date(a.updatedAt || a.createdAt).getTime()
            );
            setEntries(arr);
        } catch (e) {
            console.error('Failed to load journal entries:', e);
        } finally {
            setRefreshing(false);
        }
    };

    // Reload every time screen comes into focus
    useFocusEffect(useCallback(() => { loadEntries(); }, []));

    const openEntry = (id: string) =>
        router.push({ pathname: '/(tabs)/journal/[date]', params: { date: id } });

    const editEntry = (id: string) =>
        router.push({ pathname: '/(tabs)/journal/create', params: { date: id } });

    const deleteEntry = (id: string) => {
        Alert.alert('Delete entry?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    const next = (await readJournalEntries()).filter(e => e.id !== id);
                    await writeJournalEntries(next);
                    setEntries(next);
                },
            },
        ]);
    };

    /** Individual entry card */
    const renderItem = ({ item }: { item: JournalEntry }) => {
        const dateObj = new Date(item.date);
        // Fix timezone offset so ISO date strings display correctly
        dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
        const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
        const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const preview = item.content.length > 200 ? `${item.content.slice(0, 200)}…` : item.content;

        return (
            <Pressable onPress={() => openEntry(item.id)} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
                <View style={[styles.card, { backgroundColor: isDark ? ef.bg1 : ef.bg0, borderColor: isDark ? ef.bg4 : ef.bg3 }]}>
                    {/* Date + title */}
                    <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                            <Text variant="labelSmall" style={{ color: theme.colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                {weekday},
                            </Text>
                            <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 2, fontWeight: '700' }}>
                                {item.title?.trim() || 'Untitled entry'}
                            </Text>
                            <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 2 }}>
                                {monthDay}
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={isDark ? ef.grey1 : ef.grey2} />
                    </View>

                    {/* Preview text */}
                    <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 10, lineHeight: 19 }} numberOfLines={4}>
                        {preview}
                    </Text>

                    {/* Action row */}
                    <View style={[styles.actionRow, { borderTopColor: isDark ? ef.bg3 : ef.bg3 }]}>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? ef.bg2 : ef.bg2 }]} onPress={() => editEntry(item.id)}>
                            <Ionicons name="create-outline" size={14} color={theme.colors.primary} />
                            <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 6 }}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: isDark ? ef.bg_red : ef.bg_red }]} onPress={() => deleteEntry(item.id)}>
                            <Ionicons name="trash-outline" size={14} color={ef.red} />
                            <Text variant="labelSmall" style={{ color: ef.red, marginLeft: 6 }}>Delete</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Pressable>
        );
    };

    /** Scrollable header — rendered as FlatList ListHeaderComponent so it scrolls away */
    const ListHeader = () => (
        <View style={[styles.headerBlock, { paddingTop: insets.top + 20 }]}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, letterSpacing: 1.4, textTransform: 'uppercase' }}>
                Reflect
            </Text>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '800', marginTop: 6 }}>
                Journal History
            </Text>
            <Text variant="bodyMedium" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 6 }}>
                Your daily reflections and metrics.
            </Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {entries.length === 0 && !refreshing ? (
                <>
                    <ListHeader />
                    <View style={styles.emptyContainer}>
                        <Ionicons name="journal-outline" size={60} color={isDark ? ef.grey0 : ef.grey1} />
                        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 16, fontWeight: '700' }}>
                            No entries yet
                        </Text>
                        <Text variant="bodyMedium" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                            Tap the ✏️ button below to write your first reflection.
                        </Text>
                    </View>
                </>
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={<ListHeader />}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 120 }]}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={loadEntries} tintColor={theme.colors.primary} />
                    }
                />
            )}

            {/* Write FAB — positioned higher above the tab bar */}
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.colors.primary, bottom: insets.bottom + 100 }]}
                onPress={() => router.push('/(tabs)/journal/create')}
                activeOpacity={0.85}
            >
                <Ionicons name="add" size={28} color={theme.colors.onPrimary} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    headerBlock: {
        paddingHorizontal: 20,
        paddingBottom: 16,
    },

    listContent: {
        paddingHorizontal: 16,
    },

    /** Entry card */
    card: {
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },

    /** Edit / Delete buttons */
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
        paddingTop: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 10,
    },

    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingBottom: 120,
    },

    /** Floating write button */
    fab: {
        position: 'absolute',
        right: 20,
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
});
