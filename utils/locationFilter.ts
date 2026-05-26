function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
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

export class KalmanFilter {
    private r: number;
    private q: number;
    private lat: number = 0;
    private lon: number = 0;
    private variance: number = -1;

    constructor(r = 0.00001, q = 0.001) {
        this.r = r;
        this.q = q;
    }

    public filter(lat: number, lon: number, accuracy: number): { latitude: number; longitude: number } {
        if (this.variance < 0) {
            this.lat = lat;
            this.lon = lon;
            this.variance = accuracy * accuracy;
            return { latitude: lat, longitude: lon };
        }

        const varianceProcess = this.variance + this.r;
        const k = varianceProcess / (varianceProcess + accuracy * accuracy + this.q);

        this.lat = this.lat + k * (lat - this.lat);
        this.lon = this.lon + k * (lon - this.lon);
        this.variance = (1 - k) * varianceProcess;

        return { latitude: this.lat, longitude: this.lon };
    }

    public reset() {
        this.variance = -1;
    }
}

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
            // and the time difference is small (< 30 seconds), discard
            if (calculatedSpeed > 50 && timeDiffSec < 30) {
                return true;
            }
        }
    }

    return false;
}
