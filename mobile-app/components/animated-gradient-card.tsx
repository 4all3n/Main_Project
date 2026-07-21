import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface AnimatedGradientCardProps {
  colors: string[];
  children: React.ReactNode;
}

export function AnimatedGradientCard({ colors, children }: AnimatedGradientCardProps) {
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [opacityAnim]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={colors as any}
        locations={[0, 0.42, 0.82, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: opacityAnim.interpolate({
              inputRange: [0.7, 1],
              outputRange: [1, 0],
            }),
          },
        ]}
      >
        <LinearGradient
          colors={[colors[2], colors[1], colors[0], 'transparent'] as any}
          locations={[0, 0.4, 0.8, 1]}
          start={{ x: 1, y: 1 }}
          end={{ x: 0, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}
