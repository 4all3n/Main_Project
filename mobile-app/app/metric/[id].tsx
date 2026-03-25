import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { aggregateRecord, readRecords } from 'react-native-health-connect';
import { ActivityIndicator, Card, Divider, IconButton, Surface, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MetricDetailScreen() {
    const { id, payload } = useLocalSearchParams();
    const router = useRouter();
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    const [historicalData, setHistoricalData] = useState<{value: number, label: string}[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    // We do NOT use parsed `data` object as a dependency in useEffect
    // to prevent infinite render loops. `payload` is the stable string from params.
    let data : any;
    try {
        data = payload ? JSON.parse(payload as string) : null;
    } catch (e) {
        data = null;
    }

    useEffect(() => {
        if (!payload || !id) return;

        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const results = [];
                // Go back 7 days
                for (let i = 6; i >= 0; i--) {
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() - i);
                    
                    const startOfDay = new Date(targetDate.setHours(0, 0, 0, 0)).toISOString();
                    const endOfDay = new Date(targetDate.setHours(23, 59, 59, 999)).toISOString();
                    const dayLabel = targetDate.toLocaleDateString('en-US', { weekday: 'short' });

                    const timeRangeFilter = {
                        operator: 'between' as const,
                        startTime: startOfDay,
                        endTime: endOfDay,
                    };

                    let value = 0;

                    if (id === 'steps') {
                        const res = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
                        value = res.COUNT_TOTAL || 0;
                    } else if (id === 'activeEnergy') {
                        const res = await aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter });
                        value = Math.round(res.ACTIVE_CALORIES_TOTAL?.inKilocalories || 0);
                    } else if (id === 'totalEnergy') {
                        const res = await aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter });
                        value = Math.round(res.ENERGY_TOTAL?.inKilocalories || 0);
                    } else if (id === 'distance') {
                        const res = await aggregateRecord({ recordType: 'Distance', timeRangeFilter });
                        // store as kilometers for the chart
                        value = parseFloat(((res.DISTANCE?.inMeters || 0) / 1000).toFixed(2));
                    } else if (id === 'heartRate') {
                         const res = await aggregateRecord({ recordType: 'HeartRate', timeRangeFilter });
                         value = Math.round(res.BPM_AVG || 0);
                    } else if (id === 'sleep') {
                        const res = await readRecords('SleepSession', { timeRangeFilter });
                        let totalSleepMinutes = 0;
                        res.records.forEach((record: any) => {
                            const end = new Date(record.endTime).getTime();
                            if (end > new Date(startOfDay).getTime()) {
                               const start = new Date(record.startTime).getTime();
                               totalSleepMinutes += (end - start) / 1000 / 60;
                            }
                        });
                        // store as hours for the chart
                        value = parseFloat((totalSleepMinutes / 60).toFixed(1));
                    }

                    // Append so oldest (i=6) is first (left), newest (i=0) is last (right)
                    results.push({ 
                        value, 
                        label: dayLabel,
                        frontColor: color, // Ensure ALL days use the vibrant color, avoid camouflaging into the dark background
                    });
                }
                setHistoricalData(results);
            } catch (error) {
                console.error("Failed to fetch historical data", error);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [id, payload]);

    if (!data) {
        return (
            <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
                <IconButton icon="arrow-left" mode="contained" onPress={() => router.back()} />
                <View style={styles.centerParams}>
                    <Text variant="titleLarge">Oops, data not found.</Text>
                </View>
            </View>
        );
    }

    const { title, value, unit, icon, color, subValue } = data;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            {/* Top App Bar */}
            <View style={[styles.appBar, { paddingTop: insets.top + 10 }]}>
                <IconButton 
                    icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onBackground} />}
                    rippleColor="rgba(0,0,0,0.1)"
                    style={{ marginLeft: 8 }}
                    onPress={() => router.back()}
                />
                <Text variant="titleLarge" style={{ color: theme.colors.onBackground, fontWeight: '600' }}>
                    {title}
                </Text>
                {/* Spacer to center title */}
                <View style={{ width: 48 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Hero Section */}
                <Surface style={[styles.heroCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                    <Surface style={[styles.iconSurface, { backgroundColor: theme.colors.elevation.level3 }]} elevation={0}>
                        <Ionicons name={icon} size={42} color={color} />
                    </Surface>
                    
                    <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                        Today
                    </Text>
                    
                    <View style={styles.valueRow}>
                        <Text variant="displayLarge" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
                            {value}
                        </Text>
                        {!!unit ? (
                            <Text variant="headlineSmall" style={{ color: theme.colors.outline, marginLeft: 8, marginBottom: 8 }}>
                                {unit}
                            </Text>
                        ) : null}
                    </View>

                    {!!subValue ? (
                        <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginTop: 8, fontWeight: '600' }}>
                            {subValue}
                        </Text>
                    ) : null}
                </Surface>

                <Divider style={{ marginVertical: 24, backgroundColor: theme.colors.surfaceVariant }} />

                <Text variant="titleMedium" style={{ marginLeft: 8, marginBottom: 16, color: theme.colors.onBackground, fontWeight: '700' }}>
                    Past 7 Days
                </Text>

                {/* History Chart Engine */}
                {loadingHistory ? (
                     <View style={[styles.chartContainer, { backgroundColor: theme.colors.surfaceVariant, justifyContent: 'center', alignItems: 'center' }]}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                     </View>
                ) : (
                    <Card mode="contained" style={[styles.chartContainer, { backgroundColor: theme.colors.surfaceVariant, paddingLeft: 0 }]}>
                        <Card.Content style={{ paddingRight: 0, paddingLeft: 0, paddingBottom: 0 }}>
                            <BarChart
                                data={historicalData}
                                barWidth={22}
                                spacing={15}
                                initialSpacing={10}
                                roundedTop
                                roundedBottom={false}
                                xAxisThickness={1}
                                xAxisColor={theme.colors.outlineVariant}
                                yAxisThickness={0}
                                yAxisTextStyle={{ color: theme.colors.outline, fontSize: 10 }}
                                formatYLabel={(label) => {
                                    const num = Number(label);
                                    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
                                    return label;
                                }}
                                disableScroll
                                isAnimated
                                animationDuration={600}
                                rulesType="solid"
                                rulesColor={theme.colors.outlineVariant}
                                xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}
                                frontColor={color}
                                maxValue={Math.max(...historicalData.map(d => d.value), 10) * 1.2}
                                noOfSections={4}
                            />
                        </Card.Content>
                    </Card>
                )}

                <Card mode="contained" style={[styles.insightCard, { backgroundColor: theme.colors.surfaceVariant, marginTop: 16 }]}>
                    <Card.Content>
                        <View style={styles.insightHeader}>
                            <Ionicons name="calendar-outline" size={20} color={theme.colors.primary} />
                            <Text variant="labelLarge" style={{ marginLeft: 8, color: theme.colors.primary }}>7-Day Average</Text>
                        </View>
                        <Text variant="displaySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12, fontWeight: 'bold' }}>
                            {historicalData.length > 0 ? Math.round(historicalData.reduce((acc, curr) => acc + curr.value, 0) / historicalData.length) : '--'}
                            <Text variant="titleMedium" style={{ color: theme.colors.outline }}> {unit}</Text>
                        </Text>
                    </Card.Content>
                </Card>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    centerParams: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    appBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 10,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    heroCard: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        borderRadius: 32,
        marginTop: 10,
    },
    iconSurface: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    insightCard: {
        borderRadius: 24,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chartContainer: {
        borderRadius: 24,
        paddingVertical: 20,
        minHeight: 220,
        overflow: 'hidden'
    }
});
