import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';


const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase env vars: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY)');
}

const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

// TODO: IMPROVEMENT: Secure Auth Token Storage
// Storing Supabase session tokens in unencrypted AsyncStorage is a security concern.
// In production, configure the Supabase client to use a secure storage adapter
// (e.g., expo-secure-store) for storing sensitive authentication tokens on native platforms.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: isReactNative ? AsyncStorage : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

