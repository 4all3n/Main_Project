import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <-- NEW: Handles the Device Pill
import { useAppTheme } from '../../providers/app-theme-provider';

const TAB_ITEMS = [
    { name: 'home' as const, title: 'Dashboard', icon: 'home-outline' as keyof typeof Ionicons.glyphMap },
    { name: 'insights' as const, title: 'Insights', icon: 'stats-chart-outline' as keyof typeof Ionicons.glyphMap },
    { name: 'journal' as const, title: 'Journal', icon: 'reader-outline' as keyof typeof Ionicons.glyphMap },
];

function TabIcon({ name, color, size, focused, activeBg }: any) {
    if (focused) {
        return (
            <View style={[styles.activeIconBubble, { backgroundColor: activeBg }]}>
                <Ionicons name={name} size={size - 2} color={color} />
            </View>
        );
    }
    return <Ionicons name={name} size={size - 2} color={color} style={{ opacity: 0.6 }} />;
}

export default function TabsLayout() {
    const theme = useTheme();
    const { isDark } = useAppTheme();
    
    // Grab the exact physical dimensions of the device's notches and pills
    const insets = useSafeAreaInsets(); 

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 2, // Tightened up slightly
                },
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    // --- 1. THE COLOR FIX ---
                    // Tie this directly to your theme's surface color so it blends seamlessly
                    backgroundColor: theme.colors.surface, 
                    borderTopWidth: 1,
                    borderTopColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                    
                    // --- 2. THE DEVICE PILL FIX ---
                    // Dynamically calculate height and padding based on the physical device's bottom inset
                    height: 60 + (insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10),
                    paddingBottom: insets.bottom > 0 ? insets.bottom : Platform.OS === 'ios' ? 20 : 10,
                    paddingTop: 8,
                    
                    elevation: 0, // Set to 0 so it sits flat against the background like native iOS
                },
                tabBarItemStyle: {
                    padding: 2,
                }
            }}
        >
            {TAB_ITEMS.map((item) => (
                <Tabs.Screen
                    key={item.name}
                    name={item.name}
                    options={{
                        title: item.title,
                        tabBarIcon: ({ color, size, focused }) => (
                            <TabIcon
                                name={item.icon}
                                size={26}
                                color={color}
                                focused={focused}
                                activeBg={isDark ? 'rgba(167, 201, 237, 0.15)' : 'rgba(59, 130, 196, 0.12)'}
                            />
                        ),
                    }}
                />
            ))}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    activeIconBubble: {
        width: 56, 
        height: 32, 
        borderRadius: 16, 
        justifyContent: 'center',
        alignItems: 'center',
    },
});