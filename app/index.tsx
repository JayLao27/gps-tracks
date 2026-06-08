/**
 * ============================================================================
 * MODULE: app/index.tsx
 * LAYER: Presentation / Entry Layer
 * DESCRIPTION: Handles initial application boot redirecting user session.
 * ============================================================================
 */

import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { validateSessionLifecycle } from '@/services/authService';

export default function Index() {
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        validateSessionLifecycle().then((valid) => {
            setIsAuthenticated(valid);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#030712' }}>
                <ActivityIndicator size="large" color="#10b981" />
            </View>
        );
    }

    if (isAuthenticated) {
        return <Redirect href="/System/dashboard" />;
    }

    return <Redirect href="/Authentication/login" />;
}

