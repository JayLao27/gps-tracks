/**
 * ============================================================================
 * MODULE: services/locationIntelligence.ts
 * LAYER: Domain Intelligence / Analysis Layer
 * DESCRIPTION: Provides behavioral analytics summaries, spatial productivity scores,
 *              circadian active trends, anomalies, and AI coach helpers.
 * ============================================================================
 */

export type LocationCategory =
    | 'study'
    | 'work'
    | 'gym'
    | 'social'
    | 'home'
    | 'other';

export interface LocationVisit {
    id: string;
    locationName: string;
    category: LocationCategory;
    latitude: number;
    longitude: number;
    startTime: string;
    endTime: string;
}

export interface GoalDefinition {
    id: string;
    title: string;
    category: LocationCategory;
    targetMinutes: number;
    period: 'daily' | 'weekly';
}

export interface PatternInsight {
    kind: 'daily' | 'weekly';
    message: string;
}

export interface ProductivitySummary {
    score: number;
    productiveMinutes: number;
    nonProductiveMinutes: number;
    productivePercent: number;
    nonProductivePercent: number;
    studyDropPercent: number;
    bestWindow: string;
    productiveByHour: number[];
    categoryMinutes: Record<LocationCategory, number>;
}

export interface GoalStatus {
    goal: GoalDefinition;
    actualMinutes: number;
    remainingMinutes: number;
    achieved: boolean;
    alert?: string;
}

export interface Anomaly {
    type: 'new_place_unusual_hour' | 'long_stay';
    severity: 'low' | 'medium' | 'high';
    message: string;
}

export interface HeatmapPoint {
    locationName: string;
    latitude: number;
    longitude: number;
    visits: number;
    minutes: number;
    intensity: number;
}

export interface RoutinePrediction {
    nextLikelyLocation: string;
    confidence: number;
    schedulePrediction: string;
}

export interface AiInsight {
    narrative: string;
    focusRecommendation: string;
    routineRecommendation: string;
    coachName: string;
    timestamp: string;
}

export interface IntelligenceReport {
    patterns: PatternInsight[];
    productivity: ProductivitySummary;
    goalStatuses: GoalStatus[];
    anomalies: Anomaly[];
    heatmap: HeatmapPoint[];
    prediction: RoutinePrediction;
    aiInsight: AiInsight;
}

const PRODUCTIVE_CATEGORIES: LocationCategory[] = ['study', 'work', 'gym'];
const NON_PRODUCTIVE_CATEGORIES: LocationCategory[] = ['social', 'other'];

const LOCATION_COORDS: Record<string, { latitude: number; longitude: number }> = {
    Home: { latitude: 37.7749, longitude: -122.4194 },
    Library: { latitude: 37.7782, longitude: -122.4158 },
    Campus: { latitude: 37.8715, longitude: -122.273 },
    Gym: { latitude: 37.7812, longitude: -122.4113 },
    Cafe: { latitude: 37.7764, longitude: -122.4241 },
    Office: { latitude: 37.7896, longitude: -122.4012 },
    'Night Spot': { latitude: 37.7859, longitude: -122.4064 },
};

