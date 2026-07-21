import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Circle } from 'react-native-svg';
import { aggregateRecord, initialize, readRecords, requestPermission } from 'react-native-health-connect';
import { Card, IconButton, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../providers/app-theme-provider';
import { EverforestLight, EverforestDark } from '../../constants/theme';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface HealthData {
  steps: number;
  activeCalories: number;
  totalCalories: number;
  distance: number;
  heartRate: { min: number; max: number; avg: number } | null;
  sleepMinutes: number;
  stressLevel: number;
  bloodOxygen: number;
}

interface WidgetConfig {
  id: string;
  wide: boolean; // true = full width, false = half width
}

const INITIAL_STATE: HealthData = {
  steps: 0,
  activeCalories: 0,
  totalCalories: 0,
  distance: 0,
  heartRate: null,
  sleepMinutes: 0,
  stressLevel: 0,
  bloodOxygen: 0,
};

const STEP_GOAL = 10000;
const SLEEP_GOAL_HOURS = 8;
const ACTIVE_CALORIES_GOAL = 600;
const SYNC_LAG_MS = 120_000;
const AUTO_SYNC_INTERVAL_MS = 90_000;

const FIXED_WIDGETS: WidgetConfig[] = [
  { id: 'sleep', wide: false },
  { id: 'distance', wide: false },
  { id: 'steps', wide: false },
  { id: 'totalEnergy', wide: false },
  { id: 'stress', wide: false },
  { id: 'bloodOxygen', wide: false },
  { id: 'heartRate', wide: true },
];

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
  if (origins.length <= 1) return baseCount;
  const perOrigin = await Promise.all(
    origins.map((origin) => aggregateRecord({ recordType: 'Steps', timeRangeFilter, dataOriginFilter: [origin] }))
  );
  return Math.max(...perOrigin.map((r) => r.COUNT_TOTAL || 0), baseCount);
}

