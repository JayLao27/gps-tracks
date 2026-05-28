import { useIntelligenceReport } from '@/hooks/useIntelligenceReport';
import { getCurrentUser, logoutUser } from '@/services/authService';
import { type User } from '@/services/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingItem {
    icon: IoniconsName;
    label: string;
    iconColor: string;
    type: 'link' | 'toggle';
    value?: boolean;
}

interface SettingsSection {
    title: string;
    items: SettingItem[];
}

const settingsSections: SettingsSection[] = [
    {
        title: 'Account',
        items: [
            { icon: 'person-outline', label: 'Edit Profile', iconColor: '#60a5fa', type: 'link' },
            { icon: 'notifications-outline', label: 'Notifications', iconColor: '#fbbf24', type: 'toggle', value: true },
            { icon: 'shield-checkmark-outline', label: 'Privacy & Security', iconColor: '#34d399', type: 'link' },
        ],
    },
    {
        title: 'Preferences',
        items: [
            { icon: 'contrast-outline', label: 'Dark Mode', iconColor: '#a78bfa', type: 'toggle', value: true },
        ],
    },
    {
        title: 'Tracking Core',
        items: [
            { icon: 'pin-outline', label: 'Manage Known Places', iconColor: '#34d399', type: 'link' },
            { icon: 'location-outline', label: 'High Accuracy GPS', iconColor: '#60a5fa', type: 'toggle', value: true },
            { icon: 'battery-half-outline', label: 'Battery Saver Mode', iconColor: '#f43f5e', type: 'toggle', value: false },
            { icon: 'analytics-outline', label: 'Auto-Pause Detection', iconColor: '#38bdf8', type: 'toggle', value: true },
            { icon: 'cloud-upload-outline', label: 'Auto Cloud Sync', iconColor: '#c084fc', type: 'toggle', value: true },
        ],
    },
    {
        title: 'Support & Legal',
        items: [
            { icon: 'help-circle-outline', label: 'Help & Support', iconColor: '#94a3b8', type: 'link' },
            { icon: 'document-text-outline', label: 'Terms of Service', iconColor: '#94a3b8', type: 'link' },
            { icon: 'information-circle-outline', label: 'App Version 1.0.0', iconColor: '#64748b', type: 'link' },
        ],
    },
];

const SETTINGS_PREFS_KEY = '@gps_tracks:settings_prefs';

