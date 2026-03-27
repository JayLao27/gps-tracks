import { useCallback, useEffect, useState } from 'react';

import {
    addKnownPlace,
    deleteKnownPlace,
    getKnownPlaces,
    type KnownPlace,
} from '@/services/knownPlaces';
import type { LocationCategory } from '@/services/locationIntelligence';

export function useKnownPlaces() {
    const [places, setPlaces] = useState<KnownPlace[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const refresh = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const data = await getKnownPlaces();
            setPlaces(data);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unable to load places.');
        } finally {
            setLoading(false);
        }
    }, []);

    const createPlace = useCallback(
        async (input: {
            name: string;
            category: LocationCategory;
            latitude: number;
            longitude: number;
            radiusMeters: number;
        }) => {
            setError('');

            try {
                const created = await addKnownPlace(input);
                setPlaces((prev) => [...prev, created]);
                return true;
            } catch (e: unknown) {
                setError(e instanceof Error ? e.message : 'Unable to add place.');
                return false;
            }
        },
        []
    );

    const removePlace = useCallback(async (placeId: string) => {
        setError('');

        try {
            await deleteKnownPlace(placeId);
            setPlaces((prev) => prev.filter((place) => place.id !== placeId));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Unable to delete place.');
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        places,
        loading,
        error,
        refresh,
        createPlace,
        removePlace,
    };
}
