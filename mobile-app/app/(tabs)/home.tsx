import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { aggregateRecord, initialize, readRecords, requestPermission } from 'react-native-health-connect';
import { ActivityIndicator, Card, Surface, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types for our health data state
interface HealthData {
  steps: number;
  activeCalories: number;
  totalCalories: number;
  distance: number; // in meters
  heartRate: { min: number; max: number; avg: number } | null;
  sleep: string; // duration formatted
}

const INITIAL_STATE: HealthData = {
  steps: 0,
  activeCalories: 0,
  totalCalories: 0,
  distance: 0,
  heartRate: null,
  sleep: '--',
};

export default function Dashboard() {
  const [data, setData] = useState<HealthData>(INITIAL_STATE);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const fetchHealthData = useCallback(async () => {
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

      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date().toISOString();
      
      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: startOfDay,
        endTime: endOfDay,
      };

      // 1. Steps
      const stepsResult = await aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter,
      });

      // 2. Calories
      const activeCals = await aggregateRecord({
        recordType: 'ActiveCaloriesBurned',
        timeRangeFilter,
      });
      
      const totalCals = await aggregateRecord({
        recordType: 'TotalCaloriesBurned',
        timeRangeFilter,
      });

      // 3. Distance
      const distanceResult = await aggregateRecord({
        recordType: 'Distance',
        timeRangeFilter,
      });

      // 4. Heart Rate
      const heartRateResult = await aggregateRecord({
        recordType: 'HeartRate',
        timeRangeFilter,
      });

      // 5. Sleep
      const sleepResult = await readRecords('SleepSession', {
        timeRangeFilter: {
            operator: 'after',
            startTime: new Date(today.getTime() - 86400000).toISOString(),
        }
      });
      
      let totalSleepMinutes = 0;
      sleepResult.records.forEach((record: any) => {
          const end = new Date(record.endTime).getTime();
          if (end > new Date(startOfDay).getTime()) {
             const start = new Date(record.startTime).getTime();
             const duration = (end - start) / 1000 / 60;
             totalSleepMinutes += duration;
          }
      });
      const sleepHours = Math.floor(totalSleepMinutes / 60);
      const sleepMins = Math.round(totalSleepMinutes % 60);

      setData({
        steps: stepsResult.COUNT_TOTAL || 0,
        activeCalories: Math.round(activeCals.ACTIVE_CALORIES_TOTAL?.inKilocalories || 0),
        totalCalories: Math.round(totalCals.ENERGY_TOTAL?.inKilocalories || 0),
        distance: Math.round(distanceResult.DISTANCE?.inMeters || 0),
        heartRate: heartRateResult.BPM_AVG ? {
            min: heartRateResult.BPM_MIN || 0,
            max: heartRateResult.BPM_MAX || 0,
            avg: heartRateResult.BPM_AVG || 0
        } : null,
        sleep: totalSleepMinutes > 0 ? `${sleepHours}h ${sleepMins}m` : '--',
      });

    } catch (error) {
      console.error("Error fetching health data:", error);
    } finally {
        setLoading(false);
    }
  }, [permissionGranted]);

  useEffect(() => {
    fetchHealthData();
  }, [fetchHealthData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  }, [fetchHealthData]);

  const navigateToDetail = (id: string, payload: string) => {
      router.push({ pathname: '/metric/[id]', params: { id, payload } });
  }

  // UI Components
  const MetricCard = ({ id, title, value, unit, icon, color, subValue, fullWidth = false }: any) => {
      // Serialize payload to pass complex data via routing
      const payloadString = JSON.stringify({ title, value, unit, icon, color, subValue });

      return (
        <Card 
            mode="contained" 
            style={[styles.card, fullWidth && styles.fullWidthCard, { backgroundColor: theme.colors.surfaceVariant, overflow: 'hidden' }]}
        >
            <TouchableRipple 
                onPress={() => navigateToDetail(id, payloadString)}
                style={{ flex: 1 }}
                borderless
            >
                <Card.Content style={styles.cardContent}>
                    <View style={styles.cardHeader}>
                        <Surface 
                            style={[styles.iconSurface, { backgroundColor: theme.colors.elevation.level3 }]} 
                            elevation={1}
                        >
                            <Ionicons name={icon} size={28} color={color} />
                        </Surface>
                    </View>
                    <View style={styles.textContainer}>
                        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 4 }}>
                            {title}
                        </Text>
                        <View style={styles.valueRow}>
                            <Text variant="displaySmall" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
                            {value}
                        </Text>
                        {!!unit ? (
                            <Text variant="titleMedium" style={{ color: theme.colors.outline, marginLeft: 6, marginBottom: 4 }}>
                                {unit}
                            </Text>
                        ) : null}
                    </View>
                    {!!subValue ? (
                        <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
                            {subValue}
                        </Text>
                    ) : null}
                    </View>
                </Card.Content>
            </TouchableRipple>
        </Card>
      );
  };

  if (loading) {
      return (
          <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
      );
  }

  // Distance formatted to km. If 0, show "--" to signify no data yet for today.
  const formattedDistance = data.distance > 0 ? (data.distance / 1000).toFixed(2) : '--';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 }}>
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </Text>
            <Text variant="displayMedium" style={{ color: theme.colors.onBackground, fontWeight: 'bold' }}>
                Your Health
            </Text>
        </View>

        <View style={styles.grid}>
            {/* Steps - Full Width */}
            <MetricCard 
                id="steps"
                title="Steps Today" 
                value={data.steps > 0 ? data.steps.toLocaleString() : '--'} 
                unit="steps" 
                icon="footsteps" 
                color={theme.colors.primary} 
                fullWidth 
            />

            {/* Row 1 */}
            <MetricCard 
                id="activeEnergy"
                title="Active Energy" 
                value={data.activeCalories > 0 ? data.activeCalories : '--'} 
                unit="kcal" 
                icon="flame" 
                color="#E25822" // Vibrant orange
            />
            <MetricCard 
                id="totalEnergy"
                title="Total Energy" 
                value={data.totalCalories > 0 ? data.totalCalories : '--'} 
                unit="kcal" 
                icon="restaurant" 
                color="#FFB347" // Soft orange
            />

            {/* Row 2 */}
            <MetricCard 
                id="distance"
                title="Distance" 
                value={formattedDistance} 
                unit={data.distance > 0 ? "km" : ""} 
                icon="map" 
                color="#34C759" // iOS Green
            />
             <MetricCard 
                id="sleep"
                title="Sleep" 
                value={data.sleep} 
                unit="" 
                icon="moon" 
                color="#5856D6" // Deep Purple
            />

            {/* Heart Rate - Detail */}
            <MetricCard 
                id="heartRate"
                title="Heart Rate" 
                value={data.heartRate ? Math.round(data.heartRate.avg) : '--'} 
                unit={data.heartRate ? "bpm" : ""} 
                icon="heart" 
                color="#FF3B30" // Red
                subValue={data.heartRate ? `Min: ${data.heartRate.min} | Max: ${data.heartRate.max}` : 'No data today'}
                fullWidth
            />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
      flex: 1, 
  },
  loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  fullWidthCard: {
    width: '100%',
  },
  card: {
    width: '47%', // roughly half minus gap
    minWidth: 150,
    borderRadius: 28, // Extreme M3 rounding
  },
  cardContent: {
      padding: 20,
      flex: 1,
      justifyContent: 'space-between',
      minHeight: 180,
  },
  cardHeader: {
      alignItems: 'flex-start',
      marginBottom: 20,
  },
  iconSurface: {
      width: 56,
      height: 56,
      borderRadius: 28,
      justifyContent: 'center',
      alignItems: 'center',
  },
  textContainer: {
      flex: 1,
      justifyContent: 'flex-end',
  },
  valueRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      flexWrap: 'wrap',
  }
});