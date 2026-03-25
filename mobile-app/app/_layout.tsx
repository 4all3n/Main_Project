import { Stack } from 'expo-router';
import { MD3DarkTheme, PaperProvider } from 'react-native-paper';
import 'react-native-reanimated';

// Create a custom Material 3 Dark Theme based on our requirements
const customDarkTheme = {
    ...MD3DarkTheme,
    colors: {
        ...MD3DarkTheme.colors,
        primary: '#D0BCFF',
        onPrimary: '#381E72',
        primaryContainer: '#4F378B',
        onPrimaryContainer: '#EADDFF',
        secondary: '#CCC2DC',
        onSecondary: '#332D41',
        secondaryContainer: '#4A4458',
        onSecondaryContainer: '#E8DEF8',
        background: '#141218',
        onBackground: '#E6E1E5',
        surface: '#141218',
        onSurface: '#E6E1E5',
        surfaceVariant: '#49454F',
        onSurfaceVariant: '#CAC4D0',
        outline: '#938F99',
        outlineVariant: '#49454F',
    }
};

export default function RootLayout() {
  return (
    <PaperProvider theme={customDarkTheme}>
      <Stack screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: customDarkTheme.colors.background }
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
