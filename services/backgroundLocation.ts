import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { persistTrackedPing } from './locationTracking';

export const BACKGROUND_LOCATION_TASK = 'gps-tracks-background-location-task';

function isBackgroundApiSupported(): boolean {
    const locationApi = Location as unknown as {
        hasStartedLocationUpdatesAsync?: (taskName: string) => Promise<boolean>;
        startLocationUpdatesAsync?: (
            taskName: string,
            options: Location.LocationTaskOptions
        ) => Promise<void>;
        stopLocationUpdatesAsync?: (taskName: string) => Promise<void>;
    };

    if (Platform.OS === 'web') {
        return false;
    }

    return (
        typeof locationApi.hasStartedLocationUpdatesAsync === 'function' &&
        typeof locationApi.startLocationUpdatesAsync === 'function' &&
        typeof locationApi.stopLocationUpdatesAsync === 'function'
    );
}

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
        if (error) {
            return;
        }

        const locations = (data as { locations?: Location.LocationObject[] } | undefined)
            ?.locations;

        if (!locations || locations.length === 0) {
            return;
        }

        for (const location of locations) {
            await persistTrackedPing(
                location.coords.latitude,
                location.coords.longitude,
                new Date(location.timestamp).toISOString()
            );
        }
    });
}

export async function startBackgroundLocationTracking(): Promise<void> {
    if (!isBackgroundApiSupported()) {
        throw new Error('Background location tracking is not supported on this platform.');
    }

    const locationApi = Location as unknown as {
        hasStartedLocationUpdatesAsync: (taskName: string) => Promise<boolean>;
        startLocationUpdatesAsync: (
            taskName: string,
            options: Location.LocationTaskOptions
        ) => Promise<void>;
    };

    const foreground = await Location.requestForegroundPermissionsAsync();
    if (foreground.status !== 'granted') {
        throw new Error('Foreground location permission was denied.');
    }

    const background = await Location.requestBackgroundPermissionsAsync();
    if (background.status !== 'granted') {
        throw new Error('Background location permission was denied.');
    }

    const alreadyStarted = await locationApi.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
    );

    if (alreadyStarted) {
        return;
    }

    // TODO: IMPROVEMENT: Adaptive Tracking & Battery Optimization
    // 1. Geofencing: Instead of continuous background tracking, utilize geofencing APIs
    //    (e.g., expo-location's startGeofencingAsync) to wake up the app when boundaries are crossed.
    // 2. Adaptive Intervals: Dynamically adjust accuracy, timeInterval, and distanceInterval
    //    based on user speed/activity (e.g. throttle polling rate down when stationary to conserve battery).
    // 3. Power State Monitoring: Monitor device battery status and adjust background tracking aggressiveness
    //    accordingly.
    await locationApi.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 75,
        timeInterval: 120000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: 'GPS Tracks is running',
            notificationBody: 'Background location tracking is active',
            notificationColor: '#34d399',
        },
    });
}

export async function stopBackgroundLocationTracking(): Promise<void> {
    if (!isBackgroundApiSupported()) {
        return;
    }

    const locationApi = Location as unknown as {
        hasStartedLocationUpdatesAsync: (taskName: string) => Promise<boolean>;
        stopLocationUpdatesAsync: (taskName: string) => Promise<void>;
    };

    const started = await locationApi.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
    );

    if (!started) {
        return;
    }

    await locationApi.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}

export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
    if (!isBackgroundApiSupported()) {
        return false;
    }

    const locationApi = Location as unknown as {
        hasStartedLocationUpdatesAsync: (taskName: string) => Promise<boolean>;
    };

    return locationApi.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
