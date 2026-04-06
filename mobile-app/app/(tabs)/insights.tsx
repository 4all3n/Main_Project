import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Card, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../providers/app-theme-provider';
import { ZEN_PALETTE } from '../../constants/zen-ui';
import { MovingZenBackground } from '../../components/moving-zen-background';

function InsightCard({
    title,
    value,
    detail,
    icon,
}: {
    title: string;
    value: string;
    detail: string;
    icon: keyof typeof Ionicons.glyphMap;
}) {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    const palette = isDark ? ZEN_PALETTE.dark : ZEN_PALETTE.light;

    return (
        <Card mode="contained" style={[styles.card, { borderColor: palette.glassBorder }]}>
            <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]} />
            <Card.Content style={styles.cardContent}>
                <View style={styles.cardTop}>
                    <Surface style={[styles.iconBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)' }]} elevation={0}>
                        <Ionicons name={icon} size={20} color={theme.colors.primary} />
                    </Surface>
                    <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.9, fontSize: 11 }}>
                        {title}
                    </Text>
                </View>
                <Text variant="headlineSmall" style={{ color: theme.colors.onSurface, fontWeight: '700', marginTop: 12 }}>
                    {value}
                </Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 20 }}>
                    {detail}
                </Text>
            </Card.Content>
        </Card>
    );
}

export default function InsightsScreen() {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    const palette = isDark ? ZEN_PALETTE.dark : ZEN_PALETTE.light;
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <MovingZenBackground />

            <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 150 }]} showsVerticalScrollIndicator={false}>
                <Text variant="labelLarge" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                    Perspective
                </Text>
                <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '800', marginTop: 6 }}>
                    Journal Insights
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, marginBottom: 20 }}>
                    Your mood patterns and wellness themes appear here.
                </Text>

                <Card mode="contained" style={[styles.summaryCard, { borderColor: palette.glassBorder }]}>
                    <BlurView intensity={isDark ? 22 : 46} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]} />
                    <Card.Content style={styles.summaryContent}>
                        <View style={styles.summaryHeader}>
                            <Surface style={[styles.summaryIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)' }]} elevation={0}>
                                <Ionicons name="sparkles" size={20} color={theme.colors.primary} />
                            </Surface>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.9, fontSize: 11 }}>
                                    Daily Summary
                                </Text>
                                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', marginTop: 4 }}>
                                    AI Pulse
                                </Text>
                            </View>
                        </View>
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, lineHeight: 20 }}>
                            Mood score, strongest patterns, and key themes from your journal entries will appear here once connected to the analysis endpoint.
                        </Text>
                    </Card.Content>
                </Card>

                <InsightCard
                    title="Mood Score"
                    value="--"
                    detail="This card will show the mood score from your journal analysis endpoint."
                    icon="happy-outline"
                />
                <InsightCard
                    title="Top Feature"
                    value="--"
                    detail="This card will highlight the strongest biological driver from the ML response."
                    icon="pulse-outline"
                />
                <InsightCard
                    title="Themes"
                    value="--"
                    detail="Themes from the journal analysis will appear here as chips or grouped cards."
                    icon="chatbubble-ellipses-outline"
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: 16,
    },
    card: {
        borderRadius: 18,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 0.8,
        backgroundColor: 'transparent',
    },
    summaryCard: {
        borderRadius: 18,
        borderWidth: 0.8,
        overflow: 'hidden',
        backgroundColor: 'transparent',
        marginBottom: 16,
    },
    cardContent: {
        padding: 14,
    },
    summaryContent: {
        padding: 14,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    summaryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    iconBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});