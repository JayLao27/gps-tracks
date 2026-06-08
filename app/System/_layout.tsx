/**
 * ============================================================================
 * MODULE: app/System/_layout.tsx
 * LAYER: Presentation / Navigation Layer
 * DESCRIPTION: Configures the main application tab navigation and wraps screens
 *              in the global ThemeProvider context.
 * ============================================================================
 */

import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ThemeProvider, useTheme } from '@/hooks/useTheme';
import { validateSessionLifecycle } from '@/services/authService';

function TabsLayout() {

    const { colors } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: colors.tabBarBg,
                    borderTopColor: colors.tabBarBorder,
                    borderTopWidth: 1,
                    height: 76,
                    paddingBottom: 14,
                    paddingTop: 10,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                tabBarActiveTintColor: '#10b981',
                tabBarInactiveTintColor: colors.tabBarInactive,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '700',
                    letterSpacing: 0.5,
                },
            }}
        >
            <Tabs.Screen
                name="dashboard"
                options={{
                    title: 'Dashboard',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="navigate-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="activity"
                options={{
                    title: 'Activity',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="time-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="insights"
                options={{
                    title: 'Insights',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="sparkles-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="settings-outline" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="places"
                options={{
                    title: 'Places',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="pin-outline" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}

export default function SystemLayout() {
    const router = useRouter();

    useEffect(() => {
        let active = true;

        const checkSession = async () => {
            const isValid = await validateSessionLifecycle();
            if (!isValid && active) {
                router.replace('/Authentication/login');
            }
        };

        checkSession();

        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'active') {
                checkSession();
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            active = false;
            subscription.remove();
        };
    }, [router]);

    return (
        <ThemeProvider>
            <TabsLayout />
        </ThemeProvider>
    );
}

