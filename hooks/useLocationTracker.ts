import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
    isBackgroundLocationTrackingActive,
    startBackgroundLocationTracking,
    stopBackgroundLocationTracking,
} from '@/services/backgroundLocation';
import {
    startForegroundLocationTracking,
    stopForegroundLocationTracking,
    type TrackedLocationPing,
} from '@/services/locationTracking';

export function useLocationTracker() {
    const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

    const [isTracking, setIsTracking] = useState(false);
    const [isBackgroundTracking, setIsBackgroundTracking] = useState(false);
    const [lastPing, setLastPing] = useState<TrackedLocationPing | null>(null);
    const [error, setError] = useState('');

    const startTracking = useCallback(async () => {
        if (subscriptionRef.current) return;

        setError('');

        const subscription = await startForegroundLocationTracking(
            (ping) => {
                setLastPing(ping);
            },
            (message) => {
                setError(message);
            }
        );

        if (!subscription) {
            setIsTracking(false);
            return;
        }

        subscriptionRef.current = subscription;
        setIsTracking(true);
    }, []);

    const stopTracking = useCallback(() => {
        stopForegroundLocationTracking(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsTracking(false);
    }, []);

    const refreshBackgroundStatus = useCallback(async () => {
        const active = await isBackgroundLocationTrackingActive();
        setIsBackgroundTracking(active);
    }, []);

    const startBackgroundTracking = useCallback(async () => {
        setError('');

        try {
            await startBackgroundLocationTracking();
            setIsBackgroundTracking(true);
        } catch (e: unknown) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'Unable to start background tracking.'
            );
        }
    }, []);

    const stopBackgroundTracking = useCallback(async () => {
        setError('');

        try {
            await stopBackgroundLocationTracking();
            setIsBackgroundTracking(false);
        } catch (e: unknown) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'Unable to stop background tracking.'
            );
        }
    }, []);

    useEffect(() => {
        refreshBackgroundStatus();

        return () => {
            stopForegroundLocationTracking(subscriptionRef.current);
            subscriptionRef.current = null;
        };
    }, [refreshBackgroundStatus]);

    return {
        isTracking,
        isBackgroundTracking,
        lastPing,
        error,
        startTracking,
        stopTracking,
        startBackgroundTracking,
        stopBackgroundTracking,
        refreshBackgroundStatus,
    };
}
