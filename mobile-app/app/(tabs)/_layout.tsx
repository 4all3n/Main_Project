import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // <-- NEW: Handles the Device Pill
import { useAppTheme } from '../../providers/app-theme-provider';

const TAB_ITEMS = [
    { name: 'home' as const, title: 'Dashboard', icon: 'home-outline' as keyof typeof Ionicons.glyphMap },
    { name: 'insights' as const, title: 'Insights', icon: 'stats-chart-outline' as keyof typeof Ionicons.glyphMap },
    { name: 'journal' as const, title: 'Journal', icon: 'reader-outline' as keyof typeof Ionicons.glyphMap },
];



import React, { useEffect, useState } from 'react';
import { API_BASE_URL } from '../../lib/api';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Animated } from 'react-native';

const ServerHealthPill = () => {
    const { isDark, theme } = useAppTheme();
    const insets = useSafeAreaInsets();
    const [isOk, setIsOk] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;
        const checkHealth = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const res = await fetch(`${API_BASE_URL}/api/health`, { method: 'GET', signal: controller.signal });
                clearTimeout(timeoutId);
                if (mounted) setIsOk(res.ok);
            } catch (err) {
                if (mounted) setIsOk(false);
            }
        };

        checkHealth();
        const interval = setInterval(checkHealth, 30000);
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    return (
        <View
            style={{
                position: 'absolute',
                top: insets.top + 8,
                right: 16,
                backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                zIndex: 1000,
            }}
        >
            <View
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: isOk ? theme.colors.primary : theme.colors.error,
                }}
            />
        </View>
    );
};

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    
    return (
        <View style={{
            position: 'absolute',
            bottom: insets.bottom + 16,
            left: 24,
            right: 24,
            height: 64,
            backgroundColor: theme.colors.surfaceVariant,
            borderRadius: 32,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
            elevation: 8,
        }}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel !== undefined
                        ? options.tabBarLabel
                        : options.title !== undefined
                        ? options.title
                        : route.name;

                const isFocused = state.index === index;
                
                // Skip settings from being rendered in bottom tab bar
                if (route.name === 'settings') return null;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name, route.params);
                    }
                };

                const iconColor = isFocused ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;
                const iconName = TAB_ITEMS.find(i => i.name === route.name)?.icon || 'home-outline';

                return (
                    <TouchableOpacity
                        key={route.key}
                        accessibilityRole="button"
                        accessibilityState={isFocused ? { selected: true } : {}}
                        accessibilityLabel={options.tabBarAccessibilityLabel}
                        testID={options.tabBarTestID}
                        onPress={onPress}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 48,
                            borderRadius: 24,
                            backgroundColor: isFocused ? theme.colors.primaryContainer : 'transparent',
                        }}
                    >
                        <Ionicons name={iconName as any} size={22} color={iconColor} />
                        <Text style={{ 
                            color: iconColor, 
                            fontSize: 12, 
                            fontWeight: isFocused ? '700' : '500', 
                            marginTop: 2 
                        }}>
                            {label as string}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

export default function TabsLayout() {
    return (
        <View style={{ flex: 1 }}>
            <Tabs
                tabBar={props => <CustomTabBar {...props} />}
                screenOptions={{
                    headerShown: false,
                }}
            >
                {TAB_ITEMS.map((item) => (
                    <Tabs.Screen
                        key={item.name}
                        name={item.name}
                        options={{
                            title: item.title,
                        }}
                    />
                ))}
                <Tabs.Screen
                    name="settings"
                    options={{ title: 'Settings' }}
                />
            </Tabs>
            <ServerHealthPill />
        </View>
    );
}

const styles = StyleSheet.create({});