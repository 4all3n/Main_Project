import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { IconButton, Surface, Text, useTheme } from 'react-native-paper';
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

export default function JournalScreen() {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    const palette = isDark ? ZEN_PALETTE.dark : ZEN_PALETTE.light;
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ date?: string }>();
    
    const [entryTitle, setEntryTitle] = useState('');
    const [entryText, setEntryText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    // Date selection states
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingDateKey, setEditingDateKey] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    const getDateKey = (date = selectedDate) => date.toLocaleDateString('en-CA');

    const displayDate = useMemo(() => {
        return selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        });
    }, [selectedDate]);

    const wordCount = useMemo(() => {
        const trimmed = entryText.trim();
        if (!trimmed) return 0;
        return trimmed.split(/\s+/).length;
    }, [entryText]);

    useEffect(() => {
        const loadEntry = async () => {
            try {
                const dateParam = Array.isArray(params.date) ? params.date[0] : params.date;
                if (!dateParam) {
                    setIsLoading(false);
                    return;
                }

                const storedEntries = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
                const entries: JournalEntryMap = storedEntries ? JSON.parse(storedEntries) : {};
                const existingEntry = entries[dateParam];

                const parsedDate = new Date(dateParam);
                if (!Number.isNaN(parsedDate.getTime())) {
                    setSelectedDate(parsedDate);
                }

                if (existingEntry) {
                    const normalized = normalizeEntry(existingEntry, dateParam);
                    setEntryTitle(normalized.title);
                    setEntryText(normalized.content);
                    setEditingDateKey(dateParam);
                } else {
                    setEntryTitle(`Reflection on ${dateParam}`);
                }
            } catch (error) {
                console.error('Failed to load journal entry for editing:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadEntry();
    }, [params.date]);

    const handleDateChange = (event: any, date?: Date) => {
        setShowPicker(Platform.OS === 'ios');
        if (date) {
            setSelectedDate(date);
        }
    };

    const handleSaveEntry = async () => {
        setIsSaving(true);
        try {
            const todayKey = getDateKey();
            
            // Fetch existing object mapping dates to entries
            const storedEntries = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
            const entries: JournalEntryMap = storedEntries ? JSON.parse(storedEntries) : {};

            if (editingDateKey && editingDateKey !== todayKey) {
                delete entries[editingDateKey];
            }
            
            // Update today's entry
            entries[todayKey] = {
                title: entryTitle.trim() || `Reflection on ${todayKey}`,
                content: entryText,
            };
            
            // Save stringified map back to storage
            await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
            // Return back to the journal list view upon success
            router.back();
        } catch (error) {
            console.error('Failed to save journal entry:', error);
            Alert.alert('Save failed', 'We could not save this journal entry right now.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
            <MovingZenBackground />

            <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
                <View style={styles.headerRow}>
                    <IconButton
                        icon="arrow-left"
                        size={26}
                        iconColor={theme.colors.onBackground}
                        style={styles.backButton}
                        onPress={() => router.back()}
                    />
                    <IconButton
                        icon="content-save-edit-outline"
                        size={26}
                        iconColor={theme.colors.primary}
                        style={styles.saveIconButton}
                        disabled={isSaving || entryTitle.trim().length === 0 || entryText.trim().length === 0}
                        onPress={handleSaveEntry}
                    />
                </View>

                <View style={styles.headerTextBlockBelow}>
                    <Text variant="labelLarge" style={{ color: theme.colors.primary, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                        {editingDateKey ? 'Edit Entry' : 'New Entry'}
                    </Text>
                    <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: '700', marginTop: 4 }}>
                        {displayDate}
                    </Text>
                </View>

                <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.datePickerRow}>
                    <Surface style={[styles.dateChip, { backgroundColor: theme.colors.primary }]} elevation={0}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onPrimary, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                            Change date
                        </Text>
                    </Surface>
                    <Surface style={[styles.metaChip, { backgroundColor: palette.glass }]} elevation={0}>
                        <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Words {wordCount}</Text>
                    </Surface>
                    <Surface style={[styles.metaChip, { backgroundColor: palette.glass }]} elevation={0}>
                        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                            {editingDateKey ? 'Editing' : 'Draft'}
                        </Text>
                    </Surface>
                </TouchableOpacity>
            </View>

                {showPicker && (
                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()} // Prevent tracking futures
                    />
                )}

                {isLoading ? (
                    <View style={styles.centerParams} />
                ) : (
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                        automaticallyAdjustKeyboardInsets={false}
                        automaticallyAdjustContentInsets={false}
                    >
                        <Surface style={[styles.titleSurface, { borderColor: palette.glassBorder }]} elevation={0}>
                            <BlurView intensity={isDark ? 14 : 28} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, styles.surfaceFill]} />
                            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.surfaceFill, { backgroundColor: palette.glass }]} />
                            <View style={styles.editorHeader}>
                                <Text variant="labelMedium" style={{ color: theme.colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                    Reflection Title
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Keep it short, calm, and clear
                                </Text>
                            </View>
                            <TextInput
                                placeholder="A quiet morning, a steady mind"
                                placeholderTextColor={theme.colors.outline}
                                value={entryTitle}
                                onChangeText={setEntryTitle}
                                style={[styles.titleInput, { color: theme.colors.onSurface, borderColor: palette.glassBorder }]}
                            />
                        </Surface>

                        <Surface style={[styles.editorSurface, { backgroundColor: 'transparent', borderColor: palette.glassBorder }]} elevation={0}>
                            <BlurView intensity={isDark ? 16 : 32} tint={isDark ? 'dark' : 'light'} style={[StyleSheet.absoluteFill, styles.surfaceFill]} />
                            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.surfaceFill, { backgroundColor: palette.glass }]} />
                            <View style={styles.editorHeader}>
                                <Text variant="labelMedium" style={{ color: theme.colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                                    Reflection
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                                    Write freely, no pressure
                                </Text>
                            </View>
                            <TextInput
                                multiline
                                placeholder="How are you feeling today? Write the full journal here..."
                                placeholderTextColor={theme.colors.outline}
                                value={entryText}
                                onChangeText={setEntryText}
                                style={[
                                    styles.textInput,
                                    {
                                        color: theme.colors.onSurface,
                                    },
                                ]}
                                textAlignVertical="top"
                                autoFocus
                            />
                        </Surface>

                    </ScrollView>
                )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },
    headerTextBlockBelow: {
        marginTop: 8,
        paddingHorizontal: 2,
    },
    backButton: {
        marginTop: -4,
        marginLeft: -8,
        marginRight: 0,
    },
    headerTextBlock: {
        flex: 1,
        paddingRight: 16,
        paddingLeft: 8,
    },
    saveIconButton: {
        marginTop: -4,
        marginRight: -10,
        marginLeft: -6,
    },
    datePickerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        flexWrap: 'wrap',
    },
    dateChip: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    metaChip: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.18)',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 172,
        flexGrow: 1,
    },
    titleSurface: {
        borderRadius: 18,
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 10,
        borderWidth: 0.8,
        overflow: 'hidden',
        marginBottom: 14,
    },
    surfaceFill: {
        borderRadius: 18,
    },
    editorSurface: {
        borderRadius: 18,
        paddingHorizontal: 10,
        paddingTop: 10,
        paddingBottom: 6,
        minHeight: 340,
        borderWidth: 0.8,
        borderColor: 'rgba(255, 255, 255, 0.22)',
        overflow: 'hidden',
    },
    editorHeader: {
        paddingHorizontal: 8,
        paddingBottom: 8,
        gap: 2,
    },
    titleInput: {
        borderRadius: 14,
        borderWidth: 0.8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        fontWeight: '600',
        marginHorizontal: 8,
    },
    textInput: {
        flexGrow: 1,
        flexShrink: 1,
        minHeight: 284,
        fontSize: 15,
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 16,
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        overflow: 'hidden',
    },
    centerParams: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
