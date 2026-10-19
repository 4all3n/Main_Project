/**
 * hooks/useHealthData.ts — Custom Hook for Android Health Connect Integration
 *
 * Encapsulates:
 * - Health Connect client initialization & runtime permissions
 * - Deduplicated multi-source step aggregation
 * - Windowed sleep session overlap calculations
 * - Multi-metric biometric querying (Steps, Calories, Distance, HR, Sleep)
 * - Periodic background auto-sync loop with lifecycle cleanup
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  aggregateRecord,
  initialize,
  readRecords,
  requestPermission,
} from 'react-native-health-connect';
import {
  AUTO_SYNC_INTERVAL_MS,
  INITIAL_HEALTH_DATA,
  INITIAL_SYNC_DELAY_MS,
  SYNC_LAG_MS,
} from '../constants/app-config';
import { HealthData } from '../types';

export function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getOverlapMinutes(
  startTime: string,
  endTime: string,
  windowStart: Date,
  windowEnd: Date
): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const overlapStart = Math.max(start, windowStart.getTime());
  const overlapEnd = Math.min(end, windowEnd.getTime());
  if (overlapEnd <= overlapStart) return 0;
  return (overlapEnd - overlapStart) / 1000 / 60;
}

export async function getDeduplicatedStepsTotal(timeRangeFilter: {
  operator: 'between';
  startTime: string;
  endTime: string;
}): Promise<number> {
  const base = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
  const baseCount = base.COUNT_TOTAL || 0;
  const origins = base.dataOrigins || [];
  if (origins.length <= 1) return baseCount;

  const perOrigin = await Promise.all(
    origins.map((origin) =>
      aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter,
        dataOriginFilter: [origin],
      })
    )
  );

  return Math.max(...perOrigin.map((r) => r.COUNT_TOTAL || 0), baseCount);
}

export interface UseHealthDataReturn {
  data: HealthData;
  loading: boolean;
  refreshing: boolean;
  permissionGranted: boolean;
  error: string | null;
  fetchHealthData: () => Promise<void>;
  refreshHealthData: () => Promise<void>;
}

export function useHealthData(): UseHealthDataReturn {
  const [data, setData] = useState<HealthData>(INITIAL_HEALTH_DATA);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInFlightRef = useRef(false);
  const autoSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSyncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHealthData = useCallback(async () => {
    if (fetchInFlightRef.current) return;
    fetchInFlightRef.current = true;
    setError(null);

    try {
      const isInitialized = await initialize();
      if (!isInitialized) {
        setError('Health Connect is not initialized or unavailable on this device.');
        return;
      }

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

      const [
        stepsTotal,
        activeCals,
        totalCals,
        distanceResult,
        heartRateResult,
        sleepResult,
      ] = await Promise.all([
        getDeduplicatedStepsTotal(timeRangeFilter),
        aggregateRecord({ recordType: 'ActiveCaloriesBurned', timeRangeFilter }),
        aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter }),
        aggregateRecord({ recordType: 'Distance', timeRangeFilter }),
        aggregateRecord({ recordType: 'HeartRate', timeRangeFilter }),
        readRecords('SleepSession', {
          timeRangeFilter: {
            operator: 'between',
            startTime: new Date(startOfDayDate.getTime() - 86_400_000).toISOString(),
            endTime: now.toISOString(),
          },
        }),
      ]);

      let totalSleepMinutes = 0;
      sleepResult.records.forEach((record: any) => {
        totalSleepMinutes += getOverlapMinutes(
          record.startTime,
          record.endTime,
          startOfDayDate,
          now
        );
      });

      setData({
        steps: stepsTotal,
        activeCalories: Math.round(
          activeCals.ACTIVE_CALORIES_TOTAL?.inKilocalories || 0
        ),
        totalCalories: Math.round(
          totalCals.ENERGY_TOTAL?.inKilocalories || 0
        ),
        distance: Math.round(distanceResult.DISTANCE?.inMeters || 0),
        heartRate: heartRateResult.BPM_AVG
          ? {
              min: heartRateResult.BPM_MIN || 0,
              max: heartRateResult.BPM_MAX || 0,
              avg: heartRateResult.BPM_AVG || 0,
            }
          : null,
        sleepMinutes: Math.round(totalSleepMinutes),
        stressLevel: 42,
        bloodOxygen: 98,
      });
    } catch (err) {
      console.error('Error fetching health data in useHealthData:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch biometric data');
    } finally {
      fetchInFlightRef.current = false;
      setLoading(false);
    }
  }, [permissionGranted]);

  const refreshHealthData = useCallback(async () => {
    setRefreshing(true);
    await fetchHealthData();
    setRefreshing(false);
  }, [fetchHealthData]);

  useEffect(() => {
    let cancelled = false;

    const scheduleAutoSync = async () => {
      await fetchHealthData();
      if (cancelled) return;

      autoSyncTimeoutRef.current = setTimeout(() => {
        if (cancelled) return;
        autoSyncIntervalRef.current = setInterval(() => {
          fetchHealthData();
        }, AUTO_SYNC_INTERVAL_MS);
      }, INITIAL_SYNC_DELAY_MS);
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

  return {
    data,
    loading,
    refreshing,
    permissionGranted,
    error,
    fetchHealthData,
    refreshHealthData,
  };
}
