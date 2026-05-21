/**
 * Verification Test Script: Spatial Clustering Algorithm
 * 
 * This script verifies the core algorithmic logic of our unsupervised
 * spatial clustering engine: centroid math, grid grouping, and geofence collision checks.
 */

// Precise Haversine distance calculator
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000; // meters
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

// Spatial clustering algorithm under test
function suggestPlacesFromPings(pings, existingPlaces, minPingsThreshold = 5) {
    const eligiblePings = pings.filter(p => p.category === 'other');
    if (eligiblePings.length === 0) return [];

    const gridPrecision = 0.0008; 
    const gridGroups = {};

    for (const ping of eligiblePings) {
        const latGrid = Math.round(ping.latitude / gridPrecision);
        const lonGrid = Math.round(ping.longitude / gridPrecision);
        const key = `${latGrid},${lonGrid}`;

        if (!gridGroups[key]) {
            gridGroups[key] = [];
        }
        gridGroups[key].push(ping);
    }

    const suggestions = [];

    for (const [key, pingsInCell] of Object.entries(gridGroups)) {
        if (pingsInCell.length < minPingsThreshold) continue;

        let sumLat = 0;
        let sumLon = 0;
        for (const p of pingsInCell) {
            sumLat += p.latitude;
            sumLon += p.longitude;
        }
        const centroidLat = sumLat / pingsInCell.length;
        const centroidLon = sumLon / pingsInCell.length;

        let tooClose = false;
        for (const place of existingPlaces) {
            const dist = haversineDistanceMeters(centroidLat, centroidLon, place.latitude, place.longitude);
            if (dist <= Math.max(place.radiusMeters || 200, 200)) {
                tooClose = true;
                break;
            }
        }

        if (tooClose) continue;

        const estimatedName = `Frequent Spot (${centroidLat.toFixed(4)}, ${centroidLon.toFixed(4)})`;

        suggestions.push({
            id: `suggested-${key}`,
            latitude: centroidLat,
            longitude: centroidLon,
            pingCount: pingsInCell.length,
            estimatedName,
            category: 'work',
        });
    }

    return suggestions.sort((a, b) => b.pingCount - a.pingCount);
}

// ── TEST CASES ──

const TEST_PLACES = [
    { name: 'Home', latitude: 37.7749, longitude: -122.4194, radiusMeters: 250 },
    { name: 'Office', latitude: 37.7896, longitude: -122.4012, radiusMeters: 300 }
];

const TEST_PINGS = [
    // Cluster 1: Frequented Spot near 37.7850, -122.4180 (far from Home/Office)
    // 6 points (above threshold of 3)
    { latitude: 37.7851, longitude: -122.4182, category: 'other' },
    { latitude: 37.7852, longitude: -122.4181, category: 'other' },
    { latitude: 37.7850, longitude: -122.4183, category: 'other' },
    { latitude: 37.7853, longitude: -122.4180, category: 'other' },
    { latitude: 37.7849, longitude: -122.4184, category: 'other' },
    { latitude: 37.7851, longitude: -122.4181, category: 'other' },

    // Cluster 2: Frequented Spot but extremely close to existing Office (37.7896, -122.4012)
    // Should be filtered out due to geofence collision
    { latitude: 37.7897, longitude: -122.4013, category: 'other' },
    { latitude: 37.7895, longitude: -122.4011, category: 'other' },
    { latitude: 37.7896, longitude: -122.4012, category: 'other' },
    { latitude: 37.7898, longitude: -122.4014, category: 'other' },

    // Cluster 3: Small cluster of 2 points (below min threshold of 3)
    // Should be ignored
    { latitude: 37.7600, longitude: -122.4300, category: 'other' },
    { latitude: 37.7601, longitude: -122.4301, category: 'other' },

    // Standard points that are already geofenced correctly (not category 'other')
    { latitude: 37.7749, longitude: -122.4194, category: 'home' },
    { latitude: 37.7749, longitude: -122.4194, category: 'home' },
];

console.log("=========================================");
console.log("  Spatial Clustering Engine Test Runner  ");
console.log("=========================================\n");

console.log(`Running tests with ${TEST_PINGS.length} pings and ${TEST_PLACES.length} existing places...`);
const suggestions = suggestPlacesFromPings(TEST_PINGS, TEST_PLACES, 3);

console.log(`\nSuggestions returned: ${suggestions.length}\n`);

// Assertion 1: Should return exactly 1 suggestion (Cluster 1)
const expectedCount = 1;
if (suggestions.length === expectedCount) {
    console.log("✅ Assertion Passed: Exactly 1 cluster suggestion detected.");
} else {
    console.error(`❌ Assertion Failed: Expected ${expectedCount} suggestion, got ${suggestions.length}`);
}

if (suggestions.length > 0) {
    const cluster = suggestions[0];
    // Assertion 2: Centroid coordinates should be close to 37.7850, -122.4181
    const expectedLat = 37.7851;
    const expectedLon = -122.41818;
    const latDiff = Math.abs(cluster.latitude - expectedLat);
    const lonDiff = Math.abs(cluster.longitude - expectedLon);

    if (latDiff < 0.001 && lonDiff < 0.001) {
        console.log(`✅ Assertion Passed: Centroid math is highly accurate.`);
        console.log(`   Centroid: (${cluster.latitude.toFixed(5)}, ${cluster.longitude.toFixed(5)})`);
    } else {
        console.error(`❌ Assertion Failed: Centroid math is off. Centroid: (${cluster.latitude}, ${cluster.longitude})`);
    }

    // Assertion 3: Spot near Office should be filtered out
    const officeCentroidLat = 37.7896;
    const officeCentroidLon = -122.4012;
    const officeSuggestion = suggestions.find(s => 
        haversineDistanceMeters(s.latitude, s.longitude, officeCentroidLat, officeCentroidLon) < 100
    );

    if (!officeSuggestion) {
        console.log("✅ Assertion Passed: Collision detection successfully blocked suggesting an existing place.");
    } else {
        console.error("❌ Assertion Failed: Suggestion list contains an existing place.");
    }
}

console.log("\n=========================================");
console.log("            Test Execution End           ");
console.log("=========================================");
