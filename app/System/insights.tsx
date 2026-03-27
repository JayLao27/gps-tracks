import { useIntelligenceReport } from '@/hooks/useIntelligenceReport';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, Text, View } from 'react-native';

function toHours(minutes: number): string {
    return `${(minutes / 60).toFixed(1)}h`;
}

export default function Insights() {
    const { report, source, loading, refresh } = useIntelligenceReport();

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