function minutesBetween(startIso: string, endIso: string): number {
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    return Math.max(0, Math.round((end - start) / 60000));
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function toIso(date: Date): string {
    return date.toISOString();
}

function startOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

function endOfWeek(date: Date): Date {
    const start = startOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return end;
}

function formatHourWindow(hour: number): string {
    const end = (hour + 2) % 24;
    const toLabel = (h: number) => {
        const suffix = h >= 12 ? 'PM' : 'AM';
        const normalized = h % 12 === 0 ? 12 : h % 12;
        return `${normalized} ${suffix}`;
    };
    return `${toLabel(hour)} to ${toLabel(end)}`;
}

function dateInRange(iso: string, start: Date, end: Date): boolean {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t < end.getTime();
}

export function getDefaultGoals(): GoalDefinition[] {
    return [
        {
            id: 'study-3h',
            title: 'Study 3 hours/day',
            category: 'study',
            targetMinutes: 180,
            period: 'daily',
        },
        {
            id: 'gym-1h',
            title: 'Gym 1 hour/day',
            category: 'gym',
            targetMinutes: 60,
            period: 'daily',
        },
        {
            id: 'social-limit',
            title: 'Limit social time to 2 hours/day',
            category: 'social',
            targetMinutes: 120,
            period: 'daily',
        },
    ];
}

export function getMockLocationVisits(days = 21): LocationVisit[] {
    const visits: LocationVisit[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i -= 1) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        day.setHours(0, 0, 0, 0);

        const weekday = day.getDay();
        const isWeekend = weekday === 0 || weekday === 6;

        const addVisit = (
            locationName: keyof typeof LOCATION_COORDS,
            category: LocationCategory,
            startHour: number,
            endHour: number
        ) => {
            const start = new Date(day);
            const end = new Date(day);
            start.setHours(startHour, 0, 0, 0);
            end.setHours(endHour, 0, 0, 0);

            visits.push({
                id: `${locationName}-${toIso(start)}`,
                locationName,
                category,
                latitude: LOCATION_COORDS[locationName].latitude,
                longitude: LOCATION_COORDS[locationName].longitude,
                startTime: toIso(start),
                endTime: toIso(end),
            });
        };

        addVisit('Home', 'home', 0, 7);

        if (!isWeekend) {
            addVisit('Library', 'study', 8, 11);
            addVisit('Cafe', 'social', 12, 13);
            addVisit('Office', 'work', 14, 17);
            addVisit('Gym', 'gym', 18, i % 4 === 0 ? 19 : 18);
        } else {
            addVisit('Campus', 'study', 9, 11);
            addVisit('Cafe', 'social', 12, 15);
            addVisit('Gym', 'gym', 17, 18);
        }

        addVisit('Home', 'home', 19, 23);
    }

    const unusualStart = new Date(now);
    unusualStart.setDate(now.getDate() - 1);
    unusualStart.setHours(1, 0, 0, 0);
    const unusualEnd = new Date(unusualStart);
    unusualEnd.setHours(4, 0, 0, 0);

    visits.push({
        id: `Night-Spot-${toIso(unusualStart)}`,
        locationName: 'Night Spot',
        category: 'other',
        latitude: LOCATION_COORDS['Night Spot'].latitude,
        longitude: LOCATION_COORDS['Night Spot'].longitude,
        startTime: toIso(unusualStart),
        endTime: toIso(unusualEnd),
    });

    return visits.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
}

function calculateProductivity(visits: LocationVisit[]): ProductivitySummary {
    let productiveMinutes = 0;
    let nonProductiveMinutes = 0;
    const productiveByHour: number[] = Array.from({ length: 24 }, () => 0);
    const categoryMinutes: Record<LocationCategory, number> = {
        study: 0,
        work: 0,
        gym: 0,
        social: 0,
        home: 0,
        other: 0,
    };

    for (const visit of visits) {
        const minutes = minutesBetween(visit.startTime, visit.endTime);

        if (categoryMinutes[visit.category] !== undefined) {
            categoryMinutes[visit.category] += minutes;
        }

        if (PRODUCTIVE_CATEGORIES.includes(visit.category)) {
            productiveMinutes += minutes;
            const hour = new Date(visit.startTime).getHours();
            productiveByHour[hour] += minutes;
        }

        if (NON_PRODUCTIVE_CATEGORIES.includes(visit.category)) {
            nonProductiveMinutes += minutes;
        }
    }

    const totalClassified = productiveMinutes + nonProductiveMinutes;
    const productivePercent = totalClassified
        ? Math.round((productiveMinutes / totalClassified) * 100)
        : 0;
    const nonProductivePercent = totalClassified
        ? Math.round((nonProductiveMinutes / totalClassified) * 100)
        : 0;

    let bestHour = 8;
    let bestWindowMinutes = -1;
    for (let hour = 0; hour < 24; hour += 1) {
        const windowMinutes = productiveByHour[hour] + productiveByHour[(hour + 1) % 24];
        if (windowMinutes > bestWindowMinutes) {
            bestWindowMinutes = windowMinutes;
            bestHour = hour;
        }
    }

    const now = new Date();
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const prevWeekEnd = new Date(thisWeekStart);
    const prevWeekStart = new Date(thisWeekStart);
    prevWeekStart.setDate(prevWeekStart.getDate() - 7);

    const studyMinutesInRange = (start: Date, end: Date) =>
        visits
            .filter((visit) => visit.category === 'study' && dateInRange(visit.startTime, start, end))
            .reduce((sum, visit) => sum + minutesBetween(visit.startTime, visit.endTime), 0);

    const thisWeekStudy = studyMinutesInRange(thisWeekStart, thisWeekEnd);
    const prevWeekStudy = studyMinutesInRange(prevWeekStart, prevWeekEnd);
    const studyDropPercent = prevWeekStudy
        ? Math.round(((prevWeekStudy - thisWeekStudy) / prevWeekStudy) * 100)
        : 0;

    const rawScore = productivePercent - nonProductivePercent * 0.4;

    return {
        score: Math.round(clamp(rawScore, 0, 100)),
        productiveMinutes,
        nonProductiveMinutes,
        productivePercent,
        nonProductivePercent,
        studyDropPercent,
        bestWindow: formatHourWindow(bestHour),
        productiveByHour,
        categoryMinutes,
    };
}

