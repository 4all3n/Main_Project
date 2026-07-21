/**
 * Journal Create / Edit Screen.
 *
 * Fixes:
 * - KeyboardAvoidingView so keyboard never covers the text input
 * - Scrollable content area grows to fit keyboard
 * - No glassmorphism / BlurView — clean Everforest palette
 * - BackHandler exits when back is pressed (goes back to list)
 */
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../../providers/app-theme-provider';
import { EverforestLight, EverforestDark } from '../../../constants/theme';
import { MoodInputWidget } from '../../../components/mood-input-widget';
import { MindfulAPI } from '../../../services/mindfulApi';
import {
    buildJournalSourceHash,
    createJournalId,
    readJournalEntries,
    upsertJournalEntry,
} from '../../../lib/journal-storage';

export default function JournalCreateScreen() {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    const ef = isDark ? EverforestDark : EverforestLight;
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const params = useLocalSearchParams<{ date?: string }>();

    // ── State ────────────────────────────────────────────────────────────
    const [entryTitle, setEntryTitle] = useState('');
    const [entryText, setEntryText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // AI real-time theme detection
    const [themes, setThemes] = useState<string[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Date
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    // ── Helpers ──────────────────────────────────────────────────────────
    const getDateKey = (date = selectedDate) => date.toLocaleDateString('en-CA');

    const displayDate = useMemo(
        () => selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
        [selectedDate]
    );

    const wordCount = useMemo(() => {
        const t = entryText.trim();
        return t ? t.split(/\s+/).length : 0;
    }, [entryText]);

    // ── Load existing entry when editing ─────────────────────────────────
    useEffect(() => {
        const load = async () => {
            try {
                const dateParam = Array.isArray(params.date) ? params.date[0] : params.date;
                if (!dateParam) { setIsLoading(false); return; }

                const entries = await readJournalEntries();
                const existing = entries.find(e => e.id === dateParam);
                const parsed = new Date(existing?.date || dateParam);
                if (!Number.isNaN(parsed.getTime())) setSelectedDate(parsed);

                if (existing) {
                    setEntryTitle(existing.title || '');
                    setEntryText(existing.content || '');
                    setEditingEntryId(dateParam);
                }
            } catch (e) {
                console.error('Failed to load entry for editing:', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [params.date]);

    // ── Date picker handler ───────────────────────────────────────────────
    const handleDateChange = (_: any, date?: Date) => {
        setShowPicker(Platform.OS === 'ios');
        if (date) setSelectedDate(date);
    };

    // ── AI analysis — debounced 1.5 s after typing stops ─────────────────
    const handleTextChange = (text: string) => {
        setEntryText(text);
        if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        if (text.trim().length < 15) { setThemes([]); setIsAnalyzing(false); return; }

        setIsAnalyzing(true);
        analysisTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await MindfulAPI.analyzeJournal(text);
                if (res.status === 'success' && res.overall_themes) setThemes(res.overall_themes);
            } catch (err) {
                if (err instanceof Error && err.message.includes('canceled')) return;
                console.error('Theme extraction failed:', err);
            } finally {
                setIsAnalyzing(false);
            }
        }, 1500);
    };

    // ── Save ──────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const entries = await readJournalEntries();
            const existing = editingEntryId ? entries.find(e => e.id === editingEntryId) : undefined;
            const nowIso = new Date().toISOString();

            if (existing) {
                if (existing.content !== entryText || existing.title !== entryTitle) {
                    await upsertJournalEntry({ ...existing, title: entryTitle, content: entryText, updatedAt: nowIso });
                }
            } else {
                await upsertJournalEntry({
                    id: createJournalId(),
                    date: getDateKey(),
                    title: entryTitle,
                    content: entryText,
                    createdAt: nowIso,
                    updatedAt: nowIso,
                });
            }

            router.canGoBack() ? router.back() : router.replace('/(tabs)/journal');
        } catch (e) {
            console.error('Failed to save:', e);
            Alert.alert('Error', 'Could not save your entry. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={[styles.root, { backgroundColor: theme.colors.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            {/* Fixed top bar — back arrow + SAVE */}
            <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={22} color={theme.colors.onBackground} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: isSaving ? 0.7 : 1 }]}
                    onPress={handleSave}
                    disabled={isSaving}
                >
                    <Text variant="labelMedium" style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
                        {isSaving ? 'SAVING…' : 'SAVE'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Scrollable body — scrolls when keyboard appears */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Page title + date */}
                <View style={styles.titleBlock}>
                    <Text variant="labelLarge" style={{ color: theme.colors.primary, letterSpacing: 1.2, textTransform: 'uppercase' }}>
                        {editingEntryId ? 'Edit Entry' : 'New Entry'}
                    </Text>
                    <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: '800', marginTop: 4 }}>
                        {displayDate}
                    </Text>
                </View>

                {/* Meta chips row */}
                <View style={styles.chipsRow}>
                    <TouchableOpacity
                        style={[styles.chip, { backgroundColor: theme.colors.primary }]}
                        onPress={() => setShowPicker(true)}
                    >
                        <Text variant="labelSmall" style={{ color: theme.colors.onPrimary, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                            Change Date
                        </Text>
                    </TouchableOpacity>
                    <View style={[styles.chip, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                        <Text variant="labelSmall" style={{ color: theme.colors.primary }}>Words {wordCount}</Text>
                    </View>
                    <View style={[styles.chip, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                        <Text variant="labelSmall" style={{ color: isDark ? ef.grey1 : ef.grey2 }}>
                            {editingEntryId ? 'Editing' : 'Draft'}
                        </Text>
                    </View>
                </View>

                {/* Date picker */}
                {showPicker && (
                    <DateTimePicker
                        value={selectedDate}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                    />
                )}

                {!isLoading && (
                    <>
                        {/* Reflection title field */}
                        <View style={[styles.titleInputCard, { backgroundColor: isDark ? ef.bg1 : ef.bg0, borderColor: isDark ? ef.bg4 : ef.bg3 }]}>
                            <Text variant="labelSmall" style={{ color: isDark ? ef.grey1 : ef.grey2, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>
                                Title (optional)
                            </Text>
                            <TextInput
                                placeholder="A quiet morning, a steady mind"
                                placeholderTextColor={isDark ? ef.grey0 : ef.grey1}
                                value={entryTitle}
                                onChangeText={setEntryTitle}
                                style={[styles.titleInput, { color: theme.colors.onSurface, borderColor: isDark ? ef.bg4 : ef.bg3 }]}
                            />
                        </View>

                        {/* Main journal text editor */}
                        <MoodInputWidget
                            value={entryText}
                            onChangeText={handleTextChange}
                            themes={themes}
                            isAnalyzing={isAnalyzing}
                        />
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    /** Top navigation bar */
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    backBtn: {
        width: 38,
        height: 38,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 9,
    },

    /** Scrollable body */
    scrollContent: {
        paddingHorizontal: 16,
    },

    /** "New Entry / Edit Entry" + date block */
    titleBlock: {
        marginBottom: 12,
    },

    /** Row of chips: Change Date, Words X, Draft/Editing */
    chipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
        flexWrap: 'wrap',
    },
    chip: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },

    /** Title input card */
    titleInputCard: {
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        padding: 14,
        marginBottom: 12,
    },
    titleInput: {
        borderRadius: 10,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        fontWeight: '600',
    },
});
