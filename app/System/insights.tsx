import { useState, useRef, useEffect } from 'react';
import { useIntelligenceReport, type CoachPersona } from '@/hooks/useIntelligenceReport';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useIntelligenceChat } from '@/hooks/useIntelligenceChat';

function getPersonaColor(persona: CoachPersona): string {
    switch (persona) {
        case 'tough':
            return '#f43f5e';
        case 'encouraging':
            return '#10b981';
        case 'data-driven':
            return '#06b6d4';
        default:
            return '#4f46e5';
    }
}

function toHours(minutes: number): string {
    return `${(minutes / 60).toFixed(1)}h`;
}

// TODO: FUTURE ANALYTICAL & AI UI ENHANCEMENTS:
// 1. Chart Visualizations: Replace the text-based lists and static goal bars with interactive charts
//    (e.g., react-native-gifted-charts or victory-native) to plot productivity trends over time,
//    circadian peak focus times, and place distributions.
// 2. Chat Voice-to-Text: Integrate Speech-to-Text (expo-speech/voice) into the AI Coach chat dialog box
//    allowing hands-free dialogue and interaction.
// 3. Custom Goal Creation UI: Add an inline dashboard control permitting custom spatial/category goal
//    creation directly from the Insights page rather than relying on predefined default goals.
// 4. Heatmap View: Include a toggle-able visual geofenced heatmap overlaid on a map component showing
//    where the user spends the most high-productivity time vs social time.
export default function Insights() {
    const { report, source, loading, refresh, aiInsight, aiLoading, refreshAiAdvice, apiKey, saveApiKey, persona, savePersona } = useIntelligenceReport();
    const { colors, isDark } = useTheme();

    const { messages, sendMessage, clearChat, isLoading: chatLoading } = useIntelligenceChat(report, apiKey, persona);
    const [chatOpen, setChatOpen] = useState(false);
    const [inputText, setInputText] = useState('');
    const chatScrollViewRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (chatOpen && chatScrollViewRef.current) {
            setTimeout(() => {
                chatScrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages.length, chatLoading, chatOpen]);

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
                    <Text className="text-2xl font-black tracking-tight" style={{ color: colors.textPrimary }}>Insights</Text>
                    <Text className="mt-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                        AI-powered behavior coaching & spatial metrics
                    </Text>
                    <View className="mt-3 flex-row items-center justify-between border-t pt-3" style={{ borderTopColor: colors.cardBorder }}>
                        <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                            Source: {source === 'live' ? 'Live tracked data' : 'Demo fallback data'}
                        </Text>
                        <Pressable
                            onPress={refresh}
                            className="rounded-lg border px-2.5 py-1"
                            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                        >
                            <Text className="text-[10px] font-bold" style={{ color: colors.textSecondary }}>
                                {loading ? 'Refreshing...' : 'Force Refresh'}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {/* AI Habit Coach Card */}
                <View 
                    className="mx-6 mt-4 overflow-hidden rounded-3xl border shadow-xl"
                    style={{ backgroundColor: colors.aiBg, borderColor: colors.aiBorder }}
                >
                    <LinearGradient
                        colors={isDark 
                            ? ['rgba(99, 102, 241, 0.18)', 'rgba(168, 85, 247, 0.06)', 'rgba(3, 7, 18, 0.3)']
                            : ['rgba(99, 102, 241, 0.08)', 'rgba(168, 85, 247, 0.03)', 'rgba(255, 255, 255, 0.8)']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ padding: 20 }}
                    >
                        <View className="flex-row items-center justify-between">
                            <View className="flex-row items-center">
                                <Ionicons name="sparkles" size={16} color="#c084fc" />
                                <Text className="ml-2 text-sm font-black uppercase tracking-wider" style={{ color: colors.textPrimary }}>
                                    AI Habit Coach
                                </Text>
                            </View>
                            <View 
                                className="flex-row items-center rounded-full border px-2.5 py-0.5"
                                style={{ backgroundColor: colors.productivityBg, borderColor: colors.productivityBorder }}
                            >
                                <View className="h-1.5 w-1.5 rounded-full mr-1.5" style={{ backgroundColor: colors.productivityText }} />
                                <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.productivityText }}>
                                    {aiInsight.coachName || 'Active'}
                                </Text>
                            </View>
                        </View>

                        {/* Coach Persona Selector */}
                        <View className="mt-4">
                            <Text className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: colors.textSecondary }}>
                                Coach Persona
                            </Text>
                            <View className="flex-row justify-between bg-slate-900/5 dark:bg-black/20 p-1 rounded-xl">
                                {(['encouraging', 'tough', 'data-driven', 'direct'] as const).map((p) => {
                                    const isActive = persona === p;
                                    let label = '';
                                    if (p === 'encouraging') label = 'Warm';
                                    else if (p === 'tough') label = 'Tough';
                                    else if (p === 'data-driven') label = 'Data';
                                    else if (p === 'direct') label = 'Direct';

                                    return (
                                        <Pressable
                                            key={p}
                                            onPress={() => savePersona(p)}
                                            className="flex-1 py-1.5 rounded-lg items-center justify-center"
                                            style={{
                                                backgroundColor: isActive ? (isDark ? 'rgba(255,255,255,0.1)' : '#ffffff') : 'transparent',
                                            }}
                                        >
                                            <Text 
                                                className="text-[9px] font-extrabold uppercase tracking-wider" 
                                                style={{ color: isActive ? colors.textPrimary : colors.textTertiary }}
                                            >
                                                {label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </View>
                        </View>

                        {aiLoading ? (
                            <View className="py-8 items-center justify-center">
                                <ActivityIndicator size="small" color="#c084fc" />
                                <Text className="mt-3 text-xs font-bold uppercase tracking-wider" style={{ color: colors.aiText }}>
                                    Re-analyzing behavioral footprints...
                                </Text>
                            </View>
                        ) : (
                            <View className="mt-4">
                                <View 
                                    className="border rounded-2xl p-4 mb-4"
                                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', borderColor: colors.cardBorder }}
                                >
                                    <Text className="text-xs leading-relaxed italic font-medium" style={{ color: colors.textPrimary }}>
                                        "{aiInsight.narrative}"
                                    </Text>
                                </View>

                                <View className="mb-4">
                                    <View className="flex-row items-center">
                                        <Ionicons name="compass-outline" size={15} color={isDark ? '#c084fc' : '#4f46e5'} />
                                        <Text className="ml-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#c084fc' : '#4f46e5' }}>
                                            Focus Strategy
                                        </Text>
                                    </View>
                                    <Text className="mt-1 ml-5.5 text-xs leading-relaxed font-semibold" style={{ color: colors.textSecondary }}>
                                        {aiInsight.focusRecommendation}
                                    </Text>
                                </View>

                                <View className="mb-2">
                                    <View className="flex-row items-center">
                                        <Ionicons name="time-outline" size={15} color={isDark ? '#fb7185' : '#e11d48'} />
                                        <Text className="ml-2 text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? '#fb7185' : '#e11d48' }}>
                                            Circadian Sync
                                        </Text>
                                    </View>
                                    <Text className="mt-1 ml-5.5 text-xs leading-relaxed font-semibold" style={{ color: colors.textSecondary }}>
                                        {aiInsight.routineRecommendation}
                                    </Text>
                                </View>

                                <View className="mt-4 pt-3.5 border-t flex-row items-center justify-between" style={{ borderTopColor: colors.cardBorder }}>
                                    <Text className="text-[9px] font-semibold uppercase" style={{ color: colors.textTertiary }}>
                                        Synced: {aiInsight.timestamp}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Pressable
                                            onPress={refreshAiAdvice}
                                            className="flex-row items-center rounded-xl border px-2.5 py-1.5 active:bg-indigo-600/30"
                                            style={{ backgroundColor: colors.aiBg, borderColor: colors.aiBorder, marginRight: 8 }}
                                        >
                                            <Ionicons name="sparkles" size={11} color={colors.aiText} />
                                            <Text className="ml-1 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: colors.aiText }}>
                                                Re-Analyze
                                            </Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => setChatOpen(true)}
                                            className="flex-row items-center rounded-xl border px-3 py-1.5 active:bg-indigo-600/30"
                                            style={{ backgroundColor: colors.aiBg, borderColor: colors.aiBorder }}
                                        >
                                            <Ionicons name="chatbubbles-outline" size={11} color={colors.aiText} />
                                            <Text className="ml-1 text-[9px] font-extrabold uppercase tracking-wider" style={{ color: colors.aiText }}>
                                                Chat
                                            </Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </View>
                        )}
                    </LinearGradient>
                </View>

                {/* Productivity Score Split Panel */}
                <View 
                    className="mx-6 mt-4 rounded-3xl border p-5 shadow-lg"
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                >
                    <View className="flex-row items-center justify-between">
                        <View>
                            <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                                Productivity Index
                            </Text>
                            <Text className="mt-0.5 text-2xl font-black" style={{ color: colors.textPrimary }}>
                                {report.productivity.score}/100
                            </Text>
                        </View>
                        <View className="items-end">
                            <Text className="text-[9px] font-bold uppercase" style={{ color: colors.textTertiary }}>Best Window</Text>
                            <Text className="text-xs font-extrabold mt-0.5" style={{ color: colors.productivityText }}>
                                {report.productivity.bestWindow}
                            </Text>
                        </View>
                    </View>

                    {/* Split bar visualization */}
                    <View 
                        className="h-2.5 w-full flex-row rounded-full overflow-hidden mt-4 mb-2 p-0.5 border"
                        style={{ backgroundColor: isDark ? '#020617' : 'rgba(15,23,42,0.06)', borderColor: colors.cardBorder }}
                    >
                        <View style={{ width: `${report.productivity.productivePercent}%` }} className="bg-emerald-500 h-full rounded-full" />
                        <View style={{ width: `${report.productivity.nonProductivePercent}%` }} className="bg-amber-500 h-full rounded-full" />
                    </View>

                    <View className="flex-row justify-between mt-1.5">
                        <View className="flex-row items-center">
                            <View className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5" />
                            <Text className="text-[9px] font-bold uppercase" style={{ color: colors.textSecondary }}>Productive ({report.productivity.productivePercent}%)</Text>
                        </View>
                        <View className="flex-row items-center">
                            <View className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5" />
                            <Text className="text-[9px] font-bold uppercase" style={{ color: colors.textSecondary }}>Non-Productive ({report.productivity.nonProductivePercent}%)</Text>
                        </View>
                    </View>
                </View>

                {/* Pattern Detection */}
                <View className="px-6 pt-6">
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Spatial Patterns
                    </Text>
                    {report.patterns.map((pattern) => {
                        let iconName: any = "trending-up-outline";
                        let iconColor = "#818cf8";
                        if (pattern.message.toLowerCase().includes('routine') || pattern.message.toLowerCase().includes('clock')) {
                            iconName = "time-outline";
                            iconColor = "#f59e0b";
                        } else if (pattern.message.toLowerCase().includes('alert') || pattern.message.toLowerCase().includes('anomaly')) {
                            iconName = "alert-circle-outline";
                            iconColor = "#f87171";
                        }
                        
                        return (
                            <View
                                key={pattern.message}
                                className="mb-3 flex-row items-center rounded-2xl border p-4 shadow-sm"
                                style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                            >
                                <View 
                                    className="mr-3 h-7 w-7 items-center justify-center rounded-lg border shadow-md"
                                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                                >
                                    <Ionicons name={iconName} size={14} color={iconColor} />
                                </View>
                                <Text className="flex-1 text-xs ml-2.5 leading-relaxed font-semibold" style={{ color: colors.textSecondary }}>
                                    {pattern.message}
                                </Text>
                            </View>
                        );
                    })}
                </View>

                {/* Goal Progress Bars */}
                <View className="px-6 pt-3">
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Goals & Targets
                    </Text>
                    {report.goalStatuses.map((status) => {
                        const progress = Math.min(100, Math.round((status.actualMinutes / status.goal.targetMinutes) * 100));
                        
                        // Active color states: emerald for accomplished, indigo/amber for active, warm rose for goals needing attention
                        let progressColor = 'bg-indigo-500';
                        let textStyleColor = isDark ? '#818cf8' : '#4f46e5';
                        if (status.achieved) {
                            progressColor = 'bg-emerald-500';
                            textStyleColor = '#10b981';
                        } else if (progress < 30) {
                            progressColor = 'bg-rose-400';
                            textStyleColor = '#f43f5e';
                        } else if (progress < 70) {
                            progressColor = 'bg-amber-400';
                            textStyleColor = '#f59e0b';
                        }

                        return (
                            <View
                                key={status.goal.id}
                                className="mb-3 rounded-2xl border p-4 shadow-sm"
                                style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                            >
                                <View className="flex-row items-center justify-between">
                                    <View>
                                        <Text className="text-xs font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                                            {status.goal.title}
                                        </Text>
                                        <Text className="text-[10px] font-semibold mt-0.5 uppercase tracking-wide" style={{ color: colors.textTertiary }}>
                                            {status.goal.period} target
                                        </Text>
                                    </View>
                                    <View className="flex-row items-center">
                                        <Text className="text-xs font-extrabold mr-2" style={{ color: textStyleColor }}>
                                            {progress}%
                                        </Text>
                                        <Ionicons
                                            name={status.achieved ? 'checkmark-circle' : 'hourglass-outline'}
                                            size={15}
                                            color={status.achieved ? '#10b981' : colors.textTertiary}
                                        />
                                    </View>
                                </View>

                                {/* Progress Bar */}
                                <View 
                                    className="h-2 w-full rounded-full mt-3 overflow-hidden border p-0.5"
                                    style={{ backgroundColor: isDark ? '#020617' : 'rgba(15,23,42,0.06)', borderColor: colors.cardBorder }}
                                >
                                    <View 
                                        style={{ width: `${progress}%` }} 
                                        className={`h-full rounded-full ${progressColor}`} 
                                    />
                                </View>

                                <View className="flex-row justify-between items-center mt-2.5">
                                    <Text className="text-[10px] font-bold uppercase" style={{ color: colors.textSecondary }}>
                                        Logged: {toHours(status.actualMinutes)} / {toHours(status.goal.targetMinutes)}
                                    </Text>
                                    {status.achieved ? (
                                        <Text className="text-[9px] font-black uppercase tracking-wide text-emerald-500" style={{ color: '#10b981' }}>
                                            Completed! 🎉
                                        </Text>
                                    ) : status.alert ? (
                                        <Text className="text-[9px] font-bold uppercase tracking-wide" style={{ color: colors.warnText }}>
                                            {status.alert}
                                        </Text>
                                    ) : (
                                        <Text className="text-[9px] font-bold uppercase tracking-wide" style={{ color: colors.textTertiary }}>
                                            {toHours(status.remainingMinutes)} left
                                        </Text>
                                    )}
                                </View>
                            </View>
                        );
                    })}
                </View>

                {/* Unusual Activity Detection */}
                <View className="px-6 pt-3">
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Anomalies & Footprints
                    </Text>
                    {report.anomalies.length === 0 ? (
                        <View 
                            className="rounded-2xl border p-4"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                        >
                            <Text className="text-xs font-semibold uppercase tracking-wider text-center" style={{ color: colors.textTertiary }}>No anomalies detected</Text>
                        </View>
                    ) : (
                        report.anomalies.map((anomaly) => (
                            <View
                                key={anomaly.message}
                                className="mb-3 flex-row items-center rounded-2xl border p-4"
                                style={{ backgroundColor: colors.dangerBg, borderColor: colors.dangerBorder }}
                            >
                                <Ionicons name="alert-circle-outline" size={18} color={colors.dangerText} className="mr-3" />
                                <Text className="flex-1 text-xs leading-normal ml-3 font-semibold" style={{ color: colors.dangerText }}>{anomaly.message}</Text>
                            </View>
                        ))
                    )}
                </View>

                {/* Heatmap Section */}
                <View className="px-6 pt-3">
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Heatmap (Telemetry Index)
                    </Text>
                    {report.heatmap.slice(0, 5).map((point) => (
                        <View
                            key={point.locationName}
                            className="mb-3 rounded-2xl border p-4 shadow-sm"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                        >
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center">
                                    <View className="h-2 w-2 rounded-full bg-emerald-400 mr-2" />
                                    <Text className="text-xs font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                                        {point.locationName}
                                    </Text>
                                </View>
                                <View 
                                    className="rounded-lg px-2 py-0.5 border"
                                    style={{ backgroundColor: colors.productivityBg, borderColor: colors.productivityBorder }}
                                >
                                    <Text className="text-[9px] font-bold uppercase tracking-wide" style={{ color: colors.productivityText }}>
                                        {(point.intensity * 100).toFixed(0)}% Intensity
                                    </Text>
                                </View>
                            </View>
                            
                            <View className="flex-row justify-between items-center mt-3 border-t pt-2.5" style={{ borderTopColor: colors.cardBorder }}>
                                <Text className="text-[10px] font-bold uppercase" style={{ color: colors.textSecondary }}>
                                    {point.visits} visits · {toHours(point.minutes)} logged
                                </Text>
                                <Text className="text-[9px] font-bold" style={{ color: colors.textTertiary }}>
                                    {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Routine Prediction */}
                <View className="px-6 pt-3">
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Predictive Modeling
                    </Text>
                    <View className="overflow-hidden rounded-3xl border shadow-lg" style={{ borderColor: colors.aiBorder }}>
                        <LinearGradient
                            colors={isDark 
                                ? ['rgba(99, 102, 241, 0.1)', 'rgba(168, 85, 247, 0.02)']
                                : ['rgba(99, 102, 241, 0.04)', 'rgba(255,255,255,0.75)']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ padding: 20 }}
                        >
                            <View className="flex-row items-center justify-between">
                                <Text className="text-[10px] font-bold uppercase tracking-wider" style={{ color: colors.aiText }}>Next Likely Location</Text>
                                <View 
                                    className="rounded-lg px-2 py-0.5 border"
                                    style={{ backgroundColor: colors.aiBg, borderColor: colors.aiBorder }}
                                >
                                    <Text className="text-[9px] font-bold uppercase" style={{ color: colors.aiText }}>{report.prediction.confidence}% Conf</Text>
                                </View>
                            </View>
                            <Text className="mt-2.5 text-base font-black" style={{ color: colors.textPrimary }}>
                                {report.prediction.nextLikelyLocation}
                            </Text>
                            <Text className="mt-2 text-xs leading-relaxed font-semibold" style={{ color: colors.textSecondary }}>
                                {report.prediction.schedulePrediction}
                            </Text>
                        </LinearGradient>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={chatOpen}
                animationType="slide"
                onRequestClose={() => setChatOpen(false)}
            >
                <View 
                    style={{ 
                        flex: 1, 
                        backgroundColor: isDark ? '#090d16' : '#f8fafc',
                    }}
                >
                    {/* TODO: UI/UX CHAT IMPROVEMENTS:
                        1. PERSONA-SPECIFIC THEMES: Apply distinct background/accent gradients based on the persona (e.g. rose red tones for Tough Coach, warm gold for Encouraging).
                        2. TYPING BUBBLE ANIMATION: Replace the static ActivityIndicator with a custom animated triple-dot bounce component using React Native Animated.
                        3. SPEECH-TO-TEXT: Add a microphone button in the input bar to support voice input.
                    */}
                    <KeyboardAvoidingView 
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                        style={{ flex: 1 }}
                    >
                        {/* Header */}
                        <View 
                            style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                justifyContent: 'space-between', 
                                paddingHorizontal: 20, 
                                paddingTop: 60, 
                                paddingBottom: 16, 
                                borderBottomWidth: 1, 
                                borderBottomColor: colors.cardBorder,
                                backgroundColor: isDark ? '#090d16' : '#ffffff'
                            }}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Pressable 
                                    onPress={() => setChatOpen(false)} 
                                    style={{ padding: 8, marginRight: 8 }}
                                >
                                    <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
                                </Pressable>
                                <View 
                                    style={{ 
                                        width: 36, 
                                        height: 36, 
                                        borderRadius: 18, 
                                        backgroundColor: colors.aiBg, 
                                        alignItems: 'center', 
                                        justifyContent: 'center', 
                                        borderColor: getPersonaColor(persona) + '33', 
                                        borderWidth: 1 
                                    }}
                                >
                                    <Ionicons 
                                        name={
                                            persona === 'tough' ? 'shield-outline' :
                                            persona === 'encouraging' ? 'heart-outline' :
                                            persona === 'data-driven' ? 'analytics-outline' : 'flash-outline'
                                        } 
                                        size={18} 
                                        color={getPersonaColor(persona)} 
                                    />
                                </View>
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: 'bold' }}>
                                        {
                                            persona === 'tough' ? 'Tough Coach' :
                                            persona === 'encouraging' ? 'Encouraging Coach' :
                                            persona === 'data-driven' ? 'Data Coach' : 'Direct Coach'
                                        }
                                    </Text>
                                    <Text style={{ color: colors.textTertiary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                        Active Chat
                                    </Text>
                                </View>
                            </View>
                            <Pressable 
                                onPress={clearChat} 
                                style={{ padding: 8 }}
                            >
                                <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
                            </Pressable>
                        </View>

                        {/* Message ScrollView */}
                        <ScrollView 
                            ref={chatScrollViewRef}
                            style={{ flex: 1, paddingHorizontal: 20 }}
                            contentContainerStyle={{ paddingVertical: 16 }}
                            showsVerticalScrollIndicator={true}
                        >
                            {messages.map((message) => {
                                const isCoach = message.role === 'model';
                                return (
                                    <View 
                                        key={message.id}
                                        style={{ 
                                            alignSelf: isCoach ? 'flex-start' : 'flex-end', 
                                            maxWidth: '80%', 
                                            marginVertical: 6 
                                        }}
                                    >
                                        <View 
                                            style={{ 
                                                backgroundColor: isCoach 
                                                    ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.03)') 
                                                    : getPersonaColor(persona), 
                                                paddingHorizontal: 16, 
                                                paddingVertical: 12, 
                                                borderRadius: 20, 
                                                borderTopLeftRadius: isCoach ? 4 : 20,
                                                borderTopRightRadius: isCoach ? 20 : 4,
                                                borderColor: isCoach ? colors.cardBorder : 'transparent', 
                                                borderWidth: isCoach ? 1 : 0 
                                            }}
                                        >
                                            <Text 
                                                style={{ 
                                                    color: isCoach ? colors.textPrimary : '#ffffff', 
                                                    fontSize: 13, 
                                                    lineHeight: 18,
                                                    fontWeight: '500'
                                                }}
                                            >
                                                {message.text}
                                            </Text>
                                        </View>
                                        <Text 
                                            style={{ 
                                                alignSelf: isCoach ? 'flex-start' : 'flex-end', 
                                                fontSize: 9, 
                                                color: colors.textTertiary, 
                                                marginTop: 4,
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {message.timestamp}
                                        </Text>
                                    </View>
                                );
                            })}
                            
                            {chatLoading && (
                                <View style={{ alignSelf: 'flex-start', maxWidth: '80%', marginVertical: 6 }}>
                                    <View 
                                        style={{ 
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.03)', 
                                            paddingHorizontal: 16, 
                                            paddingVertical: 12, 
                                            borderRadius: 20, 
                                            borderTopLeftRadius: 4, 
                                            borderColor: colors.cardBorder, 
                                            borderWidth: 1, 
                                            flexDirection: 'row', 
                                            alignItems: 'center' 
                                        }}
                                    >
                                        <ActivityIndicator size="small" color={colors.aiText} style={{ marginRight: 8 }} />
                                        <Text style={{ color: colors.textTertiary, fontSize: 12, fontStyle: 'italic', fontWeight: 'bold' }}>
                                            Coach is analyzing...
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        {/* Suggestion Chips */}
                        <View style={{ borderTopWidth: 1, borderTopColor: colors.cardBorder, backgroundColor: isDark ? '#090d16' : '#ffffff', paddingTop: 8 }}>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                style={{ maxHeight: 50, paddingHorizontal: 16 }}
                            >
                                {[
                                    { text: "Analyze score", query: "How is my productivity score?" },
                                    { text: "Check anomalies", query: "Did you detect any anomalies in my schedule?" },
                                    { text: "Goals summary", query: "Tell me about my gym, study, and social goals" },
                                    { text: "Predict next location", query: "Where do you predict I will go next?" },
                                ].map((s) => (
                                    <Pressable
                                        key={s.text}
                                        onPress={() => sendMessage(s.query)}
                                        style={{ 
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9', 
                                            borderColor: colors.cardBorder, 
                                            borderWidth: 1, 
                                            borderRadius: 16, 
                                            paddingHorizontal: 14, 
                                            paddingVertical: 8, 
                                            marginRight: 8, 
                                            height: 32,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Text style={{ color: colors.textSecondary, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            {s.text}
                                        </Text>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Bottom Input Area */}
                        <View 
                            style={{ 
                                paddingHorizontal: 20, 
                                paddingBottom: Platform.OS === 'ios' ? 40 : 20, 
                                paddingTop: 8, 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                borderTopWidth: 1, 
                                borderTopColor: colors.cardBorder,
                                backgroundColor: isDark ? '#090d16' : '#ffffff'
                            }}
                        >
                            <TextInput
                                style={{ 
                                    flex: 1, 
                                    backgroundColor: isDark ? '#020617' : '#f8fafc', 
                                    color: colors.textPrimary, 
                                    borderColor: colors.cardBorder, 
                                    borderWidth: 1, 
                                    borderRadius: 24, 
                                    paddingHorizontal: 16, 
                                    paddingVertical: 10, 
                                    fontSize: 13,
                                    marginRight: 12
                                }}
                                value={inputText}
                                onChangeText={setInputText}
                                placeholder="Message your coach..."
                                placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                                multiline={false}
                                onSubmitEditing={() => {
                                    if (inputText.trim()) {
                                        sendMessage(inputText);
                                        setInputText('');
                                    }
                                }}
                            />
                            <Pressable 
                                onPress={() => {
                                    if (inputText.trim()) {
                                        sendMessage(inputText);
                                        setInputText('');
                                    }
                                }}
                                style={{ 
                                    width: 40, 
                                    height: 40, 
                                    borderRadius: 20, 
                                    backgroundColor: inputText.trim() ? getPersonaColor(persona) : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)'), 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                }}
                                disabled={!inputText.trim()}
                            >
                                <Ionicons 
                                    name="arrow-up" 
                                    size={20} 
                                    color={inputText.trim() ? '#ffffff' : colors.textTertiary} 
                                />
                            </Pressable>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>
        </LinearGradient>
    );
}
