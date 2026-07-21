import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, ScrollView, StyleSheet, View, RefreshControl, Pressable } from 'react-native';
import { Card, Chip, Surface, Text, useTheme, TouchableRipple } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../providers/app-theme-provider';
import { EverforestLight, EverforestDark } from '../../constants/theme';
import { ZEN_PALETTE } from '../../constants/zen-ui';
import { MindfulAPI } from '../../services/mindfulApi';
import React, { useCallback, useEffect, useState } from 'react';

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

    const ef = isDark ? EverforestDark : EverforestLight;
    return (
        <Card mode="contained" style={[styles.card, { backgroundColor: isDark ? ef.bg1 : ef.bg0, borderColor: isDark ? ef.bg4 : ef.bg3, borderWidth: StyleSheet.hairlineWidth }]}>
            <Card.Content style={styles.cardContent}>
                <View style={styles.cardTop}>
                    <View style={[styles.iconBubble, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                        <Ionicons name={icon} size={20} color={theme.colors.primary} />
                    </View>
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
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [activeUser, setActiveUser] = useState('p01');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [showResearchMode, setShowResearchMode] = useState(false);
    const [topFeature, setTopFeature] = useState('--');
    const [insightMessage, setInsightMessage] = useState('--');
    const [topFeatureImpact, setTopFeatureImpact] = useState<number | null>(null);
    const [dataDaysUsed, setDataDaysUsed] = useState<number | null>(null);
    const [latestFeatureValues, setLatestFeatureValues] = useState<{ key: string; value: number }[]>([]);
    const [featureImportances, setFeatureImportances] = useState<{ feature: string; impact_percent: number }[]>([]);
    const [modelInfo, setModelInfo] = useState<any>(null);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        setErrorMessage(null);

        try {
            const [insightRes, modelInfoRes] = await Promise.all([
                MindfulAPI.getInsight(activeUser),
                MindfulAPI.getModelInfo(activeUser).catch(() => null)
            ]);

            if (insightRes.status === 'success') {
                setTopFeature(insightRes.data.top_feature || '--');
                setInsightMessage(insightRes.data.insight_message || '--');
                setTopFeatureImpact(insightRes.data.top_feature_impact_percent ?? null);
                setDataDaysUsed(insightRes.data.data_days_used ?? null);
                setLatestFeatureValues(
                    Object.entries(insightRes.data.latest_feature_values || {}).map(([key, value]) => ({ key, value: value as number }))
                );
                setFeatureImportances(insightRes.data.feature_importances || []);
                setModelInfo(modelInfoRes?.status === 'success' ? modelInfoRes : null);
            } else {
                throw new Error(insightRes.message || 'No insight available right now.');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Keep wearing your watch. The insight model needs more data.';
            setErrorMessage(message);
            setTopFeature('--');
            setInsightMessage('--');
            setTopFeatureImpact(null);
            setDataDaysUsed(null);
            setLatestFeatureValues([]);
            setFeatureImportances([]);
            setModelInfo(null);
        } finally {
            if (!isRefresh) setLoading(false);
        }
    }, [activeUser]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await loadData(true);
        setRefreshing(false);
    }, [loadData]);

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>

            <ScrollView 
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 150 }]} 
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 12 }}>
                    <View style={{ flex: 1 }}>
                        <Text variant="labelLarge" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                            Perspective
                        </Text>
                        <Pressable onPress={() => setShowResearchMode(!showResearchMode)} style={{ marginTop: 6 }}>
                            <Text 
                                variant="headlineMedium" 
                                style={{ color: theme.colors.onBackground, fontWeight: '800' }}
                                suppressHighlighting={true}
                            >
                                Journal Insights
                            </Text>
                        </Pressable>
                        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                            Your mood patterns and wellness themes appear here.
                        </Text>
                    </View>
                </View>
                
                {modelInfo && !loading && !errorMessage && (
                    <Card mode="contained" style={[styles.card, { borderColor: palette.glassBorder, marginBottom: 20 }]}>
                        
                        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
                        <Card.Content style={styles.cardContent}>
                            <View style={styles.cardTop}>
                                <Surface style={[styles.iconBubble, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.5)' }]} elevation={0}>
                                    <Ionicons name="server-outline" size={20} color={theme.colors.primary} />
                                </Surface>
                                <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.9, fontSize: 11 }}>
                                    Model Info
                                </Text>
                            </View>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
                                Algorithm: <Text style={{fontWeight: '700'}}>{modelInfo.data?.algorithm || modelInfo.algorithm}</Text>
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
                                Last Trained: <Text style={{fontWeight: '700'}}>{modelInfo.data?.last_trained_human || modelInfo.last_trained_human}</Text>
                            </Text>
                        </Card.Content>
                    </Card>
                )}

                {showResearchMode && (
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
                )}

                <Card mode="contained" style={[styles.summaryCard, { borderColor: palette.glassBorder }]}>
                    
                    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
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
                        
                        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
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
                        
                        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} />
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