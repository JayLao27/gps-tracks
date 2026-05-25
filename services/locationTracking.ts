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

export function distanceMeters(
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

// TODO: FUTURE IMPROVEMENTS & ARCHITECTURAL TODOS:
// 1. Offline Sync Engine: Implement a queue-based sync manager that detects internet connectivity
//    restoration and uploads locally stored fallback pings (`gps_tracks.location_pings`),
//    locations (`gps_tracks.locations`), and visits (`gps_tracks.visits`) to Supabase.
// 2. Kalman Filtering & Noise Denoising: Implement a denoising filter to discard coordinate points
//    with low horizontal accuracy (e.g. accuracy > 50 meters) or erratic speed transitions to
//    prevent route jitter and distance skewing.
// 3. Batch DB Writes: Buffer telemetry data points in a local memory array or SQLite instance and
//    bulk-insert/batch-write them to Supabase (e.g. every 1-2 minutes or when tracking stops)
//    rather than making high-frequency individual HTTP network calls.
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

export interface LocationRecord {
    id?: number;
    userId: string;
    latitude: number;
    longitude: number;
    speed: number | null;
    createdAt: string;
}

export interface VisitSession {
    id?: number;
    userId: string;
    placeName: string;
    enteredAt: string;
    exitedAt: string;
    durationMinutes: number;
}

const LOCAL_LOCATIONS_KEY = 'gps_tracks.locations';
const LOCAL_VISITS_KEY = 'gps_tracks.visits';

let lastLocationCoords: { latitude: number; longitude: number; timestamp: string } | null = null;
let stationaryTimeMs = 0;
let activeSession: { placeName: string; enteredAt: string; lastActiveAt: string } | null = null;

export function resetStayState() {
    lastLocationCoords = null;
    stationaryTimeMs = 0;
    activeSession = null;
}

export async function readLocalLocations(): Promise<LocationRecord[]> {
    const json = await AsyncStorage.getItem(LOCAL_LOCATIONS_KEY);
    if (!json) return [];
    try {
        return JSON.parse(json) as LocationRecord[];
    } catch {
        return [];
    }
}

export async function writeLocalLocations(locations: LocationRecord[]): Promise<void> {
    await AsyncStorage.setItem(LOCAL_LOCATIONS_KEY, JSON.stringify(locations));
}

export async function readLocalVisits(): Promise<VisitSession[]> {
    const json = await AsyncStorage.getItem(LOCAL_VISITS_KEY);
    if (!json) return [];
    try {
        return JSON.parse(json) as VisitSession[];
    } catch {
        return [];
    }
}

export async function writeLocalVisits(visits: VisitSession[]): Promise<void> {
    await AsyncStorage.setItem(LOCAL_VISITS_KEY, JSON.stringify(visits));
}

export async function persistLocationToDb(
    latitude: number,
    longitude: number,
    speed: number | null,
    timestamp: string = new Date().toISOString()
): Promise<LocationRecord> {
    const userId = await getCurrentUserId();
    const record: LocationRecord = {
        userId: userId ?? 'anon',
        latitude,
        longitude,
        speed,
        createdAt: timestamp,
    };

    try {
        if (userId) {
            const { error } = await supabase.from('locations').insert({
                user_id: userId,
                latitude: record.latitude,
                longitude: record.longitude,
                speed: record.speed,
                created_at: record.createdAt,
            });

            if (error) {
                const existing = await readLocalLocations();
                await writeLocalLocations([...existing, record].slice(-3000));
            }
        } else {
            const existing = await readLocalLocations();
            await writeLocalLocations([...existing, record].slice(-3000));
        }
    } catch {
        const existing = await readLocalLocations();
        await writeLocalLocations([...existing, record].slice(-3000));
    }

    return record;
}

export async function persistVisitSessionToDb(
    placeName: string,
    enteredAt: string,
    exitedAt: string,
    durationMinutes: number
): Promise<VisitSession> {
    const userId = await getCurrentUserId();
    const visit: VisitSession = {
        userId: userId ?? 'anon',
        placeName,
        enteredAt,
        exitedAt,
        durationMinutes,
    };

    try {
        if (userId) {
            const { error } = await supabase.from('visits').insert({
                user_id: userId,
                place_name: visit.placeName,
                entered_at: visit.enteredAt,
                exited_at: visit.exitedAt,
                duration_minutes: visit.durationMinutes,
            });

            if (error) {
                const existing = await readLocalVisits();
                await writeLocalVisits([...existing, visit].slice(-500));
            }
        } else {
            const existing = await readLocalVisits();
            await writeLocalVisits([...existing, visit].slice(-500));
        }
    } catch {
        const existing = await readLocalVisits();
        await writeLocalVisits([...existing, visit].slice(-500));
    }

    return visit;
}

export async function getTrackedLocations(days = 21): Promise<LocationRecord[]> {
    const userId = await getCurrentUserId();
    if (userId) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', since.toISOString())
            .order('created_at', { ascending: true });

        if (!error && data) {
            return data.map((row: any) => ({
                id: row.id,
                userId: row.user_id,
                latitude: row.latitude,
                longitude: row.longitude,
                speed: row.speed,
                createdAt: row.created_at,
            }));
        }
    }

    // Local fallback
    const since = new Date();
    since.setDate(since.getDate() - days);
    const locations = await readLocalLocations();
    return locations
        .filter((loc) => new Date(loc.createdAt).getTime() >= since.getTime())
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function getTrackedVisitsList(days = 21): Promise<VisitSession[]> {
    const userId = await getCurrentUserId();
    if (userId) {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
            .from('visits')
            .select('*')
            .eq('user_id', userId)
            .gte('entered_at', since.toISOString())
            .order('entered_at', { ascending: false });

        if (!error && data) {
            return data.map((row: any) => ({
                id: row.id,
                userId: row.user_id,
                placeName: row.place_name,
                enteredAt: row.entered_at,
                exitedAt: row.exited_at,
                durationMinutes: row.duration_minutes,
            }));
        }
    }

    // Local fallback
    const since = new Date();
    since.setDate(since.getDate() - days);
    const visits = await readLocalVisits();
    return visits
        .filter((v) => new Date(v.enteredAt).getTime() >= since.getTime())
        .sort((a, b) => new Date(b.enteredAt).getTime() - new Date(a.enteredAt).getTime());
}

export async function processStayDetection(
    latitude: number,
    longitude: number,
    speed: number | null,
    timestamp: string
): Promise<{
    distanceFromPrevious: number;
    stationaryTime: number;
    sessionSaved: boolean;
    activePlace: string;
} | null> {
    const { locationName } = await resolvePlace(latitude, longitude);
    let distanceFromPrevious = 0;
    let elapsedMs = 0;
    let sessionSaved = false;

    if (lastLocationCoords) {
        distanceFromPrevious = distanceMeters(
            lastLocationCoords.latitude,
            lastLocationCoords.longitude,
            latitude,
            longitude
        );
        elapsedMs = new Date(timestamp).getTime() - new Date(lastLocationCoords.timestamp).getTime();

        if (distanceFromPrevious < 20) {
            stationaryTimeMs += elapsedMs;
        } else {
            stationaryTimeMs = 0;
        }
    }

    lastLocationCoords = { latitude, longitude, timestamp };

    // Session logic
    if (!activeSession) {
        activeSession = {
            placeName: locationName,
            enteredAt: timestamp,
            lastActiveAt: timestamp,
        };
    } else {
        const samePlace = activeSession.placeName === locationName;
        // If they are in the same place or stationary, we stay in the active session
        if (samePlace || distanceFromPrevious < 20) {
            activeSession.lastActiveAt = timestamp;
        } else {
            // End active session & save
            const durationMs = new Date(activeSession.lastActiveAt).getTime() - new Date(activeSession.enteredAt).getTime();
            const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

            await persistVisitSessionToDb(
                activeSession.placeName,
                activeSession.enteredAt,
                activeSession.lastActiveAt,
                durationMinutes
            );
            sessionSaved = true;

            // Start new session
            activeSession = {
                placeName: locationName,
                enteredAt: timestamp,
                lastActiveAt: timestamp,
            };
            stationaryTimeMs = 0;
        }
    }

    return {
        distanceFromPrevious,
        stationaryTime: Math.round(stationaryTimeMs / 1000), // in seconds
        sessionSaved,
        activePlace: activeSession.placeName,
    };
}

export async function startForegroundLocationTracking(
    onPing: (ping: TrackedLocationPing) => void,
    onStayUpdate?: (stay: { distanceFromPrevious: number; stationaryTime: number; activePlace: string; speed: number | null; sessionSaved: boolean }) => void,
    onError?: (message: string) => void
): Promise<Location.LocationSubscription | null> {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
        onError?.('Location permission was denied.');
        return null;
    }

    resetStayState();

    const subscription = await Location.watchPositionAsync(
        {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
            timeInterval: 10000,
        },
        async (position) => {
            try {
                const timestampStr = new Date(position.timestamp).toISOString();
                const speed = position.coords.speed !== undefined && position.coords.speed !== null ? position.coords.speed : null;

                // 1. Persist classic ping
                const ping = await persistTrackedPing(
                    position.coords.latitude,
                    position.coords.longitude,
                    timestampStr
                );

                // 2. Persist to new locations table
                await persistLocationToDb(
                    position.coords.latitude,
                    position.coords.longitude,
                    speed,
                    timestampStr
                );

                // 3. Process stay detection
                const stayResult = await processStayDetection(
                    position.coords.latitude,
                    position.coords.longitude,
                    speed,
                    timestampStr
                );

                if (stayResult && onStayUpdate) {
                    onStayUpdate({
                        distanceFromPrevious: stayResult.distanceFromPrevious,
                        stationaryTime: stayResult.stationaryTime,
                        activePlace: stayResult.activePlace,
                        speed,
                        sessionSaved: stayResult.sessionSaved,
                    });
                }

                onPing(ping);
            } catch (err) {
                console.error(err);
                onError?.('Unable to save location update.');
            }
        }
    );

    return subscription;
}

export async function stopForegroundLocationTracking(
    subscription: Location.LocationSubscription | null
): Promise<void> {
    if (!subscription) {
        return;
    }

    try {
        subscription.remove();
    } catch {
        // Some expo-location / React Native version combinations throw here due to
        // an internal event emitter API mismatch. We swallow this to avoid a crash.
    }

    // Save final open session if active when tracking stops
    if (activeSession) {
        try {
            const durationMs = new Date(activeSession.lastActiveAt).getTime() - new Date(activeSession.enteredAt).getTime();
            const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
            await persistVisitSessionToDb(
                activeSession.placeName,
                activeSession.enteredAt,
                activeSession.lastActiveAt,
                durationMinutes
            );
        } catch (e) {
            console.error('Failed to save final visit session on stop:', e);
        }
    }

    resetStayState();
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