function CircularMeter({
  size, strokeWidth, progress, color, trackColor, value, label,
}: {
  size: number; strokeWidth: number; progress: number;
  color: string; trackColor: string; value: string; label: string;
}) {
  const normalized = Math.max(0, Math.min(progress, 1));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - circumference * normalized;
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="transparent" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset} fill="transparent"
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
  const { isDark } = useAppTheme();
  const ef = isDark ? EverforestDark : EverforestLight;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const accents = {
    steps:      isDark ? ef.blue   : '#3A94C5',
    totalEnergy:isDark ? ef.orange : '#F57D26',
    distance:   isDark ? ef.aqua   : '#35A77C',
    sleep:      isDark ? ef.purple : '#DF69BA',
    heartRate:  isDark ? ef.red    : '#F85552',
    stress:     isDark ? ef.yellow : '#E5C07B',
    bloodOxygen:isDark ? ef.blue   : '#61AFEF',
  } as Record<string, string>;

  const chipBg = isDark ? ef.bg3 : ef.bg3;

  const fetchHealthData = useCallback(async () => {
    if (fetchInFlightRef.current) return;
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
      const timeRangeFilter = { operator: 'between' as const, startTime: startOfDay, endTime: now.toISOString() };
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
          ? { min: heartRateResult.BPM_MIN || 0, max: heartRateResult.BPM_MAX || 0, avg: heartRateResult.BPM_AVG || 0 }
          : null,
        sleepMinutes: Math.round(totalSleepMinutes),
        stressLevel: 42,
        bloodOxygen: 98,
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
      if (cancelled) return;
      autoSyncTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        autoSyncIntervalRef.current = setInterval(() => { fetchHealthData(); }, AUTO_SYNC_INTERVAL_MS);
      }, 5000);
    };
    scheduleAutoSync();
    return () => {
      cancelled = true;
      if (autoSyncTimeoutRef.current) { clearTimeout(autoSyncTimeoutRef.current); autoSyncTimeoutRef.current = null; }
      if (autoSyncIntervalRef.current) { clearInterval(autoSyncIntervalRef.current); autoSyncIntervalRef.current = null; }
    };
  }, [fetchHealthData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  }, [fetchHealthData]);



  const sleepHours = Math.floor(data.sleepMinutes / 60);
  const sleepMins = Math.round(data.sleepMinutes % 60);
  const formattedDistance = data.distance > 0 ? (data.distance / 1000).toFixed(2) : '--';

  const heroScore = useMemo(() => {
    const stepScore = Math.min(data.steps / STEP_GOAL, 1);
    const sleepScore = Math.min(data.sleepMinutes / (SLEEP_GOAL_HOURS * 60), 1);
    const burnScore = Math.min(data.activeCalories / ACTIVE_CALORIES_GOAL, 1);
    return Math.round((stepScore * 0.4 + sleepScore * 0.35 + burnScore * 0.25) * 100);
  }, [data.steps, data.sleepMinutes, data.activeCalories]);

  const getMetricData = (id: string) => {
    switch (id) {
      case 'steps':
        return {
          title: 'Steps', icon: 'footsteps' as const,
          value: data.steps > 0 ? data.steps.toLocaleString() : '--',
          unit: 'today',
          helper: `${Math.min(Math.round((data.steps / STEP_GOAL) * 100), 999)}% of ${STEP_GOAL.toLocaleString()} goal`,
          payload: { title: 'Steps', value: data.steps > 0 ? data.steps.toLocaleString() : '--', unit: 'steps', icon: 'footsteps', color: accents.steps, subValue: `Goal: ${STEP_GOAL.toLocaleString()}` },
        };
      case 'totalEnergy':
        return {
          title: 'Total Burn', icon: 'flame' as const,
          value: data.totalCalories > 0 ? String(data.totalCalories) : '--',
          unit: 'kcal',
          helper: `Active burn ${data.activeCalories > 0 ? `${data.activeCalories} kcal` : '--'}`,
          payload: { title: 'Total Burn', value: data.totalCalories > 0 ? data.totalCalories : '--', unit: 'kcal', icon: 'flame', color: accents.totalEnergy, subValue: `Active: ${data.activeCalories} kcal` },
        };
      case 'distance':
        return {
          title: 'Distance', icon: 'map' as const,
          value: formattedDistance,
          unit: data.distance > 0 ? 'km' : '',
          helper: data.distance > 0 ? `${Math.round((data.distance / 1000) * 1312)} est. steps equiv.` : 'No movement data yet',
          payload: { title: 'Distance', value: formattedDistance, unit: data.distance > 0 ? 'km' : '', icon: 'map', color: accents.distance, subValue: 'Today' },
        };
      case 'sleep':
        return {
          title: 'Sleep', icon: 'moon' as const,
          value: data.sleepMinutes > 0 ? `${sleepHours}h ${sleepMins}m` : '--',
          unit: '',
          helper: `${Math.min(Math.round((data.sleepMinutes / (SLEEP_GOAL_HOURS * 60)) * 100), 999)}% of ${SLEEP_GOAL_HOURS}h target`,
          payload: { title: 'Sleep', value: data.sleepMinutes > 0 ? `${sleepHours}h ${sleepMins}m` : '--', unit: '', icon: 'moon', color: accents.sleep, subValue: `Goal: ${SLEEP_GOAL_HOURS}h` },
        };
      case 'stress':
        return {
          title: 'Stress Level', icon: 'pulse' as const,
          value: data.stressLevel > 0 ? String(data.stressLevel) : '--',
          unit: '',
          helper: data.stressLevel > 0 ? 'Normal resting levels' : 'No data yet',
          payload: { title: 'Stress Level', value: data.stressLevel > 0 ? String(data.stressLevel) : '--', unit: '', icon: 'pulse', color: accents.stress, subValue: 'Today' },
        };
      case 'bloodOxygen':
        return {
          title: 'Blood Oxygen', icon: 'water' as const,
          value: data.bloodOxygen > 0 ? `${data.bloodOxygen}%` : '--',
          unit: '',
          helper: data.bloodOxygen > 0 ? 'Healthy range (95-100%)' : 'No data yet',
          payload: { title: 'Blood Oxygen', value: data.bloodOxygen > 0 ? `${data.bloodOxygen}%` : '--', unit: '', icon: 'water', color: accents.bloodOxygen, subValue: 'Latest' },
        };
      default:
        return null;
    }
  };

  const heartPayload = JSON.stringify({
    title: 'Heart Rate', value: data.heartRate ? Math.round(data.heartRate.avg) : '--',
    unit: data.heartRate ? 'bpm' : '', icon: 'heart', color: accents.heartRate,
    subValue: data.heartRate ? `Min: ${data.heartRate.min} | Max: ${data.heartRate.max}` : 'No data today',
  });

  const renderWidgetCard = (item: WidgetConfig) => {
    const { id, wide } = item;
    const accent = accents[id] || theme.colors.primary;
    const cardBg = isDark ? ef.bg1 : ef.bg0;
    const borderColor = isDark ? ef.bg4 : ef.bg3;

    const cardStyle = [
      styles.widgetCard,
      wide ? styles.widgetWide : styles.widgetHalf,
      { backgroundColor: cardBg, borderColor },
    ];

    if (id === 'heartRate') {
      return (
        <View style={cardStyle} key={id}>
          <View style={{ flex: 1 }}>
            <View style={styles.heartTopRow}>
              <View style={styles.heartTextWrap}>
                <View style={[styles.iconBubble, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                  <Ionicons name="heart" size={18} color={accents.heartRate} />
                </View>
                <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Heart Rhythm</Text>
                <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 4 }}>Range and avg bpm.</Text>
              </View>
              <CircularMeter
                size={88} strokeWidth={7}
                progress={Math.min((data.heartRate?.avg ?? 0) / 120, 1)}
                color={accents.heartRate}
                trackColor={isDark ? ef.bg3 : ef.bg2}
                value={data.heartRate ? String(Math.round(data.heartRate.avg)) : '--'}
                label="bpm"
              />
            </View>
            <View style={styles.heartMetaRow}>
              <View style={[styles.heartChip, { backgroundColor: chipBg }]}>
                <Text variant="bodySmall" style={{ color: isDark ? ef.grey2 : ef.grey1 }}>Min  {data.heartRate ? data.heartRate.min : '--'}</Text>
              </View>
              <View style={[styles.heartChip, { backgroundColor: chipBg }]}>
                <Text variant="bodySmall" style={{ color: isDark ? ef.grey2 : ef.grey1 }}>Max  {data.heartRate ? data.heartRate.max : '--'}</Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    const metricData = getMetricData(id);
    if (!metricData) return null;
    const payloadString = JSON.stringify(metricData.payload);

    return (
      <View style={cardStyle} key={id}>
        <View style={{ flex: 1 }}>
          <View style={styles.metricHeader}>
            <View style={[styles.iconBubble, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
              <Ionicons name={metricData.icon as any} size={18} color={accent} />
            </View>
            <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{metricData.title}</Text>
          </View>
          <View style={styles.valueRow}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>{metricData.value}</Text>
            {!!metricData.unit && (
              <Text variant="bodyMedium" style={{ color: isDark ? ef.grey1 : ef.grey2, marginBottom: 3, marginLeft: 5 }}>{metricData.unit}</Text>
            )}
          </View>
          <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 8 }}>{metricData.helper}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const heroBg = isDark ? ef.bg1 : ef.bg0;
  const heroBorder = isDark ? ef.bg4 : ef.bg3;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
          {/* Scrollable header */}
          <View style={[styles.header, { paddingTop: insets.top + 16, alignItems: 'flex-start' }]}>
            <View style={{ flex: 1 }}>
              <Text variant="labelLarge" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1.4 }}>
                MINDFUL MOMENTUM
              </Text>
              <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '800', marginTop: 6 }}>
                Your Dashboard
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                Your daily metrics and wellness summary.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.avatarBtn, { backgroundColor: theme.colors.primaryContainer, marginTop: 12 }]}
              onPress={() => router.push('/(tabs)/settings')}
            >
              <Ionicons name="person" size={24} color={theme.colors.onPrimaryContainer} />
            </TouchableOpacity>
          </View>
          {/* Hero Readiness Card */}
          <View style={[styles.heroCard, { backgroundColor: heroBg, borderColor: heroBorder }]}>
            <View style={styles.heroContent}>
              <View style={{ flex: 1 }}>
                <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>Readiness Score</Text>
                <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: '800', marginTop: 4 }}>{heroScore}%</Text>
                <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 6, lineHeight: 18 }}>
                  Combined from movement, burn, and sleep.
                </Text>
              </View>
              <CircularMeter
                size={100} strokeWidth={10}
                progress={heroScore / 100}
                color={theme.colors.primary}
                trackColor={isDark ? ef.bg3 : ef.bg2}
                value={`${heroScore}%`}
                label="today"
              />
            </View>
          </View>

        {/* Widget grid */}
        <View style={styles.grid}>
          {FIXED_WIDGETS.map(renderWidgetCard)}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  heroCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 16,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  meterCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  meterValue: { fontWeight: '800' },
  meterLabel: { marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 9 },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  widgetCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  widgetHalf: { width: '47.5%' },
  widgetWide:  { width: '100%' },

  metricHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontWeight: '700', fontSize: 13, flexShrink: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },

  heartTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  heartTextWrap: { flex: 1 },
  heartMetaRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  heartChip: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
});
