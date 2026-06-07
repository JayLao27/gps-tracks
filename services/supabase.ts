/**
 * ============================================================================
 * MODULE: services/supabase.ts
 * LAYER: Core Infrastructure / Client Init Layer
 * DESCRIPTION: Initializes the Supabase client mapping connection parameters.
 * ============================================================================
 */

import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';
import { getSecureItem, setSecureItem, removeSecureItem } from '../utils/secureStorage';


const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase env vars: set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY)');
}

const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

const secureStorageAdapter = {
    getItem: (key: string) => getSecureItem(key),
    setItem: (key: string, value: string) => setSecureItem(key, value),
    removeItem: (key: string) => removeSecureItem(key),
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: isReactNative ? secureStorageAdapter : undefined,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});


