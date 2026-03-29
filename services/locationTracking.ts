import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { getEffectiveKnownPlaces } from './knownPlaces';
import type { LocationCategory, LocationVisit } from './locationIntelligence';
import { supabase } from './supabase';

export interface TrackedLocationPing {
    id: string;
    userId?: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    locationName: string;
    category: LocationCategory;
}

type SupabasePingRow = {
    id: string;
    user_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    location_name: string;
    category: LocationCategory;
};

const LOCAL_PINGS_KEY = 'gps_tracks.location_pings';

function toRadians(value: number): number {
    return (value * Math.PI) / 180;
}

function distanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const earthRadius = 6371000;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
            Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadius * c;
}

async function resolvePlace(latitude: number, longitude: number): Promise<{
    locationName: string;
    category: LocationCategory;
}> {
    const places = await getEffectiveKnownPlaces();
    let best: (typeof places)[number] | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const place of places) {
        const d = distanceMeters(latitude, longitude, place.latitude, place.longitude);
        if (d <= place.radiusMeters && d < bestDistance) {
            best = place;
            bestDistance = d;
        }
    }

    if (best) {
        return { locationName: best.name, category: best.category };
    }

    return {
        locationName: `Lat ${latitude.toFixed(3)}, Lon ${longitude.toFixed(3)}`,
        category: 'other',
    };
}

async function getCurrentUserId(): Promise<string | undefined> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return user?.id;
}

async function readLocalPings(): Promise<TrackedLocationPing[]> {
    const json = await AsyncStorage.getItem(LOCAL_PINGS_KEY);
    if (!json) return [];

    try {
        return JSON.parse(json) as TrackedLocationPing[];
    } catch {
        return [];
    }
}

async function writeLocalPings(pings: TrackedLocationPing[]): Promise<void> {
    await AsyncStorage.setItem(LOCAL_PINGS_KEY, JSON.stringify(pings));
}

async function appendLocalPing(ping: TrackedLocationPing): Promise<void> {
    const existing = await readLocalPings();
    const next = [...existing, ping].slice(-3000);
    await writeLocalPings(next);
}

export async function persistTrackedPing(
    latitude: number,
    longitude: number,
    timestamp: string = new Date().toISOString()
): Promise<TrackedLocationPing> {
    const userId = await getCurrentUserId();
    const { locationName, category } = await resolvePlace(latitude, longitude);

    const ping: TrackedLocationPing = {
        id: `${userId ?? 'anon'}-${timestamp}`,
        userId,
        latitude,
        longitude,
        timestamp,
        locationName,
        category,
    };

    try {
        if (userId) {
            const { error } = await supabase.from('location_pings').insert({
                id: ping.id,
                user_id: userId,
                latitude: ping.latitude,
                longitude: ping.longitude,
                timestamp: ping.timestamp,
                location_name: ping.locationName,
                category: ping.category,
            });

            if (error) {
                await appendLocalPing(ping);
            }
        } else {
            await appendLocalPing(ping);
        }
    } catch {
        await appendLocalPing(ping);
    }

    return ping;
}

export async function startForegroundLocationTracking(
    onPing: (ping: TrackedLocationPing) => void,
    onError?: (message: string) => void
): Promise<Location.LocationSubscription | null> {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
        onError?.('Location permission was denied.');
        return null;
    }

    const subscription = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 50,
            timeInterval: 60_000,
        },
        async (position) => {
            try {
                const ping = await persistTrackedPing(
                    position.coords.latitude,
                    position.coords.longitude,
                    new Date(position.timestamp).toISOString()
                );
                onPing(ping);
            } catch {
                onError?.('Unable to save location update.');
            }
        }
    );

    return subscription;
}

export function stopForegroundLocationTracking(
    subscription: Location.LocationSubscription | null
): void {
    if (!subscription) {
        return;
    }

    try {
        subscription.remove();
    } catch {
        // Some expo-location / React Native version combinations throw here due to
        // an internal event emitter API mismatch. We swallow this to avoid a crash.
    }
}

async function fetchSupabasePings(days: number): Promise<TrackedLocationPing[]> {
    const userId = await getCurrentUserId();
    if (!userId) return [];

    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await supabase
        .from('location_pings')
        .select('id, user_id, latitude, longitude, timestamp, location_name, category')
        .eq('user_id', userId)
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: true });

    if (error || !data) return [];

    return (data as SupabasePingRow[]).map((row) => ({
        id: row.id,
        userId: row.user_id,
        latitude: row.latitude,
        longitude: row.longitude,
        timestamp: row.timestamp,
        locationName: row.location_name,
        category: row.category,
    }));
}

async function fetchLocalPings(days: number): Promise<TrackedLocationPing[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const pings = await readLocalPings();

    return pings
        .filter((ping) => new Date(ping.timestamp).getTime() >= since.getTime())
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function getTrackedPings(days = 21): Promise<TrackedLocationPing[]> {
    const supabasePings = await fetchSupabasePings(days);
    if (supabasePings.length > 0) return supabasePings;
    return fetchLocalPings(days);
}

export function aggregatePingsToVisits(pings: TrackedLocationPing[]): LocationVisit[] {
    if (pings.length === 0) return [];

    const sorted = [...pings].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const visits: LocationVisit[] = [];
    const maxGapMs = 45 * 60 * 1000;

    let current = {
        id: sorted[0].id,
        locationName: sorted[0].locationName,
        category: sorted[0].category,
        latitude: sorted[0].latitude,
        longitude: sorted[0].longitude,
        start: sorted[0].timestamp,
        end: sorted[0].timestamp,
    };

    for (let i = 1; i < sorted.length; i += 1) {
        const ping = sorted[i];
        const previous = sorted[i - 1];

        const gap =
            new Date(ping.timestamp).getTime() - new Date(previous.timestamp).getTime();

        const sameLocation =
            ping.locationName === current.locationName && ping.category === current.category;

        if (sameLocation && gap <= maxGapMs) {
            current.end = ping.timestamp;
            continue;
        }

        const endTime = new Date(current.end);
        endTime.setMinutes(endTime.getMinutes() + 10);

        visits.push({
            id: current.id,
            locationName: current.locationName,
            category: current.category,
            latitude: current.latitude,
            longitude: current.longitude,
            startTime: current.start,
            endTime: endTime.toISOString(),
        });

        current = {
            id: ping.id,
            locationName: ping.locationName,
            category: ping.category,
            latitude: ping.latitude,
            longitude: ping.longitude,
            start: ping.timestamp,
            end: ping.timestamp,
        };
    }

    const finalEnd = new Date(current.end);
    finalEnd.setMinutes(finalEnd.getMinutes() + 10);

    visits.push({
        id: current.id,
        locationName: current.locationName,
        category: current.category,
        latitude: current.latitude,
        longitude: current.longitude,
        startTime: current.start,
        endTime: finalEnd.toISOString(),
    });

    return visits;
}

export async function getTrackedVisits(days = 21): Promise<LocationVisit[]> {
    const pings = await getTrackedPings(days);
    return aggregatePingsToVisits(pings);
}
