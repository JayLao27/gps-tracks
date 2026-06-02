// TODO: FUTURE PLACES & GEOFENCING CORE ENHANCEMENTS:
// 1. Custom Places Offline Sync: Implement an automated sync manager to upload locally cached offline places
//    stored in AsyncStorage to Supabase once database connection is restored.
// 2. Reverse Geocoding Integration: Use Location.reverseGeocodeAsync() to fetch street names and city info
//    automatically based on latitude/longitude inputs to suggest friendly names for places.
// 3. Overlap Detection: Prevent the creation of overlapping geofences by checking distance metrics
//    between a new centroid and existing registered places, warning users of redundant triggers.

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { LocationCategory } from './locationIntelligence';
import { supabase } from './supabase';

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

    const place: KnownPlace = {
        id,
        userId,
        name: input.name.trim(),
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
        radiusMeters: input.radiusMeters,
    };

    if (!place.name) {
        throw new Error('Place name is required.');
    }

    if (!userId) {
        const existing = await readLocalKnownPlaces();
        const next = [...existing, place];
        await writeLocalKnownPlaces(next);
        return place;
    }

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
        throw new Error(error?.message ?? 'Failed to add place.');
    }

    return mapFromSupabase(data as SupabaseKnownPlaceRow);
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
