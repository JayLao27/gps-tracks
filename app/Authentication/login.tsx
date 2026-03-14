import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        if (email === 'test@example.com' && password === 'password') {
            Alert.alert('Login successful!');
            setError('');
            router.replace('/dashboard' as never);
            return;
        }

        setError('Invalid email or password');
    };

    return (
        <View className="flex-1 items-center justify-center bg-gray-100 p-4">
            <View className="w-full max-w-[420px] rounded-lg border border-gray-300 bg-white p-6">
                <Text className="mb-4 text-2xl font-semibold">Login</Text>

                <Text className="mb-1.5 text-sm">Email</Text>
                <TextInput
                    className="mb-3.5 rounded-md border border-gray-300 px-3 py-2.5"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="you@example.com"
                />

                <Text className="mb-1.5 text-sm">Password</Text>
                <TextInput
                    className="mb-3.5 rounded-md border border-gray-300 px-3 py-2.5"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Enter password"
                />

                {!!error && <Text className="mb-3 text-red-600">{error}</Text>}

                <Pressable className="items-center rounded-md bg-blue-500 py-3" onPress={handleSubmit}>
                    <Text className="font-semibold text-white">Login</Text>
                </Pressable>
            </View>
        </View>
    );
}