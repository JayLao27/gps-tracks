import { registerUser } from '@/services/authService';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export function useSignup() {
    const router = useRouter();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async () => {
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

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
