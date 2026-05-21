import { useIntelligenceReport } from '@/hooks/useIntelligenceReport';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { getCurrentUser } from '@/services/authService';
import { type User } from '@/services/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const stats = [
    { label: 'Distance', value: '48.2', unit: 'km', icon: 'trail-sign-outline' as const, color: '#34d399' },
    { label: 'Active Time', value: '5.4', unit: 'hrs', icon: 'timer-outline' as const, color: '#60a5fa' },
    { label: 'Tracks', value: '12', unit: 'total', icon: 'map-outline' as const, color: '#f59e0b' },
];

const recentTracks = [
    { id: '1', name: 'Morning Jog – Riverside', date: 'Today, 6:32 AM', distance: '4.2 km', duration: '28 min', icon: 'walk-outline' as const },
    { id: '2', name: 'Evening Bike Ride', date: 'Yesterday, 5:15 PM', distance: '12.8 km', duration: '45 min', icon: 'bicycle-outline' as const },
    { id: '3', name: 'Weekend Hike – Mt. Trail', date: 'Mar 19, 8:00 AM', distance: '8.6 km', duration: '2h 10m', icon: 'footsteps-outline' as const },
];

function getGreeting(): string {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
}

function formatSpeed(speedMS: number | null): string {
    if (speedMS === null || speedMS === undefined || speedMS < 0) return '0.0 km/h';
    const kmh = speedMS * 3.6;
    return `${kmh.toFixed(1)} km/h`;
}

