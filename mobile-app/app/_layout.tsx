import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PaperProvider } from 'react-native-paper';
import { AppThemeProvider, useAppTheme } from '../providers/app-theme-provider';
import 'react-native-reanimated';

function AppLayoutContent() {
  const { theme, isDark } = useAppTheme();

  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} translucent />
      <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.background }
      }}>
        {/* Mount the (tabs) interface as the root */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* Metric Detail Screen pushed on top of tabs */}
        <Stack.Screen 
            name="metric/[id]" 
            options={{ 
                headerShown: false,
                presentation: 'card', 
                animation: 'slide_from_right'
            }} 
        />
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AppLayoutContent />
    </AppThemeProvider>
  );
}
