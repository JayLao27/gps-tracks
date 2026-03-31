import { getAuthUser, type User } from './database';
import { supabase } from './supabase';

const mapAuthErrorMessage = (message: string): string => {
    const normalized = message.toLowerCase();

    if (normalized.includes('email rate limit exceeded')) {
        return 'Too many signup emails were requested. Please wait a few minutes and try again.';
    }

    if (normalized.includes('too many requests')) {
        return 'Too many attempts detected. Please wait a moment and try again.';
    }

    if (normalized.includes('invalid login credentials')) {
        return 'Invalid email or password.';
    }

    return message;
};

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
    if (password.length < 8) return 'Password must be at least 8 characters';

    const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
            data: { name: name.trim() },
        },
    });

    if (error) return mapAuthErrorMessage(error.message);
    return null;
};

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

    const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: `__google_${email}`,
    });

    if (error) {
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

export type { User } from './database';
