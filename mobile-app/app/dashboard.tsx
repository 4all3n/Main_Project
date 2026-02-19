import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { initialize, requestPermission, readRecords } from 'react-native-health-connect';

export default function HealthDashboard() {
  const [steps, setSteps] = useState<number>(0);

  useEffect(() => {
    const fetchHealthData = async () => {
      // 1. Initialize the SDK
      const isInitialized = await initialize();
      
      // 2. Request Permissions
      await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
      ]);

      // 3. Read Data (for today)
      const today = new Date();
      const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString();
      const endOfDay = new Date().toISOString();

      const result = await readRecords('Steps', {
        timeRangeFilter: {
          operator: 'between',
          startTime: startOfDay,
          endTime: endOfDay,
        },
      });

      const totalSteps = result.records.reduce((acc, cur) => acc + (cur.count || 0), 0);
      setSteps(totalSteps);
    };

    fetchHealthData();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Steps Today</Text>
        <Text style={styles.value}>{steps.toLocaleString()}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  card: { backgroundColor: '#fff', padding: 25, borderRadius: 20, elevation: 5 },
  label: { fontSize: 16, color: '#888' },
  value: { fontSize: 42, fontWeight: 'bold', color: '#007AFF' }
});