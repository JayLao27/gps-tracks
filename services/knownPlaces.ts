/**
 * ============================================================================
 * MODULE: services/knownPlaces.ts
 * LAYER: Data Access / Offline Caching Layer
 * DESCRIPTION: Coordinates geofenced KnownPlaces persistence. Bridges local SQLite
 *              with remote Supabase models and manages offline sync transitions.
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

import type { LocationCategory } from './locationIntelligence';
import { supabase } from './supabase';

function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export interface KnownPlace {
    id: string;
    userId?: string;
    name: string;
    category: LocationCategory;
    latitude: number;
    longitude: number;
    radiusMeters: number;
    createdAt?: string;
}

type SupabaseKnownPlaceRow = {
    id: string;
    user_id: string;
    name: string;
    category: LocationCategory;
    latitude: number;
    longitude: number;
    radius_meters: number;
    created_at: string;
};

const LOCAL_KNOWN_PLACES_KEY = 'gps_tracks.known_places';

const DEFAULT_KNOWN_PLACES: KnownPlace[] = [
    {
        id: 'default-home',
        name: 'Home',
        category: 'home',
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 250,
    },
    {
        id: 'default-library',
        name: 'Library',
        category: 'study',
        latitude: 37.7782,
        longitude: -122.4158,
        radiusMeters: 250,
    },
    {
        id: 'default-campus',
        name: 'Campus',
        category: 'study',
        latitude: 37.8715,
        longitude: -122.273,
        radiusMeters: 350,
    },
    {
        id: 'default-gym',
        name: 'Gym',
        category: 'gym',
        latitude: 37.7812,
        longitude: -122.4113,
        radiusMeters: 250,
    },
    {
        id: 'default-cafe',
        name: 'Cafe',
        category: 'social',
        latitude: 37.7764,
        longitude: -122.4241,
        radiusMeters: 220,
    },
    {
        id: 'default-office',
        name: 'Office',
        category: 'work',
        latitude: 37.7896,
        longitude: -122.4012,
        radiusMeters: 300,
    },
];

async function getCurrentUserId(): Promise<string | undefined> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return user?.id;
}

async function readLocalKnownPlaces(): Promise<KnownPlace[]> {
    const json = await AsyncStorage.getItem(LOCAL_KNOWN_PLACES_KEY);
    if (!json) return [];

    try {
        return JSON.parse(json) as KnownPlace[];
    } catch {
        return [];
    }
}

async function writeLocalKnownPlaces(places: KnownPlace[]): Promise<void> {
    await AsyncStorage.setItem(LOCAL_KNOWN_PLACES_KEY, JSON.stringify(places));
}

function mapFromSupabase(row: SupabaseKnownPlaceRow): KnownPlace {
    return {
        id: row.id,
        userId: row.user_id,
        name: row.name,
        category: row.category,
        latitude: row.latitude,
        longitude: row.longitude,
        radiusMeters: row.radius_meters,
        createdAt: row.created_at,
    };
}

export function getDefaultKnownPlaces(): KnownPlace[] {
    return DEFAULT_KNOWN_PLACES;
}

export async function getKnownPlaces(): Promise<KnownPlace[]> {
    const userId = await getCurrentUserId();

    if (!userId) {
        return readLocalKnownPlaces();
    }

    try {
        const { data, error } = await supabase
            .from('known_places')
            .select('id, user_id, name, category, latitude, longitude, radius_meters, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error || !data) {
            return readLocalKnownPlaces();
        }

        return (data as SupabaseKnownPlaceRow[]).map(mapFromSupabase);
    } catch {
        return readLocalKnownPlaces();
    }
}

export async function getEffectiveKnownPlaces(): Promise<KnownPlace[]> {
    const custom = await getKnownPlaces();
    return [...DEFAULT_KNOWN_PLACES, ...custom];
}

export async function addKnownPlace(
    input: Omit<KnownPlace, 'id' | 'userId' | 'createdAt'>
): Promise<KnownPlace> {
    const userId = await getCurrentUserId();
    const id = `${userId ?? 'anon'}-${Date.now()}`;

    // Overlap detection
    const existingPlaces = await getEffectiveKnownPlaces();
    for (const p of existingPlaces) {
        const dist = distanceMeters(input.latitude, input.longitude, p.latitude, p.longitude);
        const combinedRadius = (input.radiusMeters || 200) + (p.radiusMeters || 200);
        if (dist < combinedRadius) {
            throw new Error(`This location overlaps with geofence "${p.name}" (Distance: ${Math.round(dist)}m).`);
        }
    }

    let nameToUse = input.name.trim();
    if (!nameToUse) {
        try {
            if (Platform.OS !== 'web') {
                const geo = await Location.reverseGeocodeAsync({
                    latitude: input.latitude,
                    longitude: input.longitude,
                });
                if (geo && geo.length > 0) {
                    const first = geo[0];
                    const street = first.street || first.name || '';
                    const city = first.city || '';
                    nameToUse = street ? `${street}, ${city}` : (city || 'Custom Spot');
                }
            }
        } catch (e) {
            console.error('Reverse geocoding failed:', e);
        }
        if (!nameToUse) {
            nameToUse = `Spot (${input.latitude.toFixed(4)}, ${input.longitude.toFixed(4)})`;
        }
    }

    const place: KnownPlace = {
        id,
        userId,
        name: nameToUse,
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
    };

    if (!userId) {
        const existing = await readLocalKnownPlaces();
        const next = [...existing, place];
        await writeLocalKnownPlaces(next);
        return place;
    }

    try {
        const { data, error } = await supabase
            .from('known_places')
            .insert({
                id: place.id,
                user_id: userId,
                name: place.name,
                category: place.category,
                latitude: place.latitude,
                longitude: place.longitude,
                radius_meters: place.radiusMeters,
            })
            .select('id, user_id, name, category, latitude, longitude, radius_meters, created_at')
            .single();

        if (error || !data) {
            // Save to local cache on DB failure (e.g., offline)
            const existing = await readLocalKnownPlaces();
            const next = [...existing, place];
            await writeLocalKnownPlaces(next);
            return place;
        }

        return mapFromSupabase(data as SupabaseKnownPlaceRow);
    } catch {
        // Save to local cache on network throws
        const existing = await readLocalKnownPlaces();
        const next = [...existing, place];
        await writeLocalKnownPlaces(next);
        return place;
    }
}

export async function deleteKnownPlace(placeId: string): Promise<void> {
    const userId = await getCurrentUserId();

    if (!userId) {
        const existing = await readLocalKnownPlaces();
        const next = existing.filter((place) => place.id !== placeId);
        await writeLocalKnownPlaces(next);
        return;
    }

    const { error } = await supabase
        .from('known_places')
        .delete()
        .eq('id', placeId)
        .eq('user_id', userId);

    if (error) {
        throw new Error(error.message);
    }
}

/**
 * Synchronizes any custom places added while offline or anonymous to Supabase.
 * Auto-rebinds anonymous records to the current authenticated user's ID.
 */
export async function syncOfflineKnownPlaces(): Promise<void> {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const localPlaces = await readLocalKnownPlaces();
    if (localPlaces.length === 0) return;

    // Map custom offline place IDs to the active user's ID
    const placesToSync = localPlaces.map((p) => ({
        id: p.id.includes('anon-') ? `${userId}-${p.id.split('-').slice(1).join('-')}` : p.id,
        user_id: userId,
        name: p.name,
        category: p.category,
        latitude: p.latitude,
        longitude: p.longitude,
        radius_meters: p.radiusMeters,
    }));

    try {
        const { error } = await supabase
            .from('known_places')
            .upsert(placesToSync, { onConflict: 'id' });

        if (!error) {
            await writeLocalKnownPlaces([]);
        } else {
            console.error('Failed to sync offline known places:', error);
        }
    } catch (e) {
        console.error('Error in syncOfflineKnownPlaces:', e);
    }
}
