/**
 * ============================================================================
 * MODULE: app/System/activity.tsx
 * LAYER: Presentation / Feature View Layer
 * DESCRIPTION: Renders the historical GPS tracking feed, filters activities by
 *              type and window, and opens interactive detail modals for telemetry.
 * ============================================================================
 */

import { useTracks } from '@/hooks/useTracks';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, Modal, Alert } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { type Track, deleteTrack } from '@/services/database';

const filters = ['All', 'This Week', 'This Month'];
const typeFilters = ['All Types', 'Walks', 'Runs', 'Rides'];

export default function Activity() {
    const [activeFilter, setActiveFilter] = useState('All');
    const [activeTypeFilter, setActiveTypeFilter] = useState('All Types');
    const [searchQuery, setSearchQuery] = useState('');
    const { tracks, loading, error, refresh } = useTracks();
    const { colors, isDark } = useTheme();
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const handleDeleteTrack = async (trackId: string) => {
        Alert.alert(
            "Delete Track",
            "Are you sure you want to permanently delete this track?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: async () => {
                        setDeleteLoading(true);
                        try {
                            const success = await deleteTrack(trackId);
                            if (success) {
                                setSelectedTrack(null);
                                refresh();
                            } else {
                                Alert.alert("Error", "Failed to delete the track.");
                            }
                        } catch {
                            Alert.alert("Error", "An error occurred while deleting.");
                        } finally {
                            setDeleteLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Dynamically filter tracks based on period selection, activity type, and text search query
    const filteredTracks = tracks.filter((track) => {
        // 1. Search query matching
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            const nameMatch = track.name.toLowerCase().includes(query);
            const paceMatch = track.pace?.toLowerCase().includes(query);
            if (!nameMatch && !paceMatch) return false;
        }

        // 2. Activity type matching
        if (activeTypeFilter !== 'All Types') {
            const icon = (track.icon || '').toLowerCase();
            const name = (track.name || '').toLowerCase();
            if (activeTypeFilter === 'Walks') {
                if (!icon.includes('footsteps') && !name.includes('walk') && !name.includes('hike')) return false;
            } else if (activeTypeFilter === 'Runs') {
                if (!icon.includes('walk') && !name.includes('run') && !name.includes('jog')) return false;
            } else if (activeTypeFilter === 'Rides') {
                if (!icon.includes('bicycle') && !name.includes('ride') && !name.includes('cycle')) return false;
            }
        }

        // 3. Time period matching
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

                {/* Activity Type Pill Capsules */}
                <View className="flex-row gap-2 px-6 pt-2">
                    {typeFilters.map((filter) => {
                        const isSelected = activeTypeFilter === filter;
                        return (
                            <Pressable
                                key={filter}
                                onPress={() => setActiveTypeFilter(filter)}
                                className="rounded-full px-4.5 py-1.5 border"
                                style={{
                                    backgroundColor: isSelected ? colors.aiBg : colors.cardBg,
                                    borderColor: isSelected ? colors.aiBorder : colors.cardBorder,
                                }}
                            >
                                <Text
                                    className="text-[10px] font-extrabold uppercase tracking-wider"
                                    style={{ color: isSelected ? colors.aiText : colors.textTertiary }}
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
                                    onPress={() => setSelectedTrack(track)}
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

            {/* Track Detail Modal */}
            <Modal
                visible={selectedTrack !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedTrack(null)}
            >
                <View className="flex-1 justify-end bg-black/60">
                    <View 
                        className="rounded-t-3xl border-t p-6 pb-10"
                        style={{ 
                            backgroundColor: isDark ? '#0f172a' : '#ffffff', 
                            borderColor: colors.cardBorder,
                            maxHeight: '85%'
                        }}
                    >
                        {selectedTrack && (() => {
                            const trackColor = selectedTrack.color || '#34d399';
                            
                            // Estimate steps
                            const isFoot = (selectedTrack.icon || '').includes('footsteps') || (selectedTrack.icon || '').includes('walk') || selectedTrack.name.toLowerCase().includes('walk') || selectedTrack.name.toLowerCase().includes('run');
                            const estimatedStepsCount = isFoot ? Math.round(parseFloat(selectedTrack.distance || '0') * 1320) : 0;
                            
                            // Estimate Calories burned
                            let caloriesPerMin = 6;
                            if ((selectedTrack.icon || '').includes('walk') || (selectedTrack.icon || '').includes('footsteps')) caloriesPerMin = 5;
                            else if ((selectedTrack.icon || '').includes('run')) caloriesPerMin = 11;
                            else if ((selectedTrack.icon || '').includes('bicycle')) caloriesPerMin = 8;
                            const estimatedCalories = selectedTrack.duration_minutes * caloriesPerMin;

                            return (
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    {/* Modal Handle */}
                                    <View className="w-12 h-1.5 rounded-full bg-slate-500/30 self-center mb-6" />

                                    {/* Modal Header */}
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-row items-center flex-1 mr-4">
                                            <View 
                                                className="h-12 w-12 items-center justify-center rounded-2xl border mr-4"
                                                style={{ 
                                                    backgroundColor: trackColor + '15',
                                                    borderColor: trackColor + '30'
                                                }}
                                            >
                                                <Ionicons name={selectedTrack.icon as any} size={24} color={trackColor} />
                                            </View>
                                            <View className="flex-1">
                                                <Text className="text-lg font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                                    {selectedTrack.name}
                                                </Text>
                                                <Text className="text-[10px] font-bold uppercase tracking-wider mt-0.5" style={{ color: colors.textTertiary }}>
                                                    {new Date(selectedTrack.date).toLocaleDateString('en-US', {
                                                        weekday: 'long',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </Text>
                                            </View>
                                        </View>
                                        <Pressable 
                                            onPress={() => setSelectedTrack(null)}
                                            className="p-2 rounded-xl bg-slate-500/10 active:bg-slate-500/20"
                                        >
                                            <Ionicons name="close" size={20} color={colors.textSecondary} />
                                        </Pressable>
                                    </View>

                                    {/* Simulated Route Visualizer / abstract mini map path */}
                                    <View 
                                        className="h-44 w-full rounded-2xl border my-6 items-center justify-center overflow-hidden"
                                        style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(15,23,42,0.02)', borderColor: colors.cardBorder }}
                                    >
                                        {/* Background Grid Lines for Technical styling */}
                                        <View className="absolute inset-0 opacity-10 flex-col justify-between p-4">
                                            <View className="h-px w-full bg-slate-500" />
                                            <View className="h-px w-full bg-slate-500" />
                                            <View className="h-px w-full bg-slate-500" />
                                            <View className="h-px w-full bg-slate-500" />
                                        </View>
                                        <View className="absolute inset-0 opacity-10 flex-row justify-between p-4">
                                            <View className="w-px h-full bg-slate-500" />
                                            <View className="w-px h-full bg-slate-500" />
                                            <View className="w-px h-full bg-slate-500" />
                                            <View className="w-px h-full bg-slate-500" />
                                        </View>

                                        {/* Abstract route path using styled dots/lines */}
                                        <View className="relative w-4/5 h-24 justify-center items-center">
                                            {/* Stylized route shape */}
                                            <View 
                                                className="absolute border-dashed border-2 rounded-full opacity-30" 
                                                style={{ width: '80%', height: '80%', borderColor: trackColor, transform: [{ rotate: '45deg' }] }} 
                                            />
                                            {/* Start and end node points */}
                                            <View 
                                                className="absolute h-3 w-3 rounded-full border bg-emerald-400 items-center justify-center" 
                                                style={{ top: '10%', left: '10%', borderColor: '#ffffff' }}
                                            >
                                                <View className="h-1.5 w-1.5 bg-white rounded-full" />
                                            </View>
                                            <View 
                                                className="absolute h-3 w-3 rounded-full border bg-rose-400 items-center justify-center" 
                                                style={{ bottom: '10%', right: '15%', borderColor: '#ffffff' }}
                                            >
                                                <View className="h-1.5 w-1.5 bg-white rounded-full" />
                                            </View>
                                            
                                            {/* Pulsing indicator along the track path */}
                                            <View 
                                                className="absolute h-5 w-5 rounded-full items-center justify-center" 
                                                style={{ top: '48%', left: '60%', backgroundColor: trackColor + '20' }}
                                            >
                                                <View className="h-2 w-2 rounded-full" style={{ backgroundColor: trackColor }} />
                                            </View>

                                            <Text className="absolute bottom-1 left-2 text-[8px] font-bold uppercase tracking-widest text-emerald-400">START</Text>
                                            <Text className="absolute top-1 right-2 text-[8px] font-bold uppercase tracking-widest text-rose-400">FINISH</Text>
                                        </View>

                                        {/* Overlay Telemetry Metadata */}
                                        <View className="absolute bottom-3 right-3 bg-black/60 rounded-lg px-2 py-0.5 border border-white/10">
                                            <Text className="text-[8px] font-extrabold uppercase text-white tracking-widest">
                                                Telemetry Active
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Stats grid */}
                                    <View className="flex-row flex-wrap justify-between gap-y-3">
                                        {/* Distance */}
                                        <View className="p-4 rounded-2xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, width: '48.5%' }}>
                                            <View className="flex-row items-center mb-1">
                                                <Ionicons name="resize-outline" size={14} color={colors.textTertiary} />
                                                <Text className="ml-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Distance</Text>
                                            </View>
                                            <Text className="text-lg font-black" style={{ color: colors.textPrimary }}>{selectedTrack.distance} km</Text>
                                        </View>

                                        {/* Duration */}
                                        <View className="p-4 rounded-2xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, width: '48.5%' }}>
                                            <View className="flex-row items-center mb-1">
                                                <Ionicons name="time-outline" size={14} color={colors.textTertiary} />
                                                <Text className="ml-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Duration</Text>
                                            </View>
                                            <Text className="text-lg font-black" style={{ color: colors.textPrimary }}>{selectedTrack.duration_minutes} min</Text>
                                        </View>

                                        {/* Pace */}
                                        <View className="p-4 rounded-2xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, width: '48.5%' }}>
                                            <View className="flex-row items-center mb-1">
                                                <Ionicons name="speedometer-outline" size={14} color={colors.textTertiary} />
                                                <Text className="ml-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Average Pace</Text>
                                            </View>
                                            <Text className="text-base font-black" style={{ color: colors.textPrimary }}>{selectedTrack.pace}</Text>
                                        </View>

                                        {/* Energy Burned */}
                                        <View className="p-4 rounded-2xl border" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder, width: '48.5%' }}>
                                            <View className="flex-row items-center mb-1">
                                                <Ionicons name="flame-outline" size={14} color={colors.textTertiary} />
                                                <Text className="ml-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Energy Burned</Text>
                                            </View>
                                            <Text className="text-lg font-black text-rose-400" style={{ color: isDark ? '#f87171' : '#e11d48' }}>{estimatedCalories} kcal</Text>
                                        </View>
                                        
                                        {/* Estimated Steps (for walks/runs) */}
                                        {estimatedStepsCount > 0 && (
                                            <View className="p-4 rounded-2xl border w-full" style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}>
                                                <View className="flex-row items-center justify-between mb-1">
                                                    <View className="flex-row items-center">
                                                        <Ionicons name="footsteps-outline" size={14} color={colors.textTertiary} />
                                                        <Text className="ml-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>Steps Count</Text>
                                                    </View>
                                                    <Text className="text-[9px] font-bold uppercase text-emerald-400" style={{ color: colors.productivityText }}>Pedometer Est.</Text>
                                                </View>
                                                <Text className="text-lg font-black" style={{ color: colors.textPrimary }}>{estimatedStepsCount.toLocaleString()} steps</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Action Buttons */}
                                    <View className="flex-row gap-3 mt-6">
                                        <Pressable
                                            onPress={() => setSelectedTrack(null)}
                                            className="flex-1 items-center justify-center rounded-2xl border py-4 active:bg-slate-900/40"
                                            style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                                        >
                                            <Text className="text-xs font-black uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                                Close Details
                                            </Text>
                                        </Pressable>

                                        <Pressable
                                            onPress={() => handleDeleteTrack(selectedTrack.id)}
                                            disabled={deleteLoading}
                                            className="flex-1 flex-row items-center justify-center rounded-2xl bg-rose-500 py-4 active:bg-rose-600 shadow-md shadow-rose-950/20"
                                        >
                                            <Ionicons name="trash-outline" size={14} color="#ffffff" className="mr-1" />
                                            <Text className="ml-1.5 text-xs font-black uppercase tracking-wider text-white">
                                                {deleteLoading ? 'Deleting...' : 'Delete Track'}
                                            </Text>
                                        </Pressable>
                                    </View>
                                </ScrollView>
                            );
                        })()}
                    </View>
                </View>
            </Modal>
        </LinearGradient>
    );
}
