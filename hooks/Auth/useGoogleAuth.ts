import { loginOrRegisterWithGoogle } from '@/services/authService';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

// ── Google OAuth Config ──
// Replace with your own Google Cloud OAuth Client ID.
// Create one at: https://console.cloud.google.com/apis/credentials
// Choose "Web application" type and add your redirect URI.
const GOOGLE_CLIENT_ID = '707847440005-1ncojlfspbkbgo8iq3d94ie8e8oulf60.apps.googleusercontent.com';

const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export function useGoogleAuth() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // For web development, use your localhost URL.
    // For production or native builds, use AuthSession.makeRedirectUri({ scheme: 'gpstracks' })
    const redirectUri = 'http://localhost:8081';

    const [request, , promptAsync] = AuthSession.useAuthRequest(
        {
            clientId: GOOGLE_CLIENT_ID,
            scopes: ['openid', 'profile', 'email'],
            redirectUri,
            responseType: AuthSession.ResponseType.Token,
            usePKCE: false,
        },
        discovery
    );

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError('');

        try {
            const result = await promptAsync();

            if (result.type === 'success' && result.authentication) {
                // Fetch user info from Google
                const userInfoResponse = await fetch(
                    'https://www.googleapis.com/oauth2/v3/userinfo',
                    {
                        headers: {
                            Authorization: `Bearer ${result.authentication.accessToken}`,
                        },
                    }
                );
                const userInfo = await userInfoResponse.json();

                // Register or login the user locally
                await loginOrRegisterWithGoogle(
                    userInfo.name || 'Google User',
                    userInfo.email
                );

                router.replace('/System/dashboard' as never);
            } else if (result.type === 'error') {
                setError(result.error?.message || 'Google sign-in failed');
            }
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    return {
        handleGoogleSignIn,
        loading,
        error,
        isReady: !!request,
    };
}
