import { supabase } from './supabase';


export interface User {
    id: string;
    name: string;
    email: string;
    auth_provider: 'local' | 'google';
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
