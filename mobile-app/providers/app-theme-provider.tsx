import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { configureFonts, MD3DarkTheme, MD3LightTheme, Theme } from 'react-native-paper';
import { EverforestLight, EverforestDark } from '../constants/theme';

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
    primary: EverforestLight.green,
    onPrimary: EverforestLight.bg0,
    primaryContainer: EverforestLight.bg_green,
    onPrimaryContainer: EverforestLight.fg,
    secondary: EverforestLight.blue,
    onSecondary: EverforestLight.bg0,
    secondaryContainer: EverforestLight.bg_blue,
    onSecondaryContainer: EverforestLight.fg,
    tertiary: EverforestLight.yellow,
    onTertiary: EverforestLight.bg0,
    tertiaryContainer: EverforestLight.bg_yellow,
    onTertiaryContainer: EverforestLight.fg,
    background: EverforestLight.bg_dim,
    onBackground: EverforestLight.fg,
    surface: EverforestLight.bg0,
    onSurface: EverforestLight.fg,
    surfaceVariant: EverforestLight.bg1,
    onSurfaceVariant: EverforestLight.fg,
    outline: EverforestLight.grey1,
    outlineVariant: EverforestLight.bg2,
  },
  fonts: fontConfig,
};

const darkZenTheme: Theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: EverforestDark.green,
    onPrimary: EverforestDark.bg0,
    primaryContainer: EverforestDark.bg_green,
    onPrimaryContainer: EverforestDark.fg,
    secondary: EverforestDark.blue,
    onSecondary: EverforestDark.bg0,
    secondaryContainer: EverforestDark.bg_blue,
    onSecondaryContainer: EverforestDark.fg,
    tertiary: EverforestDark.yellow,
    onTertiary: EverforestDark.bg0,
    tertiaryContainer: EverforestDark.bg_yellow,
    onTertiaryContainer: EverforestDark.fg,
    background: EverforestDark.bg_dim,
    onBackground: EverforestDark.fg,
    surface: EverforestDark.bg0,
    onSurface: EverforestDark.fg,
    surfaceVariant: EverforestDark.bg1,
    onSurfaceVariant: EverforestDark.fg,
    outline: EverforestDark.grey1,
    outlineVariant: EverforestDark.bg2,
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
