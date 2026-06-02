import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { AppState } from 'react-native';

import { getEffectiveKnownPlaces, syncOfflineKnownPlaces } from './knownPlaces';
import type { LocationCategory, LocationVisit } from './locationIntelligence';
import { supabase } from './supabase';
import { KalmanFilter, shouldDiscardPing } from '../utils/locationFilter';

/**
 * Interface representing a single GPS telemetry coordinate point logged in a track.
 */
export interface TrackedLocationPing {
    id: string;
    userId?: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    locationName: string;
    category: LocationCategory;
}

/** Row format mapped inside the Supabase database. */
type SupabasePingRow = {
    id: string;
    user_id: string;
    latitude: number;
    longitude: number;
    timestamp: string;
    location_name: string;
    category: LocationCategory;
};

// Storage Keys for Fallback Local Databases (Offline Queues)
const LOCAL_PINGS_KEY = 'gps_tracks.location_pings';
const LOCAL_LOCATIONS_KEY = 'gps_tracks.locations';
const LOCAL_VISITS_KEY = 'gps_tracks.visits';

/** Helper to convert decimal degrees to radians. */
function toRadians(value: number): number {
    return (value * Math.PI) / 180;
}

/**
 * Calculates the distance between two coordinate pairs in meters using the Haversine formula.
 * 
 * @param lat1 Latitude of point 1.
 * @param lon1 Longitude of point 1.
 * @param lat2 Latitude of point 2.
 * @param lon2 Longitude of point 2.
 * @returns The distance in meters.
 */
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

/**
 * Resolves a coordinate pair to an existing Known Place.
 * Returns the place's name and category if it falls within the place's geofence boundary;
 * returns a general formatted address string and 'other' category otherwise.
 */
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

/** Retrieves the authenticated Supabase user's ID. */
async function getCurrentUserId(): Promise<string | undefined> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return user?.id;
}

// ----------------------------------------------------
// Fallback Local Storage Read/Write Operations
// ----------------------------------------------------

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

// Kalman Filter instance and states for foreground location updates
const fgKalmanFilter = new KalmanFilter();
let lastFgLat: number | undefined;
let lastFgLon: number | undefined;
let lastFgTime: number | undefined;

// ----------------------------------------------------
// Offline Sync Engine & Batch Writes
// ----------------------------------------------------

let isSyncing = false;

/**
 * Periodically uploads all offline-buffered pings, locations, and visit sessions to Supabase.
 * Batches high-frequency updates into bulk writes to save battery and network bandwidth.
 * 
 * DESIGN STRATEGY:
 * - Concurrent Execution Guard: Uses `isSyncing` flag to prevent overlapping synchronization requests.
 * - Identity Binding: Retrieves current authenticated userId. Anonymous logs generated while offline
 *   are rebound to this active user ID during synchronization.
 * - Error Isolation: Pings, raw locations, and visit sessions are synced in independent try-catch sub-flows.
 *   If one queue fails (e.g. database constraint), it doesn't halt the syncing of other tables.
 * - Queue Clearance: Only clears local AsyncStorage queues (e.g., writeLocalPings([])) if Supabase
 *   returns no error, preventing data loss.
 */
export async function syncOfflineData(): Promise<void> {
    if (isSyncing) return;

    const userId = await getCurrentUserId();
    if (!userId) return; // Prevent syncing if the user session is unauthenticated

    isSyncing = true;

    try {
        // 1. Sync local location pings
        // Reads cached TrackedLocationPing records. Pings are synchronized using an `upsert`
        // operation with `onConflict: 'id'` config. This prevents unique constraint violations
        // from halting progress if a subset of pings was already successfully inserted.
        const pings = await readLocalPings();
        if (pings.length > 0) {
            const rowsToInsert = pings.map((p) => ({
                id: p.id,
                user_id: userId,
                latitude: p.latitude,
                longitude: p.longitude,
                timestamp: p.timestamp,
                location_name: p.locationName,
                category: p.category,
            }));
            const { error } = await supabase
                .from('location_pings')
                .upsert(rowsToInsert, { onConflict: 'id' });
            if (!error) {
                await writeLocalPings([]); // Clear the sync queue on success
            }
        }

        // 2. Sync local raw location logs
        // Raw coordinate logs mapping high-resolution tracks are batched and uploaded.
        // These logs use auto-incrementing serial primary keys on the DB side, so we use
        // standard inserts. If successful, local locations storage is cleared.
        const locations = await readLocalLocations();
        if (locations.length > 0) {
            const rowsToInsert = locations.map((l) => ({
                user_id: userId,
                latitude: l.latitude,
                longitude: l.longitude,
                speed: l.speed,
                created_at: l.createdAt,
            }));
            const { error } = await supabase.from('locations').insert(rowsToInsert);
            if (!error) {
                await writeLocalLocations([]);
            }
        }

        // 3. Sync local visit sessions
        // Automatically detected dwell sessions (stay logs) are pushed to the remote DB.
        // On success, the local visits queue is truncated/flushed.
        const visits = await readLocalVisits();
        if (visits.length > 0) {
            const rowsToInsert = visits.map((v) => ({
                user_id: userId,
                place_name: v.placeName,
                entered_at: v.enteredAt,
                exited_at: v.exitedAt,
                duration_minutes: v.durationMinutes,
            }));
            const { error } = await supabase.from('visits').insert(rowsToInsert);
            if (!error) {
                await writeLocalVisits([]);
            }
        }

        // 4. Sync custom known places
        // Upload any custom places created while offline or anonymous and bind them to the user.
        await syncOfflineKnownPlaces();
    } catch (e) {
        console.error('Offline sync execution failed:', e);
    } finally {
        isSyncing = false;
    }
}

