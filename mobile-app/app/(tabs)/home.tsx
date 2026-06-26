import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { aggregateRecord, initialize, readRecords, requestPermission } from 'react-native-health-connect';
import { Card, IconButton, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../providers/app-theme-provider';
import { ZEN_PALETTE } from '../../constants/zen-ui';
import { AnimatedGradientCard } from '../../components/animated-gradient-card';

interface HealthData {
  steps: number;
  activeCalories: number;
  totalCalories: number;
  distance: number;
  heartRate: { min: number; max: number; avg: number } | null;
  sleepMinutes: number;
}

const INITIAL_STATE: HealthData = {
  steps: 0,
  activeCalories: 0,
  totalCalories: 0,
  distance: 0,
  heartRate: null,
  sleepMinutes: 0,
};

const STEP_GOAL = 10000;
const SLEEP_GOAL_HOURS = 8;
const ACTIVE_CALORIES_GOAL = 600;
const SYNC_LAG_MS = 120_000;
const AUTO_SYNC_INTERVAL_MS = 90_000;

function getStartOfDay(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getOverlapMinutes(startTime: string, endTime: string, windowStart: Date, windowEnd: Date) {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const overlapStart = Math.max(start, windowStart.getTime());
  const overlapEnd = Math.min(end, windowEnd.getTime());
  if (overlapEnd <= overlapStart) return 0;
  return (overlapEnd - overlapStart) / 1000 / 60;
}

async function getDeduplicatedStepsTotal(timeRangeFilter: {
  operator: 'between';
  startTime: string;
  endTime: string;
}) {
  const base = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
  const baseCount = base.COUNT_TOTAL || 0;
  const origins = base.dataOrigins || [];

  if (origins.length <= 1) {
    return baseCount;
  }

  const perOrigin = await Promise.all(
    origins.map((origin) =>
      aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter,
        dataOriginFilter: [origin],
      })
    )
  );

  const bestOriginCount = Math.max(...perOrigin.map((result) => result.COUNT_TOTAL || 0), baseCount);
  return bestOriginCount;
}

