/**
 * ============================================================================
 * MODULE: app/System/places.tsx
 * LAYER: Presentation / Feature View Layer
 * DESCRIPTION: Provides the interface to manage geofenced places and apply
 *              DBSCAN spatial clustering suggestions.
 * ============================================================================
 */

import { useKnownPlaces } from '@/hooks/useKnownPlaces';
import { useTheme } from '@/hooks/useTheme';
import { suggestPlacesFromPings, type LocationCategory, type SuggestedPlace } from '@/services/locationIntelligence';
import { getTrackedPings } from '@/services/locationTracking';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

const categories: LocationCategory[] = [
    'home',
    'study',
    'work',
    'gym',
    'social',
    'other',
];

interface CategoryStyle {
    dark: { border: string; bg: string; text: string };
    light: { border: string; bg: string; text: string };
    icon: any;
}

const categoryStyles: Record<LocationCategory, CategoryStyle> = {
    home: {
        dark: { border: 'rgba(16, 185, 129, 0.3)', bg: 'rgba(16, 185, 129, 0.1)', text: '#34d399' },
        light: { border: '#a7f3d0', bg: '#ecfdf5', text: '#047857' },
        icon: 'home-outline',
    },
    study: {
        dark: { border: 'rgba(99, 102, 241, 0.3)', bg: 'rgba(99, 102, 241, 0.1)', text: '#818cf8' },
        light: { border: '#c7d2fe', bg: '#e0e7ff', text: '#3730a3' },
        icon: 'book-outline',
    },
    work: {
        dark: { border: 'rgba(56, 189, 248, 0.3)', bg: 'rgba(56, 189, 248, 0.1)', text: '#38bdf8' },
        light: { border: '#bae6fd', bg: '#e0f2fe', text: '#0369a1' },
        icon: 'briefcase-outline',
    },
    gym: {
        dark: { border: 'rgba(244, 63, 94, 0.3)', bg: 'rgba(244, 63, 94, 0.1)', text: '#fb7185' },
        light: { border: '#fecdd3', bg: '#fff1f2', text: '#be123c' },
        icon: 'barbell-outline',
    },
    social: {
        dark: { border: 'rgba(168, 85, 247, 0.3)', bg: 'rgba(168, 85, 247, 0.1)', text: '#c084fc' },
        light: { border: '#e9d5ff', bg: '#f3e8ff', text: '#7e22ce' },
        icon: 'people-outline',
    },
    other: {
        dark: { border: 'rgba(148, 163, 184, 0.3)', bg: 'rgba(148, 163, 184, 0.1)', text: '#cbd5e1' },
        light: { border: '#cbd5e1', bg: '#f1f5f9', text: '#475569' },
        icon: 'pin-outline',
    },
};