function detectPatterns(visits: LocationVisit[], productivity: ProductivitySummary): PatternInsight[] {
    const insights: PatternInsight[] = [];

    insights.push({
        kind: 'weekly',
        message: `You spend ${productivity.nonProductivePercent}% of your classified time in non-productive places.`,
    });

    if (productivity.studyDropPercent > 0) {
        insights.push({
            kind: 'weekly',
            message: `Your study time dropped ${productivity.studyDropPercent}% this week.`,
        });
    }

    insights.push({
        kind: 'daily',
        message: `You are most productive between ${productivity.bestWindow}.`,
    });

    const byDay: Record<number, number> = {};
    for (const visit of visits) {
        if (visit.category !== 'study') continue;
        const day = new Date(visit.startTime).getDay();
        byDay[day] = (byDay[day] ?? 0) + minutesBetween(visit.startTime, visit.endTime);
    }

    let topDay = 1;
    let topMinutes = 0;
    for (const [key, minutes] of Object.entries(byDay)) {
        if (minutes > topMinutes) {
            topMinutes = minutes;
            topDay = Number(key);
        }
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    insights.push({
        kind: 'weekly',
        message: `Your strongest study habit appears on ${dayNames[topDay]}.`,
    });

    return insights;
}

function evaluateGoals(visits: LocationVisit[], goals: GoalDefinition[]): GoalStatus[] {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    return goals.map((goal) => {
        const windowStart = goal.period === 'daily' ? todayStart : startOfWeek(now);
        const windowEnd = goal.period === 'daily' ? tomorrowStart : endOfWeek(now);

        const actualMinutes = visits
            .filter((visit) => visit.category === goal.category && dateInRange(visit.startTime, windowStart, windowEnd))
            .reduce((sum, visit) => sum + minutesBetween(visit.startTime, visit.endTime), 0);

        const remaining = Math.max(0, goal.targetMinutes - actualMinutes);
        const achieved = goal.id === 'social-limit'
            ? actualMinutes <= goal.targetMinutes
            : actualMinutes >= goal.targetMinutes;

        let alert: string | undefined;

        if (goal.id === 'social-limit' && actualMinutes > goal.targetMinutes) {
            const exceeded = Math.round((actualMinutes - goal.targetMinutes) / 60);
            alert = `You exceeded social time by ${exceeded} hour${exceeded === 1 ? '' : 's'} today.`;
        }

        if (goal.id === 'gym-1h' && !achieved && now.getHours() >= 20) {
            alert = 'You skipped gym today.';
        }

        return {
            goal,
            actualMinutes,
            remainingMinutes: remaining,
            achieved,
            alert,
        };
    });
}

function detectAnomalies(visits: LocationVisit[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    const sorted = [...visits].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const seenLocations = new Set<string>();

    for (const visit of sorted) {
        const hour = new Date(visit.startTime).getHours();
        const isUnusualHour = hour < 6 || hour >= 23;
        const isNewLocation = !seenLocations.has(visit.locationName);

        if (isNewLocation && isUnusualHour) {
            anomalies.push({
                type: 'new_place_unusual_hour',
                severity: 'high',
                message: `You visited a new place (${visit.locationName}) at an unusual hour.`,
            });
        }

        seenLocations.add(visit.locationName);
    }

    const durationsByLocation: Record<string, number[]> = {};
    for (const visit of sorted) {
        const duration = minutesBetween(visit.startTime, visit.endTime);
        if (!durationsByLocation[visit.locationName]) {
            durationsByLocation[visit.locationName] = [];
        }
        durationsByLocation[visit.locationName].push(duration);
    }

    for (const [locationName, durations] of Object.entries(durationsByLocation)) {
        if (durations.length < 3) continue;

        const latest = durations[durations.length - 1];
        const baseline =
            durations.slice(0, durations.length - 1).reduce((sum, v) => sum + v, 0) /
            (durations.length - 1);

        if (latest > baseline * 1.6 && latest - baseline >= 30) {
            anomalies.push({
                type: 'long_stay',
                severity: 'medium',
                message: `You stayed longer than usual at ${locationName} (${Math.round(latest)} min vs ${Math.round(baseline)} min typical).`,
            });
        }
    }

    return anomalies.slice(0, 5);
}

function buildHeatmap(visits: LocationVisit[]): HeatmapPoint[] {
    const byLocation: Record<string, HeatmapPoint> = {};

    for (const visit of visits) {
        const minutes = minutesBetween(visit.startTime, visit.endTime);

        if (!byLocation[visit.locationName]) {
            byLocation[visit.locationName] = {
                locationName: visit.locationName,
                latitude: visit.latitude,
                longitude: visit.longitude,
                visits: 0,
                minutes: 0,
                intensity: 0,
            };
        }

        byLocation[visit.locationName].visits += 1;
        byLocation[visit.locationName].minutes += minutes;
    }

    const list = Object.values(byLocation).sort((a, b) => b.minutes - a.minutes);
    const maxMinutes = list[0]?.minutes ?? 1;

    for (const point of list) {
        point.intensity = clamp(point.minutes / maxMinutes, 0.05, 1);
    }

    return list;
}

function predictRoutine(visits: LocationVisit[]): RoutinePrediction {
    if (visits.length < 2) {
        return {
            nextLikelyLocation: 'Home',
            confidence: 0,
            schedulePrediction: 'Not enough data yet.',
        };
    }

    const sorted = [...visits].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const transitionCounts: Record<string, Record<string, number>> = {};
    for (let i = 0; i < sorted.length - 1; i += 1) {
        const current = sorted[i].locationName;
        const next = sorted[i + 1].locationName;

        if (!transitionCounts[current]) transitionCounts[current] = {};
        transitionCounts[current][next] = (transitionCounts[current][next] ?? 0) + 1;
    }

    const lastLocation = sorted[sorted.length - 1].locationName;
    const options = transitionCounts[lastLocation] ?? {};

    let nextLikelyLocation = 'Home';
    let bestCount = 0;
    let total = 0;

    for (const [loc, count] of Object.entries(options)) {
        total += count;
        if (count > bestCount) {
            bestCount = count;
            nextLikelyLocation = loc;
        }
    }

    const confidence = total ? Math.round((bestCount / total) * 100) : 0;

    const hourLocationCounts: Record<number, Record<string, number>> = {};
    for (const visit of sorted) {
        const hour = new Date(visit.startTime).getHours();
        if (!hourLocationCounts[hour]) hourLocationCounts[hour] = {};
        hourLocationCounts[hour][visit.locationName] =
            (hourLocationCounts[hour][visit.locationName] ?? 0) + 1;
    }

    let bestHour = 18;
    let bestHourLocation = 'Home';
    let highest = 0;

    for (const [hourString, locationCounts] of Object.entries(hourLocationCounts)) {
        for (const [locationName, count] of Object.entries(locationCounts)) {
            if (count > highest) {
                highest = count;
                bestHour = Number(hourString);
                bestHourLocation = locationName;
            }
        }
    }

    const suffix = bestHour >= 12 ? 'PM' : 'AM';
    const normalized = bestHour % 12 === 0 ? 12 : bestHour % 12;

    return {
        nextLikelyLocation,
        confidence,
        schedulePrediction: `You usually go to ${bestHourLocation} at ${normalized} ${suffix}.`,
    };
}

export function generateLocalAiInsight(
    productivity: ProductivitySummary,
    prediction: RoutinePrediction,
    anomalies: Anomaly[]
): AiInsight {
    let narrative = '';
    let focusRecommendation = '';
    let routineRecommendation = '';
    
    const score = productivity.score;
    
    if (score >= 70) {
        narrative = `Excellent behavioral focus! You are maintaining a highly productive spatial discipline, spending the majority of your time at study and work hubs. Your best focus hours are concentrated around ${productivity.bestWindow}.`;
        focusRecommendation = "You are in a high-efficiency zone. Protect your deep focus windows and keep distractions minimal during these periods.";
    } else if (score >= 45) {
        narrative = `Moderate focus trends. You are striking a solid balance between productive spatial targets and social downtime. However, your time spent in non-productive zones (around ${productivity.nonProductivePercent}%) is slightly diluting your routine momentum.`;
        focusRecommendation = "Try scheduling dedicated 90-minute study or gym blocks and log them in your custom places to train your spatial focus habits.";
    } else {
        narrative = `Spatial fragmentation alert. Your current spatial routine shows significant dilution, with over ${productivity.nonProductivePercent}% of your time spent in unscheduled or social locations. This pattern suggests potential procrastination habits or unstructured days.`;
        focusRecommendation = "Pick one designated location (like a library or office) and commit to spending at least 2 hours there tomorrow. Physical environment shifts are highly effective in overriding procrastination.";
    }

    if (anomalies.length > 0) {
        const firstAnomaly = anomalies[0];
        narrative += ` ${firstAnomaly.message}`;
        
        if (firstAnomaly.type === 'new_place_unusual_hour') {
            routineRecommendation = "Late-night location changes disrupt circadian rhythms. Try planning a consistent winding-down routine to protect next-day cognitive performance.";
        } else {
            routineRecommendation = "Extended stays in a single location can lead to fatigue. Try integrating micro-breaks (e.g., a brief walk) every 90 minutes to maintain alertness.";
        }
    } else {
        routineRecommendation = `Circadian sync high. Your routine shows steady regular habits. Our predictive model expects you to next visit ${prediction.nextLikelyLocation} with a confidence of ${prediction.confidence}%.`;
    }

    return {
        narrative,
        focusRecommendation,
        routineRecommendation,
        coachName: "Antigravity Habit Coach",
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
}

/**
 * Parses incomplete/streaming JSON buffers progressively.
 * Utilizes regular expressions to extract partial properties from the active JSON stream
 * before the full block has finished generating.
 * 
 * @param jsonStr The current raw buffer content.
 * @returns A partial AiInsight object.
 */
function parsePartialJson(jsonStr: string): Partial<AiInsight> {
    const result: Partial<AiInsight> = {};

    // Remove any markdown wrappers if present (sometimes Gemini adds them despite config)
    const cleanedJson = jsonStr.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    
    // Extract "narrative": "..."
    const narrativeMatch = cleanedJson.match(/"narrative"\s*:\s*"((\\.|[^"\\])*)"/);
    if (narrativeMatch) {
        result.narrative = narrativeMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    } else {
        const partialNarrativeMatch = cleanedJson.match(/"narrative"\s*:\s*"((\\.|[^"\\])*)$/);
        if (partialNarrativeMatch) {
            result.narrative = partialNarrativeMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
    }

    // Extract "focusRecommendation": "..."
    const focusMatch = cleanedJson.match(/"focusRecommendation"\s*:\s*"((\\.|[^"\\])*)"/);
    if (focusMatch) {
        result.focusRecommendation = focusMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    } else {
        const partialFocusMatch = cleanedJson.match(/"focusRecommendation"\s*:\s*"((\\.|[^"\\])*)$/);
        if (partialFocusMatch) {
            result.focusRecommendation = partialFocusMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
    }

    // Extract "routineRecommendation": "..."
    const routineMatch = cleanedJson.match(/"routineRecommendation"\s*:\s*"((\\.|[^"\\])*)"/);
    if (routineMatch) {
        result.routineRecommendation = routineMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
    } else {
        const partialRoutineMatch = cleanedJson.match(/"routineRecommendation"\s*:\s*"((\\.|[^"\\])*)$/);
        if (partialRoutineMatch) {
            result.routineRecommendation = partialRoutineMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n');
        }
    }

    return result;
}

