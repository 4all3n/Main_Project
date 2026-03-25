import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Button, IconButton, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const JOURNAL_STORAGE_KEY = '@journal_entries';

export default function JournalScreen() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    
    const [entryText, setEntryText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Date selection states
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);

    const getDateKey = () => {
        return selectedDate.toLocaleDateString('en-CA'); 
    };

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
            const entries = storedEntries ? JSON.parse(storedEntries) : {};
            
            // Update today's entry
            entries[todayKey] = entryText;
            
            // Save stringified map back to storage
            await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(entries));
            // Return back to the journal list view upon success
            router.back();
        } catch (error) {
            console.error('Failed to save journal entry:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.colors.background }]} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
            <View style={[styles.headerContainer, { paddingTop: insets.top + 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                <View>
                    <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>
                        New Entry
                    </Text>
                    <TouchableOpacity onPress={() => setShowPicker(true)} style={styles.dateSelectorRow}>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                            {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </Text>
                        <Text variant="bodySmall" style={{ color: theme.colors.primary, marginTop: 4, marginLeft: 8 }}>
                            (Edit)
                        </Text>
                    </TouchableOpacity>
                </View>
                <IconButton
                    icon="close"
                    size={28}
                    iconColor={theme.colors.onBackground}
                    onPress={() => router.back()}
                />
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
                <View style={styles.centerParams}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    
                    <Surface style={[styles.editorSurface, { backgroundColor: theme.colors.surfaceVariant }]} elevation={1}>
                        <TextInput
                            mode="flat"
                            multiline
                            placeholder="How are you feeling today? e.g. 'Felt great, slept heavily and crushed my workout...'"
                            placeholderTextColor={theme.colors.outline}
                            value={entryText}
                            onChangeText={setEntryText}
                            style={[
                                styles.textInput, 
                                { 
                                    backgroundColor: 'transparent',
                                    color: theme.colors.onSurfaceVariant
                                }
                            ]}
                            underlineColor="transparent"
                            activeUnderlineColor="transparent"
                            autoFocus
                        />
                    </Surface>

                    <Button 
                        mode="contained" 
                        onPress={handleSaveEntry}
                        loading={isSaving}
                        disabled={isSaving || entryText.trim().length === 0}
                        style={styles.saveButton}
                        contentStyle={styles.saveButtonContent}
                        labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                    >
                        Save Entry
                    </Button>

                </ScrollView>
            )}
        </KeyboardAvoidingView>
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
    dateSelectorRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        flexGrow: 1,
    },
    editorSurface: {
        borderRadius: 24,
        padding: 8,
        flex: 1,
        minHeight: 300,
    },
    textInput: {
        flex: 1,
        minHeight: 280,
        fontSize: 16,
        paddingHorizontal: 10,
    },
    saveButton: {
        marginTop: 24,
        borderRadius: 16,
    },
    saveButtonContent: {
        paddingVertical: 8,
    },
    centerParams: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
