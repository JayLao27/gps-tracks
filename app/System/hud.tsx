/**
 * ============================================================================
 * MODULE: app/System/hud.tsx
 * LAYER: Presentation / Feature View Layer
 * DESCRIPTION: Provides an OLED-optimized, distraction-free Heads Up Display 
 *              (HUD) for active runners and cyclists.
 * ============================================================================
 */

import { useLocationTracker } from '@/hooks/useLocationTracker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StatusBar, Dimensions } from 'react-native';
import * as SMS from 'expo-sms';
import { Alert } from 'react-native';

const { width } = Dimensions.get('window');

function formatTime(seconds: number): string {
    if (seconds <= 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function HUDMode() {
    const router = useRouter();
    const { isTracking, stopTracking, stationaryTime, speed, lastPing } = useLocationTracker();
    
    // Derived metrics for HUD
    const currentSpeedKmh = speed ? (speed * 3.6).toFixed(1) : '0.0';
    // Simplified distance calculation for HUD display (using stationaryTime to mock active duration)
    const activeDuration = stationaryTime; // Assuming stationaryTime is used as a generic duration tracker in this context

    useEffect(() => {
        // Auto-exit HUD if tracking stops
        if (!isTracking) {
            router.back();
        }
    }, [isTracking, router]);

    const handleSOS = async () => {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            const locationText = lastPing ? `Lat: ${lastPing.latitude.toFixed(5)}, Lon: ${lastPing.longitude.toFixed(5)}` : "Unknown Location";
            await SMS.sendSMSAsync(
                [],
                `SOS Safety Alert! I am using GPS Tracks HUD and need assistance. My location is ${locationText}.`
            );
        } else {
            Alert.alert("SMS Unavailable", "Your device does not support sending SMS messages.");
        }
    };

    return (
        <View className="flex-1 bg-black justify-between px-6 pt-16 pb-12">
            <StatusBar hidden={true} />
            
            {/* Top Bar */}
            <View className="flex-row items-center justify-between">
                <Pressable onPress={() => router.back()} className="p-3 bg-white/10 rounded-full active:bg-white/20">
                    <Ionicons name="close" size={28} color="#ffffff" />
                </Pressable>
                
                <View className="flex-row items-center bg-emerald-500/20 px-4 py-1.5 rounded-full border border-emerald-500/50">
                    <View className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                    <Text className="text-emerald-500 font-black uppercase tracking-widest text-xs">GPS Active</Text>
                </View>
                
                <Pressable onPress={handleSOS} className="p-3 bg-red-500/20 rounded-full active:bg-red-500/40 border border-red-500/50">
                    <Ionicons name="warning" size={24} color="#ef4444" />
                </Pressable>
            </View>

            {/* Main HUD Metrics */}
            <View className="flex-1 justify-center items-center">
                {/* Primary Metric: Speed */}
                <View className="items-center mb-12">
                    <Text className="text-[120px] font-black text-white leading-none tracking-tighter" style={{ textShadowColor: 'rgba(255,255,255,0.2)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 20 }}>
                        {currentSpeedKmh}
                    </Text>
                    <Text className="text-2xl font-bold uppercase tracking-[0.3em] text-slate-400">
                        km/h
                    </Text>
                </View>

                {/* Secondary Metrics */}
                <View className="flex-row w-full justify-around mt-8 border-t border-white/10 pt-10">
                    <View className="items-center">
                        <Ionicons name="time-outline" size={32} color="#94a3b8" className="mb-2" />
                        <Text className="text-4xl font-black text-white tracking-tight">{formatTime(activeDuration)}</Text>
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Duration</Text>
                    </View>
                    
                    <View className="w-px bg-white/10" />

                    <View className="items-center">
                        <Ionicons name="location-outline" size={32} color="#94a3b8" className="mb-2" />
                        <Text className="text-4xl font-black text-white tracking-tight">{(activeDuration * 0.0015).toFixed(2)}</Text>
                        <Text className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Dist (km)</Text>
                    </View>
                </View>
            </View>

            {/* Bottom Actions */}
            <View className="items-center">
                <Pressable 
                    onPress={stopTracking}
                    className="h-20 w-20 rounded-full bg-rose-600 items-center justify-center border-4 border-rose-900 shadow-2xl active:bg-rose-500 active:scale-95 transition-transform"
                >
                    <Ionicons name="stop" size={32} color="#ffffff" />
                </Pressable>
                <Text className="text-xs font-black uppercase tracking-widest text-rose-300 mt-4">
                    Hold to Stop
                </Text>
            </View>
        </View>
    );
}