/**
 * Fetches coaching insights from the Gemini API.
 * Supports token streaming through a callback to display text progressively in the UI.
 * 
 * @param productivity The productivity summary metrics.
 * @param prediction The routine prediction metrics.
 * @param anomalies Detected anomalies in behavior.
 * @param customApiKey Optional user-supplied Gemini API key.
 * @param persona The chosen persona/attitude of the AI coach.
 * @param onStreamChunk Optional callback function invoked when a new streaming text chunk is decoded.
 * @returns The final full AiInsight object, or null if the request failed.
 */
export async function fetchGeminiAiInsight(
    productivity: ProductivitySummary,
    prediction: RoutinePrediction,
    anomalies: Anomaly[],
    customApiKey?: string,
    persona?: 'tough' | 'encouraging' | 'data-driven' | 'direct',
    onStreamChunk?: (partial: Partial<AiInsight>) => void
): Promise<AiInsight | null> {
    const apiKey = customApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'AIzaSyCr49Xp8Lj_XxQ--SQoPscXQVFgAyqOklg';
    if (!apiKey) return null;

    let personaInstructions = "Write in an encouraging, insightful, and professional tone.";
    let coachName = "Gemini AI Coach";

    if (persona === 'tough') {
        personaInstructions = "Write in a 'tough love', highly challenging, direct, and slightly strict tone. Focus on pushing the user hard, pointing out laziness or slacking, and challenging them to do better without any fluff.";
        coachName = "Tough Coach";
    } else if (persona === 'encouraging') {
        personaInstructions = "Write in a highly warm, supportive, and positive tone. Highlight any small progress, encourage them through challenges, and focus heavily on positive reinforcement.";
        coachName = "Encouraging Coach";
    } else if (persona === 'data-driven') {
        personaInstructions = "Write in a highly analytical, objective, and metric-focused tone. Reference specific percentages, scores, and trends. Speak like a data scientist highlighting behavioral correlations.";
        coachName = "Data Coach";
    } else if (persona === 'direct') {
        personaInstructions = "Write in an extremely concise, straight-to-the-point, and practical tone. Avoid empty filler or flowery phrases. Just deliver the action items and key insights directly.";
        coachName = "Direct Coach";
    }

    const stats = {
        productivityScore: productivity.score,
        productivePercent: productivity.productivePercent,
        nonProductivePercent: productivity.nonProductivePercent,
        bestWindow: productivity.bestWindow,
        nextLikelyLocation: prediction.nextLikelyLocation,
        predictionConfidence: prediction.confidence,
        anomalies: anomalies.map(a => a.message),
    };

    const prompt = `You are a world-class AI Behavioral Coach named ${coachName}. ${personaInstructions}
Analyze this user's location tracking history statistics:
${JSON.stringify(stats, null, 2)}

Provide a highly personalized behavioral coaching summary in JSON format:
{
  "narrative": "A 2-3 sentence personalized evaluation of their current habits.",
  "focusRecommendation": "A 1-sentence actionable advice to improve spatial productivity.",
  "routineRecommendation": "A 1-sentence advice regarding their schedule/routine and predictions."
}
Do not include any markdown formatting or extra text, output ONLY valid JSON.`;

    try {
        const isStreamingSupported = onStreamChunk !== undefined;
        const endpoint = isStreamingSupported ? 'streamGenerateContent' : 'generateContent';
        
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:${endpoint}?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: 'application/json' }
                }),
            }
        );

        if (!response.ok) return null;

        const timestampStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        // Stream reader branch (Web and compatible React Native bundles)
        if (isStreamingSupported && response.body && typeof response.body.getReader === 'function') {
            const reader = response.body.getReader();
            let buffer = '';
            let fullText = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                // Decode raw bytes to string
                const chunk = global.Buffer 
                    ? global.Buffer.from(value).toString('utf8') 
                    : new TextDecoder().decode(value, { stream: true });
                
                buffer += chunk;

                // Match all "text" properties inside streamed NDJSON array candidates
                const matches = buffer.matchAll(/"text"\s*:\s*"((?:\\.|[^"\\])*)"/g);
                let currentFullText = '';
                for (const match of matches) {
                    try {
                        const partText = JSON.parse(`"${match[1]}"`);
                        currentFullText += partText;
                    } catch {
                        // Skip uncompleted unicode escaping sequence at boundary
                    }
                }

                if (currentFullText !== fullText) {
                    fullText = currentFullText;
                    const partialInsight = parsePartialJson(fullText);
                    onStreamChunk({
                        ...partialInsight,
                        coachName,
                        timestamp: timestampStr,
                    });
                }
            }

            const finalInsight = parsePartialJson(fullText);
            return {
                narrative: finalInsight.narrative || '',
                focusRecommendation: finalInsight.focusRecommendation || '',
                routineRecommendation: finalInsight.routineRecommendation || '',
                coachName,
                timestamp: timestampStr,
            };
        } else {
            // Standard non-streaming branch
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return null;

            const parsed = JSON.parse(text);
            const finalResult = {
                narrative: parsed.narrative || '',
                focusRecommendation: parsed.focusRecommendation || '',
                routineRecommendation: parsed.routineRecommendation || '',
                coachName,
                timestamp: timestampStr,
            };
            onStreamChunk?.(finalResult);
            return finalResult;
        }
    } catch (e) {
        console.error('Failed to fetch Gemini AI insights:', e);
        return null;
    }
}

