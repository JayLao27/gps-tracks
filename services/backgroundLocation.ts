/**
 * ============================================================================
 * MODULE: services/backgroundLocation.ts
 * LAYER: Background Telemetry Layer
 * DESCRIPTION: Handles battery-efficient, adaptive background location updates
 *              via Expo TaskManager. Combines Kalman filtering and geofencing.
 * ============================================================================
 */

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import * as Battery from 'expo-battery';

import { persistTrackedPing } from './locationTracking';
import { KalmanFilter, shouldDiscardPing } from '../utils/locationFilter';

/**
 * Unique task identifier for Expo's Background Task Manager.
 */
export const BACKGROUND_LOCATION_TASK = 'gps-tracks-background-location-task';

/**
 * Helper to check whether the background location tracking API features are fully supported
 * by the current runtime environment (i.e. disabled on Web browser simulations).
 * 
 * @returns True if supported; false otherwise.
 */
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

// Background Kalman Filter instance and state memory to denoise background GPS coordinates
const bgKalmanFilter = new KalmanFilter();
let lastBgLat: number | undefined;
let lastBgLon: number | undefined;
let lastBgTime: number | undefined;

// Active background tracking options tracked inside the module scope to avoid redundant updates
let activeAccuracy: Location.Accuracy = Location.Accuracy.Balanced;
let activeTimeInterval = 120000;
let activeDistanceInterval = 75;

/**
 * Dynamically adjusts background location parameters on the fly based on the user's velocity
 * and the device's current battery status.
 * 
 * - If the device is in low power mode or battery is < 20%, it throttles updates to 5-minute intervals.
 * - If the user is moving fast (> 15 km/h), it increases polling frequency to 30-second intervals.
 * - If the user is stationary, it drops updates to 4-minute intervals to maximize battery life.
 * 
 * @param speedMps Current instantaneous speed in meters per second.
 */
async function adjustTrackingParams(speedMps: number | null): Promise<void> {
    try {
        const batteryLevel = await Battery.getBatteryLevelAsync();
        const isLowPower = await Battery.isLowPowerModeEnabledAsync();

        let targetAccuracy = Location.Accuracy.Balanced;
        let targetTimeInterval = 120000;
        let targetDistanceInterval = 75;

        // Apply battery-conserving policies
        if (isLowPower || batteryLevel < 0.20) {
            targetAccuracy = Location.Accuracy.Low;
            targetTimeInterval = 300000; // 5 minutes
            targetDistanceInterval = 150; // 150 meters
        } else if (speedMps !== null) {
            const speedKmh = speedMps * 3.6;
            // Apply speed-adaptive policies
            if (speedKmh > 15) {
                targetAccuracy = Location.Accuracy.High;
                targetTimeInterval = 30000; // 30 seconds
                targetDistanceInterval = 50; // 50 meters
            } else if (speedKmh < 3) {
                targetAccuracy = Location.Accuracy.Balanced;
                targetTimeInterval = 240000; // 4 minutes
                targetDistanceInterval = 100; // 100 meters
            }
        }

        // Restart the background location task with updated options if parameters change
        if (
            targetAccuracy !== activeAccuracy ||
            targetTimeInterval !== activeTimeInterval ||
            targetDistanceInterval !== activeDistanceInterval
        ) {
            activeAccuracy = targetAccuracy;
            activeTimeInterval = targetTimeInterval;
            activeDistanceInterval = targetDistanceInterval;

            const locationApi = Location as unknown as {
                startLocationUpdatesAsync: (
                    taskName: string,
                    options: Location.LocationTaskOptions
                ) => Promise<void>;
            };

            await locationApi.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
                accuracy: targetAccuracy,
                distanceInterval: targetDistanceInterval,
                timeInterval: targetTimeInterval,
                showsBackgroundLocationIndicator: true,
                foregroundService: {
                    notificationTitle: 'GPS Tracks is running',
                    notificationBody: 'Background location tracking (optimized) is active',
                    notificationColor: '#34d399',
                },
            });
        }
    } catch (e) {
        console.error('Failed to dynamically adjust background tracking parameters:', e);
    }
}

// Define the background task handler in the TaskManager
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
            const lat = location.coords.latitude;
            const lon = location.coords.longitude;
            const accuracy = location.coords.accuracy ?? null;
            const speed = location.coords.speed ?? null;
            const timeMs = location.timestamp;

            // Denoising & outlier removal
            if (shouldDiscardPing(accuracy, speed, lat, lon, timeMs, lastBgLat, lastBgLon, lastBgTime)) {
                continue;
            }

            // Kalman smoothing
            const smoothed = bgKalmanFilter.filter(lat, lon, accuracy ?? 10);

            lastBgLat = smoothed.latitude;
            lastBgLon = smoothed.longitude;
            lastBgTime = timeMs;

            // Save smoothed location locally / offline buffer
            await persistTrackedPing(
                smoothed.latitude,
                smoothed.longitude,
                new Date(timeMs).toISOString()
            );

            // Dynamically recalculate optimal background options based on current velocity
            await adjustTrackingParams(speed);
        }
    });
}

/**
 * Requests necessary location permissions and starts background location updates.
 * Estimates current battery state right away to configure initial optimized tracking parameters.
 */
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

    // Reset background filters
    bgKalmanFilter.reset();
    lastBgLat = undefined;
    lastBgLon = undefined;
    lastBgTime = undefined;

    let initialAccuracy = Location.Accuracy.Balanced;
    let initialTimeInterval = 120000;
    let initialDistanceInterval = 75;

    try {
        const batteryLevel = await Battery.getBatteryLevelAsync();
        const isLowPower = await Battery.isLowPowerModeEnabledAsync();

        if (isLowPower || batteryLevel < 0.20) {
            initialAccuracy = Location.Accuracy.Low;
            initialTimeInterval = 300000;
            initialDistanceInterval = 150;
        }
    } catch (e) {
        console.error('Failed to get initial battery state for background tracking:', e);
    }

    activeAccuracy = initialAccuracy;
    activeTimeInterval = initialTimeInterval;
    activeDistanceInterval = initialDistanceInterval;

    await locationApi.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: initialAccuracy,
        distanceInterval: initialDistanceInterval,
        timeInterval: initialTimeInterval,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: 'GPS Tracks is running',
            notificationBody: 'Background location tracking is active',
            notificationColor: '#34d399',
        },
    });
}

/**
 * Stops background location updates.
 */
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

/**
 * Checks whether background location tracking is actively registered in TaskManager.
 * 
 * @returns True if background updates are active.
 */
export async function isBackgroundLocationTrackingActive(): Promise<boolean> {
    if (!isBackgroundApiSupported()) {
        return false;
    }

    const locationApi = Location as unknown as {
        hasStartedLocationUpdatesAsync: (taskName: string) => Promise<boolean>;
    };

    return locationApi.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
}
