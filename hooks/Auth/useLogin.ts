import { loginUser } from '@/services/authService';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

export function useLogin() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        const success = await loginUser(email, password);

        if (success) {
            Alert.alert('Login successful!');
            setError('');
            router.replace('/dashboard' as never);
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
