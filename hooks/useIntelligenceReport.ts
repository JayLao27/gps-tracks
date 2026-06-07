/**
 * ============================================================================
 * MODULE: hooks/useIntelligenceReport.ts
 * LAYER: Stateful Hooks Layer
 * DESCRIPTION: Orchestrates telemetry metrics compilation, caching, and Gemini API
 *              feedback streams.
 * ============================================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    generateIntelligenceReport,
    generateIntelligenceReportAsync,
    getDefaultGoals,
    getMockLocationVisits,
    type IntelligenceReport,
    type AiInsight,
    fetchGeminiAiInsight,
    generateLocalAiInsight,
    type GoalDefinition,
} from '@/services/locationIntelligence';
import { getTrackedVisits } from '@/services/locationTracking';
import { getSecureItem, setSecureItem } from '../utils/secureStorage';

/** Storage key for the Gemini API Key. Saved securely inside keychain/secureStore. */
const STORAGE_KEY = '@gps_tracks:gemini_api_key';
/** Storage key for the user's selected coaching persona. */
const PERSONA_KEY = '@gps_tracks:coach_persona';

export type CoachPersona = 'tough' | 'encouraging' | 'data-driven' | 'direct';

/**
 * A custom hook to fetch, parse, cache, and manage behavioral intelligence reports and AI Habit Coaching.
 * Implements token streaming, background offloading, secure storage, caching, and rate limiting.
 */
