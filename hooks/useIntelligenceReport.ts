import { useCallback, useEffect, useState } from 'react';

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

export function useIntelligenceReport() {
    const [report, setReport] = useState<IntelligenceReport>(() =>
        generateIntelligenceReport(getMockLocationVisits(), getDefaultGoals())
    );
    const [source, setSource] = useState<'live' | 'mock'>('mock');
    const [loading, setLoading] = useState(false);
    const [aiInsight, setAiInsight] = useState<AiInsight>(() => report.aiInsight);
    const [aiLoading, setAiLoading] = useState(false);

    const refresh = useCallback(async () => {
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
            const apiResult = await fetchGeminiAiInsight(
                activeReport.productivity,
                activeReport.prediction,
                activeReport.anomalies
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
    }, []);

    const refreshAiAdvice = useCallback(async () => {
        setAiLoading(true);
        try {
            const apiResult = await fetchGeminiAiInsight(
                report.productivity,
                report.prediction,
                report.anomalies
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
    }, [report]);

    useEffect(() => {
        refresh();
    }, []);

    return {
        report,
        source,
        loading,
        aiInsight,
        aiLoading,
        refresh,
        refreshAiAdvice,
    };
}
