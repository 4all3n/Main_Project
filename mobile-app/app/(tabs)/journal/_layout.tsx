import { Stack } from 'expo-router';
import { useTheme } from 'react-native-paper';

export default function JournalStackLayout() {
    const theme = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background }
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="create" options={{ presentation: 'modal' }} />
            <Stack.Screen name="[date]" />
        </Stack>
    );
}
