import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const STORAGE_KEY = '@gps_tracks:gemini_api_key';

export function useIntelligenceReport() {
    const [report, setReport] = useState<IntelligenceReport>(() =>
        generateIntelligenceReport(getMockLocationVisits(), getDefaultGoals())
    );
    const [source, setSource] = useState<'live' | 'mock'>('mock');
    const [loading, setLoading] = useState(false);
    const [aiInsight, setAiInsight] = useState<AiInsight>(() => report.aiInsight);
    const [aiLoading, setAiLoading] = useState(false);
    const [apiKey, setApiKey] = useState<string>('');

    // Load key from AsyncStorage on mount
    useEffect(() => {
        const loadKey = async () => {
            try {
                const savedKey = await AsyncStorage.getItem(STORAGE_KEY);
                if (savedKey) {
                    setApiKey(savedKey);
                }
            } catch (err) {
                console.error('Failed to load Gemini key:', err);
            }
        };
        loadKey();
    }, []);

    // TODO: IMPROVEMENT: Secure Storage & API Key Protection
    // 1. Secure Storage: Use Expo SecureStore instead of unencrypted AsyncStorage to save
    //    user-entered API keys on the device.
    // 2. Request Throttling: Implement caching/de-bouncing on API insight requests to
    //    prevent multiple duplicate Gemini calls during frequent component updates.
    const saveApiKey = useCallback(async (newKey: string) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, newKey);
            setApiKey(newKey);
        } catch (err) {
            console.error('Failed to save Gemini key:', err);
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

        // Also refresh AI insights
        setAiLoading(true);
        try {
            const keyToUse = (currentKey && typeof currentKey === 'string') ? currentKey : apiKey;
            const apiResult = await fetchGeminiAiInsight(
                activeReport.productivity,
                activeReport.prediction,
                activeReport.anomalies,
                keyToUse
            );
            if (apiResult) {
                setAiInsight(apiResult);
            } else {
                setAiInsight(activeReport.aiInsight);
            }
        } catch {
            setAiInsight(activeReport.aiInsight);
        } finally {
            setAiLoading(false);
        }
    }, [apiKey, report]);

    const refreshAiAdvice = useCallback(async (currentKey?: any) => {
        setAiLoading(true);
        try {
            const keyToUse = (currentKey && typeof currentKey === 'string') ? currentKey : apiKey;
            const apiResult = await fetchGeminiAiInsight(
                report.productivity,
                report.prediction,
                report.anomalies,
                keyToUse
            );
            if (apiResult) {
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
            const local = generateLocalAiInsight(
                report.productivity,
                report.prediction,
                report.anomalies
            );
            setAiInsight(local);
        } finally {
            setAiLoading(false);
        }
    }, [apiKey, report]);

    // Initial load when mounting or when key is loaded/changed
    useEffect(() => {
        refresh();
    }, [apiKey]);

    return {
        report,
        source,
        loading,
        aiInsight,
        aiLoading,
        apiKey,
        saveApiKey,
        refresh,
        refreshAiAdvice,
    };
}