function formatStationaryTime(seconds: number): string {
    if (seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) {
        return `${m}m ${s}s`;
    }
    return `${s}s`;
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const { report, source, refresh } = useIntelligenceReport();
    const {
        isTracking,
        isBackgroundTracking,
        lastPing,
        error,
        distanceFromPrevious,
        stationaryTime,
        activePlace,
        speed,
        savedSessionsCount,
        startTracking,
        stopTracking,
        startBackgroundTracking,
        stopBackgroundTracking,
    } = useLocationTracker();
    const { colors, isDark } = useTheme();

    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

    return (
        <LinearGradient
            colors={colors.bgGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            <ScrollView
                className="flex-1"
                contentContainerStyle={{ paddingBottom: 40 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="px-6 pb-4 pt-16">
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                                {getGreeting()}
                            </Text>
                            <Text className="mt-1 text-2xl font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                {user?.name ?? 'Explorer'}
                            </Text>
                        </View>
                        <View 
                            className="h-10 w-10 items-center justify-center rounded-xl border shadow-lg"
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                        >
                            <Ionicons name="person" size={16} color="#34d399" />
                        </View>
                    </View>
                </View>

                {/* Live Tracking Deck */}
                <View className="px-6">
                    <View 
                        className="overflow-hidden rounded-3xl border shadow-xl"
                        style={{ borderColor: isTracking ? 'rgba(16, 185, 129, 0.3)' : colors.cardBorder }}
                    >
                        <LinearGradient
                            colors={isTracking 
                                ? (isDark ? ['#022c22', '#064e3b', '#022c22'] : ['#e6fbf4', '#d1fae5', '#e6fbf4'])
                                : (isDark ? ['#1e1b4b', '#111827', '#030712'] : ['#e0e7ff', '#ffffff', '#e0e7ff'])
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ padding: 24, minHeight: 180 }}
                        >
                            {/* Map overlay pattern globe */}
                            <View className="absolute right-[-20] top-[-20] opacity-10">
                                <Ionicons name="globe-outline" size={140} color={isDark ? '#fff' : 'rgba(15,23,42,0.15)'} />
                            </View>

                            <View className="z-10">
                                <View className="mb-3 flex-row items-center justify-between">
                                    <View className="flex-row items-center">
                                        <View className={`h-2 w-2 rounded-full mr-2 ${isTracking ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
                                        <Text className={`text-xs font-extrabold uppercase tracking-widest ${isTracking ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                            {isTracking ? 'Recording Live GPS' : 'GPS Core'}
                                        </Text>
                                    </View>
                                    {isBackgroundTracking && (
                                        <View 
                                            className="flex-row items-center rounded-lg border px-2.5 py-0.5"
                                            style={{ backgroundColor: colors.aiBg, borderColor: colors.aiBorder }}
                                        >
                                            <Ionicons name="moon-outline" size={10} color={colors.aiText} />
                                            <Text className="ml-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.aiText }}>Background On</Text>
                                        </View>
                                    )}
                                </View>

                                <Text className="mb-1 text-2xl font-black leading-none" style={{ color: colors.textPrimary }}>
                                    {isTracking ? 'Active Session' : 'Ready to Explore?'}
                                </Text>
                                <Text className="mb-4 text-xs leading-normal" style={{ color: colors.textSecondary }}>
                                    {isTracking 
                                        ? 'Your route and spatial footprint are currently being stored in your local logs.'
                                        : 'Start a new GPS track to map your physical habits and spatial productivity.'}
                                </Text>

                                {isTracking && (
                                    <View className="mb-4 rounded-2xl border p-4 shadow-sm" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                                        <View className="mb-2 flex-row items-center justify-between">
                                            <Text className="text-[10px] font-black uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                                                Active Stay Dwell
                                            </Text>
                                            <View className="flex-row items-center rounded-full px-2 py-0.5" style={{ backgroundColor: colors.aiBadgeBg }}>
                                                <View className={`h-1.5 w-1.5 rounded-full mr-1.5 ${stationaryTime > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                                <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.aiBadgeText }}>
                                                    {stationaryTime > 0 ? 'Stationary' : 'Moving'}
                                                </Text>
                                            </View>
                                        </View>

                                        <Text className="text-lg font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                            {activePlace || 'Resolving position...'}
                                        </Text>

                                        {!!lastPing && (
                                            <Text className="mt-1 text-[10px]" style={{ color: colors.textTertiary }}>
                                                ({lastPing.latitude.toFixed(4)}, {lastPing.longitude.toFixed(4)})
                                            </Text>
                                        )}

                                        <View className="mt-4 flex-row items-center justify-between border-t pt-3" style={{ borderTopColor: colors.cardBorder }}>
                                            <View>
                                                <Text className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                                                    Dwell Duration
                                                </Text>
                                                <Text className="mt-0.5 text-xs font-extrabold" style={{ color: colors.textPrimary }}>
                                                    {stationaryTime > 0 ? formatStationaryTime(stationaryTime) : '0s'}
                                                </Text>
                                            </View>
                                            <View className="items-center">
                                                <Text className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                                                    Speed
                                                </Text>
                                                <Text className="mt-0.5 text-xs font-extrabold" style={{ color: colors.textPrimary }}>
                                                    {formatSpeed(speed)}
                                                </Text>
                                            </View>
                                            <View className="items-end">
                                                <Text className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                                                    Saved Visits
                                                </Text>
                                                <Text className="mt-0.5 text-xs font-extrabold text-emerald-400">
                                                    {savedSessionsCount}
                                                </Text>
                                            </View>
                                        </View>
                                        
                                        <View className="mt-3 flex-row items-center justify-between border-t pt-2" style={{ borderTopColor: colors.cardBorder }}>
                                            <Text className="text-[9px] font-bold" style={{ color: colors.textTertiary }}>
                                                Last Step Delta: {distanceFromPrevious.toFixed(1)} meters
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {!!error && (
                                    <View 
                                        className="mb-4 flex-row items-center rounded-xl border px-3 py-2 self-start"
                                        style={{ backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }}
                                    >
                                        <Ionicons name="alert-circle" size={12} color={colors.dangerText} />
                                        <Text className="ml-1.5 text-[10px] font-bold" style={{ color: colors.dangerText }}>
                                            {error}
                                        </Text>
                                    </View>
                                )}

                                <View className="flex-row flex-wrap gap-2 pt-2">
                                    <Pressable
                                        onPress={isTracking ? stopTracking : startTracking}
                                        className={`flex-row items-center rounded-xl px-5 py-3 ${
                                            isTracking
                                                ? 'bg-rose-500 active:bg-rose-600'
                                                : 'bg-emerald-500 active:bg-emerald-600'
                                        }`}
                                    >
                                        <Ionicons
                                            name={isTracking ? 'stop-circle-outline' : 'navigate-sharp'}
                                            size={16}
                                            color="#fff"
                                        />
                                        <Text className="ml-2 text-xs font-black uppercase tracking-wider text-white">
                                            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={
                                            isBackgroundTracking
                                                ? stopBackgroundTracking
                                                : startBackgroundTracking
                                        }
                                        className="flex-row items-center rounded-xl px-4 py-3 border"
                                        style={{
                                            backgroundColor: isBackgroundTracking ? colors.aiBg : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'),
                                            borderColor: isBackgroundTracking ? colors.aiBorder : colors.cardBorder
                                        }}
                                    >
                                        <Ionicons
                                            name={
                                                isBackgroundTracking
                                                    ? 'pause-circle-outline'
                                                    : 'moon-outline'
                                            }
                                            size={14}
                                            color={colors.textSecondary}
                                        />
                                        <Text className="ml-1.5 text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                            {isBackgroundTracking ? 'Stop BG GPS' : 'Background GPS'}
                                        </Text>
                                    </Pressable>
                                </View>

                                <View className="mt-4 flex-row items-center justify-between border-t pt-3" style={{ borderTopColor: colors.cardBorder }}>
                                    <Text className="text-[10px]" style={{ color: colors.textTertiary }}>
                                        Source: {source === 'live' ? 'Live tracked data' : 'Demo data'}
                                    </Text>
                                    <Pressable
                                        onPress={refresh}
                                        className="flex-row items-center rounded-lg border px-2.5 py-1"
                                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                                    >
                                        <Ionicons name="refresh-outline" size={11} color={colors.textSecondary} />
                                        <Text className="ml-1 text-[10px] font-bold" style={{ color: colors.textSecondary }}>
                                            Sync Insights
                                        </Text>
                                    </Pressable>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                </View>

                {/* Quick Stats Grid */}
                <View className="flex-row gap-3 px-6 pt-5">
                    {stats.map((stat) => (
                        <View
                            key={stat.label}
                            className="flex-1 rounded-2xl border p-4 shadow-sm"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                        >
                            <View
                                className="mb-3 h-8 w-8 items-center justify-center rounded-lg"
                                style={{ backgroundColor: stat.color + '15' }}
                            >
                                <Ionicons name={stat.icon} size={16} color={stat.color} />
                            </View>
                            <Text className="text-xl font-black tracking-tight leading-none" style={{ color: colors.textPrimary }}>
                                {stat.value}
                            </Text>
                            <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                                {stat.unit} · {stat.label}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Smart Insights */}
                <View className="px-6 pt-6">
                    <Text className="mb-3 text-sm font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>
                        Smart Insights
                    </Text>
                    <View 
                        className="mb-3 rounded-2xl border p-4 flex-row items-center justify-between"
                        style={{ backgroundColor: colors.productivityBg, borderColor: colors.productivityBorder }}
                    >
                        <View className="flex-1 mr-4">
                            <Text className="text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.productivityText }}>
                                Productivity Score
                            </Text>
                            <Text className="mt-0.5 text-xs leading-normal" style={{ color: colors.productivitySub }}>
                                Non-productive spatial window is minimal at {report.productivity.nonProductivePercent}%.
                            </Text>
                        </View>
                        <View 
                            className="h-12 w-12 items-center justify-center rounded-xl border"
                            style={{ backgroundColor: colors.productivityBg, borderColor: colors.productivityBorder }}
                        >
                            <Text className="text-base font-black" style={{ color: colors.productivityText }}>
                                {report.productivity.score}
                            </Text>
                        </View>
                    </View>
                    
                    {report.patterns.slice(0, 2).map((pattern) => (
                        <View
                            key={pattern.message}
                            className="mb-3 flex-row items-center rounded-2xl border p-4"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                        >
                            <Ionicons name="trending-up-outline" size={16} color="#818cf8" />
                            <Text className="flex-1 text-xs leading-normal ml-3" style={{ color: colors.textSecondary }}>{pattern.message}</Text>
                        </View>
                    ))}
                </View>

                {/* Recent Tracks */}
                <View className="px-6 pt-6">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-sm font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>
                            Recent Tracks
                        </Text>
                        <Pressable>
                            <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.productivityText }}>
                                View all
                            </Text>
                        </Pressable>
                    </View>

                    {recentTracks.map((track) => (
                        <Pressable
                            key={track.id}
                            className="mb-3 flex-row items-center rounded-2xl border p-4 shadow-sm"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                        >
                            <View 
                                className="mr-4 h-10 w-10 items-center justify-center rounded-xl border"
                                style={{ backgroundColor: colors.productivityBg, borderColor: colors.productivityBorder }}
                            >
                                <Ionicons name={track.icon} size={20} color={colors.productivityText} />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-bold tracking-tight leading-snug" style={{ color: colors.textPrimary }}>
                                    {track.name}
                                </Text>
                                <Text className="mt-0.5 text-[10px]" style={{ color: colors.textTertiary }}>
                                    {track.date}
                                </Text>
                            </View>
                            <View className="items-end ml-2">
                                <Text className="text-sm font-black leading-none" style={{ color: colors.textPrimary }}>
                                    {track.distance}
                                </Text>
                                <Text className="mt-1 text-[10px] font-bold" style={{ color: colors.textTertiary }}>
                                    {track.duration}
                                </Text>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
