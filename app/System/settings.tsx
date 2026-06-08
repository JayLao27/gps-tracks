/**
 * ============================================================================
 * MODULE: app/System/settings.tsx
 * LAYER: Presentation / Feature View Layer
 * DESCRIPTION: Manages application configuration: API keys, themes, profile logs,
 *              and account sign-out actions.
 * ============================================================================
 */

import { useIntelligenceReport } from '@/hooks/useIntelligenceReport';
import { getCurrentUser, logoutUser, updateUserProfile } from '@/services/authService';
import { type User } from '@/services/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, Switch, Text, View, Alert, Share, TextInput, ActivityIndicator } from 'react-native';
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
            { icon: 'help-buoy-outline', label: 'Background GPS Troubleshooter', iconColor: '#fb7185', type: 'link' },
            { icon: 'location-outline', label: 'High Accuracy GPS', iconColor: '#60a5fa', type: 'toggle', value: true },
            { icon: 'battery-half-outline', label: 'Battery Saver Mode', iconColor: '#f43f5e', type: 'toggle', value: false },
            { icon: 'analytics-outline', label: 'Auto-Pause Detection', iconColor: '#38bdf8', type: 'toggle', value: true },
            { icon: 'cloud-upload-outline', label: 'Auto Cloud Sync', iconColor: '#c084fc', type: 'toggle', value: true },
        ],
    },
    {
        title: 'Diagnostics & Storage',
        items: [
            { icon: 'download-outline', label: 'Export Telemetry Logs', iconColor: '#60a5fa', type: 'link' },
            { icon: 'trash-outline', label: 'Purge Local Telemetry DB', iconColor: '#f43f5e', type: 'link' },
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
    const [showTroubleshooter, setShowTroubleshooter] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);
    const [showHelpModal, setShowHelpModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);

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

    const handleUpdateProfile = async () => {
        if (!newName.trim()) {
            Alert.alert('Validation Error', 'Name cannot be empty.');
            return;
        }

        setIsSavingProfile(true);
        const errorMsg = await updateUserProfile(newName);
        setIsSavingProfile(false);

        if (errorMsg) {
            Alert.alert('Update Failed', errorMsg);
        } else {
            setUser((prev) => prev ? { ...prev, name: newName.trim() } : null);
            setShowEditProfileModal(false);
            Alert.alert('Profile Saved', 'Your display name has been updated successfully.');
        }
    };

    const handleExportTelemetry = async () => {
        Alert.alert(
            "Export Telemetry Logs",
            "Choose a format for exporting your raw location logs.",
            [
                { text: "JSON Format", onPress: () => performExport("json") },
                { text: "GPX Format (GPS XML)", onPress: () => performExport("gpx") },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const performExport = async (format: "json" | "gpx") => {
        try {
            const rawPings = await AsyncStorage.getItem('gps_tracks.location_pings');
            const pings = rawPings ? JSON.parse(rawPings) : [];
            
            if (!pings || pings.length === 0) {
                Alert.alert("No Data", "There are no local telemetry pings found to export.");
                return;
            }

            let content = "";
            if (format === "json") {
                content = JSON.stringify(pings, null, 2);
            } else {
                content = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                    '<gpx version="1.1" creator="GPS Tracks" xmlns="http://www.topografix.com/GPX/1/1">\n' +
                    '  <metadata>\n' +
                    `    <time>${new Date().toISOString()}</time>\n` +
                    '  </metadata>\n' +
                    '  <trk>\n' +
                    '    <name>GPS Tracks Log</name>\n' +
                    '    <trkseg>\n';
                for (const p of pings) {
                    content += `      <trkpt lat="${p.latitude}" lon="${p.longitude}">\n` +
                        `        <time>${p.timestamp || new Date().toISOString()}</time>\n` +
                        `        <name>${p.locationName || 'Tracked Spot'}</name>\n` +
                        `        <desc>Category: ${p.category || 'other'}</desc>\n` +
                        '      </trkpt>\n';
                }
                content += '    </trkseg>\n  </trk>\n</gpx>';
            }

            await Share.share({
                message: content,
                title: `GPS_Telemetry_${new Date().toISOString().split('T')[0]}`
            });
        } catch {
            Alert.alert("Export Error", "An error occurred while compiling your telemetry logs.");
        }
    };

    const handlePurgeTelemetry = async () => {
        Alert.alert(
            "Purge Telemetry Database",
            "WARNING: This will permanently delete all local coordinate pings, location history, visit logs, and offline tracks on this device. Remote database records will not be deleted.\n\nAre you sure you want to proceed?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Purge Database",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await AsyncStorage.multiRemove([
                                'gps_tracks.location_pings',
                                'gps_tracks.locations',
                                'gps_tracks.visits',
                                'gps_tracks.offline_tracks'
                            ]);
                            Alert.alert("Purge Complete", "All local databases have been cleared.");
                        } catch {
                            Alert.alert("Purge Failed", "Could not clear local databases.");
                        }
                    }
                }
            ]
        );
    };

    const handleLinkPress = (label: string) => {
        if (label === 'Manage Known Places') {
            router.push('/System/places');
        } else if (label === 'Background GPS Troubleshooter') {
            setShowTroubleshooter(true);
        } else if (label === 'Edit Profile') {
            setNewName(user?.name || '');
            setShowEditProfileModal(true);
        } else if (label === 'Privacy & Security') {
            setShowPrivacyModal(true);
        } else if (label === 'Help & Support') {
            setShowHelpModal(true);
        } else if (label === 'Terms of Service') {
            setShowTermsModal(true);
        } else if (label === 'Export Telemetry Logs') {
            handleExportTelemetry();
        } else if (label === 'Purge Local Telemetry DB') {
            handlePurgeTelemetry();
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
                        onPress={() => handleLinkPress('Edit Profile')}
                        className="rounded-xl border p-2.5 shadow-sm active:opacity-80"
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
                {/* ── Background GPS Troubleshooter Modal ── */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showTroubleshooter}
                    onRequestClose={() => setShowTroubleshooter(false)}
                >
                    <View className="flex-1 items-center justify-center bg-black/60 px-6">
                        <View 
                            className="w-full max-w-[380px] overflow-hidden rounded-[32px] border p-6 shadow-2xl"
                            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: colors.cardBorder }}
                        >
                            <View className="flex-row items-center justify-between border-b pb-4 mb-4" style={{ borderBottomColor: colors.cardBorder }}>
                                <View className="flex-row items-center">
                                    <Ionicons name="help-buoy-outline" size={20} color="#fb7185" />
                                    <Text className="ml-2 text-base font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                        GPS Telemetry Fixer
                                    </Text>
                                </View>
                                <Pressable onPress={() => setShowTroubleshooter(false)} hitSlop={8}>
                                    <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[360px] pr-1">
                                <Text className="text-xs leading-relaxed font-semibold mb-4" style={{ color: colors.textSecondary }}>
                                    If background tracking stops unexpectedly or misses routes, check these standard system configurations:
                                </Text>

                                {/* Step 1 */}
                                <View className="mb-4">
                                    <View className="flex-row items-center mb-1">
                                        <View className="h-5 w-5 rounded-full items-center justify-center bg-emerald-500/10 border border-emerald-500/20">
                                            <Text className="text-[10px] font-black text-emerald-500">1</Text>
                                        </View>
                                        <Text className="ml-2 text-xs font-bold" style={{ color: colors.textPrimary }}>
                                            Location Permissions (Always Allow)
                                        </Text>
                                    </View>
                                    <Text className="text-[10px] leading-relaxed ml-7" style={{ color: colors.textTertiary }}>
                                        iOS & Android require location authorization to be set to <Text className="font-extrabold" style={{ color: colors.textSecondary }}>"Allow all the time"</Text> for background geofencing. Check Settings &gt; Apps &gt; GPS Tracks &gt; Permissions.
                                    </Text>
                                </View>

                                {/* Step 2 */}
                                <View className="mb-4">
                                    <View className="flex-row items-center mb-1">
                                        <View className="h-5 w-5 rounded-full items-center justify-center bg-indigo-500/10 border border-indigo-500/20">
                                            <Text className="text-[10px] font-black text-indigo-500">2</Text>
                                        </View>
                                        <Text className="ml-2 text-xs font-bold" style={{ color: colors.textPrimary }}>
                                            Battery Optimization (Android)
                                        </Text>
                                    </View>
                                    <Text className="text-[10px] leading-relaxed ml-7" style={{ color: colors.textTertiary }}>
                                        Android OS aggressively suspends location services. Exclude this app from optimization: Settings &gt; Battery &gt; Battery Optimization &gt; GPS Tracks &gt; <Text className="font-extrabold" style={{ color: colors.textSecondary }}>Don't Optimize / Unrestricted</Text>.
                                    </Text>
                                </View>

                                {/* Step 3 */}
                                <View className="mb-4">
                                    <View className="flex-row items-center mb-1">
                                        <View className="h-5 w-5 rounded-full items-center justify-center bg-amber-500/10 border border-amber-500/20">
                                            <Text className="text-[10px] font-black text-amber-500">3</Text>
                                        </View>
                                        <Text className="ml-2 text-xs font-bold" style={{ color: colors.textPrimary }}>
                                            Background App Refresh (iOS)
                                        </Text>
                                    </View>
                                    <Text className="text-[10px] leading-relaxed ml-7" style={{ color: colors.textTertiary }}>
                                        Toggle iOS system refresh enabled: Settings &gt; General &gt; Background App Refresh &gt; <Text className="font-extrabold" style={{ color: colors.textSecondary }}>On (Wi-Fi & Mobile Data)</Text>.
                                    </Text>
                                </View>

                                {/* Step 4 */}
                                <View className="mb-2">
                                    <View className="flex-row items-center mb-1">
                                        <View className="h-5 w-5 rounded-full items-center justify-center bg-rose-500/10 border border-rose-500/20">
                                            <Text className="text-[10px] font-black text-rose-500">4</Text>
                                        </View>
                                        <Text className="ml-2 text-xs font-bold" style={{ color: colors.textPrimary }}>
                                            Satellite Signal Line-of-Sight
                                        </Text>
                                    </View>
                                    <Text className="text-[10px] leading-relaxed ml-7" style={{ color: colors.textTertiary }}>
                                        Underground transit, thick concrete slabs, and dense skyscrapers block GPS signals. Adaptive tracking will resume automatically once connection is established.
                                    </Text>
                                </View>
                            </ScrollView>

                            <Pressable
                                onPress={() => setShowTroubleshooter(false)}
                                className="mt-5 rounded-2xl py-3 items-center active:opacity-85 shadow-md"
                                style={{ backgroundColor: colors.isDark ? '#1e293b' : 'rgba(15,23,42,0.06)' }}
                            >
                                <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.textPrimary }}>
                                    Dismiss Diagnostic
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                {/* ── Edit Profile Modal ── */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showEditProfileModal}
                    onRequestClose={() => setShowEditProfileModal(false)}
                >
                    <View className="flex-1 items-center justify-center bg-black/60 px-6">
                        <View 
                            className="w-full max-w-[380px] overflow-hidden rounded-[32px] border p-6 shadow-2xl"
                            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: colors.cardBorder }}
                        >
                            <View className="flex-row items-center justify-between border-b pb-4 mb-4" style={{ borderBottomColor: colors.cardBorder }}>
                                <View className="flex-row items-center">
                                    <Ionicons name="person-outline" size={20} color="#60a5fa" />
                                    <Text className="ml-2 text-base font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                        Edit Profile
                                    </Text>
                                </View>
                                <Pressable onPress={() => setShowEditProfileModal(false)} hitSlop={8}>
                                    <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <View className="mb-4">
                                <Text className="mb-2 text-[10px] font-black uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                                    Display Name
                                </Text>
                                <TextInput
                                    className="rounded-2xl border px-4 py-3 text-sm font-semibold"
                                    style={{ 
                                        color: colors.textPrimary,
                                        backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.02)',
                                        borderColor: colors.cardBorder
                                    }}
                                    value={newName}
                                    onChangeText={setNewName}
                                    placeholder="Enter your name"
                                    placeholderTextColor="#475569"
                                    autoCorrect={false}
                                />
                            </View>

                            <View className="flex-row gap-3 mt-4">
                                <Pressable
                                    onPress={() => setShowEditProfileModal(false)}
                                    className="flex-1 rounded-2xl py-3 items-center"
                                    style={{ backgroundColor: isDark ? '#1e293b' : 'rgba(15,23,42,0.06)' }}
                                >
                                    <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.textPrimary }}>
                                        Cancel
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={handleUpdateProfile}
                                    disabled={isSavingProfile}
                                    className="flex-1 rounded-2xl py-3 items-center bg-emerald-500 active:opacity-85"
                                >
                                    {isSavingProfile ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <Text className="text-xs font-black uppercase tracking-wider text-white">
                                            Save
                                        </Text>
                                    )}
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* ── Privacy & Security Modal ── */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showPrivacyModal}
                    onRequestClose={() => setShowPrivacyModal(false)}
                >
                    <View className="flex-1 items-center justify-center bg-black/60 px-6">
                        <View 
                            className="w-full max-w-[380px] overflow-hidden rounded-[32px] border p-6 shadow-2xl"
                            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: colors.cardBorder }}
                        >
                            <View className="flex-row items-center justify-between border-b pb-4 mb-4" style={{ borderBottomColor: colors.cardBorder }}>
                                <View className="flex-row items-center">
                                    <Ionicons name="shield-checkmark-outline" size={20} color="#34d399" />
                                    <Text className="ml-2 text-base font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                        Privacy & Security
                                    </Text>
                                </View>
                                <Pressable onPress={() => setShowPrivacyModal(false)} hitSlop={8}>
                                    <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[300px]">
                                <Text className="text-xs leading-relaxed font-semibold mb-3" style={{ color: colors.textSecondary }}>
                                    Your telemetry data security is our top architectural priority:
                                </Text>

                                <View className="mb-3">
                                    <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>Local-First Caching</Text>
                                    <Text className="text-[10px] leading-relaxed" style={{ color: colors.textTertiary }}>
                                        Coordinate pings, locations, and visit logs are stored locally using hardware-backed SecureStore keychain encryption.
                                    </Text>
                                </View>

                                <View className="mb-3">
                                    <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>Kalman Denoising</Text>
                                    <Text className="text-[10px] leading-relaxed" style={{ color: colors.textTertiary }}>
                                        Raw coordinates are smoothed locally using Kalman filters to remove jumpy coordinate noise and protect precise track lines.
                                    </Text>
                                </View>

                                <View className="mb-3">
                                    <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>Geofence Protections</Text>
                                    <Text className="text-[10px] leading-relaxed" style={{ color: colors.textTertiary }}>
                                        Circular geofences automatically aggregate spatial data, preventing raw coordinate exposures near sensitive addresses.
                                    </Text>
                                </View>

                                <View className="mb-3">
                                    <Text className="text-xs font-bold" style={{ color: colors.textPrimary }}>Full Data Ownership</Text>
                                    <Text className="text-[10px] leading-relaxed" style={{ color: colors.textTertiary }}>
                                        You have the absolute right to download your telemetry logs or purge them instantly from the Diagnostics & Storage panel.
                                    </Text>
                                </View>
                            </ScrollView>

                            <Pressable
                                onPress={() => setShowPrivacyModal(false)}
                                className="mt-4 rounded-2xl py-3 items-center active:opacity-85"
                                style={{ backgroundColor: colors.isDark ? '#1e293b' : 'rgba(15,23,42,0.06)' }}
                            >
                                <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.textPrimary }}>
                                    Dismiss
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                {/* ── Help & Support Modal ── */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showHelpModal}
                    onRequestClose={() => setShowHelpModal(false)}
                >
                    <View className="flex-1 items-center justify-center bg-black/60 px-6">
                        <View 
                            className="w-full max-w-[380px] overflow-hidden rounded-[32px] border p-6 shadow-2xl"
                            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: colors.cardBorder }}
                        >
                            <View className="flex-row items-center justify-between border-b pb-4 mb-4" style={{ borderBottomColor: colors.cardBorder }}>
                                <View className="flex-row items-center">
                                    <Ionicons name="help-circle-outline" size={20} color="#fbbf24" />
                                    <Text className="ml-2 text-base font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                        Help & Support
                                    </Text>
                                </View>
                                <Pressable onPress={() => setShowHelpModal(false)} hitSlop={8}>
                                    <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[300px]">
                                <View className="mb-3">
                                    <Text className="text-xs font-bold text-emerald-400" style={{ color: colors.productivityText }}>Q: How does tracking work?</Text>
                                    <Text className="text-[10px] leading-relaxed mt-0.5" style={{ color: colors.textTertiary }}>
                                        The app combines GPS hardware updates, pedometer step cadence, and Kalman filter smoothers to log your spatial routines.
                                    </Text>
                                </View>

                                <View className="mb-3">
                                    <Text className="text-xs font-bold text-emerald-400" style={{ color: colors.productivityText }}>Q: How accurate is it?</Text>
                                    <Text className="text-[10px] leading-relaxed mt-0.5" style={{ color: colors.textTertiary }}>
                                        High Accuracy Mode polls the satellite receiver every 10 seconds. Geofence dwell detection triggers when you stay within a 20-meter radius for over 3 minutes.
                                    </Text>
                                </View>

                                <View className="mb-3">
                                    <Text className="text-xs font-bold text-emerald-400" style={{ color: colors.productivityText }}>Q: Does it drain battery?</Text>
                                    <Text className="text-[10px] leading-relaxed mt-0.5" style={{ color: colors.textTertiary }}>
                                        Adaptive background tracking automatically toggles low-power intervals when you are stationary or when your battery level drops below 20%.
                                    </Text>
                                </View>
                            </ScrollView>

                            <Pressable
                                onPress={() => setShowHelpModal(false)}
                                className="mt-4 rounded-2xl py-3 items-center active:opacity-85"
                                style={{ backgroundColor: colors.isDark ? '#1e293b' : 'rgba(15,23,42,0.06)' }}
                            >
                                <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.textPrimary }}>
                                    Dismiss
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>

                {/* ── Terms of Service Modal ── */}
                <Modal
                    animationType="fade"
                    transparent={true}
                    visible={showTermsModal}
                    onRequestClose={() => setShowTermsModal(false)}
                >
                    <View className="flex-1 items-center justify-center bg-black/60 px-6">
                        <View 
                            className="w-full max-w-[380px] overflow-hidden rounded-[32px] border p-6 shadow-2xl"
                            style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: colors.cardBorder }}
                        >
                            <View className="flex-row items-center justify-between border-b pb-4 mb-4" style={{ borderBottomColor: colors.cardBorder }}>
                                <View className="flex-row items-center">
                                    <Ionicons name="document-text-outline" size={20} color="#a78bfa" />
                                    <Text className="ml-2 text-base font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                        Terms of Service
                                    </Text>
                                </View>
                                <Pressable onPress={() => setShowTermsModal(false)} hitSlop={8}>
                                    <Ionicons name="close-outline" size={22} color={colors.textSecondary} />
                                </Pressable>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} className="max-h-[300px]">
                                <Text className="text-[10px] leading-relaxed" style={{ color: colors.textTertiary }}>
                                    By using GPS Tracks, you authorize the logging of geographic telemetry metrics on this device. Data collection is governed by a local-first privacy policy.
                                    {"\n\n"}
                                    1. Telemetry logs are stored locally. Syncing to the cloud is optional and secure.
                                    {"\n\n"}
                                    2. You retain full copyright and ownership of all location files, logs, and metadata.
                                    {"\n\n"}
                                    3. We do not sell, distribute, or share your tracking logs with third-party networks.
                                    {"\n\n"}
                                    4. You are solely responsible for checking your local laws regarding background location tracking.
                                </Text>
                            </ScrollView>

                            <Pressable
                                onPress={() => setShowTermsModal(false)}
                                className="mt-4 rounded-2xl py-3 items-center active:opacity-85"
                                style={{ backgroundColor: colors.isDark ? '#1e293b' : 'rgba(15,23,42,0.06)' }}
                            >
                                <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.textPrimary }}>
                                    Dismiss Terms
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </LinearGradient>
    );
}