function CircularMeter({
  size,
  strokeWidth,
  progress,
  color,
  trackColor,
  value,
  label,
}: {
  size: number;
  strokeWidth: number;
  progress: number;
  color: string;
  trackColor: string;
  value: string;
  label: string;
}) {
  const normalized = Math.max(0, Math.min(progress, 1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * normalized);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.meterCenter}>
        <Text variant="titleMedium" style={styles.meterValue}>{value}</Text>
        <Text variant="labelSmall" style={styles.meterLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<HealthData>(INITIAL_STATE);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);
  const fetchInFlightRef = useRef(false);
  const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const theme = useTheme();
  const { isDark, toggleTheme } = useAppTheme();
  const palette = isDark ? ZEN_PALETTE.dark : ZEN_PALETTE.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const floatAnim = useRef(new Animated.Value(0)).current;
  const gradientAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 12000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  useEffect(() => {
    Animated.loop(
      Animated.timing(gradientAnim, {
        toValue: 1,
        duration: 8000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: false,
      })
    ).start();
  }, [gradientAnim]);

  const glowOneTransform = {
    transform: [
      {
        translateX: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-36, 32] }),
      },
      {
        translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 16] }),
      },
    ],
  };

  const glowTwoTransform = {
    transform: [
      {
        translateX: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [28, -30] }),
      },
      {
        translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [24, -18] }),
      },
    ],
  };

  const fetchHealthData = useCallback(async () => {
    if (fetchInFlightRef.current) {
      return;
    }

    fetchInFlightRef.current = true;
    try {
      const isInitialized = await initialize();
      if (!isInitialized) return;

      if (!permissionGranted) {
        await requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
          { accessType: 'read', recordType: 'TotalCaloriesBurned' },
          { accessType: 'read', recordType: 'Distance' },
          { accessType: 'read', recordType: 'HeartRate' },
          { accessType: 'read', recordType: 'SleepSession' },
        ]);
        setPermissionGranted(true);
      }

      const now = new Date(Date.now() - SYNC_LAG_MS);
      const startOfDayDate = getStartOfDay(now);
      const startOfDay = startOfDayDate.toISOString();
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startOfDay,
        endTime: now.toISOString(),
      };

      const [stepsTotal, activeCals, totalCals, distanceResult, heartRateResult, sleepResult] = await Promise.all([
        getDeduplicatedStepsTotal(timeRangeFilter),
        aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter }),
        aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter }),
        aggregateRecord({ recordType: 'Distance', timeRangeFilter }),
        aggregateRecord({ recordType: 'HeartRate', timeRangeFilter }),
        readRecords('SleepSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime: new Date(startOfDayDate.getTime() - 86400000).toISOString(),
            endTime: now.toISOString(),
          },
        }),
      ]);

      let totalSleepMinutes = 0;
      sleepResult.records.forEach((record: any) => {
        totalSleepMinutes += getOverlapMinutes(record.startTime, record.endTime, startOfDayDate, now);
      });

      setData({
        steps: stepsTotal,
        activeCalories: Math.round(activeCals.ACTIVE_CALORIES_TOTAL?.inKilocalories || 0),
        totalCalories: Math.round(totalCals.ENERGY_TOTAL?.inKilocalories || 0),
        distance: Math.round(distanceResult.DISTANCE?.inMeters || 0),
        heartRate: heartRateResult.BPM_AVG
          ? {
              min: heartRateResult.BPM_MIN || 0,
              max: heartRateResult.BPM_MAX || 0,
              avg: heartRateResult.BPM_AVG || 0,
            }
          : null,
        sleepMinutes: Math.round(totalSleepMinutes),
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      fetchInFlightRef.current = false;
      setLoading(false);
    }
  }, [permissionGranted]);

  useEffect(() => {
    let cancelled = false;

    const scheduleAutoSync = async () => {
      await fetchHealthData();

      if (cancelled) {
        return;
      }

      autoSyncTimeoutRef.current = setTimeout(() => {
        if (cancelled) {
          return;
        }

        autoSyncIntervalRef.current = setInterval(() => {
          fetchHealthData();
        }, AUTO_SYNC_INTERVAL_MS);
      }, 5000);
    };

    scheduleAutoSync();

    return () => {
      cancelled = true;

      if (autoSyncTimeoutRef.current) {
        clearTimeout(autoSyncTimeoutRef.current);
        autoSyncTimeoutRef.current = null;
      }

      if (autoSyncIntervalRef.current) {
        clearInterval(autoSyncIntervalRef.current);
        autoSyncIntervalRef.current = null;
      }
    };
  }, [fetchHealthData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  }, [fetchHealthData]);

  const navigateToDetail = (id: string, payload: string) => {
    router.push({ pathname: '/metric/[id]', params: { id, payload } });
  };

  const sleepHours = Math.floor(data.sleepMinutes / 60);
  const sleepMins = Math.round(data.sleepMinutes % 60);
  const formattedDistance = data.distance > 0 ? (data.distance / 1000).toFixed(2) : '--';

  const heroScore = useMemo(() => {
    const stepScore = Math.min(data.steps / STEP_GOAL, 1);
    const sleepScore = Math.min(data.sleepMinutes / (SLEEP_GOAL_HOURS * 60), 1);
    const burnScore = Math.min(data.activeCalories / ACTIVE_CALORIES_GOAL, 1);
    return Math.round((stepScore * 0.4 + sleepScore * 0.35 + burnScore * 0.25) * 100);
  }, [data.steps, data.sleepMinutes, data.activeCalories]);

  const metrics = [
    {
      id: 'steps',
      title: 'Steps',
      value: data.steps > 0 ? data.steps.toLocaleString() : '--',
      unit: 'today',
      icon: 'footsteps',
      accent: palette.accentSteps,
      helper: `${Math.min(Math.round((data.steps / STEP_GOAL) * 100), 999)}% of ${STEP_GOAL.toLocaleString()} goal`,
      payloadValue: data.steps > 0 ? data.steps.toLocaleString() : '--',
      payloadUnit: 'steps',
    },
    {
      id: 'totalEnergy',
      title: 'Total Burn',
      value: data.totalCalories > 0 ? String(data.totalCalories) : '--',
      unit: 'kcal',
      icon: 'flame',
      accent: palette.accentBurn,
      helper: `Active burn ${data.activeCalories > 0 ? `${data.activeCalories} kcal` : '--'}`,
      payloadValue: data.totalCalories > 0 ? data.totalCalories : '--',
      payloadUnit: 'kcal',
    },
    {
      id: 'distance',
      title: 'Distance',
      value: formattedDistance,
      unit: data.distance > 0 ? 'km' : '',
      icon: 'map',
      accent: palette.accentDistance,
      helper: data.distance > 0 ? `${Math.round((data.distance / 1000) * 1312)} est. steps equivalent` : 'No movement data yet',
      payloadValue: formattedDistance,
      payloadUnit: data.distance > 0 ? 'km' : '',
    },
    {
      id: 'sleep',
      title: 'Sleep',
      value: data.sleepMinutes > 0 ? `${sleepHours}h ${sleepMins}m` : '--',
      unit: '',
      icon: 'moon',
      accent: palette.accentSleep,
      helper: `${Math.min(Math.round((data.sleepMinutes / (SLEEP_GOAL_HOURS * 60)) * 100), 999)}% of ${SLEEP_GOAL_HOURS}h target`,
      payloadValue: data.sleepMinutes > 0 ? `${sleepHours}h ${sleepMins}m` : '--',
      payloadUnit: '',
    },
  ];

  const heartPayload = JSON.stringify({
    title: 'Heart Rate',
    value: data.heartRate ? Math.round(data.heartRate.avg) : '--',
    unit: data.heartRate ? 'bpm' : '',
    icon: 'heart',
    color: palette.accentHeart,
    subValue: data.heartRate ? `Min: ${data.heartRate.min} | Max: ${data.heartRate.max}` : 'No data today',
  });

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Animated.View style={[styles.movingGlowOne, glowOneTransform]}>
        <LinearGradient colors={[palette.glowA, 'transparent']} style={styles.glowGradient} />
      </Animated.View>
      <Animated.View style={[styles.movingGlowTwo, glowTwoTransform]}>
        <LinearGradient colors={[palette.glowB, palette.glowC, 'transparent']} style={styles.glowGradient} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={[styles.kicker, { color: theme.colors.primary }]}>Mindful Momentum</Text>
            <Text variant="headlineMedium" style={[styles.headline, { color: theme.colors.onBackground }]}>Breathe. Move. Balance.</Text>
            <Text variant="bodyMedium" style={{ color: palette.textSoft, marginTop: 6 }}>
              Your wellness overview, crafted for clarity and calm focus.
            </Text>
          </View>
          <IconButton
            icon={isDark ? 'weather-night' : 'white-balance-sunny'}
            mode="contained"
            containerColor={palette.glass}
            iconColor={theme.colors.primary}
            onPress={toggleTheme}
          />
        </View>

        <Card mode="contained" style={[styles.heroCard, { borderColor: palette.glassBorder }]}>
          <BlurView
            intensity={isDark ? 34 : 62}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]}
          />
          <AnimatedGradientCard
            colors={[palette.heroStart, palette.heroMid, palette.heroEnd, 'rgba(255,255,255,0.02)']}
          >
            {null}
          </AnimatedGradientCard>
          <Card.Content style={styles.heroContent}>
            <View style={styles.heroTextWrap}>
              <Text variant="labelLarge" style={[styles.kicker, { color: theme.colors.primary }]}>Readiness Score</Text>
              <Text variant="bodyMedium" style={{ color: palette.textSoft, marginTop: 6 }}>
                Combined score from movement, burn, and restorative sleep.
              </Text>
            </View>
            <CircularMeter
              size={98}
              strokeWidth={10}
              progress={heroScore / 100}
              color={palette.accentSteps}
              trackColor={isDark ? 'rgba(255,255,255,0.14)' : 'rgba(28,37,45,0.10)'}
              value={`${heroScore}%`}
              label="today"
            />
          </Card.Content>
        </Card>

        <View style={styles.grid}>
          {metrics.map((metric) => {
            const payloadString = JSON.stringify({
              title: metric.title,
              value: metric.payloadValue,
              unit: metric.payloadUnit,
              icon: metric.icon,
              color: metric.accent,
              subValue: metric.helper,
            });

            return (
              <Card key={metric.id} mode="contained" style={[styles.metricCard, { borderColor: palette.glassBorder }]}>
                <BlurView
                  intensity={isDark ? 30 : 56}
                  tint={isDark ? 'dark' : 'light'}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                <View
                  pointerEvents="none"
                  style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]}
                />
                <TouchableRipple borderless style={{ borderRadius: 24 }} onPress={() => navigateToDetail(metric.id, payloadString)}>
                  <Card.Content style={styles.metricContent}>
                    <View style={styles.metricHeader}>
                      <Surface style={[styles.metricIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.56)' }]} elevation={0}>
                        <Ionicons name={metric.icon as any} size={19} color={metric.accent} />
                      </Surface>
                      <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>{metric.title}</Text>
                    </View>

                    <View style={styles.valueRow}>
                      <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>{metric.value}</Text>
                      {!!metric.unit && (
                        <Text variant="bodyMedium" style={{ color: palette.textSoft, marginBottom: 2, marginLeft: 6 }}>{metric.unit}</Text>
                      )}
                    </View>

                    <Text variant="bodySmall" style={{ color: palette.textSoft, marginTop: 8, minHeight: 34 }}>
                      {metric.helper}
                    </Text>
                  </Card.Content>
                </TouchableRipple>
              </Card>
            );
          })}
        </View>

        <Card mode="contained" style={[styles.heartCard, { borderColor: palette.glassBorder }]}>
          <BlurView
            intensity={isDark ? 32 : 60}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: palette.glass }]}
          />
          <TouchableRipple borderless style={{ borderRadius: 24 }} onPress={() => navigateToDetail('heartRate', heartPayload)}>
            <Card.Content style={styles.heartContent}>
              <View style={styles.heartTopRow}>
                <View style={styles.heartTextWrap}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>Heart Rhythm</Text>
                  <Text variant="bodyMedium" style={{ color: palette.textSoft, marginTop: 4 }}>
                    Range and average bpm for the day.
                  </Text>
                </View>
                <View style={styles.heartMeterWrap}>
                  <CircularMeter
                    size={94}
                    strokeWidth={8}
                    progress={Math.min((data.heartRate?.avg ?? 0) / 120, 1)}
                    color={palette.accentHeart}
                    trackColor={isDark ? 'rgba(255,255,255,0.14)' : 'rgba(28,37,45,0.10)'}
                    value={data.heartRate ? `${Math.round(data.heartRate.avg)}` : '--'}
                    label="bpm"
                  />
                </View>
              </View>

              <View style={styles.heartMetaRow}>
                <Surface style={[styles.heartMetaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.62)' }]} elevation={0}>
                  <Text variant="bodySmall" style={{ color: palette.textSoft }}>
                    Min {data.heartRate ? data.heartRate.min : '--'}
                  </Text>
                </Surface>
                <Surface style={[styles.heartMetaChip, { backgroundColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.62)' }]} elevation={0}>
                  <Text variant="bodySmall" style={{ color: palette.textSoft }}>
                    Max {data.heartRate ? data.heartRate.max : '--'}
                  </Text>
                </Surface>
              </View>
            </Card.Content>
          </TouchableRipple>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  movingGlowOne: {
    position: 'absolute',
    width: 320,
    height: 190,
    borderRadius: 72,
    top: -18,
    left: -74,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    opacity: 0.9,
  },
  movingGlowTwo: {
    position: 'absolute',
    width: 280,
    height: 210,
    borderRadius: 66,
    bottom: 74,
    right: -72,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    opacity: 0.85,
  },
  glowGradient: {
    flex: 1,
    borderRadius: 90,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 16,
  },
  kicker: {
    textTransform: 'uppercase',
    letterSpacing: 1.3,
  },
  headline: {
    marginTop: 4,
    fontWeight: '800',
  },
  heroCard: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'transparent',
    marginBottom: 14,
  },
  heroContent: {
    minHeight: 170,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  meterCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meterValue: {
    fontWeight: '800',
  },
  meterLabel: {
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    minWidth: 155,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  metricContent: {
    padding: 14,
    minHeight: 168,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 14,
  },
  heartCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  heartContent: {
    padding: 16,
  },
  heartTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heartTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  heartMeterWrap: {
    width: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  heartMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  heartMetaChip: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
});