/**
 * Synchronously generates the intelligence report.
 * 
 * @param visits The list of tracked location visits.
 * @param goals The list of defined goals.
 * @returns The generated intelligence report.
 */
export function generateIntelligenceReport(
    visits: LocationVisit[],
    goals: GoalDefinition[] = getDefaultGoals()
): IntelligenceReport {
    const productivity = calculateProductivity(visits);
    const anomalies = detectAnomalies(visits);
    const prediction = predictRoutine(visits);
    const heatmap = buildHeatmap(visits);
    const patterns = detectPatterns(visits, productivity);
    const goalStatuses = evaluateGoals(visits, goals);
    
    const aiInsight = generateLocalAiInsight(productivity, prediction, anomalies);

    return {
        patterns,
        productivity,
        goalStatuses,
        anomalies,
        heatmap,
        prediction,
        aiInsight,
    };
}

/**
 * Asynchronously generates the intelligence report by yielding to the event loop between heavy calculations.
 * This offloads the CPU computation, keeping the UI responsive and avoiding frame drops on mobile devices.
 * 
 * @param visits The list of tracked location visits.
 * @param goals The list of defined goals.
 * @returns A promise that resolves to the intelligence report.
 */
export async function generateIntelligenceReportAsync(
    visits: LocationVisit[],
    goals: GoalDefinition[] = getDefaultGoals()
): Promise<IntelligenceReport> {
    const yieldToEventLoop = () => new Promise(resolve => setTimeout(resolve, 0));

    await yieldToEventLoop();
    const productivity = calculateProductivity(visits);

    await yieldToEventLoop();
    const anomalies = detectAnomalies(visits);

    await yieldToEventLoop();
    const prediction = predictRoutine(visits);

    await yieldToEventLoop();
    const heatmap = buildHeatmap(visits);

    await yieldToEventLoop();
    const patterns = detectPatterns(visits, productivity);

    await yieldToEventLoop();
    const goalStatuses = evaluateGoals(visits, goals);
    
    await yieldToEventLoop();
    const aiInsight = generateLocalAiInsight(productivity, prediction, anomalies);

    return {
        patterns,
        productivity,
        goalStatuses,
        anomalies,
        heatmap,
        prediction,
        aiInsight,
    };
}

