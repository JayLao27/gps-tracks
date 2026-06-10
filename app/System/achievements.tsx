/**
 * ============================================================================
 * MODULE: app/System/achievements.tsx
 * LAYER: Presentation / Feature View Layer
 * DESCRIPTION: Displays unlocked user badges and spatial productivity streaks.
 * ============================================================================
 */

import { useTheme } from '@/hooks/useTheme';
import { useTracks } from '@/hooks/useTracks';
import { useIntelligenceReport } from '@/hooks/useIntelligenceReport';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ScrollView, Text, View, Pressable } from 'react-native';

interface Badge {
    id: string;
    title: string;
    description: string;
    icon: any;
    color: string;
    unlocked: boolean;
}

export default function Achievements() {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const { tracks } = useTracks();
    const { report } = useIntelligenceReport();

    const tracksCount = tracks.length;
    const totalDistance = tracks.reduce((sum, t) => sum + parseFloat(t.distance || '0'), 0);
    const prodScore = report.productivity.score || 0;

    const badges: Badge[] = [
        {
            id: 'b1',
            title: 'First Step',
            description: 'Record your very first GPS track.',
            icon: 'footsteps',
            color: '#3b82f6', // blue
            unlocked: tracksCount > 0
        },
        {
            id: 'b2',
            title: 'Marathoner',
            description: 'Log over 42km of total distance.',
            icon: 'medal',
            color: '#8b5cf6', // violet
            unlocked: totalDistance >= 42
        },
        {
            id: 'b3',
            title: 'Laser Focus',
            description: 'Achieve a productivity score over 85.',
            icon: 'flash',
            color: '#f59e0b', // amber
            unlocked: prodScore > 85
        },
        {
            id: 'b4',
            title: 'Explorer',
            description: 'Record 10 different tracks.',
            icon: 'map',
            color: '#10b981', // emerald
            unlocked: tracksCount >= 10
        },
        {
            id: 'b5',
            title: 'Early Bird',
            description: 'Register highly productive hours before 8 AM.',
            icon: 'sunny',
            color: '#ef4444', // red
            unlocked: report.productivity.bestWindow.includes('AM') && parseInt(report.productivity.bestWindow) <= 8
        },
        {
            id: 'b6',
            title: 'Night Owl',
            description: 'Register highly productive hours after 9 PM.',
            icon: 'moon',
            color: '#6366f1', // indigo
            unlocked: report.productivity.bestWindow.includes('PM') && parseInt(report.productivity.bestWindow) >= 9 && parseInt(report.productivity.bestWindow) !== 12
        }
    ];

    const unlockedCount = badges.filter(b => b.unlocked).length;

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
                        <Text className="text-2xl font-black tracking-tight" style={{ color: colors.textPrimary }}>Trophy Room</Text>
                        <Text className="mt-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                            You have unlocked {unlockedCount} of {badges.length} badges.
                        </Text>
                    </View>
                    <View 
                        className="h-12 w-12 items-center justify-center rounded-xl border shadow-lg"
                        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                    >
                        <Ionicons name="trophy" size={20} color="#f59e0b" />
                    </View>
                </View>

                {/* Progress Bar */}
                <View className="px-6 mt-4">
                    <View 
                        className="h-3 w-full rounded-full overflow-hidden border"
                        style={{ backgroundColor: isDark ? '#020617' : 'rgba(15,23,42,0.06)', borderColor: colors.cardBorder }}
                    >
                        <View 
                            style={{ width: `${(unlockedCount / badges.length) * 100}%`, backgroundColor: '#f59e0b' }} 
                            className="h-full rounded-full" 
                        />
                    </View>
                </View>

                {/* Badges Grid */}
                <View className="flex-row flex-wrap justify-between px-6 pt-6 gap-y-4">
                    {badges.map((badge) => (
                        <View 
                            key={badge.id}
                            className="rounded-3xl border p-5 shadow-sm items-center"
                            style={{ 
                                backgroundColor: badge.unlocked ? colors.cardBg : (isDark ? 'rgba(0,0,0,0.4)' : 'rgba(15,23,42,0.02)'), 
                                borderColor: badge.unlocked ? badge.color + '50' : colors.cardBorder,
                                width: '48%'
                            }}
                        >
                            <View 
                                className="h-14 w-14 items-center justify-center rounded-2xl mb-3 shadow-md"
                                style={{ 
                                    backgroundColor: badge.unlocked ? badge.color + '20' : (isDark ? '#1e293b' : '#e2e8f0'),
                                    opacity: badge.unlocked ? 1 : 0.4
                                }}
                            >
                                <Ionicons 
                                    name={badge.icon} 
                                    size={28} 
                                    color={badge.unlocked ? badge.color : colors.textTertiary} 
                                />
                            </View>
                            <Text className="text-sm font-black text-center" style={{ color: badge.unlocked ? colors.textPrimary : colors.textTertiary }}>
                                {badge.title}
                            </Text>
                            <Text className="text-[9px] font-semibold text-center mt-1.5 leading-relaxed" style={{ color: colors.textSecondary, opacity: badge.unlocked ? 1 : 0.6 }}>
                                {badge.description}
                            </Text>
                            
                            {!badge.unlocked && (
                                <View className="absolute top-2 right-2">
                                    <Ionicons name="lock-closed" size={10} color={colors.textTertiary} />
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
