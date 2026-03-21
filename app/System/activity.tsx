import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useState } from 'react';

/* ── Mock Data ── */
const filters = ['All', 'This Week', 'This Month'];

const tracks = [
    {
        id: '1',
        name: 'Morning Jog – Riverside',
        date: 'Today, 6:32 AM',
        distance: '4.2 km',
        duration: '28 min',
        pace: "6'40\"/km",
        icon: 'walk-outline' as const,
        color: '#34d399',
    },
    {
        id: '2',
        name: 'Evening Bike Ride',
        date: 'Yesterday, 5:15 PM',
        distance: '12.8 km',
        duration: '45 min',
        pace: '17 km/h',
        icon: 'bicycle-outline' as const,
        color: '#60a5fa',
    },
    {
        id: '3',
        name: 'Weekend Hike – Mt. Trail',
        date: 'Mar 19, 8:00 AM',
        distance: '8.6 km',
        duration: '2h 10m',
        pace: "15'06\"/km",
        icon: 'footsteps-outline' as const,
        color: '#f59e0b',
    },
    {
        id: '4',
        name: 'City Walk – Downtown',
        date: 'Mar 18, 12:30 PM',
        distance: '3.1 km',
        duration: '35 min',
        pace: "11'17\"/km",
        icon: 'walk-outline' as const,
        color: '#a78bfa',
    },
    {
        id: '5',
        name: 'Park Loop Run',
        date: 'Mar 17, 7:00 AM',
        distance: '5.5 km',
        duration: '30 min',
        pace: "5'27\"/km",
        icon: 'fitness-outline' as const,
        color: '#fb7185',
    },
    {
        id: '6',
        name: 'Lake Trail Cycling',
        date: 'Mar 15, 4:00 PM',
        distance: '18.3 km',
        duration: '1h 5m',
        pace: '16.9 km/h',
        icon: 'bicycle-outline' as const,
        color: '#38bdf8',
    },
];

export default function Activity() {
    const [activeFilter, setActiveFilter] = useState('All');

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
                    <Text className="text-2xl font-bold text-white">Activity</Text>
                    <Text className="mt-1 text-sm text-slate-400">
                        Your recorded GPS tracks
                    </Text>
                </View>

                {/* ── Summary Bar ── */}
                <View className="mx-6 mt-4 flex-row rounded-2xl border border-white/10 bg-white/5 p-4">
                    <View className="flex-1 items-center">
                        <Text className="text-lg font-bold text-white">52.5</Text>
                        <Text className="text-xs text-slate-400">km total</Text>
                    </View>
                    <View className="w-px bg-white/10" />
                    <View className="flex-1 items-center">
                        <Text className="text-lg font-bold text-white">6</Text>
                        <Text className="text-xs text-slate-400">tracks</Text>
                    </View>
                    <View className="w-px bg-white/10" />
                    <View className="flex-1 items-center">
                        <Text className="text-lg font-bold text-white">5h 33m</Text>
                        <Text className="text-xs text-slate-400">active</Text>
                    </View>
                </View>

                {/* ── Filter Chips ── */}
                <View className="flex-row gap-2 px-6 pt-5">
                    {filters.map((filter) => (
                        <Pressable
                            key={filter}
                            onPress={() => setActiveFilter(filter)}
                            className={`rounded-full px-4 py-2 ${
                                activeFilter === filter
                                    ? 'bg-emerald-500'
                                    : 'border border-white/10 bg-white/5'
                            }`}
                        >
                            <Text
                                className={`text-xs font-semibold ${
                                    activeFilter === filter
                                        ? 'text-white'
                                        : 'text-slate-400'
                                }`}
                            >
                                {filter}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* ── Track List ── */}
                <View className="px-6 pt-5">
                    {tracks.map((track) => (
                        <Pressable
                            key={track.id}
                            className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4 active:bg-white/10"
                        >
                            <View className="flex-row items-center">
                                <View
                                    className="mr-4 h-11 w-11 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: track.color + '20' }}
                                >
                                    <Ionicons
                                        name={track.icon}
                                        size={22}
                                        color={track.color}
                                    />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-sm font-semibold text-white">
                                        {track.name}
                                    </Text>
                                    <Text className="mt-0.5 text-xs text-slate-400">
                                        {track.date}
                                    </Text>
                                </View>
                                <Ionicons
                                    name="chevron-forward"
                                    size={18}
                                    color="#475569"
                                />
                            </View>

                            {/* ── Track Meta Row ── */}
                            <View className="mt-3 flex-row border-t border-white/5 pt-3">
                                <View className="flex-1 flex-row items-center">
                                    <Ionicons
                                        name="resize-outline"
                                        size={13}
                                        color="#64748b"
                                    />
                                    <Text className="ml-1 text-xs text-slate-400">
                                        {track.distance}
                                    </Text>
                                </View>
                                <View className="flex-1 flex-row items-center">
                                    <Ionicons
                                        name="time-outline"
                                        size={13}
                                        color="#64748b"
                                    />
                                    <Text className="ml-1 text-xs text-slate-400">
                                        {track.duration}
                                    </Text>
                                </View>
                                <View className="flex-1 flex-row items-center">
                                    <Ionicons
                                        name="speedometer-outline"
                                        size={13}
                                        color="#64748b"
                                    />
                                    <Text className="ml-1 text-xs text-slate-400">
                                        {track.pace}
                                    </Text>
                                </View>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
