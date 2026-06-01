// TODO: FUTURE LOGIN & CONVENIENCE ENHANCEMENTS:
// 1. Biometric Authentication (FaceID/TouchID): Integrate expo-local-authentication to prompt
//    keychain-backed biometric login for returning users, skipping passcode input.
// 2. Email Trimming & Sanitization: Clean the email string to trim leading/trailing whitespace
//    before dispatching authentication API requests to avoid accidental credential mismatch.

import { loginUser } from '@/services/authService';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export function useLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        const success = await loginUser(email, password);

        if (success) {
            setError('');
            router.replace('/System/dashboard' as never);
            return;
        }

        setError('Invalid email or password');
    };

    return {
        email,
        setEmail,
        password,
        setPassword,
        error,
        handleSubmit,
    };
}
