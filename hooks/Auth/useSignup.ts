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

    const getPasswordStrength = (): { score: number; label: string; color: string } => {
        if (!password) return { score: 0, label: 'None', color: '#64748b' };
        let score = 0;
        if (password.length >= 8) score += 1;
        if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        switch (score) {
            case 0:
            case 1:
                return { score, label: 'Weak', color: '#ef4444' };
            case 2:
                return { score, label: 'Fair', color: '#f59e0b' };
            case 3:
                return { score, label: 'Good', color: '#3b82f6' };
            case 4:
                return { score, label: 'Strong', color: '#10b981' };
            default:
                return { score: 0, label: 'None', color: '#64748b' };
        }
    };

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

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLastSubmitAt(now);
        setLoading(true);
        setError('');

        const result = await registerUser(name, email.trim().toLowerCase(), password);

        if (result) {
            setError(result);
            setLoading(false);
            return;
        }

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
        getPasswordStrength,
    };
}