export function useIntelligenceReport() {
    const [report, setReport] = useState<IntelligenceReport>(() =>
        generateIntelligenceReport(getMockLocationVisits(), getDefaultGoals())
    );
    const [goals, setGoals] = useState<GoalDefinition[]>([]);
    const [source, setSource] = useState<'live' | 'mock'>('mock');
    const [loading, setLoading] = useState(false);
    const [aiInsight, setAiInsight] = useState<AiInsight>(() => report.aiInsight);
    const [aiLoading, setAiLoading] = useState(false);
    const [apiKey, setApiKey] = useState<string>('');
    const [persona, setPersonaState] = useState<CoachPersona>('encouraging');

    // ----------------------------------------------------
    // Caching, Throttling & Request Deduplication
    // ----------------------------------------------------
    
    /** Cache ref holding the signature and result of the last successful AI API call. */
    const cacheRef = useRef<{
        signature: string;
        timestamp: number;
        data: AiInsight;
    } | null>(null);
    
    /** Lock ref to prevent multiple duplicate concurrent insight API requests. */
    const isRequestPendingRef = useRef(false);

    /** Generates a unique fingerprint signature of the coaching request input state. */
    const getInsightSignature = useCallback((
        prodScore: number,
        nextLoc: string,
        anomCount: number,
        p: CoachPersona
    ) => {
        return `${prodScore}-${nextLoc}-${anomCount}-${p}`;
    }, []);

    // Load saved settings from Secure Store and AsyncStorage on mount
    useEffect(() => {
        const loadSavedSettings = async () => {
            try {
                const savedKey = await getSecureItem(STORAGE_KEY);
                if (savedKey) {
                    setApiKey(savedKey);
                }
                const savedPersona = await getSecureItem(PERSONA_KEY);
                if (savedPersona === 'tough' || savedPersona === 'encouraging' || savedPersona === 'data-driven' || savedPersona === 'direct') {
                    setPersonaState(savedPersona as CoachPersona);
                }
                
                // Load custom goals list
                const savedGoals = await AsyncStorage.getItem('@gps_tracks:custom_goals');
                if (savedGoals) {
                    setGoals(JSON.parse(savedGoals));
                } else {
                    const defaults = getDefaultGoals();
                    setGoals(defaults);
                    await AsyncStorage.setItem('@gps_tracks:custom_goals', JSON.stringify(defaults));
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        };
        loadSavedSettings();
    }, []);

    /** 
     * Adds a custom tracking goal. 
     * Generates a random unique ID, appends the goal to local state, stores the updated 
     * list in AsyncStorage, and triggers an asynchronous report recalculation so the UI
     * reflects the newly added goal target immediately.
     */
    const addCustomGoal = useCallback(async (newGoal: Omit<GoalDefinition, 'id'>) => {
        try {
            const nextGoal: GoalDefinition = {
                id: Math.random().toString(36).substring(2, 9),
                ...newGoal
            };
            const nextGoals = [...goals, nextGoal];
            setGoals(nextGoals);
            await AsyncStorage.setItem('@gps_tracks:custom_goals', JSON.stringify(nextGoals));
            
            // Re-generate report with new goals
            const trackedVisits = await getTrackedVisits(21);
            const visits = trackedVisits.length > 0 ? trackedVisits : getMockLocationVisits();
            const nextReport = await generateIntelligenceReportAsync(visits, nextGoals);
            setReport(nextReport);
        } catch (err) {
            console.error('Failed to add custom goal:', err);
        }
    }, [goals]);

    /** 
     * Removes a custom tracking goal. 
     * Filters out the target goal by ID, updates local state and AsyncStorage cache, 
     * and triggers a background report recalculation to recalculate remaining minutes.
     */
    const removeCustomGoal = useCallback(async (goalId: string) => {
        try {
            const nextGoals = goals.filter(g => g.id !== goalId);
            setGoals(nextGoals);
            await AsyncStorage.setItem('@gps_tracks:custom_goals', JSON.stringify(nextGoals));
            
            // Re-generate report with new goals
            const trackedVisits = await getTrackedVisits(21);
            const visits = trackedVisits.length > 0 ? trackedVisits : getMockLocationVisits();
            const nextReport = await generateIntelligenceReportAsync(visits, nextGoals);
            setReport(nextReport);
        } catch (err) {
            console.error('Failed to remove custom goal:', err);
        }
    }, [goals]);

    /** Securely saves the user's Gemini API Key. */
    const saveApiKey = useCallback(async (newKey: string) => {
        try {
            await setSecureItem(STORAGE_KEY, newKey);
            setApiKey(newKey);
            // Invalidate the cache immediately upon key changes
            cacheRef.current = null;
        } catch (err) {
            console.error('Failed to save Gemini key:', err);
        }
    }, []);

    /** Saves the user's chosen coaching persona preference. */
    const savePersona = useCallback(async (newPersona: CoachPersona) => {
        try {
            await setSecureItem(PERSONA_KEY, newPersona);
            setPersonaState(newPersona);
        } catch (err) {
            console.error('Failed to save persona preference:', err);
        }
    }, []);

    /**
     * Refreshes the telemetry data report and fetches updated AI coaching advice.
     * Analytical calculations are offloaded asynchronously to keep the UI responsive.
     * 
     * This function coordinates:
     * 1. Querying raw sqlite tracked visits from the device databases.
     * 2. Offloading computational heavy statistics calculations into web workers or background threads.
     * 3. Fetching and rate-limiting dynamic Gemini Habit Insights.
     */
    const refresh = useCallback(async (currentKey?: any) => {
        setLoading(true);
        let activeReport = report;

        try {
            const trackedVisits = await getTrackedVisits(21);

            // Resolve custom goals list
            let currentGoals = goals;
            try {
                const saved = await AsyncStorage.getItem('@gps_tracks:custom_goals');
                if (saved) {
                    currentGoals = JSON.parse(saved);
                }
            } catch {}
            if (!currentGoals || currentGoals.length === 0) {
                currentGoals = getDefaultGoals();
            }

            if (trackedVisits.length > 0) {
                // Offload calculation asynchronously to avoid thread blocking
                const nextReport = await generateIntelligenceReportAsync(trackedVisits, currentGoals);
                setReport(nextReport);
                activeReport = nextReport;
                setSource('live');
            } else {
                const nextReport = await generateIntelligenceReportAsync(getMockLocationVisits(), currentGoals);
                setReport(nextReport);
                activeReport = nextReport;
                setSource('mock');
            }
        } catch {
            let fallbackGoals = goals.length > 0 ? goals : getDefaultGoals();
            const nextReport = generateIntelligenceReport(getMockLocationVisits(), fallbackGoals);
            setReport(nextReport);
            activeReport = nextReport;
            setSource('mock');
        } finally {
            setLoading(false);
        }

        // Fetch AI coaching feedback
        setAiLoading(true);
        try {
            const keyToUse = (currentKey && typeof currentKey === 'string') ? currentKey : apiKey;
            
            const signature = getInsightSignature(
                activeReport.productivity.score,
                activeReport.prediction.nextLikelyLocation,
                activeReport.anomalies.length,
                persona
            );

            // Caching: Return cached results if signature matches and is under 5 minutes old
            if (
                cacheRef.current &&
                cacheRef.current.signature === signature &&
                Date.now() - cacheRef.current.timestamp < 5 * 60 * 1000
            ) {
                setAiInsight(cacheRef.current.data);
                setAiLoading(false);
                return;
            }

            // Throttling: Return immediately if another API request is already pending
            if (isRequestPendingRef.current) {
                setAiLoading(false);
                return;
            }
            isRequestPendingRef.current = true;

            // Reset insight to prompt real-time typing/streaming effect in the UI
            setAiInsight({
                narrative: '',
                focusRecommendation: '',
                routineRecommendation: '',
                coachName: 'Active Coach',
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            });

            // Fetch with stream callback chunk updates
            const apiResult = await fetchGeminiAiInsight(
                activeReport.productivity,
                activeReport.prediction,
                activeReport.anomalies,
                keyToUse,
                persona,
                (partialChunk) => {
                    setAiInsight((prev) => ({
                        ...prev,
                        ...partialChunk,
                    }));
                }
            );

            isRequestPendingRef.current = false;

            if (apiResult) {
                // Update caching ref with the final aggregated result
                cacheRef.current = {
                    signature,
                    timestamp: Date.now(),
                    data: apiResult,
                };
                setAiInsight(apiResult);
            } else {
                setAiInsight(activeReport.aiInsight);
            }
        } catch {
            isRequestPendingRef.current = false;
            setAiInsight(activeReport.aiInsight);
        } finally {
            setAiLoading(false);
        }
    }, [apiKey, report, persona, getInsightSignature]);

    /** Fetches updated AI feedback focusing exclusively on the current active report. */
    const refreshAiAdvice = useCallback(async (currentKey?: any) => {
        setAiLoading(true);
        try {
            const keyToUse = (currentKey && typeof currentKey === 'string') ? currentKey : apiKey;

            const signature = getInsightSignature(
                report.productivity.score,
                report.prediction.nextLikelyLocation,
                report.anomalies.length,
                persona
            );

            if (
                cacheRef.current &&
                cacheRef.current.signature === signature &&
                Date.now() - cacheRef.current.timestamp < 5 * 60 * 1000
            ) {
                setAiInsight(cacheRef.current.data);
                setAiLoading(false);
                return;
            }

            if (isRequestPendingRef.current) {
                setAiLoading(false);
                return;
            }
            isRequestPendingRef.current = true;

            setAiInsight({
                narrative: '',
                focusRecommendation: '',
                routineRecommendation: '',
                coachName: 'Active Coach',
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            });

            const apiResult = await fetchGeminiAiInsight(
                report.productivity,
                report.prediction,
                report.anomalies,
                keyToUse,
                persona,
                (partialChunk) => {
                    setAiInsight((prev) => ({
                        ...prev,
                        ...partialChunk,
                    }));
                }
            );

            isRequestPendingRef.current = false;

            if (apiResult) {
                cacheRef.current = {
                    signature,
                    timestamp: Date.now(),
                    data: apiResult,
                };
                setAiInsight(apiResult);
            } else {
                const local = generateLocalAiInsight(
                    report.productivity,
                    report.prediction,
                    report.anomalies
                );
                setAiInsight(local);
            }
        } catch {
            isRequestPendingRef.current = false;
            const local = generateLocalAiInsight(
                report.productivity,
                report.prediction,
                report.anomalies
            );
            setAiInsight(local);
        } finally {
            setAiLoading(false);
        }
    }, [apiKey, report, persona, getInsightSignature]);

    // Perform an initial fetch on mount and whenever settings are loaded/altered
    useEffect(() => {
        refresh();
    }, [apiKey, persona]);

    return {
        report,
        goals,
        addCustomGoal,
        removeCustomGoal,
        source,
        loading,
        aiInsight,
        aiLoading,
        apiKey,
        saveApiKey,
        persona,
        savePersona,
        refresh,
        refreshAiAdvice,
    };
}
