/**
 * ============================================================================
 * MODULE: app/index.tsx
 * LAYER: Presentation / Entry Layer
 * DESCRIPTION: Handles initial application boot redirecting user session.
 * ============================================================================
 */

import { Redirect } from 'expo-router';

export default function Index() {
    return <Redirect href="/Authentication/login" />;
}
