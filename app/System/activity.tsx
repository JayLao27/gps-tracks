import { useTracks } from '@/hooks/useTracks';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

const filters = ['All', 'This Week', 'This Month'];

export default function Activity() {
    const [activeFilter, setActiveFilter] = useState('All');
    const { tracks, loading, error, refresh } = useTracks();

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
                <View className="px-6 pb-2 pt-16">
                    <Text className="text-2xl font-bold text-white">Activity</Text>
                    <Text className="mt-1 text-sm text-slate-400">
                        Your recorded GPS tracks
                    </Text>
                    <Pressable
                        onPress={refresh}
                        className="mt-3 self-start rounded-xl border border-white/20 px-3 py-2"
                    >
                        <Text className="text-xs font-semibold text-slate-300">
                            {loading ? 'Loading...' : 'Refresh'}
                        </Text>
                    </Pressable>
                </View>

                <View className="mx-6 mt-4 flex-row rounded-2xl border border-white/10 bg-white/5 p-4">
                    <View className="flex-1 items-center">
                        <Text className="text-lg font-bold text-white">
                            {(tracks.reduce((sum, t) => sum + parseFloat(t.distance || '0'), 0)).toFixed(1)}
                        </Text>
                        <Text className="text-xs text-slate-400">km total</Text>
                    </View>
                    <View className="w-px bg-white/10" />
                    <View className="flex-1 items-center">
                        <Text className="text-lg font-bold text-white">{tracks.length}</Text>
                        <Text className="text-xs text-slate-400">tracks</Text>
                    </View>
                    <View className="w-px bg-white/10" />
                    <View className="flex-1 items-center">
                        <Text className="text-lg font-bold text-white">
                            {(() => {
                                const totalMinutes = tracks.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
                                const hours = Math.floor(totalMinutes / 60);
                                const mins = totalMinutes % 60;
                                return `${hours}h ${mins}m`;
                            })()}
                        </Text>
                        <Text className="text-xs text-slate-400">active</Text>
                    </View>
                </View>

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

                <View className="px-6 pt-5">
                    {loading ? (
                        <View className="items-center justify-center py-8">
                            <ActivityIndicator size="large" color="#34d399" />
                        </View>
                    ) : error ? (
                        <View className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
                            <Text className="text-sm text-red-400">{error}</Text>
                        </View>
                    ) : tracks.length === 0 ? (
                        <View className="rounded-2xl border border-white/10 bg-white/5 p-6">
                            <Text className="text-center text-sm text-slate-300">No tracks yet. Start tracking to see your activities here.</Text>
                        </View>
                    ) : (
                        tracks.map((track) => (
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
                                            name={track.icon as any}
                                            size={22}
                                            color={track.color}
                                        />
                                    </View>
                                    <View className="flex-1">
                                        <Text className="text-sm font-semibold text-white">
                                            {track.name}
                                        </Text>
                                        <Text className="mt-0.5 text-xs text-slate-400">
                                            {new Date(track.date).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                    </View>
                                    <Ionicons
                                        name="chevron-forward"
                                        size={18}
                                        color="#475569"
                                    />
                                </View>

                                <View className="mt-3 flex-row border-t border-white/5 pt-3">
                                    <View className="flex-1 flex-row items-center">
                                        <Ionicons
                                            name="resize-outline"
                                            size={13}
                                            color="#64748b"
                                        />
                                        <Text className="ml-1 text-xs text-slate-400">
                                            {track.distance} km
                                        </Text>
                                    </View>
                                    <View className="flex-1 flex-row items-center">
                                        <Ionicons
                                            name="time-outline"
                                            size={13}
                                            color="#64748b"
                                        />
                                        <Text className="ml-1 text-xs text-slate-400">
                                            {track.duration_minutes} min
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
                        ))
                    )}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
