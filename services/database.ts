import { supabase } from './supabase';


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
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching tracks:', error);
        return [];
    }

    return data || [];
}

export async function addTrack(track: Omit<Track, 'id' | 'user_id' | 'created_at'>): Promise<Track | null> {
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

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
        console.error('Error adding track:', error);
        return null;
    }

    return data;
}

export async function deleteTrack(trackId: string): Promise<boolean> {
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

