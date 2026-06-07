/**
 * ============================================================================
 * MODULE: hooks/Auth/useSignup.ts
 * LAYER: Stateful Hooks / Authentication Layer
 * DESCRIPTION: Coordinates registration fields validation and signup requests.
 * ============================================================================
 */

import { registerUser } from '@/services/authService';
import { useRouter } from 'expo-router';
import { useState } from 'react';

const SIGNUP_RETRY_COOLDOWN_MS = 15000;

export function useSignup() {
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [lastSubmitAt, setLastSubmitAt] = useState<number>(0);

    const handleSignup = async () => {
        if (loading) return;

        const now = Date.now();
        const msSinceLastSubmit = now - lastSubmitAt;
        if (msSinceLastSubmit < SIGNUP_RETRY_COOLDOWN_MS) {
            const secondsRemaining = Math.ceil(
                (SIGNUP_RETRY_COOLDOWN_MS - msSinceLastSubmit) / 1000
            );
            setError(`Please wait ${secondsRemaining}s before trying again.`);
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLastSubmitAt(now);
        setLoading(true);
        setError('');

        const result = await registerUser(name, email, password);

        if (result) {
            // result is an error message
            setError(result);
            setLoading(false);
            return;
        }

        // Success – navigate to dashboard
        setLoading(false);
        router.replace('/System/dashboard' as never);
    };

    return {
        name,
        setName,
        email,
        setEmail,
        password,
        setPassword,
        confirmPassword,
        setConfirmPassword,
        error,
        loading,
        handleSignup,
    };
}
