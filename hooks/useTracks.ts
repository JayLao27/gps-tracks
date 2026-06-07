/**
 * ============================================================================
 * MODULE: hooks/useTracks.ts
 * LAYER: Stateful Hooks Layer
 * DESCRIPTION: Coordinates loading and refreshing of tracked GPS segments.
 * ============================================================================
 */

import type { Track } from '@/services/database';
import { getUserTracks } from '@/services/database';
import { useEffect, useState } from 'react';

export function useTracks() {
    const [tracks, setTracks] = useState<Track[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadTracks();
    }, []);

    const loadTracks = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getUserTracks();
            setTracks(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load tracks');
        } finally {
            setLoading(false);
        }
    };

    return { tracks, loading, error, refresh: loadTracks };
}
