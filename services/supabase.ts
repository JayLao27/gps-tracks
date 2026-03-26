import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// ── Supabase Config ──
// Replace these with your own Supabase project credentials.
// Find them at: https://supabase.com → Your Project → Settings → API
const SUPABASE_URL = 'https://kzshsbqdughppyfrgydb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fejl1d_EtHZQHKn12oeo_g_QHCuUTzX';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, 
    },
});
