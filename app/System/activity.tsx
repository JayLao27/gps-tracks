// TODO: FUTURE ACTIVITY & ROUTE ENHANCEMENTS:
// 1. Detailed Map Replay: Support opening a detailed model drawing the full GPS route breadcrumb trail
//    on an interactive map with zoom and scrub controls.
// 2. Activity Type Filtering: Extend filter pill capsules to filter by "Walk", "Run", or "Ride"
//    in addition to time ranges, using appropriate icons.
// 3. Telemetry Search: Add a text query input to search recorded sessions by location name or notes.

import { useTracks } from '@/hooks/useTracks';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const filters = ['All', 'This Week', 'This Month'];

export default function Activity() {
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const { tracks, loading, error, refresh } = useTracks();
    const { colors, isDark } = useTheme();

    // Dynamically filter tracks based on period selection and text search query
    const filteredTracks = tracks.filter((track) => {
        // 1. Search query matching
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const nameMatch = track.name.toLowerCase().includes(query);
            const paceMatch = track.pace?.toLowerCase().includes(query);
            if (!nameMatch && !paceMatch) return false;
        }

        // 2. Time period matching
        if (activeFilter === 'All') return true;

        try {
            const trackDate = new Date(track.date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - trackDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (activeFilter === 'This Week') {
                return diffDays <= 7;
            }
            if (activeFilter === 'This Month') {
                return diffDays <= 30;
            }
        } catch {
            return true;
        }
        return true;
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
                contentContainerStyle={{ paddingBottom: 48 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View className="px-6 pb-2 pt-16">
                    <Text className="text-2xl font-black tracking-tight" style={{ color: colors.textPrimary }}>Activity</Text>
                    <Text className="mt-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                        Your recorded GPS tracks and footprints
                    </Text>
                    <Pressable
                        onPress={refresh}
                        className="mt-3.5 self-start rounded-xl border px-3.5 py-1.5"
                        style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                    >
                        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                            {loading ? 'Syncing...' : 'Force Refresh'}
                        </Text>
                    </Pressable>
                </View>

                {/* Unified Glass Metrics Panel */}
                <View 
                    className="mx-6 mt-4 flex-row rounded-3xl border p-5 shadow-lg"
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                >
                    <View className="flex-1 items-center">
                        <Text className="text-xl font-black" style={{ color: colors.textPrimary }}>
                            {(tracks.reduce((sum, t) => sum + parseFloat(t.distance || '0'), 0)).toFixed(1)}
                        </Text>
                        <Text className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: colors.textTertiary }}>km total</Text>
                    </View>
                    <View className="w-px my-1" style={{ backgroundColor: colors.cardBorder }} />
                    <View className="flex-1 items-center">
                        <Text className="text-xl font-black" style={{ color: colors.textPrimary }}>{tracks.length}</Text>
                        <Text className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: colors.textTertiary }}>tracks</Text>
                    </View>
                    <View className="w-px my-1" style={{ backgroundColor: colors.cardBorder }} />
                    <View className="flex-1 items-center">
                        <Text className="text-xl font-black" style={{ color: colors.textPrimary }}>
                            {(() => {
                                const totalMinutes = tracks.reduce((sum, t) => sum + (t.duration_minutes || 0), 0);
                                const hours = Math.floor(totalMinutes / 60);
                                const mins = totalMinutes % 60;
                                return `${hours}h ${mins}m`;
                            })()}
                        </Text>
                        <Text className="text-[9px] font-bold uppercase tracking-wider mt-1" style={{ color: colors.textTertiary }}>active</Text>
                    </View>
                </View>

                {/* Search Bar */}
                <View className="px-6 pt-5">
                    <View 
                        className="flex-row items-center rounded-2xl border px-3.5 py-2"
                        style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                    >
                        <Ionicons name="search-outline" size={14} color={colors.textTertiary} />
                        <TextInput
                            className="ml-2.5 flex-1 text-xs font-semibold"
                            style={{ color: colors.textPrimary, paddingVertical: 4 }}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Search tracks by name..."
                            placeholderTextColor={colors.textTertiary}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchQuery !== '' && (
                            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                                <Ionicons name="close-circle" size={15} color={colors.textTertiary} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Filter Pill Capsules */}
                <View className="flex-row gap-2 px-6 pt-6">
                    {filters.map((filter) => {
                        const isSelected = activeFilter === filter;
                        return (
                            <Pressable
                                key={filter}
                                onPress={() => setActiveFilter(filter)}
                                className="rounded-full px-4 py-2 border"
                                style={{
                                    backgroundColor: isSelected ? colors.productivityBg : colors.cardBg,
                                    borderColor: isSelected ? colors.productivityBorder : colors.cardBorder,
                                }}
                            >
                                <Text
                                    className="text-xs font-bold uppercase tracking-wider"
                                    style={{ color: isSelected ? colors.productivityText : colors.textSecondary }}
                                >
                                    {filter}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>

                {/* Activity List */}
                <View className="px-6 pt-5">
                    {loading ? (
                        <View className="items-center justify-center py-12">
                            <ActivityIndicator size="large" color="#10b981" />
                        </View>
                    ) : error ? (
                        <View className="rounded-2xl border p-4" style={{ backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }}>
                            <Text className="text-sm font-semibold" style={{ color: colors.dangerText }}>{error}</Text>
                        </View>
                    ) : tracks.length === 0 ? (
                        <View className="rounded-2xl border p-6" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                            <Text className="text-center text-xs font-semibold leading-normal" style={{ color: colors.textSecondary }}>
                                No tracks recorded yet. Start tracking from the dashboard to see them here!
                            </Text>
                        </View>
                    ) : filteredTracks.length === 0 ? (
                        <View className="rounded-2xl border p-6" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                            <Text className="text-center text-xs font-semibold leading-normal" style={{ color: colors.textSecondary }}>
                                No tracks match your current search and filters.
                            </Text>
                        </View>
                    ) : (
                        filteredTracks.map((track) => {
                            // Dynamic color border glowing and categorizing
                            const trackColor = track.color || '#34d399';
                            return (
                                <Pressable
                                    key={track.id}
                                    style={{
                                        backgroundColor: colors.cardBg,
                                        borderColor: trackColor + '40',
                                        borderWidth: 1,
                                    }}
                                    className="mb-3.5 rounded-2xl p-4 active:bg-slate-800/40 shadow-sm"
                                >
                                    <View className="flex-row items-center">
                                        <View
                                            className="mr-3.5 h-11 w-11 items-center justify-center rounded-xl border"
                                            style={{ 
                                                backgroundColor: trackColor + '15',
                                                borderColor: trackColor + '30'
                                            }}
                                        >
                                            <Ionicons
                                                name={track.icon as any}
                                                size={20}
                                                color={trackColor}
                                            />
                                        </View>
                                        <View className="flex-1">
                                            <Text className="text-sm font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                                {track.name}
                                            </Text>
                                            <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ color: colors.textTertiary }}>
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
                                            size={16}
                                            color={colors.textTertiary}
                                        />
                                    </View>

                                    <View className="mt-3 flex-row border-t pt-3" style={{ borderTopColor: colors.cardBorder, borderTopWidth: 1 }}>
                                        <View className="flex-1 flex-row items-center">
                                            <Ionicons
                                                name="resize-outline"
                                                size={13}
                                                color={colors.textTertiary}
                                            />
                                            <Text className="ml-1.5 text-xs font-bold" style={{ color: colors.textSecondary }}>
                                                {track.distance} km
                                            </Text>
                                        </View>
                                        <View className="flex-1 flex-row items-center">
                                            <Ionicons
                                                name="time-outline"
                                                size={13}
                                                color={colors.textTertiary}
                                            />
                                            <Text className="ml-1.5 text-xs font-bold" style={{ color: colors.textSecondary }}>
                                                {track.duration_minutes} min
                                            </Text>
                                        </View>
                                        <View className="flex-1 flex-row items-center">
                                            <Ionicons
                                                name="speedometer-outline"
                                                size={13}
                                                color={colors.textTertiary}
                                            />
                                            <Text className="ml-1.5 text-xs font-bold" style={{ color: colors.textSecondary }}>
                                                {track.pace}
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
