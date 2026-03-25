import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { FAB, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// We pull from the same storage key as the editor
const JOURNAL_STORAGE_KEY = '@journal_entries';

export default function JournalListScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    
    // entries format: [{ date: '2023-10-25', content: '...' }, ...]
    const [entries, setEntries] = useState<{date: string, content: string}[]>([]);
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
                    content: parsed[dateKey]
                }));
                // Sort descending (newest first)
                entriesArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setEntries(entriesArray);
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

    const renderItem = ({ item }: { item: { date: string, content: string } }) => {
        // Format the date header
        const dateObj = new Date(item.date);
        // Correct time zone shifting for ISO parsing
        dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
        
        const friendlyDate = dateObj.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric'
        });

        return (
            <Surface style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
                <View style={styles.cardHeader}>
                    <Ionicons name="calendar" size={16} color={theme.colors.primary} />
                    <Text variant="labelLarge" style={{ color: theme.colors.primary, marginLeft: 8 }}>
                        {friendlyDate}
                    </Text>
                </View>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, lineHeight: 22 }} numberOfLines={4}>
                    {item.content}
                </Text>
            </Surface>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.headerContainer, { paddingTop: insets.top + 20 }]}>
                <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>
                    Journal History
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                    Your daily reflections and metrics.
                </Text>
            </View>

            {entries.length === 0 && !refreshing ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="journal-outline" size={64} color={theme.colors.outline} />
                    <Text variant="titleMedium" style={{ color: theme.colors.outline, marginTop: 16 }}>
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

            <FAB
                icon="plus"
                style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
                color={theme.colors.onPrimaryContainer}
                onPress={() => router.push('/(tabs)/journal/create')}
            />
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
        paddingBottom: 100, // Make room for FAB
    },
    card: {
        padding: 16,
        borderRadius: 20,
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fab: {
        position: 'absolute',
        margin: 24,
        right: 0,
        bottom: 0,
        borderRadius: 16,
    },
});
