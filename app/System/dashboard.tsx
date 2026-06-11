/**
 * ============================================================================
 * MODULE: app/System/dashboard.tsx
 * LAYER: Presentation / Feature View Layer
 * DESCRIPTION: Renders the core user dashboard. Features summary statistics
 *              and switches to start/stop foreground and background location tracking.
 * ============================================================================
 */

import { useIntelligenceReport } from '@/hooks/useIntelligenceReport';
import { useLocationTracker } from '@/hooks/useLocationTracker';
import { useTheme } from '@/hooks/useTheme';
import { useTracks } from '@/hooks/useTracks';
import { getCurrentUser } from '@/services/authService';
import { type User } from '@/services/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import MapView, { PROVIDER_DEFAULT, Marker } from 'react-native-maps';

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
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const { report, source, refresh } = useIntelligenceReport();
    const { tracks, loading: tracksLoading, refresh: refreshTracks } = useTracks();
    const {
        isTracking,
        isBackgroundTracking,
        lastPing,
        error,
        distanceFromPrevious,
        stationaryTime,
        activePlace,
        speed,
        steps,
        savedSessionsCount,
        startTracking,
        stopTracking,
        startBackgroundTracking,
        stopBackgroundTracking,
    } = useLocationTracker();
    const { colors, isDark } = useTheme();

    useEffect(() => {
        getCurrentUser().then(setUser);
        refreshTracks();
    }, []);

    useEffect(() => {
        if (!isTracking) {
            refreshTracks();
        }
    }, [isTracking]);

    const totalDistance = tracks.reduce((sum, t) => sum + parseFloat(t.distance || '0'), 0);
    const totalMinutes = tracks.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
    const activeHours = (totalMinutes / 60).toFixed(1);
    const tracksCount = tracks.length;

    // Estimate total pedometer steps based on average stride length for walk/run icons
    const estimatedSteps = tracks.reduce((sum, t) => {
        const isFoot = (t.icon || '').includes('footsteps') || (t.icon || '').includes('walk') || t.name.toLowerCase().includes('walk') || t.name.toLowerCase().includes('run');
        if (isFoot) {
            return sum + Math.round(parseFloat(t.distance || '0') * 1320); // 1320 steps per km average
        }
        return sum;
    }, 0);

    const displayStats = [
        { label: 'Distance', value: totalDistance.toFixed(1), unit: 'km', icon: 'trail-sign-outline' as const, color: '#34d399' },
        { label: 'Active Time', value: activeHours, unit: 'hrs', icon: 'timer-outline' as const, color: '#60a5fa' },
        { label: 'Steps', value: estimatedSteps >= 1000 ? `${(estimatedSteps / 1000).toFixed(1)}k` : estimatedSteps.toString(), unit: 'steps', icon: 'footsteps-outline' as const, color: '#c084fc' },
        { label: 'Tracks', value: tracksCount.toString(), unit: 'total', icon: 'map-outline' as const, color: '#f59e0b' },
    ];

    // Grab the latest 3 tracks from the user's history
    const displayRecentTracks = tracks.slice(0, 3).map((t) => {
        let dateStr = '';
        try {
            const date = new Date(t.date);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
            if (diffDays === 0) {
                dateStr = 'Today, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } else if (diffDays === 1) {
                dateStr = 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } else {
                dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }
        } catch {
            dateStr = t.date;
        }

        return {
            id: t.id || Math.random().toString(),
            name: t.name,
            date: dateStr,
            distance: `${t.distance} km`,
            duration: `${t.duration_minutes} min`,
            icon: (t.icon || 'walk-outline') as any,
        };
    });

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
                                            <View className="mt-3 h-32 w-full overflow-hidden rounded-xl border shadow-sm" style={{ borderColor: colors.cardBorder }}>
                                                <MapView
                                                    provider={PROVIDER_DEFAULT}
                                                    style={{ flex: 1 }}
                                                    region={{
                                                        latitude: lastPing.latitude,
                                                        longitude: lastPing.longitude,
                                                        latitudeDelta: 0.005,
                                                        longitudeDelta: 0.005,
                                                    }}
                                                    userInterfaceStyle={isDark ? 'dark' : 'light'}
                                                    scrollEnabled={false}
                                                    zoomEnabled={false}
                                                >
                                                    <Marker
                                                        coordinate={{ latitude: lastPing.latitude, longitude: lastPing.longitude }}
                                                    >
                                                        <View className="h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow-md" />
                                                    </Marker>
                                                </MapView>
                                            </View>
                                        )}

                                        <View className="mt-4 flex-row items-center justify-between border-t pt-3" style={{ borderTopColor: colors.cardBorder }}>
                                            <View>
                                                <Text className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                                                    Duration
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
                                            <View className="items-center">
                                                <Text className="text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                                                    Steps
                                                </Text>
                                                <Text className="mt-0.5 text-xs font-extrabold" style={{ color: colors.textPrimary }}>
                                                    {steps || 0}
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
                <View className="flex-row flex-wrap justify-between px-6 pt-5" style={{ gap: 12 }}>
                    {displayStats.map((stat) => (
                        <View
                            key={stat.label}
                            className="rounded-2xl border p-4 shadow-sm"
                            style={{ 
                                backgroundColor: colors.cardBg, 
                                borderColor: colors.cardBorder,
                                width: '48%' // 2 columns layout
                            }}
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
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-sm font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>
                            Smart Insights
                        </Text>
                        <View className="flex-row items-center gap-1.5">
                            <Pressable onPress={() => router.push('/System/social')} className="flex-row items-center bg-violet-500/10 rounded-full px-2.5 py-1 border border-violet-500/20">
                                <Ionicons name="people" size={10} color="#8b5cf6" />
                                <Text className="ml-1 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: '#8b5cf6' }}>
                                    Leaderboard
                                </Text>
                            </Pressable>
                            <Pressable onPress={() => router.push('/System/achievements')} className="flex-row items-center bg-amber-500/10 rounded-full px-2.5 py-1 border border-amber-500/20">
                                <Ionicons name="trophy" size={10} color="#f59e0b" />
                                <Text className="ml-1 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: '#f59e0b' }}>
                                    Trophies
                                </Text>
                            </Pressable>
                        </View>
                    </View>
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
                        <Pressable onPress={() => router.push('/System/activity')}>
                            <Text className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.productivityText }}>
                                View all
                            </Text>
                        </Pressable>
                    </View>

                    {displayRecentTracks.length === 0 ? (
                        <View className="rounded-2xl border p-6" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                            <Text className="text-center text-xs font-semibold leading-normal" style={{ color: colors.textSecondary }}>
                                No tracks recorded yet. Start tracking above!
                            </Text>
                        </View>
                    ) : (
                        displayRecentTracks.map((track) => (
                            <Pressable
                                key={track.id}
                                onPress={() => router.push('/System/activity')}
                                className="mb-3 flex-row items-center rounded-2xl border p-4 shadow-sm active:opacity-80"
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
                        ))
                    )}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
