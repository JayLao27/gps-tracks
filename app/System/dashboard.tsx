import { getCurrentUser } from '@/services/authService';
import { type User } from '@/services/database';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

/* ── Mock Data ── */
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

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        getCurrentUser().then(setUser);
    }, []);

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
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-sm tracking-wide text-slate-400">
                                {getGreeting()}, {user?.name ?? 'Explorer'} 👋
                            </Text>
                            <Text className="mt-1 text-2xl font-bold text-white">
                                Dashboard
                            </Text>
                        </View>
                        <View className="h-11 w-11 items-center justify-center rounded-full bg-emerald-500/20">
                            <Ionicons name="person-outline" size={22} color="#34d399" />
                        </View>
                    </View>
                </View>

                {/* ── Map Preview Card ── */}
                <View className="px-6 pt-4">
                    <View className="overflow-hidden rounded-3xl border border-white/10">
                        <LinearGradient
                            colors={['#065f46', '#0f766e', '#164e63']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ padding: 24, minHeight: 180 }}
                        >
                            {/* Map overlay pattern dots */}
                            <View className="absolute right-4 top-4 opacity-20">
                                <Ionicons name="globe-outline" size={100} color="#fff" />
                            </View>

                            <View className="z-10">
                                <View className="mb-2 flex-row items-center">
                                    <Ionicons name="location" size={16} color="#34d399" />
                                    <Text className="ml-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300">
                                        Live Tracking
                                    </Text>
                                </View>
                                <Text className="mb-1 text-xl font-bold text-white">
                                    Ready to explore?
                                </Text>
                                <Text className="mb-5 text-sm text-white/60">
                                    Start a new GPS track and record your route in real-time.
                                </Text>

                                <Pressable className="flex-row items-center self-start rounded-xl bg-emerald-500 px-5 py-3 active:bg-emerald-600">
                                    <Ionicons name="navigate" size={18} color="#fff" />
                                    <Text className="ml-2 text-sm font-bold text-white">
                                        Start Tracking
                                    </Text>
                                </Pressable>
                            </View>
                        </LinearGradient>
                    </View>
                </View>

                {/* ── Stats Row ── */}
                <View className="flex-row gap-3 px-6 pt-5">
                    {stats.map((stat) => (
                        <View
                            key={stat.label}
                            className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                            <View
                                className="mb-3 h-9 w-9 items-center justify-center rounded-xl"
                                style={{ backgroundColor: stat.color + '20' }}
                            >
                                <Ionicons name={stat.icon} size={18} color={stat.color} />
                            </View>
                            <Text className="text-xl font-bold text-white">
                                {stat.value}
                            </Text>
                            <Text className="mt-0.5 text-xs text-slate-400">
                                {stat.unit} · {stat.label}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* ── Recent Tracks ── */}
                <View className="px-6 pt-6">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-lg font-bold text-white">
                            Recent Tracks
                        </Text>
                        <Pressable>
                            <Text className="text-xs font-semibold text-emerald-400">
                                View all
                            </Text>
                        </Pressable>
                    </View>

                    {recentTracks.map((track) => (
                        <Pressable
                            key={track.id}
                            className="mb-3 flex-row items-center rounded-2xl border border-white/10 bg-white/5 p-4 active:bg-white/10"
                        >
                            <View className="mr-4 h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15">
                                <Ionicons name={track.icon} size={22} color="#34d399" />
                            </View>
                            <View className="flex-1">
                                <Text className="text-sm font-semibold text-white">
                                    {track.name}
                                </Text>
                                <Text className="mt-0.5 text-xs text-slate-400">
                                    {track.date}
                                </Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-sm font-bold text-white">
                                    {track.distance}
                                </Text>
                                <Text className="mt-0.5 text-xs text-slate-500">
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