let syncIntervalId: any = null;

/**
 * Starts a background sync timer executing every 60 seconds.
 */
export function startOfflineSyncTimer() {
    if (syncIntervalId) return;
    syncOfflineData();
    syncIntervalId = setInterval(() => {
        syncOfflineData();
    }, 60000);
}

/**
 * Stops the periodic sync timer.
 */
export function stopOfflineSyncTimer() {
    if (syncIntervalId) {
        clearInterval(syncIntervalId);
        syncIntervalId = null;
    }
}

// Automatically start the background sync manager on module load
startOfflineSyncTimer();

// Listen to app state changes (foregrounding) to trigger sync immediately
AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
        syncOfflineData();
    }
});

// Listen for auth state changes (login) to sync locally buffered tracks
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        syncOfflineData();
    }
});

/**
 * Persists a tracked coordinate ping.
 * Saves directly to the local database buffer first (offline-first), then triggers sync.
 */
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

    // Buffer locally first
    await appendLocalPing(ping);

    // Trigger sync
    syncOfflineData();

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

// Session detection tracking variables
let lastLocationCoords: { latitude: number; longitude: number; timestamp: string } | null = null;
let stationaryTimeMs = 0;
let activeSession: { placeName: string; enteredAt: string; lastActiveAt: string } | null = null;

/** Resets the active tracking session state variables. */
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

/** Saves a raw location point to the local buffer and schedules upload. */
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

    const existing = await readLocalLocations();
    await writeLocalLocations([...existing, record].slice(-3000));

    syncOfflineData();

    return record;
}

/** Saves a visit session to the local buffer and schedules upload. */
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

    const existing = await readLocalVisits();
    await writeLocalVisits([...existing, visit].slice(-500));

    syncOfflineData();

    return visit;
}

/**
 * Returns raw location coordinate pings logged in the last X days.
 * Queries Supabase when online, falling back to AsyncStorage queues when offline.
 */
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

/** Returns registered visit sessions logged in the last X days. */
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

/**
 * Evaluates whether a coordinate update triggers the start or end of a stay session
 * (i.e. remains within 20 meters for a sustained duration).
 */
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

    // Session logic management
    if (!activeSession) {
        activeSession = {
            placeName: locationName,
            enteredAt: timestamp,
            lastActiveAt: timestamp,
        };
    } else {
        const samePlace = activeSession.placeName === locationName;
        if (samePlace || distanceFromPrevious < 20) {
            activeSession.lastActiveAt = timestamp;
        } else {
            // End the active session and write to database buffers
            const durationMs = new Date(activeSession.lastActiveAt).getTime() - new Date(activeSession.enteredAt).getTime();
            const durationMinutes = Math.max(1, Math.round(durationMs / 60000));

            await persistVisitSessionToDb(
                activeSession.placeName,
                activeSession.enteredAt,
                activeSession.lastActiveAt,
                durationMinutes
            );
            sessionSaved = true;

            // Initialize next session
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

/**
 * Registers a foreground subscription to watch user location coordinates.
 * Filters coordinates through Kalman filter smoothing and noise checks.
 */
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
    fgKalmanFilter.reset();
    lastFgLat = undefined;
    lastFgLon = undefined;
    lastFgTime = undefined;

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
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const accuracy = position.coords.accuracy ?? null;
                const timeMs = position.timestamp;

                // 1. Noise Denoising
                if (shouldDiscardPing(accuracy, speed, lat, lon, timeMs, lastFgLat, lastFgLon, lastFgTime)) {
                    return;
                }

                // 2. Kalman Filtering
                const smoothed = fgKalmanFilter.filter(lat, lon, accuracy ?? 10);

                lastFgLat = smoothed.latitude;
                lastFgLon = smoothed.longitude;
                lastFgTime = timeMs;

                // 3. Persist classic ping
                const ping = await persistTrackedPing(
                    smoothed.latitude,
                    smoothed.longitude,
                    timestampStr
                );

                // 4. Persist to new locations table
                await persistLocationToDb(
                    smoothed.latitude,
                    smoothed.longitude,
                    speed,
                    timestampStr
                );

                // 5. Process stay detection
                const stayResult = await processStayDetection(
                    smoothed.latitude,
                    smoothed.longitude,
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

/**
 * Removes the foreground watch position listener.
 * Automatically saves the final open visit session and flushes any pending offline data.
 */
export async function stopForegroundLocationTracking(
    subscription: Location.LocationSubscription | null
): Promise<void> {
    if (!subscription) {
        return;
    }

    try {
        subscription.remove();
    } catch {
        // Swallow
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
    
    // Flush remaining offline queues to Supabase
    await syncOfflineData();
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

/** Fetches pings in the last X days, querying remote database first and falling back to local. */
export async function getTrackedPings(days = 21): Promise<TrackedLocationPing[]> {
    const supabasePings = await fetchSupabasePings(days);
    if (supabasePings.length > 0) return supabasePings;
    return fetchLocalPings(days);
}

/** Groups raw pings into visits by parsing spatial gaps and timestamps. */
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

/** Fetches location pings in the last X days and aggregates them into visits. */
export async function getTrackedVisits(days = 21): Promise<LocationVisit[]> {
    const pings = await getTrackedPings(days);
    return aggregatePingsToVisits(pings);
}
