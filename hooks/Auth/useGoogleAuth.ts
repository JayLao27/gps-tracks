// TODO: FUTURE GOOGLE AUTH & OAUTH SECURITY ENHANCEMENTS:
// 1. Dynamic Redirect URIs: Replace hardcoded 'http://localhost:8081' with AuthSession.makeRedirectUri()
//    to support dynamic scheme redirection and deep links on native Android/iOS builds.
// 2. PKCE Authorization Flow: Shift responseType from ResponseType.Token to ResponseType.Code and
//    enable usePKCE: true to protect raw access tokens from escaping in browser histories.
// 3. Platform-Specific Native Client IDs: Select client IDs dynamically based on the OS (e.g. Platform.select)
//    using separate IDs for Google iOS, Android, and Web client configurations.

import { loginOrRegisterWithGoogle } from '@/services/authService';
import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

WebBrowser.maybeCompleteAuthSession();


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