export default function Settings() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const { report, source } = useIntelligenceReport();
    const { colors, isDark, toggleTheme } = useTheme();
    const [toggleStates, setToggleStates] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        settingsSections.forEach((section) => {
            section.items.forEach((item) => {
                if (item.type === 'toggle' && item.value !== undefined) {
                    initial[item.label] = item.value;
                }
            });
        });
        return initial;
    });

    useEffect(() => {
        getCurrentUser().then(setUser);

        // Load persistent preferences from AsyncStorage on mount
        const loadPrefs = async () => {
            try {
                const saved = await AsyncStorage.getItem(SETTINGS_PREFS_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setToggleStates((prev) => ({ ...prev, ...parsed }));
                }
            } catch (e) {
                console.error('Failed to load settings preferences:', e);
            }
        };
        loadPrefs();
    }, []);

    const handleToggle = async (label: string) => {
        if (label === 'Dark Mode') {
            toggleTheme();
        } else {
            const nextVal = !toggleStates[label];
            const nextStates = { ...toggleStates, [label]: nextVal };
            setToggleStates(nextStates);
            try {
                await AsyncStorage.setItem(SETTINGS_PREFS_KEY, JSON.stringify(nextStates));
            } catch (e) {
                console.error('Failed to save settings preferences:', e);
            }
        }
    };

    const handleSignOut = async () => {
        await logoutUser();
        router.replace('/Authentication/login');
    };

    const handleLinkPress = (label: string) => {
        if (label === 'Manage Known Places') {
            router.push('/System/places');
        }
    };

    return (
        <LinearGradient
            colors={colors.bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="px-6 pb-2 pt-16">
                    <Text className="text-2xl font-black tracking-tight" style={{ color: colors.textPrimary }}>Settings</Text>
                    <Text className="mt-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                        Manage your preferences & account
                    </Text>
                </View>

                {/* Profile Card */}
                <View 
                    className="mx-6 mt-4 flex-row items-center rounded-3xl border p-5 shadow-lg"
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                >
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-md">
                        <Ionicons name="person" size={26} color="#10b981" />
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className="text-base font-black tracking-tight" style={{ color: colors.textPrimary }}>
                            {user?.name ?? 'Explorer'}
                        </Text>
                        <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.textTertiary }}>
                            {user?.email ?? ''}
                        </Text>
                    </View>
                    <Pressable 
                        className="rounded-xl border p-2.5 shadow-sm"
                        style={{ backgroundColor: colors.isDark ? 'rgba(0,0,0,0.3)' : 'rgba(15,23,42,0.05)', borderColor: colors.cardBorder }}
                    >
                        <Ionicons name="create-outline" size={17} color={colors.textSecondary} />
                    </Pressable>
                </View>

                {/* Settings list sections */}
                {settingsSections.map((section) => (
                    <View key={section.title} className="px-6 pt-6">
                        <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                            {section.title}
                        </Text>
                        <View 
                            className="overflow-hidden rounded-3xl border shadow-sm"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                        >
                            {section.items.map((item, idx) => {
                                const isItemToggleActive = item.label === 'Dark Mode' ? isDark : toggleStates[item.label];
                                return (
                                    <Pressable
                                        key={item.label}
                                        onPress={
                                            item.type === 'link'
                                                ? () => handleLinkPress(item.label)
                                                : undefined
                                        }
                                        className="flex-row items-center px-4.5 py-4 active:bg-slate-800/40"
                                        style={{
                                            borderBottomColor: colors.cardBorder,
                                            borderBottomWidth: idx < section.items.length - 1 ? 1 : 0
                                        }}
                                    >
                                        <View
                                            className="mr-3.5 h-8 w-8 items-center justify-center rounded-lg border"
                                            style={{ 
                                                backgroundColor: item.iconColor + '10', 
                                                borderColor: item.iconColor + '25' 
                                            }}
                                        >
                                            <Ionicons
                                                name={item.icon}
                                                size={16}
                                                color={item.iconColor}
                                            />
                                        </View>
                                        <Text className="flex-1 text-sm font-semibold" style={{ color: colors.textPrimary }}>
                                            {item.label}
                                        </Text>
                                        {item.type === 'toggle' ? (
                                            <Switch
                                                value={isItemToggleActive}
                                                onValueChange={() => handleToggle(item.label)}
                                                trackColor={{
                                                    false: colors.isDark ? '#1e293b' : 'rgba(15, 23, 42, 0.08)',
                                                    true: 'rgba(16, 185, 129, 0.2)',
                                                }}
                                                thumbColor={
                                                    isItemToggleActive
                                                        ? '#10b981'
                                                        : '#64748b'
                                                }
                                            />
                                        ) : (
                                            <Ionicons
                                                name="chevron-forward"
                                                size={16}
                                                color={colors.textTertiary}
                                            />
                                        )}
                                    </Pressable>
                                );
                            })}
                        </View>
                    </View>
                ))}


                {/* Behavior Coach Widgets */}
                <View className="px-6 pt-6">
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Coach Telemetry Warnings
                    </Text>
                    <Text className="mb-3.5 text-[9px] font-bold uppercase" style={{ color: colors.textTertiary }}>
                        Source: {source === 'live' ? 'Live tracked data' : 'Demo fallback data'}
                    </Text>

                    {report.goalStatuses
                        .filter((status) => status.alert)
                        .slice(0, 2)
                        .map((status) => (
                            <View
                                key={status.goal.id}
                                className="mb-3 rounded-2xl border p-4 shadow-sm"
                                style={{ backgroundColor: colors.warnBg, borderColor: colors.warnBorder }}
                            >
                                <View className="flex-row items-center mb-1.5">
                                    <Ionicons name="sparkles" size={14} color="#f59e0b" />
                                    <Text className="ml-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.warnText }}>
                                        Goal Alert
                                    </Text>
                                </View>
                                <Text className="text-xs font-semibold leading-relaxed" style={{ color: colors.warnText }}>
                                    {status.alert}
                                </Text>
                            </View>
                        ))}

                    {report.anomalies.slice(0, 1).map((anomaly) => (
                        <View
                            key={anomaly.message}
                            className="mb-3 rounded-2xl border p-4 shadow-sm"
                            style={{ backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }}
                        >
                            <View className="flex-row items-center mb-1.5">
                                <Ionicons name="alert-circle-outline" size={14} color="#f43f5e" />
                                <Text className="ml-1.5 text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.dangerText }}>
                                    Safety Anomaly
                                </Text>
                            </View>
                            <Text className="text-xs font-semibold leading-relaxed" style={{ color: colors.dangerText }}>
                                {anomaly.message}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* ── Sign Out ── */}
                <View className="px-6 pt-6">
                    <Pressable
                        onPress={handleSignOut}
                        className="flex-row items-center justify-center rounded-2xl border py-4 active:bg-rose-950/20 shadow-md"
                        style={{ backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }}
                    >
                        <Ionicons name="log-out-outline" size={18} color="#f43f5e" />
                        <Text className="ml-2 text-xs font-black uppercase tracking-wider" style={{ color: colors.dangerText }}>
                            Sign Out
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
