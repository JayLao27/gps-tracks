import { useKnownPlaces } from '@/hooks/useKnownPlaces';
import type { LocationCategory } from '@/services/locationIntelligence';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useState } from 'react';
import {
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

export default function Places() {
    const { places, loading, error, createPlace, removePlace } = useKnownPlaces();

    const [name, setName] = useState('');
    const [category, setCategory] = useState<LocationCategory>('study');
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radiusMeters, setRadiusMeters] = useState('200');
    const [gpsLoading, setGpsLoading] = useState(false);
    const [gpsError, setGpsError] = useState('');

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
                    <Text className="text-2xl font-bold text-white">Manage Places</Text>
                    <Text className="mt-1 text-sm text-slate-400">
                        Add custom places for smarter category detection.
                    </Text>
                </View>

                <View className="mx-6 mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <Text className="mb-2 text-xs uppercase tracking-widest text-slate-400">
                        New place
                    </Text>

                    <TextInput
                        className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                        value={name}
                        onChangeText={setName}
                        placeholder="Place name"
                        placeholderTextColor="#64748b"
                    />

                    <View className="mb-3 flex-row flex-wrap gap-2">
                        {categories.map((item) => (
                            <Pressable
                                key={item}
                                onPress={() => setCategory(item)}
                                className={`rounded-full px-3 py-1.5 ${
                                    category === item
                                        ? 'bg-emerald-500'
                                        : 'border border-white/10 bg-white/5'
                                }`}
                            >
                                <Text
                                    className={`text-xs font-semibold uppercase ${
                                        category === item ? 'text-white' : 'text-slate-300'
                                    }`}
                                >
                                    {item}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    <TextInput
                        className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                        value={latitude}
                        onChangeText={setLatitude}
                        placeholder="Latitude"
                        placeholderTextColor="#64748b"
                        keyboardType="decimal-pad"
                    />
                    <TextInput
                        className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                        value={longitude}
                        onChangeText={setLongitude}
                        placeholder="Longitude"
                        placeholderTextColor="#64748b"
                        keyboardType="decimal-pad"
                    />

                    <Pressable
                        onPress={handleUseCurrentGps}
                        disabled={gpsLoading}
                        className="mb-3 flex-row items-center self-start rounded-xl border border-white/20 px-3 py-2 active:bg-white/10"
                    >
                        <Ionicons name="locate-outline" size={14} color="#cbd5e1" />
                        <Text className="ml-2 text-xs font-semibold text-slate-300">
                            {gpsLoading ? 'Getting GPS...' : 'Use Current GPS'}
                        </Text>
                    </Pressable>

                    {!!gpsError && (
                        <Text className="mb-3 text-xs text-red-300">{gpsError}</Text>
                    )}

                    <TextInput
                        className="mb-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                        value={radiusMeters}
                        onChangeText={setRadiusMeters}
                        placeholder="Radius (meters)"
                        placeholderTextColor="#64748b"
                        keyboardType="number-pad"
                    />

                    <Pressable
                        onPress={handleAdd}
                        className="items-center rounded-xl bg-emerald-500 py-3 active:bg-emerald-600"
                    >
                        <Text className="text-sm font-bold text-white">Add Place</Text>
                    </Pressable>

                    {!!error && <Text className="mt-3 text-xs text-red-300">{error}</Text>}
                </View>

                <View className="px-6 pt-6">
                    <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Your custom places
                    </Text>

                    {loading ? (
                        <Text className="text-sm text-slate-400">Loading places...</Text>
                    ) : places.length === 0 ? (
                        <Text className="text-sm text-slate-400">No custom places yet.</Text>
                    ) : (
                        places.map((place) => (
                            <View
                                key={place.id}
                                className="mb-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                            >
                                <View className="flex-row items-center justify-between">
                                    <View>
                                        <Text className="text-sm font-semibold text-white">
                                            {place.name}
                                        </Text>
                                        <Text className="mt-1 text-xs uppercase text-slate-400">
                                            {place.category}
                                        </Text>
                                        <Text className="mt-1 text-xs text-slate-500">
                                            {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)} | {place.radiusMeters}m
                                        </Text>
                                    </View>
                                    <Pressable
                                        onPress={() => removePlace(place.id)}
                                        className="rounded-lg border border-red-400/40 px-2.5 py-2"
                                    >
                                        <Ionicons
                                            name="trash-outline"
                                            size={16}
                                            color="#f87171"
                                        />
                                    </Pressable>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </LinearGradient>
    );
}
