import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { initialize, requestPermission, aggregateRecord } from 'react-native-health-connect';

const { width } = Dimensions.get('window');

export default function AntigravityDashboard() {
  const [steps, setSteps] = useState<number>(0);
  const [calories, setCalories] = useState<number>(0);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const isInitialized = await initialize();
        if (!isInitialized) return;

        await requestPermission([
          { accessType: 'read', recordType: 'Steps' },
          { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
        ]);

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date().toISOString();
        
        const timeRangeFilter = {
          operator: 'between' as const,
          startTime: startOfDay,
          endTime: endOfDay,
        };

        // Fetch Aggregated Steps (Prevents double-counting)
        const stepsResult = await aggregateRecord({
          recordType: 'Steps',
          timeRangeFilter,
        });
        setSteps(stepsResult.COUNT_TOTAL || 0);

        // Fetch Aggregated Calories
        const caloriesResult = await aggregateRecord({
          recordType: 'ActiveCaloriesBurned',
          timeRangeFilter,
        });
        setCalories(Math.round(caloriesResult.ACTIVE_CALORIES_TOTAL?.inKilocalories || 0));

      } catch (error) {
        console.log('Error fetching health data:', error);
      }
    };

    fetchHealthData();
  }, []);

  return (
    // Using a dark abstract background to make the glass effect pop
    <ImageBackground 
      source={{ uri: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2400&auto=format&fit=crop' }} 
      style={styles.background}
    >
      <View style={styles.overlay}>
        <Text style={styles.headerTitle}>Daily Overview</Text>

        {/* Central Glowing Orb (Calories) */}
        <BlurView intensity={40} tint="light" style={styles.orbCard}>
          <Text style={styles.orbLabel}>ACTIVE CALORIES</Text>
          <Text style={styles.orbValue}>{calories}</Text>
          <Text style={styles.orbUnit}>kcal</Text>
        </BlurView>

        {/* Floating Steps Card */}
        <BlurView intensity={40} tint="light" style={styles.floatingCard}>
          <View>
            <Text style={styles.cardLabel}>STEPS TAKEN</Text>
            <Text style={styles.cardValue}>{steps.toLocaleString()}</Text>
          </View>
        </BlurView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)', // Darkens the background slightly
    alignItems: 'center',
    paddingTop: 80,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '300',
    color: '#fff',
    letterSpacing: 2,
    marginBottom: 40,
  },
  orbCard: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: width * 0.325,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 40,
  },
  orbLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 2,
    marginBottom: 5,
  },
  orbValue: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#fff',
  },
  orbUnit: {
    fontSize: 16,
    color: '#00e5ff', // Electric cyan accent
    fontWeight: '600',
  },
  floatingCard: {
    width: width * 0.85,
    padding: 25,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
});