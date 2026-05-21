import { useState } from 'react';
import { useIntelligenceReport } from '@/hooks/useIntelligenceReport';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

function toHours(minutes: number): string {
    return `${(minutes / 60).toFixed(1)}h`;
}

export default function Insights() {
    const { report, source, loading, refresh, aiInsight, aiLoading, refreshAiAdvice, apiKey, saveApiKey } = useIntelligenceReport();
    const [showKeyInput, setShowKeyInput] = useState(false);

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
                    <Text className="text-2xl font-bold text-white">Insights</Text>
                    <Text className="mt-1 text-sm text-slate-400">
                        AI-powered behavior coach from your location history
                    </Text>
                    <Text className="mt-2 text-xs text-slate-500">
                        Source: {source === 'live' ? 'Live tracked data' : 'Demo fallback data'}
                    </Text>
                    <Pressable
                        onPress={refresh}
                        className="mt-3 self-start rounded-xl border border-white/20 px-3 py-2"
                    >
                        <Text className="text-xs font-semibold text-slate-300">
                            {loading ? 'Refreshing...' : 'Refresh'}
                        </Text>
                    </Pressable>
                </View>

                {/* AI Habit Coach Card */}
                <View className="mx-6 mt-4 rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-5">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center">
                            <Ionicons name="sparkles" size={18} color="#818cf8" />
                            <Text className="ml-2 text-base font-bold text-white">
                                AI Habit Coach
                            </Text>
                            <Pressable 
                                onPress={() => setShowKeyInput(!showKeyInput)}
                                className="ml-2 p-1 rounded-lg bg-indigo-500/10 border border-indigo-400/20 active:bg-indigo-500/20"
                            >
                                <Ionicons name="key-outline" size={12} color="#a5b4fc" />
                            </Pressable>
                        </View>
                        <View className="flex-row items-center rounded-full bg-emerald-500/10 border border-emerald-400/20 px-2 py-0.5">
                            <View className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5" />
                            <Text className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider">
                                {aiInsight.coachName || 'Active'}
                            </Text>
                        </View>
                    </View>

                    {showKeyInput && (
                        <View className="mt-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                            <Text className="text-[11px] font-semibold text-slate-300">
                                Gemini API Key (EXPO_PUBLIC_GEMINI_API_KEY)
                            </Text>
                            <TextInput
                                className="mt-1.5 bg-[#0f172a] text-white rounded-xl px-3 py-2 text-xs border border-indigo-500/30"
                                secureTextEntry={true}
                                value={apiKey}
                                onChangeText={saveApiKey}
                                placeholder="Paste your Gemini API key here..."
                                placeholderTextColor="#64748b"
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                            <Text className="text-[9px] text-slate-400 mt-1.5 leading-normal">
                                Get your API key for free from the Google AI Studio. The key is saved locally in secure storage and is only used to query the Gemini Pro API directly from your device.
                            </Text>
                        </View>
                    )}

                    {aiLoading ? (
                        <View className="py-8 items-center justify-center">
                            <ActivityIndicator size="small" color="#818cf8" />
                            <Text className="mt-3 text-xs text-indigo-200">
                                Re-analyzing behavioral footprints...
                            </Text>
                        </View>
                    ) : (
                        <View className="mt-3">
                            <Text className="text-sm leading-relaxed text-slate-200 bg-white/5 border border-white/5 rounded-2xl p-4 mb-4 italic">
                                "{aiInsight.narrative}"
                            </Text>

                            <View className="mb-4">
                                <View className="flex-row items-center">
                                    <Ionicons name="compass-outline" size={16} color="#c084fc" />
                                    <Text className="ml-2 text-xs font-semibold uppercase tracking-wider text-purple-300">
                                        Focus Strategy
                                    </Text>
                                </View>
                                <Text className="mt-1 ml-6 text-sm text-slate-300 leading-relaxed">
                                    {aiInsight.focusRecommendation}
                                </Text>
                            </View>

                            <View className="mb-2">
                                <View className="flex-row items-center">
                                    <Ionicons name="time-outline" size={16} color="#fb7185" />
                                    <Text className="ml-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                                        Circadian Sync
                                    </Text>
                                </View>
                                <Text className="mt-1 ml-6 text-sm text-slate-300 leading-relaxed">
                                    {aiInsight.routineRecommendation}
                                </Text>
                            </View>

                            <View className="mt-4 pt-3 border-t border-indigo-400/10 flex-row items-center justify-between">
                                <Text className="text-[10px] text-slate-400">
                                    Synced: {aiInsight.timestamp}
                                </Text>
                                <Pressable
                                    onPress={refreshAiAdvice}
                                    className="flex-row items-center rounded-xl bg-indigo-500/20 border border-indigo-400/30 px-3 py-1.5 active:bg-indigo-600/30"
                                >
                                    <Ionicons name="refresh-outline" size={12} color="#a5b4fc" />
                                    <Text className="ml-1 text-[11px] font-bold text-indigo-200">
                                        Consult Coach
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>


                <View className="mx-6 mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                    <Text className="text-xs uppercase tracking-widest text-emerald-300">
                        Productivity score
                    </Text>
                    <Text className="mt-2 text-3xl font-bold text-white">
                        {report.productivity.score}/100
                    </Text>
                    <Text className="mt-1 text-xs text-slate-300">
                        Productive {report.productivity.productivePercent}% | Non-productive {report.productivity.nonProductivePercent}%
                    </Text>
                    <Text className="mt-2 text-sm text-slate-200">
                        Most productive window: {report.productivity.bestWindow}
                    </Text>
                </View>

                <View className="px-6 pt-6">
                    <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Pattern detection
                    </Text>
                    {report.patterns.map((pattern) => (
                        <View
                            key={pattern.message}
                            className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                            <Text className="text-sm text-white">{pattern.message}</Text>
                        </View>
                    ))}
                </View>

                <View className="px-6 pt-3">
                    <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Goal tracking
                    </Text>
                    {report.goalStatuses.map((status) => (
                        <View
                            key={status.goal.id}
                            className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                            <View className="flex-row items-center justify-between">
                                <Text className="text-sm font-semibold text-white">
                                    {status.goal.title}
                                </Text>
                                <Ionicons
                                    name={status.achieved ? 'checkmark-circle' : 'alert-circle-outline'}
                                    size={18}
                                    color={status.achieved ? '#34d399' : '#f59e0b'}
                                />
                            </View>
                            <Text className="mt-2 text-xs text-slate-300">
                                {toHours(status.actualMinutes)} / {toHours(status.goal.targetMinutes)} this {status.goal.period}
                            </Text>
                            {!!status.alert && (
                                <Text className="mt-2 text-xs text-amber-300">{status.alert}</Text>
                            )}
                        </View>
                    ))}
                </View>

                <View className="px-6 pt-3">
                    <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Unusual activity detection
                    </Text>
                    {report.anomalies.length === 0 ? (
                        <View className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <Text className="text-sm text-slate-300">No anomalies detected.</Text>
                        </View>
                    ) : (
                        report.anomalies.map((anomaly) => (
                            <View
                                key={anomaly.message}
                                className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4"
                            >
                                <Text className="text-sm text-red-200">{anomaly.message}</Text>
                            </View>
                        ))
                    )}
                </View>

                <View className="px-6 pt-3">
                    <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Heatmap (most visited places)
                    </Text>
                    {report.heatmap.slice(0, 5).map((point) => (
                        <View
                            key={point.locationName}
                            className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                            <View className="flex-row items-center justify-between">
                                <Text className="text-sm font-semibold text-white">
                                    {point.locationName}
                                </Text>
                                <Text className="text-xs text-slate-400">
                                    {(point.intensity * 100).toFixed(0)}% heat
                                </Text>
                            </View>
                            <Text className="mt-2 text-xs text-slate-300">
                                {point.visits} visits | {toHours(point.minutes)} total | {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                            </Text>
                        </View>
                    ))}
                </View>

                <View className="px-6 pt-3">
                    <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Routine prediction
                    </Text>
                    <View className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4">
                        <Text className="text-sm text-indigo-100">
                            Next likely location: {report.prediction.nextLikelyLocation} ({report.prediction.confidence}% confidence)
                        </Text>
                        <Text className="mt-2 text-xs text-indigo-200">
                            {report.prediction.schedulePrediction}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
