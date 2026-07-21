import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../providers/app-theme-provider';
import { ZEN_PALETTE } from '../constants/zen-ui';

export function MovingZenBackground() {
  const { isDark } = useAppTheme();
  const palette = isDark ? ZEN_PALETTE.dark : ZEN_PALETTE.light;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const screen = Dimensions.get('screen');

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

  return (
    <View style={[styles.root, { width: screen.width, height: screen.height + 80 }]} pointerEvents="none">
      <Animated.View style={[styles.movingGlowOne, glowOneTransform]}>
        <LinearGradient colors={[palette.glowA, 'transparent']} style={styles.glowGradient} />
      </Animated.View>
      <Animated.View style={[styles.movingGlowTwo, glowTwoTransform]}>
        <LinearGradient colors={[palette.glowB, palette.glowC, 'transparent']} style={styles.glowGradient} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
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
});
