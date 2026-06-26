import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Chip, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../providers/app-theme-provider';
import { ZEN_PALETTE } from '../../constants/zen-ui';
import { MovingZenBackground } from '../../components/moving-zen-background';
import { MindfulAPI } from '../../services/mindfulApi';

const DEMO_USERS = Array.from({ length: 16 }, (_, index) => `p${String(index + 1).padStart(2, '0')}`);

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
    const [activeUser, setActiveUser] = useState('p01');
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [topFeature, setTopFeature] = useState('--');
    const [insightMessage, setInsightMessage] = useState('--');
    const [topFeatureImpact, setTopFeatureImpact] = useState<number | null>(null);
    const [dataDaysUsed, setDataDaysUsed] = useState<number | null>(null);
    const [latestFeatureValues, setLatestFeatureValues] = useState<{ key: string; value: number }[]>([]);
    const [featureImportances, setFeatureImportances] = useState<{ feature: string; impact_percent: number }[]>([]);

    useEffect(() => {
        let cancelled = false;

        const loadInsight = async () => {
            setLoading(true);
            setErrorMessage(null);

            try {
                const response = await MindfulAPI.getInsight(activeUser);
                if (cancelled) {
                    return;
                }

                if (response.status === 'success') {
                    setTopFeature(response.data.top_feature || '--');
                    setInsightMessage(response.data.insight_message || '--');
                    setTopFeatureImpact(response.data.top_feature_impact_percent ?? null);
                    setDataDaysUsed(response.data.data_days_used ?? null);
                    setLatestFeatureValues(
                        Object.entries(response.data.latest_feature_values || {}).map(([key, value]) => ({ key, value }))
                    );
                    setFeatureImportances(response.data.feature_importances || []);
                } else {
                    throw new Error(response.message || 'No insight available right now.');
                }
            } catch (error) {
                if (cancelled) {
                    return;
                }

                const message = error instanceof Error ? error.message : 'Keep wearing your watch. The insight model needs more data.';
                setErrorMessage(message);
                setTopFeature('--');
                setInsightMessage('--');
                setTopFeatureImpact(null);
                setDataDaysUsed(null);
                setLatestFeatureValues([]);
                setFeatureImportances([]);
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadInsight();

        return () => {
            cancelled = true;
        };
    }, [activeUser]);

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

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcherRow} style={styles.switcherScroll}>
                    {DEMO_USERS.map((user) => {
                        const selected = user === activeUser;
                        return (
                            <Chip
                                key={user}
                                compact
                                selected={selected}
                                onPress={() => setActiveUser(user)}
                                style={[
                                    styles.userChip,
                                    {
                                        backgroundColor: selected ? theme.colors.primary : palette.glass,
                                        borderColor: selected ? 'transparent' : palette.glassBorder,
                                    },
                                ]}
                                textStyle={{ color: selected ? theme.colors.onPrimary : theme.colors.onSurface }}
                            >
                                {user.toUpperCase()}
                            </Chip>
                        );
                    })}
                </ScrollView>

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
                                    Active User
                                </Text>
                                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '600', marginTop: 4 }}>
                                    {activeUser.toUpperCase()} Insight Session
                                </Text>
                            </View>
                        </View>
                        {loading ? (
                            <View style={styles.loadingRow}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 10 }}>
                                    Generating your insight...
                                </Text>
                            </View>
                        ) : errorMessage ? (
                            <View style={styles.warningCard}>
                                <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                                    Keep wearing your watch
                                </Text>
                                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, lineHeight: 20 }}>
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : (
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, lineHeight: 20 }}>
                                Model response loaded successfully.
                            </Text>
                        )}
                    </Card.Content>
                </Card>

                <InsightCard
                    title="Top Feature"
                    value={loading ? '...' : errorMessage ? '--' : topFeature}
                    detail={loading ? 'Fetching top feature from the model...' : errorMessage ? 'No top feature available for this user yet.' : topFeatureImpact !== null ? `Strongest driver (${topFeatureImpact}% impact).` : 'Strongest biological driver identified by the Random Forest model.'}
                    icon="pulse-outline"
                />
                <InsightCard
                    title="Insight Message"
                    value={loading ? '...' : errorMessage ? '--' : 'Generated'}
                    detail={loading ? 'Fetching narrative insight...' : errorMessage ? 'No insight message available for this user yet.' : insightMessage}
                    icon="sparkles-outline"
                />

                {!loading && !errorMessage ? (
                    <Card mode="contained" style={[styles.card, { borderColor: palette.glassBorder }]}>
                        <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]} />
                        <Card.Content style={styles.cardContent}>
                            <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.9, fontSize: 11 }}>
                                Model Input Snapshot {dataDaysUsed ? `(Days used: ${dataDaysUsed})` : ''}
                            </Text>
                            <View style={styles.dataGrid}>
                                {latestFeatureValues.length > 0 ? (
                                    latestFeatureValues.map((item) => (
                                        <View key={item.key} style={styles.dataRow}>
                                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                                                {item.key.replaceAll('_', ' ')}
                                            </Text>
                                            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                                                {String(item.value)}
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                                        No feature snapshot available.
                                    </Text>
                                )}
                            </View>
                        </Card.Content>
                    </Card>
                ) : null}

                {!loading && !errorMessage ? (
                    <Card mode="contained" style={[styles.card, { borderColor: palette.glassBorder }]}>
                        <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]} />
                        <Card.Content style={styles.cardContent}>
                            <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.9, fontSize: 11 }}>
                                Feature Importances
                            </Text>
                            <View style={styles.dataGrid}>
                                {featureImportances.length > 0 ? (
                                    featureImportances.map((item) => (
                                        <View key={item.feature} style={styles.dataRow}>
                                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
                                                {item.feature.replaceAll('_', ' ')}
                                            </Text>
                                            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
                                                {item.impact_percent}%
                                            </Text>
                                        </View>
                                    ))
                                ) : (
                                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                                        No feature importances available.
                                    </Text>
                                )}
                            </View>
                        </Card.Content>
                    </Card>
                ) : null}
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
    switcherScroll: {
        marginBottom: 14,
    },
    switcherRow: {
        flexDirection: 'row',
        gap: 8,
        paddingRight: 12,
    },
    userChip: {
        borderWidth: 0.8,
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
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    warningCard: {
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.06)',
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
    dataGrid: {
        marginTop: 12,
        gap: 8,
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.15)',
        paddingBottom: 6,
    },
});