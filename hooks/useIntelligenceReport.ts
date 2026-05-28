import { useCallback, useEffect, useRef, useState } from 'react';

import {
    generateIntelligenceReport,
    generateIntelligenceReportAsync,
    getDefaultGoals,
    getMockLocationVisits,
    type IntelligenceReport,
    type AiInsight,
    fetchGeminiAiInsight,
    generateLocalAiInsight,
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

    // Load saved settings from Secure Store on mount
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
            } catch (err) {
                console.error('Failed to load settings:', err);
            }
        };
        loadSavedSettings();
    }, []);

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
     */
    const refresh = useCallback(async (currentKey?: any) => {
        setLoading(true);
        let activeReport = report;

        try {
            const trackedVisits = await getTrackedVisits(21);

            if (trackedVisits.length > 0) {
                // Offload calculation asynchronously to avoid thread blocking
                const nextReport = await generateIntelligenceReportAsync(trackedVisits, getDefaultGoals());
                setReport(nextReport);
                activeReport = nextReport;
                setSource('live');
            } else {
                const nextReport = await generateIntelligenceReportAsync(getMockLocationVisits(), getDefaultGoals());
                setReport(nextReport);
                activeReport = nextReport;
                setSource('mock');
            }
        } catch {
            const nextReport = generateIntelligenceReport(getMockLocationVisits(), getDefaultGoals());
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
