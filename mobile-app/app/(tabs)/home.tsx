import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { LineChart } from 'react-native-gifted-charts';
import { Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import {
  ACTIVE_CALORIES_GOAL,
  FIXED_WIDGETS,
  MOOD_OPTIONS,
  SLEEP_GOAL_HOURS,
  STEP_GOAL,
} from '../../constants/app-config';
import { EverforestDark, EverforestLight } from '../../constants/theme';
import { useHealthData } from '../../hooks/useHealthData';
import { getRecentMoodLogs, getTodayMoodLog, saveTodayMood } from '../../lib/journal-storage';
import { useAppTheme } from '../../providers/app-theme-provider';
import { HealthData, MoodLog, WidgetConfig } from '../../types';

// Enable layout animation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Rest well';
}

interface ContextualTip {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  accent: string;
}

function getContextualTip(data: HealthData, todayMood: MoodLog | null, ef: typeof EverforestDark): ContextualTip {
  if (data.sleepMinutes > 0 && data.sleepMinutes < 360) {
    return {
      icon: 'moon-outline',
      title: 'Rest & Recovery',
      message: 'Under 6 hours of sleep recorded. Pace your energy and schedule a restorative pause today.',
      accent: ef.purple,
    };
  }
  if (data.sleepMinutes >= 480) {
    return {
      icon: 'sparkles-outline',
      title: 'Optimal Recovery',
      message: 'Great sleep duration (8+ hours). Your nervous system is primed for peak mental focus.',
      accent: ef.green,
    };
  }
  if (data.steps > 0 && data.steps < 3000 && new Date().getHours() >= 14) {
    return {
      icon: 'walk-outline',
      title: 'Movement Prompt',
      message: 'Activity is light today. A short 15-minute walk can elevate serotonin and mental clarity.',
      accent: ef.orange,
    };
  }
  if (data.steps >= STEP_GOAL) {
    return {
      icon: 'trophy-outline',
      title: 'Daily Goal Achieved',
      message: `Outstanding! You hit ${data.steps.toLocaleString()} steps today, exceeding your 10k target.`,
      accent: ef.yellow,
    };
  }
  if (todayMood && todayMood.score <= 2) {
    return {
      icon: 'heart-outline',
      title: 'Mindful Compassion',
      message: 'Low mood reported. Take a moment to breathe, journal your thoughts, and go gentle today.',
      accent: ef.red,
    };
  }
  return {
    icon: 'leaf-outline',
    title: 'Daily Rhythm',
    message: 'Stay hydrated, take mindful micro-breaks, and listen to your body’s natural signals.',
    accent: ef.aqua,
  };
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
  const strokeDashoffset = circumference - circumference * normalized;

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
        <Text variant="titleMedium" style={styles.meterValue}>
          {value}
        </Text>
        <Text variant="labelSmall" style={styles.meterLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function Dashboard() {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const ef = isDark ? EverforestDark : EverforestLight;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Custom Health Connect Hook (Task 2.2)
  const { data, loading, refreshing, refreshHealthData } = useHealthData();

  // Mood Logging State
  const [todayMood, setTodayMood] = useState<MoodLog | null>(null);
  const [moodTrend, setMoodTrend] = useState<{ value: number; label: string; dataPointText?: string }[]>([]);

  const accents = useMemo(
    () =>
      ({
        steps: isDark ? ef.blue : '#3A94C5',
        totalEnergy: isDark ? ef.orange : '#F57D26',
        distance: isDark ? ef.aqua : '#35A77C',
        sleep: isDark ? ef.purple : '#DF69BA',
        heartRate: isDark ? ef.red : '#F85552',
        stress: isDark ? ef.yellow : '#E5C07B',
        bloodOxygen: isDark ? ef.blue : '#61AFEF',
      }) as Record<string, string>,
    [isDark, ef]
  );

  const chipBg = isDark ? ef.bg3 : ef.bg3;
  const heroBg = isDark ? ef.bg1 : ef.bg0;
  const heroBorder = isDark ? ef.bg4 : ef.bg3;

  const loadMoodData = useCallback(async () => {
    try {
      const today = await getTodayMoodLog();
      setTodayMood(today);

      const recent = await getRecentMoodLogs(7);
      if (recent.length > 0) {
        const trend = recent.map((item) => {
          const d = new Date(item.date + 'T00:00:00');
          const day = d.toLocaleDateString('en-US', { weekday: 'narrow' });
          return {
            value: item.score,
            label: day,
            dataPointText: `${item.score}`,
          };
        });
        setMoodTrend(trend);
      } else {
        setMoodTrend([]);
      }
    } catch (e) {
      console.error('Failed to load mood data:', e);
    }
  }, []);

  const handleSelectMood = async (score: number) => {
    try {
      const saved = await saveTodayMood(score);
      setTodayMood(saved);
      await loadMoodData();
    } catch (e) {
      console.error('Failed to save mood:', e);
    }
  };

  useEffect(() => {
    loadMoodData();
  }, [loadMoodData]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshHealthData(), loadMoodData()]);
  }, [refreshHealthData, loadMoodData]);

  const sleepHours = Math.floor(data.sleepMinutes / 60);
  const sleepMins = Math.round(data.sleepMinutes % 60);
  const formattedDistance = data.distance > 0 ? (data.distance / 1000).toFixed(2) : '--';

  const heroScore = useMemo(() => {
    const stepScore = Math.min(data.steps / STEP_GOAL, 1);
    const sleepScore = Math.min(data.sleepMinutes / (SLEEP_GOAL_HOURS * 60), 1);
    const burnScore = Math.min(data.activeCalories / ACTIVE_CALORIES_GOAL, 1);
    return Math.round((stepScore * 0.4 + sleepScore * 0.35 + burnScore * 0.25) * 100);
  }, [data.steps, data.sleepMinutes, data.activeCalories]);

  const tip = useMemo(() => getContextualTip(data, todayMood, ef), [data, todayMood, ef]);

  const getMetricData = (id: string) => {
    switch (id) {
      case 'steps':
        return {
          title: 'Steps',
          icon: 'footsteps' as const,
          value: data.steps > 0 ? data.steps.toLocaleString() : '--',
          unit: 'today',
          helper: `${Math.min(Math.round((data.steps / STEP_GOAL) * 100), 999)}% of ${STEP_GOAL.toLocaleString()} goal`,
          payload: {
            title: 'Steps',
            value: data.steps > 0 ? data.steps.toLocaleString() : '--',
            unit: 'steps',
            icon: 'footsteps',
            color: accents.steps,
            subValue: `Goal: ${STEP_GOAL.toLocaleString()}`,
          },
        };
      case 'totalEnergy':
        return {
          title: 'Total Burn',
          icon: 'flame' as const,
          value: data.totalCalories > 0 ? String(data.totalCalories) : '--',
          unit: 'kcal',
          helper: `Active burn ${data.activeCalories > 0 ? `${data.activeCalories} kcal` : '--'}`,
          payload: {
            title: 'Total Burn',
            value: data.totalCalories > 0 ? data.totalCalories : '--',
            unit: 'kcal',
            icon: 'flame',
            color: accents.totalEnergy,
            subValue: `Active: ${data.activeCalories} kcal`,
          },
        };
      case 'distance':
        return {
          title: 'Distance',
          icon: 'map' as const,
          value: formattedDistance,
          unit: data.distance > 0 ? 'km' : '',
          helper:
            data.distance > 0
              ? `${Math.round((data.distance / 1000) * 1312)} est. steps equiv.`
              : 'No movement data yet',
          payload: {
            title: 'Distance',
            value: formattedDistance,
            unit: data.distance > 0 ? 'km' : '',
            icon: 'map',
            color: accents.distance,
            subValue: 'Today',
          },
        };
      case 'sleep':
        return {
          title: 'Sleep',
          icon: 'moon' as const,
          value: data.sleepMinutes > 0 ? `${sleepHours}h ${sleepMins}m` : '--',
          unit: '',
          helper: `${Math.min(
            Math.round((data.sleepMinutes / (SLEEP_GOAL_HOURS * 60)) * 100),
            999
          )}% of ${SLEEP_GOAL_HOURS}h target`,
          payload: {
            title: 'Sleep',
            value: data.sleepMinutes > 0 ? `${sleepHours}h ${sleepMins}m` : '--',
            unit: '',
            icon: 'moon',
            color: accents.sleep,
            subValue: `Goal: ${SLEEP_GOAL_HOURS}h`,
          },
        };
      case 'stress':
        return {
          title: 'Stress Level',
          icon: 'pulse' as const,
          value: data.stressLevel > 0 ? String(data.stressLevel) : '--',
          unit: '',
          helper: data.stressLevel > 0 ? 'Normal resting levels' : 'No data yet',
          payload: {
            title: 'Stress Level',
            value: data.stressLevel > 0 ? String(data.stressLevel) : '--',
            unit: '',
            icon: 'pulse',
            color: accents.stress,
            subValue: 'Today',
          },
        };
      case 'bloodOxygen':
        return {
          title: 'Blood Oxygen',
          icon: 'water' as const,
          value: data.bloodOxygen > 0 ? `${data.bloodOxygen}%` : '--',
          unit: '',
          helper: data.bloodOxygen > 0 ? 'Healthy range (95-100%)' : 'No data yet',
          payload: {
            title: 'Blood Oxygen',
            value: data.bloodOxygen > 0 ? `${data.bloodOxygen}%` : '--',
            unit: '',
            icon: 'water',
            color: accents.bloodOxygen,
            subValue: 'Latest',
          },
        };
      default:
        return null;
    }
  };

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
                <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
                  Heart Rhythm
                </Text>
                <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 4 }}>
                  Range and avg bpm.
                </Text>
              </View>
              <CircularMeter
                size={88}
                strokeWidth={7}
                progress={Math.min((data.heartRate?.avg ?? 0) / 120, 1)}
                color={accents.heartRate}
                trackColor={isDark ? ef.bg3 : ef.bg2}
                value={data.heartRate ? String(Math.round(data.heartRate.avg)) : '--'}
                label="bpm"
              />
            </View>
            <View style={styles.heartMetaRow}>
              <View style={[styles.heartChip, { backgroundColor: chipBg }]}>
                <Text variant="bodySmall" style={{ color: isDark ? ef.grey2 : ef.grey1 }}>
                  Min  {data.heartRate ? data.heartRate.min : '--'}
                </Text>
              </View>
              <View style={[styles.heartChip, { backgroundColor: chipBg }]}>
                <Text variant="bodySmall" style={{ color: isDark ? ef.grey2 : ef.grey1 }}>
                  Max  {data.heartRate ? data.heartRate.max : '--'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      );
    }

    const metricData = getMetricData(id);
    if (!metricData) return null;

    return (
      <View style={cardStyle} key={id}>
        <View style={{ flex: 1 }}>
          <View style={styles.metricHeader}>
            <View style={[styles.iconBubble, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
              <Ionicons name={metricData.icon as any} size={18} color={accent} />
            </View>
            <Text variant="titleSmall" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              {metricData.title}
            </Text>
          </View>
          <View style={styles.valueRow}>
            <Text variant="headlineMedium" style={{ color: theme.colors.onSurface, fontWeight: '800' }}>
              {metricData.value}
            </Text>
            {!!metricData.unit && (
              <Text variant="bodyMedium" style={{ color: isDark ? ef.grey1 : ef.grey2, marginBottom: 3, marginLeft: 5 }}>
                {metricData.unit}
              </Text>
            )}
          </View>
          <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 8 }}>
            {metricData.helper}
          </Text>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Header with Time-based Greeting (Task 2.4 / F10) */}
        <View style={[styles.header, { paddingTop: insets.top + 16, alignItems: 'flex-start' }]}>
          <View style={{ flex: 1 }}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1.4 }}>
              MINDFUL MOMENTUM
            </Text>
            <Text variant="headlineMedium" style={{ color: theme.colors.onBackground, fontWeight: '800', marginTop: 4 }}>
              {getGreeting()}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              Your daily biometric & psychological balance.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.avatarBtn, { backgroundColor: theme.colors.primaryContainer, marginTop: 8 }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Ionicons name="person" size={22} color={theme.colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>

        {/* Hero Readiness Card */}
        <View style={[styles.heroCard, { backgroundColor: heroBg, borderColor: heroBorder }]}>
          <View style={styles.heroContent}>
            <View style={{ flex: 1 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                Readiness Score
              </Text>
              <Text variant="headlineLarge" style={{ color: theme.colors.onSurface, fontWeight: '800', marginTop: 4 }}>
                {heroScore}%
              </Text>
              <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 6, lineHeight: 18 }}>
                Synthesized from movement, active energy, and restorative sleep.
              </Text>
            </View>
            <CircularMeter
              size={100}
              strokeWidth={10}
              progress={heroScore / 100}
              color={theme.colors.primary}
              trackColor={isDark ? ef.bg3 : ef.bg2}
              value={`${heroScore}%`}
              label="today"
            />
          </View>
        </View>

        {/* Contextual Wellness Tip Banner (Task 2.4 / F10) */}
        <View style={[styles.tipCard, { backgroundColor: heroBg, borderColor: heroBorder }]}>
          <View style={[styles.tipIconWrap, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
            <Ionicons name={tip.icon} size={20} color={tip.accent} />
          </View>
          <View style={styles.tipTextWrap}>
            <View style={styles.tipTitleRow}>
              <Text variant="labelSmall" style={{ color: tip.accent, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                {tip.title}
              </Text>
              <Text variant="labelSmall" style={{ color: isDark ? ef.grey2 : ef.grey1, fontSize: 10 }}>
                Contextual Tip
              </Text>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurface, marginTop: 3, lineHeight: 18 }}>
              {tip.message}
            </Text>
          </View>
        </View>

        {/* Daily Mood Check-In Card */}
        <View style={[styles.sectionCard, { backgroundColor: heroBg, borderColor: heroBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                Daily Mood Check-In
              </Text>
              <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 2 }}>
                {todayMood
                  ? `Logged: ${MOOD_OPTIONS.find((m) => m.score === todayMood.score)?.label || ''} (${todayMood.score}/5)`
                  : 'How are you feeling right now?'}
              </Text>
            </View>
            {todayMood && (
              <View style={[styles.loggedBadge, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
                <Ionicons name="checkmark-circle" size={16} color={ef.green} />
                <Text variant="labelSmall" style={{ color: ef.green, marginLeft: 4, fontWeight: '700' }}>
                  Logged
                </Text>
              </View>
            )}
          </View>

          <View style={styles.moodEmojiRow}>
            {MOOD_OPTIONS.map((item) => {
              const isSelected = todayMood?.score === item.score;
              return (
                <TouchableOpacity
                  key={item.score}
                  onPress={() => handleSelectMood(item.score)}
                  activeOpacity={0.7}
                  style={[
                    styles.moodButton,
                    {
                      backgroundColor: isSelected ? (isDark ? ef.bg3 : ef.bg2) : isDark ? ef.bg2 : ef.bg1,
                      borderColor: isSelected ? theme.colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={styles.moodEmoji}>{item.emoji}</Text>
                  <Text
                    variant="labelSmall"
                    style={{
                      color: isSelected ? theme.colors.primary : isDark ? ef.grey1 : ef.grey2,
                      fontWeight: isSelected ? '800' : '500',
                      marginTop: 4,
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={{
                      color: isSelected ? theme.colors.primary : isDark ? ef.grey2 : ef.grey1,
                      fontSize: 10,
                      marginTop: 1,
                    }}
                  >
                    {item.score}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Weekly Mood Trend LineChart */}
        <View style={[styles.sectionCard, { backgroundColor: heroBg, borderColor: heroBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text variant="labelMedium" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1 }}>
                Weekly Mood Trend
              </Text>
              <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2, marginTop: 2 }}>
                7-Day self-reported psychological variance
              </Text>
            </View>
            <View style={[styles.loggedBadge, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}>
              <Ionicons name="trending-up" size={14} color={theme.colors.primary} />
              <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 4, fontWeight: '700' }}>
                1–5 Scale
              </Text>
            </View>
          </View>

          {moodTrend.length >= 2 ? (
            <View style={styles.chartWrap}>
              <LineChart
                data={moodTrend}
                height={130}
                width={Dimensions.get('window').width - 96}
                color={theme.colors.primary}
                thickness={3}
                startFillColor={theme.colors.primary}
                endFillColor={isDark ? ef.bg1 : ef.bg0}
                startOpacity={0.25}
                endOpacity={0.02}
                areaChart
                curved
                hideDataPoints={false}
                dataPointsColor={theme.colors.primary}
                dataPointsRadius={5}
                textColor={isDark ? ef.grey1 : ef.grey2}
                textFontSize={10}
                textShiftY={-8}
                yAxisColor={isDark ? ef.bg4 : ef.bg3}
                xAxisColor={isDark ? ef.bg4 : ef.bg3}
                yAxisTextStyle={{ color: isDark ? ef.grey2 : ef.grey1, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: isDark ? ef.grey1 : ef.grey2, fontSize: 11, fontWeight: '600' }}
                yAxisOffset={0}
                maxValue={5}
                noOfSections={4}
                stepValue={1}
                isAnimated
              />
            </View>
          ) : (
            <View style={[styles.emptyTrendBox, { backgroundColor: isDark ? ef.bg2 : ef.bg2 }]}>
              <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} style={{ marginBottom: 6 }} />
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '700', textAlign: 'center' }}>
                {moodTrend.length === 1 ? '1 day recorded so far' : 'No mood logs recorded yet'}
              </Text>
              <Text variant="labelSmall" style={{ color: isDark ? ef.grey1 : ef.grey2, textAlign: 'center', marginTop: 4 }}>
                Check in for 2 or more days to generate your psychological trajectory line against biometric readiness.
              </Text>
            </View>
          )}
        </View>

        {/* Widget Grid */}
        <View style={styles.grid}>{FIXED_WIDGETS.map(renderWidgetCard)}</View>
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
    marginBottom: 14,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },

  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 14,
    gap: 12,
  },
  tipIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipTextWrap: {
    flex: 1,
  },
  tipTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  widgetWide: { width: '100%' },

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

  sectionCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  loggedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  moodEmojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  moodButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  moodEmoji: {
    fontSize: 22,
  },
  chartWrap: {
    paddingTop: 16,
    paddingBottom: 4,
    alignItems: 'center',
    overflow: 'hidden',
  },
  emptyTrendBox: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
});
