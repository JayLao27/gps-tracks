import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { useState } from 'react';

/* ── Settings Sections ── */
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
            { icon: 'notifications-outline', label: 'Notifications', iconColor: '#f59e0b', type: 'toggle', value: true },
            { icon: 'shield-checkmark-outline', label: 'Privacy', iconColor: '#34d399', type: 'link' },
        ],
    },
    {
        title: 'Tracking',
        items: [
            { icon: 'location-outline', label: 'High Accuracy GPS', iconColor: '#a78bfa', type: 'toggle', value: true },
            { icon: 'battery-half-outline', label: 'Battery Saver Mode', iconColor: '#fb7185', type: 'toggle', value: false },
            { icon: 'analytics-outline', label: 'Auto-Pause Detection', iconColor: '#38bdf8', type: 'toggle', value: true },
            { icon: 'cloud-upload-outline', label: 'Auto Sync', iconColor: '#34d399', type: 'toggle', value: true },
        ],
    },
    {
        title: 'About',
        items: [
            { icon: 'help-circle-outline', label: 'Help & Support', iconColor: '#94a3b8', type: 'link' },
            { icon: 'document-text-outline', label: 'Terms of Service', iconColor: '#94a3b8', type: 'link' },
            { icon: 'information-circle-outline', label: 'App Version 1.0.0', iconColor: '#94a3b8', type: 'link' },
        ],
    },
];

export default function Settings() {
    const router = useRouter();
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

    const handleToggle = (label: string) => {
        setToggleStates((prev) => ({ ...prev, [label]: !prev[label] }));
    };

    const handleSignOut = () => {
        router.replace('/Authentication/login');
    };

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b', '#0f172a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <View className="px-6 pb-2 pt-16">
                    <Text className="text-2xl font-bold text-white">Settings</Text>
                    <Text className="mt-1 text-sm text-slate-400">
                        Manage your preferences
                    </Text>
                </View>

                {/* ── Profile Card ── */}
                <View className="mx-6 mt-4 flex-row items-center rounded-2xl border border-white/10 bg-white/5 p-4">
                    <View className="h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20">
                        <Ionicons name="person" size={28} color="#34d399" />
                    </View>
                    <View className="ml-4 flex-1">
                        <Text className="text-base font-bold text-white">
                            Jay Lao
                        </Text>
                        <Text className="mt-0.5 text-sm text-slate-400">
                            test@example.com
                        </Text>
                    </View>
                    <Pressable className="rounded-xl bg-white/5 p-2.5 active:bg-white/10">
                        <Ionicons name="create-outline" size={18} color="#94a3b8" />
                    </Pressable>
                </View>

                {/* ── Settings Sections ── */}
                {settingsSections.map((section) => (
                    <View key={section.title} className="px-6 pt-6">
                        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                            {section.title}
                        </Text>
                        <View className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                            {section.items.map((item, idx) => (
                                <Pressable
                                    key={item.label}
                                    className={`flex-row items-center px-4 py-3.5 active:bg-white/5 ${
                                        idx < section.items.length - 1
                                            ? 'border-b border-white/5'
                                            : ''
                                    }`}
                                >
                                    <View
                                        className="mr-3 h-8 w-8 items-center justify-center rounded-lg"
                                        style={{ backgroundColor: item.iconColor + '20' }}
                                    >
                                        <Ionicons
                                            name={item.icon}
                                            size={17}
                                            color={item.iconColor}
                                        />
                                    </View>
                                    <Text className="flex-1 text-sm text-white">
                                        {item.label}
                                    </Text>
                                    {item.type === 'toggle' ? (
                                        <Switch
                                            value={toggleStates[item.label]}
                                            onValueChange={() => handleToggle(item.label)}
                                            trackColor={{
                                                false: '#334155',
                                                true: '#065f46',
                                            }}
                                            thumbColor={
                                                toggleStates[item.label]
                                                    ? '#34d399'
                                                    : '#94a3b8'
                                            }
                                        />
                                    ) : (
                                        <Ionicons
                                            name="chevron-forward"
                                            size={18}
                                            color="#475569"
                                        />
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    </View>
                ))}

                {/* ── Sign Out ── */}
                <View className="px-6 pt-8">
                    <Pressable
                        onPress={handleSignOut}
                        className="flex-row items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 py-4 active:bg-red-500/20"
                    >
                        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                        <Text className="ml-2 text-sm font-bold text-red-400">
                            Sign Out
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
