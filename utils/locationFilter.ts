/**
 * ============================================================================
 * MODULE: utils/locationFilter.ts
 * LAYER: Hardware / Filtering Utility Layer
 * DESCRIPTION: Provides Kalman Filter implementations and speed threshold checks
 *              to filter out noisy GPS location coordinates.
 * ============================================================================
 */

/**
 * Calculates the great-circle distance between two geographic coordinates in meters.
 * Uses the Haversine formula to account for Earth's spherical shape.
 * 
 * @param lat1 Latitude of the first point in decimal degrees.
 * @param lon1 Longitude of the first point in decimal degrees.
 * @param lat2 Latitude of the second point in decimal degrees.
 * @param lon2 Longitude of the second point in decimal degrees.
 * @returns The distance between the points in meters.
 */
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * A standard 2D Kalman Filter implementation for smoothing latitude and longitude coordinates.
 * Kalman filtering projects a true state from sequential measurements containing random noise.
 */
export class KalmanFilter {
    /** Process noise covariance. Smaller values result in smoother lines but slower tracking. */
    private r: number;
    /** Measurement noise covariance. Larger values trust measurements less and rely more on prediction. */
    private q: number;
    /** Current estimated latitude state. */
    private lat: number = 0;
    /** Current estimated longitude state. */
    private lon: number = 0;
    /** Estimated error variance. A value of -1 denotes an uninitialized state. */
    private variance: number = -1;

    /**
     * Creates a new KalmanFilter instance.
     * 
     * @param r Process noise covariance (default: `1e-5`).
     * @param q Measurement noise covariance (default: `1e-3`).
     */
    constructor(r = 0.00001, q = 0.001) {
        this.r = r;
        this.q = q;
    }

    /**
     * Filters and smooths a raw coordinate measurement using the Kalman prediction and update steps.
     * 
     * @param lat Raw latitude measurement.
     * @param lon Raw longitude measurement.
     * @param accuracy Raw sensor horizontal accuracy in meters. Used as measurement variance.
     * @returns The estimated/smoothed latitude and longitude coordinates.
     */
    public filter(lat: number, lon: number, accuracy: number): { latitude: number; longitude: number } {
        // If uninitialized, set the initial state to the first measurement
        if (this.variance < 0) {
            this.lat = lat;
            this.lon = lon;
            this.variance = accuracy * accuracy;
            return { latitude: lat, longitude: lon };
        }

        // Prediction Step: Project state variance forward
        const varianceProcess = this.variance + this.r;

        // Kalman Gain: Compute weight factor of measurement vs prediction
        const k = varianceProcess / (varianceProcess + accuracy * accuracy + this.q);

        // Update Step: Correct state with measurement weighted by Kalman Gain
        this.lat = this.lat + k * (lat - this.lat);
        this.lon = this.lon + k * (lon - this.lon);

        // Correct error covariance
        this.variance = (1 - k) * varianceProcess;

        return { latitude: this.lat, longitude: this.lon };
    }

    /**
     * Resets the filter to an uninitialized state.
     * Call this when starting a brand new tracking session to discard previous state memories.
     */
    public reset() {
        this.variance = -1;
    }
}

/**
 * Heuristically evaluates whether a GPS ping update represents noise and should be discarded.
 * Discards pings that fail sensor accuracy tests, exceed reasonable speed bounds, or represent
 * erratic geographic coordinate jumps (e.g. telemetry teleportation).
 * 
 * @param accuracy Horizontal accuracy reported by the GPS sensor in meters.
 * @param speed Instantaneous velocity reported by the sensor in m/s.
 * @param latitude Latitude coordinates in decimal degrees.
 * @param longitude Longitude coordinates in decimal degrees.
 * @param timestampMs Epoch timestamp of the measurement in milliseconds.
 * @param lastLat Latitude coordinates of the last accepted location.
 * @param lastLon Longitude coordinates of the last accepted location.
 * @param lastTimeMs Epoch timestamp of the last accepted location in milliseconds.
 * @returns True if the ping is identified as noise and should be discarded; false if it is valid.
 */
export function shouldDiscardPing(
    accuracy: number | null,
    speed: number | null,
    latitude: number,
    longitude: number,
    timestampMs: number,
    lastLat?: number,
    lastLon?: number,
    lastTimeMs?: number
): boolean {
    // 1. Accuracy threshold: discard if accuracy is poor (> 50 meters)
    if (accuracy !== null && accuracy > 50) {
        return true;
    }

    // 2. Erratic speed check: discard if speed is impossible (> 45 m/s or 162 km/h)
    if (speed !== null && speed > 45) {
        return true;
    }

    // 3. Jump check: if distance from previous point is too high for the elapsed time
    if (lastLat !== undefined && lastLon !== undefined && lastTimeMs !== undefined) {
        const distance = haversineDistanceMeters(lastLat, lastLon, latitude, longitude);
        const timeDiffSec = (timestampMs - lastTimeMs) / 1000;
        if (timeDiffSec > 0) {
            const calculatedSpeed = distance / timeDiffSec;
            // If calculated speed between updates is physically impossible (> 50 m/s, or 180 km/h)
            // and the time difference is small (< 30 seconds), discard it as a teleportation jump.
            if (calculatedSpeed > 50 && timeDiffSec < 30) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Simplifies a list of coordinates using the Ramer-Douglas-Peucker (RDP) algorithm.
 * 
 * @param points Array of coordinates.
 * @param epsilonMeters Distance threshold in meters.
 */
export function compressRouteRDP<T extends { latitude: number; longitude: number }>(
    points: T[],
    epsilonMeters: number
): T[] {
    if (points.length <= 2) {
        return points;
    }

    let dmax = 0;
    let index = 0;
    const end = points.length - 1;

    for (let i = 1; i < end; i++) {
        const d = perpendicularDistanceMeters(points[i], points[0], points[end]);
        if (d > dmax) {
            index = i;
            dmax = d;
        }
    }

    if (dmax > epsilonMeters) {
        const results1 = compressRouteRDP(points.slice(0, index + 1), epsilonMeters);
        const results2 = compressRouteRDP(points.slice(index), epsilonMeters);
        return results1.slice(0, results1.length - 1).concat(results2);
    } else {
        return [points[0], points[end]];
    }
}

function perpendicularDistanceMeters<T extends { latitude: number; longitude: number }>(
    p: T,
    p1: T,
    p2: T
): number {
    const latRad = (p.latitude * Math.PI) / 180;
    const R = 6371000; // Earth radius in meters
    
    const getX = (pt: T) => pt.longitude * Math.PI / 180 * R * Math.cos(latRad);
    const getY = (pt: T) => pt.latitude * Math.PI / 180 * R;

    const px = getX(p);
    const py = getY(p);
    const p1x = getX(p1);
    const p1y = getY(p1);
    const p2x = getX(p2);
    const p2y = getY(p2);

    const dx = p2x - p1x;
    const dy = p2y - p1y;
    
    const denom = Math.sqrt(dx * dx + dy * dy);
    if (denom === 0) {
        return haversineDistanceMeters(p.latitude, p.longitude, p1.latitude, p1.longitude);
    }

    return Math.abs(dy * px - dx * py + p2x * p1y - p2y * p1x) / denom;
}