export interface SuggestedPlace {
    id: string;
    latitude: number;
    longitude: number;
    pingCount: number;
    estimatedName: string;
    category: LocationCategory;
}

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

// TODO: IMPROVEMENT: Advanced Density-Based Spatial Clustering
// Replace this simplified grid-precision cell count method with a proper density-based
// spatial clustering algorithm like DBSCAN or OPTICS. This will better identify clusters
// of irregular shapes and filter out noise points without relying on artificial coordinates grids.
function dbscan(points: any[], eps: number, minPts: number): any[][] {
    const visited = new Set<number>();
    const noise = new Set<number>();
    const clusters: any[][] = [];
    const clustered = new Set<number>();

    const getNeighbors = (index: number): number[] => {
        const neighbors: number[] = [];
        const p1 = points[index];
        for (let i = 0; i < points.length; i++) {
            const p2 = points[i];
            const dist = haversineDistanceMeters(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
            if (dist <= eps) {
                neighbors.push(i);
            }
        }
        return neighbors;
    };

    const expandCluster = (index: number, neighbors: number[], cluster: any[]) => {
        cluster.push(points[index]);
        clustered.add(index);

        let i = 0;
        while (i < neighbors.length) {
            const neighborIdx = neighbors[i];
            if (!visited.has(neighborIdx)) {
                visited.add(neighborIdx);
                const neighborNeighbors = getNeighbors(neighborIdx);
                if (neighborNeighbors.length >= minPts) {
                    for (const n of neighborNeighbors) {
                        if (!neighbors.includes(n)) {
                            neighbors.push(n);
                        }
                    }
                }
            }

            if (!noise.has(neighborIdx) && !clustered.has(neighborIdx)) {
                cluster.push(points[neighborIdx]);
                clustered.add(neighborIdx);
            }
            i++;
        }
    };

    for (let i = 0; i < points.length; i++) {
        if (visited.has(i)) continue;
        visited.add(i);

        const neighbors = getNeighbors(i);
        if (neighbors.length < minPts) {
            noise.add(i);
        } else {
            const cluster: any[] = [];
            expandCluster(i, neighbors, cluster);
            clusters.push(cluster);
        }
    }

    return clusters;
}

export function suggestPlacesFromPings(
    pings: any[], // raw TrackedLocationPing[]
    existingPlaces: any[], // KnownPlace[]
    minPingsThreshold = 5
): SuggestedPlace[] {
    const eligiblePings = pings.filter(p => p.category === 'other');
    if (eligiblePings.length === 0) return [];

    // Run DBSCAN with eps = 75 meters and minPts = minPingsThreshold
    const clusters = dbscan(eligiblePings, 75, minPingsThreshold);
    const suggestions: SuggestedPlace[] = [];

    for (let i = 0; i < clusters.length; i++) {
        const clusterPings = clusters[i];

        // Calculate centroid
        let sumLat = 0;
        let sumLon = 0;
        for (const p of clusterPings) {
            sumLat += p.latitude;
            sumLon += p.longitude;
        }
        const centroidLat = sumLat / clusterPings.length;
        const centroidLon = sumLon / clusterPings.length;

        // Check if this cluster is already close to any existing known place
        let tooClose = false;
        for (const place of existingPlaces) {
            const dist = haversineDistanceMeters(centroidLat, centroidLon, place.latitude, place.longitude);
            if (dist <= Math.max(place.radiusMeters || 200, 200)) {
                tooClose = true;
                break;
            }
        }

        if (tooClose) continue;

        // Estimate a friendly name based on centroid coordinates
        const estimatedName = `Frequent Spot (${centroidLat.toFixed(4)}, ${centroidLon.toFixed(4)})`;

        suggestions.push({
            id: `suggested-cluster-${i}`,
            latitude: centroidLat,
            longitude: centroidLon,
            pingCount: clusterPings.length,
            estimatedName,
            category: 'work',
        });
    }

    // Sort suggestions by ping count descending
    return suggestions.sort((a, b) => b.pingCount - a.pingCount);
}

