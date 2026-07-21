/**
 * MoodInputWidget — clean text editor card for journal entry reflection.
 * Displays detected themes as chips and a subtle pulse animation while analyzing.
 * No glassmorphism — uses solid Everforest background colors.
 */
import React, { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View, Animated, Easing } from 'react-native';
import { Surface, Text, Chip, useTheme } from 'react-native-paper';
import { useAppTheme } from '../providers/app-theme-provider';
import { EverforestLight, EverforestDark } from '../constants/theme';

interface MoodInputWidgetProps {
  value: string;
  onChangeText: (text: string) => void;
  themes?: string[];
  isAnalyzing?: boolean;
}

export function MoodInputWidget({ value, onChangeText, themes = [], isAnalyzing = false }: MoodInputWidgetProps) {
  const theme = useTheme();
  const { isDark } = useAppTheme();
  const ef = isDark ? EverforestDark : EverforestLight;

  // Subtle pulse on the card border while AI is analyzing
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnalyzing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(0);
      pulseAnim.stopAnimation();
    }
  }, [isAnalyzing, pulseAnim]);

  return (
    <View style={[styles.container, { backgroundColor: isDark ? ef.bg1 : ef.bg0, borderColor: isDark ? ef.bg4 : ef.bg3 }]}>
      {/* Subtle AI-analyzing pulse overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.primary, opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] }), borderRadius: 20 }]}
        pointerEvents="none"
      />

      {/* Card header row */}
      <View style={styles.header}>
        <Text variant="labelMedium" style={{ color: theme.colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' }}>
          Reflection
        </Text>
        <Text variant="bodySmall" style={{ color: isDark ? ef.grey1 : ef.grey2 }}>
          Write freely, no pressure
        </Text>
      </View>

      {/* Main multiline text input */}
      <TextInput
        multiline
        placeholder="How are you feeling today? Write your full journal here..."
        placeholderTextColor={isDark ? ef.grey0 : ef.grey1}
        value={value}
        onChangeText={onChangeText}
        style={[styles.textInput, { color: theme.colors.onSurface }]}
        textAlignVertical="top"
        scrollEnabled={false}  // Let the parent ScrollView handle scrolling
      />

      {/* Detected theme chips */}
      {(themes.length > 0 || isAnalyzing) && (
        <View style={styles.themesContainer}>
          {isAnalyzing && themes.length === 0 && (
            <Text variant="labelSmall" style={{ color: theme.colors.primary, opacity: 0.7 }}>
              Analyzing thoughts...
            </Text>
          )}
          {themes.map((themeStr, idx) => (
            <Chip
              key={idx}
              compact
              style={[styles.themeChip, { backgroundColor: isDark ? ef.bg3 : ef.bg2 }]}
              textStyle={{ color: theme.colors.primary, fontSize: 10, fontWeight: '600' }}
            >
              {themeStr.toUpperCase()}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    fontSize: 16,
    lineHeight: 26,
    minHeight: 200,
  },
  themesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
    alignItems: 'center',
  },
  themeChip: {
    borderRadius: 8,
  },
});
