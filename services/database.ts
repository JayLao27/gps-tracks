/**
 * ============================================================================
 * MODULE: services/database.ts
 * LAYER: Data Access / Offline Caching Layer
 * DESCRIPTION: Handles offline AsyncStorage caching, retrieval, and syncing of
 *              GPS tracks with the Supabase remote database.
 * ============================================================================
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const LOCAL_OFFLINE_TRACKS_KEY = 'gps_tracks.offline_tracks';

export async function readLocalOfflineTracks(): Promise<Track[]> {
    try {
        const json = await AsyncStorage.getItem(LOCAL_OFFLINE_TRACKS_KEY);
        return json ? (JSON.parse(json) as Track[]) : [];
    } catch {
        return [];
    }
}

export async function writeLocalOfflineTracks(tracks: Track[]): Promise<void> {
    try {
        await AsyncStorage.setItem(LOCAL_OFFLINE_TRACKS_KEY, JSON.stringify(tracks));
    } catch (err) {
        console.error('Failed to write offline tracks:', err);
    }
}


export interface User {
    id: string;
    name: string;
    email: string;
    auth_provider: 'local' | 'google';
    created_at: string;
}

export interface Track {
    id: string;
    user_id: string;
    name: string;
    date: string;
    distance: string;
    duration_minutes: number;
    pace: string;
    icon: string;
    color: string;
    created_at: string;
}


export function mapAuthUser(authUser: {
    id: string;
    email?: string;
    user_metadata?: { name?: string; full_name?: string };
    app_metadata?: { provider?: string };
    created_at: string;
}): User {
    return {
        id: authUser.id,
        name:
            authUser.user_metadata?.name ??
            authUser.user_metadata?.full_name ??
            'User',
        email: authUser.email ?? '',
        auth_provider:
            authUser.app_metadata?.provider === 'google' ? 'google' : 'local',
        created_at: authUser.created_at,
    };
}


export async function getAuthUser(): Promise<User | null> {
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return user ? mapAuthUser(user) : null;
}

export async function getUserTracks(): Promise<Track[]> {
    const localOffline = await readLocalOfflineTracks();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return localOffline;

    const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching tracks, merging local offline:', error);
        return localOffline;
    }

    const remoteTracks = data || [];
    const merged = [...localOffline, ...remoteTracks];
    return merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addTrack(track: Omit<Track, 'id' | 'user_id' | 'created_at'>): Promise<Track | null> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    const offlineTrack: Track = {
        id: 'offline-' + Math.random().toString(36).substring(2, 11),
        user_id: user?.id ?? 'anon',
        ...track,
        created_at: new Date().toISOString(),
    };

    if (!user) {
        const existing = await readLocalOfflineTracks();
        await writeLocalOfflineTracks([offlineTrack, ...existing]);
        return offlineTrack;
    }

    try {
        const { data, error } = await supabase
            .from('tracks')
            .insert([
                {
                    id: Math.random().toString(36).substring(2, 11),
                    user_id: user.id,
                    ...track,
                },
            ])
            .select()
            .single();

        if (error) {
            console.error('Supabase track insert failed, queuing offline:', error);
            const existing = await readLocalOfflineTracks();
            await writeLocalOfflineTracks([offlineTrack, ...existing]);
            return offlineTrack;
        }

        return data;
    } catch (err) {
        console.error('Network error when adding track, queuing offline:', err);
        const existing = await readLocalOfflineTracks();
        await writeLocalOfflineTracks([offlineTrack, ...existing]);
        return offlineTrack;
    }
}

export async function deleteTrack(trackId: string): Promise<boolean> {
    if (trackId.startsWith('offline-')) {
        try {
            const existing = await readLocalOfflineTracks();
            const next = existing.filter((t) => t.id !== trackId);
            await writeLocalOfflineTracks(next);
            return true;
        } catch {
            return false;
        }
    }

    const { error } = await supabase
        .from('tracks')
        .delete()
        .eq('id', trackId);

    if (error) {
        console.error('Error deleting track:', error);
        return false;
    }

    return true;
}

