import { useCallback, useEffect, useRef, useState } from 'react';

import {
    generateIntelligenceReport,
    getDefaultGoals,
    getMockLocationVisits,
    type IntelligenceReport,
    type AiInsight,
    fetchGeminiAiInsight,
    generateLocalAiInsight,
} from '@/services/locationIntelligence';
import { getTrackedVisits } from '@/services/locationTracking';
import { getSecureItem, setSecureItem } from '../utils/secureStorage';

const STORAGE_KEY = '@gps_tracks:gemini_api_key';
const PERSONA_KEY = '@gps_tracks:coach_persona';

export type CoachPersona = 'tough' | 'encouraging' | 'data-driven' | 'direct';

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

    // Caching and Throttling Refs
    const cacheRef = useRef<{
        signature: string;
        timestamp: number;
        data: AiInsight;
    } | null>(null);
    
    const isRequestPendingRef = useRef(false);

    // Compute unique signature of inputs to cache responses
    const getInsightSignature = useCallback((
        prodScore: number,
        nextLoc: string,
        anomCount: number,
        p: CoachPersona
    ) => {
        return `${prodScore}-${nextLoc}-${anomCount}-${p}`;
    }, []);

    // Load key and persona preference on mount
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

    const saveApiKey = useCallback(async (newKey: string) => {
        try {
            await setSecureItem(STORAGE_KEY, newKey);
            setApiKey(newKey);
            // Clear cache when API key changes
            cacheRef.current = null;
        } catch (err) {
            console.error('Failed to save Gemini key:', err);
        }
    }, []);

    const savePersona = useCallback(async (newPersona: CoachPersona) => {
        try {
            await setSecureItem(PERSONA_KEY, newPersona);
            setPersonaState(newPersona);
        } catch (err) {
            console.error('Failed to save persona preference:', err);
        }
    }, []);

    const refresh = useCallback(async (currentKey?: any) => {
        setLoading(true);
        let activeReport = report;

        try {
            const trackedVisits = await getTrackedVisits(21);

            if (trackedVisits.length > 0) {
                const nextReport = generateIntelligenceReport(trackedVisits, getDefaultGoals());
                setReport(nextReport);
                activeReport = nextReport;
                setSource('live');
            } else {
                const nextReport = generateIntelligenceReport(getMockLocationVisits(), getDefaultGoals());
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

        // Refresh AI insights
        setAiLoading(true);
        try {
            const keyToUse = (currentKey && typeof currentKey === 'string') ? currentKey : apiKey;
            
            // Check cache
            const signature = getInsightSignature(
                activeReport.productivity.score,
                activeReport.prediction.nextLikelyLocation,
                activeReport.anomalies.length,
                persona
            );

            if (
                cacheRef.current &&
                cacheRef.current.signature === signature &&
                Date.now() - cacheRef.current.timestamp < 5 * 60 * 1000 // 5 minutes cache
            ) {
                setAiInsight(cacheRef.current.data);
                setAiLoading(false);
                return;
            }

            // Request Throttling: prevent concurrent requests
            if (isRequestPendingRef.current) {
                setAiLoading(false);
                return;
            }
            isRequestPendingRef.current = true;

            const apiResult = await fetchGeminiAiInsight(
                activeReport.productivity,
                activeReport.prediction,
                activeReport.anomalies,
                keyToUse,
                persona
            );

            isRequestPendingRef.current = false;

            if (apiResult) {
                // Save to cache
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

    const refreshAiAdvice = useCallback(async (currentKey?: any) => {
        setAiLoading(true);
        try {
            const keyToUse = (currentKey && typeof currentKey === 'string') ? currentKey : apiKey;

            // Check cache
            const signature = getInsightSignature(
                report.productivity.score,
                report.prediction.nextLikelyLocation,
                report.anomalies.length,
                persona
            );

            if (
                cacheRef.current &&
                cacheRef.current.signature === signature &&
                Date.now() - cacheRef.current.timestamp < 5 * 60 * 1000 // 5 minutes
            ) {
                setAiInsight(cacheRef.current.data);
                setAiLoading(false);
                return;
            }

            // Throttling
            if (isRequestPendingRef.current) {
                setAiLoading(false);
                return;
            }
            isRequestPendingRef.current = true;

            const apiResult = await fetchGeminiAiInsight(
                report.productivity,
                report.prediction,
                report.anomalies,
                keyToUse,
                persona
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

    // Initial load when mounting or when key/persona is loaded or changed
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
