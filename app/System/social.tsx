/**
 * ============================================================================
 * MODULE: app/System/social.tsx
 * LAYER: Presentation / Feature View Layer
 * DESCRIPTION: Displays a social leaderboard of friends based on productivity
 *              scores and step counts.
 * ============================================================================
 */

import { useTheme } from '@/hooks/useTheme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View, Pressable, Image } from 'react-native';

interface Friend {
    id: string;
    name: string;
    score: number;
    steps: number;
    avatarUrl: string;
    trend: 'up' | 'down' | 'flat';
}

const MOCK_FRIENDS: Friend[] = [
    { id: '1', name: 'Alex Johnson', score: 94, steps: 14200, avatarUrl: 'https://i.pravatar.cc/150?u=1', trend: 'up' },
    { id: '2', name: 'You', score: 85, steps: 12050, avatarUrl: 'https://i.pravatar.cc/150?u=you', trend: 'up' },
    { id: '3', name: 'Samantha Lee', score: 82, steps: 11900, avatarUrl: 'https://i.pravatar.cc/150?u=3', trend: 'flat' },
    { id: '4', name: 'Marcus Chen', score: 76, steps: 9500, avatarUrl: 'https://i.pravatar.cc/150?u=4', trend: 'down' },
    { id: '5', name: 'David Smith', score: 68, steps: 8400, avatarUrl: 'https://i.pravatar.cc/150?u=5', trend: 'up' },
    { id: '6', name: 'Emily Davis', score: 65, steps: 7200, avatarUrl: 'https://i.pravatar.cc/150?u=6', trend: 'flat' },
];

export default function SocialLeaderboard() {
    const { colors, isDark } = useTheme();
    const router = useRouter();

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
                <View className="px-6 pb-2 pt-16 flex-row items-center justify-between">
                    <View>
                        <Pressable onPress={() => router.back()} className="mb-2">
                            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
                        </Pressable>
                        <Text className="text-2xl font-black tracking-tight" style={{ color: colors.textPrimary }}>Leaderboard</Text>
                        <Text className="mt-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                            See how your productivity stacks up.
                        </Text>
                    </View>
                    <View 
                        className="h-12 w-12 items-center justify-center rounded-xl border shadow-lg"
                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                    >
                        <Ionicons name="people" size={20} color="#8b5cf6" />
                    </View>
                </View>

                {/* Top 3 Podium */}
                <View className="px-6 mt-8 mb-6 flex-row items-end justify-center h-40">
                    {/* 2nd Place */}
                    <View className="items-center mx-2" style={{ width: '28%' }}>
                        <Image source={{ uri: MOCK_FRIENDS[1].avatarUrl }} className="w-10 h-10 rounded-full border-2 border-slate-300 mb-2" />
                        <Text className="text-[10px] font-bold text-center mb-1" style={{ color: colors.textSecondary }} numberOfLines={1}>{MOCK_FRIENDS[1].name}</Text>
                        <View className="w-full bg-slate-300 rounded-t-xl items-center justify-start pt-2" style={{ height: '60%' }}>
                            <Text className="text-slate-700 font-black text-lg">2</Text>
                            <Text className="text-slate-600 font-bold text-[9px]">{MOCK_FRIENDS[1].score} pts</Text>
                        </View>
                    </View>

                    {/* 1st Place */}
                    <View className="items-center mx-2" style={{ width: '32%', zIndex: 10 }}>
                        <Ionicons name="crown" size={16} color="#f59e0b" className="mb-1" />
                        <Image source={{ uri: MOCK_FRIENDS[0].avatarUrl }} className="w-12 h-12 rounded-full border-2 border-amber-400 mb-2" />
                        <Text className="text-xs font-black text-center mb-1" style={{ color: colors.textPrimary }} numberOfLines={1}>{MOCK_FRIENDS[0].name}</Text>
                        <View className="w-full bg-amber-400 rounded-t-xl items-center justify-start pt-2 shadow-lg shadow-amber-500/30" style={{ height: '80%' }}>
                            <Text className="text-amber-900 font-black text-2xl">1</Text>
                            <Text className="text-amber-800 font-bold text-[10px]">{MOCK_FRIENDS[0].score} pts</Text>
                        </View>
                    </View>

                    {/* 3rd Place */}
                    <View className="items-center mx-2" style={{ width: '28%' }}>
                        <Image source={{ uri: MOCK_FRIENDS[2].avatarUrl }} className="w-10 h-10 rounded-full border-2 border-amber-700 mb-2" />
                        <Text className="text-[10px] font-bold text-center mb-1" style={{ color: colors.textSecondary }} numberOfLines={1}>{MOCK_FRIENDS[2].name}</Text>
                        <View className="w-full bg-amber-700 rounded-t-xl items-center justify-start pt-2" style={{ height: '45%' }}>
                            <Text className="text-amber-100 font-black text-lg">3</Text>
                            <Text className="text-amber-200 font-bold text-[9px]">{MOCK_FRIENDS[2].score} pts</Text>
                        </View>
                    </View>
                </View>

                {/* Leaderboard List */}
                <View className="px-6 pt-4 border-t" style={{ borderTopColor: colors.cardBorder }}>
                    <Text className="mb-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Global Rankings
                    </Text>
                    
                    {MOCK_FRIENDS.map((friend, index) => {
                        const isMe = friend.name === 'You';
                        return (
                            <View 
                                key={friend.id}
                                className="flex-row items-center p-3 mb-3 rounded-2xl border"
                                style={{ 
                                    backgroundColor: isMe ? colors.productivityBg : colors.cardBg, 
                                    borderColor: isMe ? colors.productivityBorder : colors.cardBorder 
                                }}
                            >
                                <Text className="w-6 text-center font-black mr-2" style={{ color: colors.textTertiary }}>
                                    {index + 1}
                                </Text>
                                
                                <Image source={{ uri: friend.avatarUrl }} className="w-10 h-10 rounded-full mr-3" />
                                
                                <View className="flex-1">
                                    <Text className="text-sm font-bold" style={{ color: isMe ? colors.productivityText : colors.textPrimary }}>
                                        {friend.name}
                                    </Text>
                                    <Text className="text-[10px] font-semibold mt-0.5" style={{ color: colors.textSecondary }}>
                                        {friend.steps.toLocaleString()} steps
                                    </Text>
                                </View>
                                
                                <View className="items-end mr-3">
                                    <Text className="text-lg font-black" style={{ color: isMe ? colors.productivityText : colors.textPrimary }}>
                                        {friend.score}
                                    </Text>
                                    <Text className="text-[8px] font-bold uppercase tracking-wider" style={{ color: colors.textTertiary }}>
                                        Score
                                    </Text>
                                </View>
                                
                                <View className="w-6 items-center">
                                    {friend.trend === 'up' && <Ionicons name="caret-up" size={14} color="#10b981" />}
                                    {friend.trend === 'down' && <Ionicons name="caret-down" size={14} color="#ef4444" />}
                                    {friend.trend === 'flat' && <Ionicons name="remove" size={14} color={colors.textTertiary} />}
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
