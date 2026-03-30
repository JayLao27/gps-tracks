import { getAuthUser, type User } from './database';
import { supabase } from './supabase';

/**
 * Login with email + password via Supabase Auth.
 */
export const loginUser = async (
    email: string,
    password: string
): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    return !error;
};

/**
 * Sign up a new user via Supabase Auth.
 * Returns an error message on failure, or null on success.
 */
export const registerUser = async (
    name: string,
    email: string,
    password: string
): Promise<string | null> => {
    if (!name.trim()) return 'Please enter your name';
    if (!email.trim()) return 'Please enter your email';
    if (password.length < 6) return 'Password must be at least 6 characters';

    const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
            data: { name: name.trim() },
        },
    });

    if (error) return error.message;
    return null;
};

/**
 * Login or register via Google profile info.
 * Uses the access token obtained from Google OAuth to authenticate with Supabase.
 */
export const loginOrRegisterWithGoogle = async (
    name: string,
    email: string,
    idToken?: string
): Promise<boolean> => {
    if (idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
        });
        return !error;
    }

    // Fallback: sign in with email (for cases where we only have user info)
    // This requires the user to already exist in Supabase
    const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: `__google_${email}`,
    });

    if (error) {
        // Auto-register if not found
        const { error: signUpError } = await supabase.auth.signUp({
            email: email.toLowerCase(),
            password: `__google_${email}`,
            options: {
                data: { name, full_name: name },
            },
        });
        return !signUpError;
    }

    return true;
};

export const getCurrentUser = async (): Promise<User | null> => {
    return getAuthUser();
};

export const logoutUser = async (): Promise<void> => {
    await supabase.auth.signOut();
};

// Re-export User type for convenience
export type { User } from './database';