const MOCK_RAW_PINGS = [
    // A dense cluster of 6 points around Lat: 37.785, Lon: -122.418 (e.g. coffee shop or work spot)
    { id: 'mock-raw-1', latitude: 37.7851, longitude: -122.4182, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-2', latitude: 37.7852, longitude: -122.4181, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-3', latitude: 37.7850, longitude: -122.4183, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-4', latitude: 37.7853, longitude: -122.4180, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-5', latitude: 37.7849, longitude: -122.4184, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-6', latitude: 37.7851, longitude: -122.4181, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },

    // Another dense cluster of 7 points around Lat: 37.792, Lon: -122.405 (e.g. office/campus spot)
    { id: 'mock-raw-7', latitude: 37.7921, longitude: -122.4052, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-8', latitude: 37.7922, longitude: -122.4051, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-9', latitude: 37.7920, longitude: -122.4053, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-10', latitude: 37.7923, longitude: -122.4050, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-11', latitude: 37.7919, longitude: -122.4054, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-12', latitude: 37.7921, longitude: -122.4051, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
    { id: 'mock-raw-13', latitude: 37.7922, longitude: -122.4053, category: 'other' as const, locationName: 'Unknown Spot', timestamp: new Date().toISOString() },
];

export default function Places() {
    const { places, loading, error, createPlace, removePlace } = useKnownPlaces();

    const [name, setName] = useState('');
    const [category, setCategory] = useState<LocationCategory>('study');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radiusMeters, setRadiusMeters] = useState('200');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState('');
    const [suggestions, setSuggestions] = useState<SuggestedPlace[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const { colors, isDark } = useTheme();

    useEffect(() => {
        const loadSuggestions = async () => {
            setSuggestionsLoading(true);
            try {
                const livePings = await getTrackedPings(21);
                const allPings = livePings.length > 0 ? livePings : MOCK_RAW_PINGS;
                const results = suggestPlacesFromPings(allPings, places, 3);
                setSuggestions(results);
            } catch (err) {
                console.error('Failed to suggest places:', err);
            } finally {
                setSuggestionsLoading(false);
            }
        };
        loadSuggestions();
    }, [places]);

    const handleApplySuggestion = (suggestion: SuggestedPlace) => {
        setName(`AI Custom Spot ${places.length + 1}`);
        setLatitude(suggestion.latitude.toFixed(6));
        setLongitude(suggestion.longitude.toFixed(6));
        setRadiusMeters('200');
        setCategory(suggestion.category);
    };

    const handleUseCurrentGps = async () => {
        setGpsError('');
        setGpsLoading(true);

        try {
            const permission = await Location.requestForegroundPermissionsAsync();

            if (permission.status !== 'granted') {
                setGpsError('Location permission was denied.');
                return;
            }

            const current = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            setLatitude(current.coords.latitude.toFixed(6));
            setLongitude(current.coords.longitude.toFixed(6));
        } catch (e: unknown) {
            setGpsError(
                e instanceof Error ? e.message : 'Unable to get current location.'
            );
        } finally {
            setGpsLoading(false);
        }
    };

    const handleAdd = async () => {
        const parsedLat = Number(latitude);
        const parsedLon = Number(longitude);
        const parsedRadius = Number(radiusMeters);

        if (!name.trim() || Number.isNaN(parsedLat) || Number.isNaN(parsedLon)) {
            return;
        }

        const success = await createPlace({
            name,
            category,
            latitude: parsedLat,
            longitude: parsedLon,
            radiusMeters: Number.isNaN(parsedRadius) ? 200 : parsedRadius,
        });

        if (!success) {
            return;
        }

        setName('');
        setLatitude('');
        setLongitude('');
        setRadiusMeters('200');
    };

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
                    <Text className="text-2xl font-black tracking-tight" style={{ color: colors.textPrimary }}>Manage Places</Text>
                    <Text className="mt-1 text-xs font-semibold" style={{ color: colors.textSecondary }}>
                        Add geofenced places for spatial intelligence and tracking.
                    </Text>
                </View>

                {/* 💡 AI Suggested Places Panel */}
                <View 
                    className="mx-6 mt-4 overflow-hidden rounded-3xl border shadow-xl"
                    style={{ backgroundColor: colors.aiBg, borderColor: colors.aiBorder }}
                >
                    <LinearGradient
                        colors={isDark 
                            ? ['rgba(99, 102, 241, 0.15)', 'rgba(168, 85, 247, 0.05)', 'rgba(3, 7, 18, 0.3)']
                            : ['rgba(99, 102, 241, 0.05)', 'rgba(168, 85, 247, 0.01)', 'rgba(255, 255, 255, 0.8)']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ padding: 20 }}
                    >
                        <View className="flex-row items-center mb-2">
                            <Ionicons name="sparkles" size={18} color="#c084fc" />
                            <Text className="ml-2 text-base font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                AI Place Suggestions
                            </Text>
                        </View>
                        <Text className="text-xs mb-4 leading-relaxed font-semibold" style={{ color: colors.textSecondary }}>
                            Based on your raw location footprint, our clustering engine detected frequently visited spots outside your existing geofences.
                        </Text>

                        {suggestionsLoading ? (
                            <View className="py-6 items-center justify-center">
                                <ActivityIndicator size="small" color="#c084fc" />
                            </View>
                        ) : suggestions.length === 0 ? (
                            <View 
                                className="rounded-2xl border p-4 items-center"
                                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                            >
                                <Text className="text-xs font-bold uppercase tracking-wider text-center" style={{ color: colors.textTertiary }}>
                                    All footprints are inside registered places
                                </Text>
                            </View>
                        ) : (
                            suggestions.map((suggestion) => (
                                <View
                                    key={suggestion.id}
                                    className="mb-3 rounded-2xl border p-4 flex-row items-center justify-between shadow-sm"
                                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)', borderColor: colors.cardBorder }}
                                >
                                    <View className="flex-1 mr-3">
                                        <Text className="text-sm font-bold tracking-tight" style={{ color: colors.textPrimary }}>
                                            {suggestion.estimatedName}
                                        </Text>
                                        <Text className="mt-1 text-[10px] font-bold leading-normal uppercase" style={{ color: colors.textTertiary }}>
                                            Logged {suggestion.pingCount} times · Centroid: {suggestion.latitude.toFixed(4)}, {suggestion.longitude.toFixed(4)}
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => handleApplySuggestion(suggestion)}
                                        className="rounded-xl border px-3.5 py-2 active:bg-indigo-600/30"
                                        style={{ backgroundColor: colors.aiBg, borderColor: colors.aiBorder }}
                                    >
                                        <Text className="text-xs font-bold uppercase tracking-wider" style={{ color: colors.aiText }}>
                                            Use Spot
                                        </Text>
                                    </Pressable>
                                </View>
                            ))
                        )}
                    </LinearGradient>
                </View>

                {/* Form to Add Custom Place */}
                <View 
                    className="mx-6 mt-5 rounded-3xl border p-5 shadow-lg"
                    style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                >
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textSecondary }}>
                        New Place Geofence
                    </Text>

                    <TextInput
                        className="mb-3.5 rounded-xl border px-3.5 py-3 text-sm focus:border-indigo-500/40 focus:bg-slate-950/60"
                        style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff', color: colors.textPrimary, borderColor: colors.cardBorder }}
                        value={name}
                        onChangeText={setName}
                        placeholder="Place name"
                        placeholderTextColor="#475569"
                    />

                    {/* Semantic Category Pill Selectors */}
                    <Text className="mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Category Tag
                    </Text>
                    <View className="mb-4 flex-row flex-wrap gap-2">
                        {categories.map((item) => {
                            const isSelected = category === item;
                            const styleMode = isDark ? categoryStyles[item].dark : categoryStyles[item].light;
                            const iconName = categoryStyles[item].icon;
                            
                            return (
                                <Pressable
                                    key={item}
                                    onPress={() => setCategory(item)}
                                    className="rounded-full px-3.5 py-2 border flex-row items-center"
                                    style={{
                                        backgroundColor: isSelected ? styleMode.bg : (isDark ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.02)'),
                                        borderColor: isSelected ? styleMode.border : colors.cardBorder,
                                    }}
                                >
                                    <Ionicons 
                                        name={iconName} 
                                        size={12} 
                                        color={isSelected ? styleMode.text : colors.textTertiary} 
                                        style={{ marginRight: 4 }}
                                    />
                                    <Text
                                        className="text-xs font-bold uppercase tracking-wider"
                                        style={{ color: isSelected ? styleMode.text : colors.textSecondary }}
                                    >
                                        {item}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    <TextInput
                        className="mb-3.5 rounded-xl border px-3.5 py-3 text-sm focus:border-indigo-500/40 focus:bg-slate-950/60"
                        style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff', color: colors.textPrimary, borderColor: colors.cardBorder }}
                        value={latitude}
                        onChangeText={setLatitude}
                        placeholder="Latitude (e.g. 37.7858)"
                        placeholderTextColor="#475569"
                        keyboardType="decimal-pad"
                    />
                    <TextInput
                        className="mb-3.5 rounded-xl border px-3.5 py-3 text-sm focus:border-indigo-500/40 focus:bg-slate-950/60"
                        style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff', color: colors.textPrimary, borderColor: colors.cardBorder }}
                        value={longitude}
                        onChangeText={setLongitude}
                        placeholder="Longitude (e.g. -122.4064)"
                        placeholderTextColor="#475569"
                        keyboardType="decimal-pad"
                    />

                    <View className="mb-4 flex-row justify-start">
                        <Pressable
                            onPress={handleUseCurrentGps}
                            disabled={gpsLoading}
                            className="flex-row items-center rounded-xl border px-4 py-2.5 active:bg-slate-900/40"
                            style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.03)', borderColor: colors.cardBorder }}
                        >
                            <Ionicons name="locate-outline" size={14} color={colors.textSecondary} />
                            <Text className="ml-2 text-xs font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                {gpsLoading ? 'Locating...' : 'Use Current GPS'}
                            </Text>
                        </Pressable>
                    </View>

                    <Text className="mb-2 text-[9px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Geofence Boundary Radius
                    </Text>
                    <View className="mb-4 flex-row items-center gap-2">
                        {['100', '200', '500', '1000'].map((preset) => {
                            const isSelected = radiusMeters === preset;
                            return (
                                <Pressable
                                    key={preset}
                                    onPress={() => setRadiusMeters(preset)}
                                    className="rounded-xl px-3 py-2 border active:opacity-80"
                                    style={{
                                        backgroundColor: isSelected ? colors.productivityBg : (isDark ? 'rgba(0,0,0,0.2)' : 'rgba(15,23,42,0.02)'),
                                        borderColor: isSelected ? colors.productivityBorder : colors.cardBorder,
                                    }}
                                >
                                    <Text
                                        className="text-xs font-bold uppercase"
                                        style={{ color: isSelected ? colors.productivityText : colors.textSecondary }}
                                    >
                                        {preset === '1000' ? '1km' : `${preset}m`}
                                    </Text>
                                </Pressable>
                            );
                        })}
                        <View className="flex-1 ml-1.5">
                            <TextInput
                                className="rounded-xl border px-3 py-2 text-center text-xs"
                                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#ffffff', color: colors.textPrimary, borderColor: colors.cardBorder }}
                                value={radiusMeters}
                                onChangeText={setRadiusMeters}
                                placeholder="Custom"
                                placeholderTextColor="#475569"
                                keyboardType="number-pad"
                            />
                        </View>
                    </View>

                    {!!gpsError && (
                        <Text className="mb-3.5 text-xs font-semibold text-rose-400">{gpsError}</Text>
                    )}

                    <Pressable
                        onPress={handleAdd}
                        className="items-center rounded-xl bg-emerald-500 py-3.5 active:bg-emerald-600 shadow-lg shadow-emerald-950/30"
                    >
                        <Text className="text-xs font-black uppercase tracking-wider text-white">Add Geofence</Text>
                    </Pressable>

                    {!!error && <Text className="mt-3 text-xs font-semibold text-rose-400">{error}</Text>}
                </View>

                {/* Registered Places list */}
                <View className="px-6 pt-6">
                    <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.textTertiary }}>
                        Registered Places Geofences
                    </Text>

                    {loading ? (
                        <View className="py-6 justify-center">
                            <ActivityIndicator size="small" color="#10b981" />
                        </View>
                    ) : places.length === 0 ? (
                        <View 
                            className="rounded-2xl border p-5 items-center"
                            style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                        >
                            <Text className="text-xs font-bold uppercase text-center tracking-wider" style={{ color: colors.textTertiary }}>No registered places yet</Text>
                        </View>
                    ) : (
                        places.map((place) => {
                            const styleMode = isDark ? (categoryStyles[place.category]?.dark || categoryStyles.other.dark) : (categoryStyles[place.category]?.light || categoryStyles.other.light);
                            const catIcon = categoryStyles[place.category]?.icon || categoryStyles.other.icon;
                            
                            return (
                                <View
                                    key={place.id}
                                    className="mb-3 rounded-2xl border p-4 shadow-sm"
                                    style={{ backgroundColor: colors.cardBg, borderColor: colors.cardBorder }}
                                >
                                    <View className="flex-row items-center justify-between">
                                        <View className="flex-1 mr-3">
                                            <Text className="text-sm font-black tracking-tight" style={{ color: colors.textPrimary }}>
                                                {place.name}
                                            </Text>
                                            <View className="flex-row items-center mt-1.5 flex-wrap gap-2">
                                                <View 
                                                    className="rounded-full px-2 py-0.5 border flex-row items-center"
                                                    style={{ backgroundColor: styleMode.bg, borderColor: styleMode.border }}
                                                >
                                                    <Ionicons name={catIcon} size={10} color={styleMode.text} style={{ marginRight: 3 }} />
                                                    <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: styleMode.text }}>
                                                        {place.category}
                                                    </Text>
                                                </View>
                                                <View 
                                                    className="rounded-full px-2 py-0.5 border"
                                                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.03)', borderColor: colors.cardBorder }}
                                                >
                                                    <Text className="text-[9px] font-bold uppercase tracking-wider" style={{ color: colors.textSecondary }}>
                                                        Radius: {place.radiusMeters}m
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text className="mt-2 text-[10px] font-bold uppercase" style={{ color: colors.textTertiary }}>
                                                Centroid: {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                                            </Text>
                                        </View>
                                        <Pressable
                                            onPress={() => removePlace(place.id)}
                                            className="rounded-xl border bg-rose-500/5 p-2.5 active:bg-rose-500/10"
                                            style={{ borderColor: 'rgba(239, 68, 68, 0.2)' }}
                                        >
                                            <Ionicons
                                                name="trash-outline"
                                                size={15}
                                                color="#f87171"
                                            />
                                        </Pressable>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
