import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Switch, TouchableRipple, useTheme, Button, Divider, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../providers/app-theme-provider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, updateApiUrl } from '../../lib/api';

export default function SettingsScreen() {
    const { isDark, toggleTheme, theme: appTheme } = useAppTheme();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    
    const [apiUrl, setApiUrl] = useState(API_BASE_URL);

    const handleSaveUrl = async () => {
        updateApiUrl(apiUrl);
        // show some toast or alert in a real app
    };

    const handleClearData = async () => {
        try {
            await AsyncStorage.clear();
            alert("All local data cleared!");
        } catch (e) {
            console.error(e);
        }
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Text variant="headlineMedium" style={{ fontWeight: '700', color: theme.colors.onBackground }}>Settings</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Appearance</Text>
                <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="moon-outline" size={24} color={theme.colors.onSurface} style={styles.icon} />
                            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Dark Mode</Text>
                        </View>
                        <Switch value={isDark} onValueChange={toggleTheme} color={theme.colors.primary} />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Network</Text>
                <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>Backend API URL</Text>
                    <TextInput 
                        mode="outlined"
                        value={apiUrl}
                        onChangeText={setApiUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={{ backgroundColor: theme.colors.surfaceVariant }}
                        textColor={theme.colors.onSurface}
                        outlineColor={theme.colors.outline}
                        activeOutlineColor={theme.colors.primary}
                    />
                    <Button 
                        mode="contained" 
                        onPress={handleSaveUrl} 
                        style={{ marginTop: 12, backgroundColor: theme.colors.primary }}
                        labelStyle={{ color: theme.colors.onPrimary }}
                    >
                        Save URL
                    </Button>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>Data Management</Text>
                <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
                    <Button 
                        mode="outlined" 
                        onPress={handleClearData}
                        textColor={theme.colors.error}
                        style={{ borderColor: theme.colors.error }}
                    >
                        Clear All Local Data
                    </Button>
                </View>

                <View style={styles.footer}>
                    <Text variant="labelSmall" style={{ color: theme.colors.outline }}>MindfulMomentum v1.0.0</Text>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 16,
    },
    footer: {
        marginTop: 40,
        alignItems: 'center',
    }
});
