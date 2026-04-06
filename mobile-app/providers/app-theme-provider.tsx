import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { configureFonts, MD3DarkTheme, MD3LightTheme, Theme } from 'react-native-paper';

type ThemeMode = 'light' | 'dark';

type AppThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
};

const STORAGE_KEY = '@app_theme_mode';

const fontConfig = configureFonts({
  config: {
    displayLarge: {
      fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
      letterSpacing: -0.2,
      fontWeight: '700',
    },
    displayMedium: {
      fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
      letterSpacing: -0.2,
      fontWeight: '700',
    },
    headlineMedium: {
      fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
      letterSpacing: -0.1,
      fontWeight: '700',
    },
    titleLarge: {
      fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
      fontWeight: '700',
    },
    titleMedium: {
      fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
      fontWeight: '600',
    },
    bodyLarge: {
      fontFamily: Platform.select({ ios: 'Avenir', android: 'sans-serif', default: 'System' }),
    },
    bodyMedium: {
      fontFamily: Platform.select({ ios: 'Avenir', android: 'sans-serif', default: 'System' }),
    },
    labelLarge: {
      fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
      fontWeight: '600',
      letterSpacing: 0.6,
    },
    labelMedium: {
      fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium', default: 'System' }),
      fontWeight: '600',
    },
  },
  isV3: true,
});

const lightZenTheme: Theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#3B82C4',
    onPrimary: '#FFFFFF',
    primaryContainer: '#CFE6FA',
    onPrimaryContainer: '#0E3354',
    secondary: '#3A9F78',
    onSecondary: '#FFFFFF',
    secondaryContainer: '#CDEDDD',
    onSecondaryContainer: '#103A2A',
    tertiary: '#C9831E',
    onTertiary: '#FFFFFF',
    tertiaryContainer: '#F8E7C9',
    onTertiaryContainer: '#422E0A',
    background: '#F2F7FC',
    onBackground: '#172532',
    surface: '#FEFFFF',
    onSurface: '#1C252D',
    surfaceVariant: '#E0ECF8',
    onSurfaceVariant: '#4D6276',
    outline: '#8EA4B7',
    outlineVariant: '#CBD9E7',
  },
  fonts: fontConfig,
};

const darkZenTheme: Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#A7C9ED',
    onPrimary: '#0F2B45',
    primaryContainer: '#2C4F70',
    onPrimaryContainer: '#D8EAFB',
    secondary: '#9FD9BE',
    onSecondary: '#103425',
    secondaryContainer: '#2F5A44',
    onSecondaryContainer: '#D4EFDF',
    tertiary: '#E7C88D',
    onTertiary: '#3A2A0A',
    tertiaryContainer: '#5E4B1F',
    onTertiaryContainer: '#F8E8C8',
    background: '#0E1319',
    onBackground: '#E5EDF5',
    surface: '#151C24',
    onSurface: '#E5EDF5',
    surfaceVariant: '#23303C',
    onSurfaceVariant: '#B8C9D8',
    outline: '#7E97AC',
    outlineVariant: '#2F3F4D',
  },
  fonts: fontConfig,
};

const AppThemeContext = createContext<AppThemeContextValue | undefined>(undefined);

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedMode === 'dark' || savedMode === 'light') {
          setMode(savedMode);
        }
      } catch (error) {
        console.error('Failed to load theme mode:', error);
      }
    };

    loadThemePreference();
  }, []);

  const toggleTheme = async () => {
    const nextMode: ThemeMode = mode === 'light' ? 'dark' : 'light';
    setMode(nextMode);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextMode);
    } catch (error) {
      console.error('Failed to store theme mode:', error);
    }
  };

  const value = useMemo<AppThemeContextValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      theme: mode === 'dark' ? darkZenTheme : lightZenTheme,
      toggleTheme,
    }),
    [mode]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
}
