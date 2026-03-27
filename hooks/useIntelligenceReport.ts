import { useCallback, useEffect, useState } from 'react';

import {
    generateIntelligenceReport,
    getDefaultGoals,
    getMockLocationVisits,
    type IntelligenceReport,
} from '@/services/locationIntelligence';
import { getTrackedVisits } from '@/services/locationTracking';

export function useIntelligenceReport() {
    const [report, setReport] = useState<IntelligenceReport>(() =>
        generateIntelligenceReport(getMockLocationVisits(), getDefaultGoals())
    );
    const [source, setSource] = useState<'live' | 'mock'>('mock');
    const [loading, setLoading] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);

        try {
            const trackedVisits = await getTrackedVisits(21);

            if (trackedVisits.length > 0) {
                setReport(generateIntelligenceReport(trackedVisits, getDefaultGoals()));
                setSource('live');
                return;
            }
        } catch {
            // Fall through to mock data.
        } finally {
            setLoading(false);
        }

        setReport(generateIntelligenceReport(getMockLocationVisits(), getDefaultGoals()));
        setSource('mock');
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        report,
        source,
        loading,
        refresh,
    };
}
