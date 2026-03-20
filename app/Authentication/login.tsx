import { useLogin } from '@/hooks/Auth/useLogin';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function Login() {
    const { email, setEmail, password, setPassword, error, handleSubmit } =
        useLogin();
    const [showPassword, setShowPassword] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    return (
        <LinearGradient
            colors={['#0f172a', '#1e293b', '#0f172a']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
            >
                <View className="flex-1 items-center justify-center px-6">
                    {/* ── Branding Section ── */}
                    <View className="mb-10 items-center">
                        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
                            <Ionicons
                                name="location"
                                size={40}
                                color="#34d399"
                            />
                        </View>
                        <Text className="text-3xl font-bold tracking-wider text-white">
                            GPS Tracks
                        </Text>
                        <Text className="mt-1 text-sm tracking-wide text-slate-400">
                            Track your location in real-time
                        </Text>
                    </View>

                    {/* ── Login Card ── */}
                    <View className="w-full max-w-[400px] rounded-3xl border border-white/10 bg-white/5 p-7">
                        <Text className="mb-1 text-xl font-bold text-white">
                            Welcome back
                        </Text>
                        <Text className="mb-6 text-sm text-slate-400">
                            Sign in to continue tracking
                        </Text>

                        {/* ── Email Input ── */}
                        <View className="mb-4">
                            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                Email
                            </Text>
                            <View
                                className={`flex-row items-center rounded-xl border px-4 py-3 ${
                                    emailFocused
                                        ? 'border-emerald-500 bg-white/10'
                                        : 'border-white/10 bg-white/5'
                                }`}
                            >
                                <Ionicons
                                    name="mail-outline"
                                    size={18}
                                    color={
                                        emailFocused ? '#34d399' : '#94a3b8'
                                    }
                                />
                                <TextInput
                                    className="ml-3 flex-1 text-base text-white"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholder="you@example.com"
                                    placeholderTextColor="#64748b"
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={() => setEmailFocused(false)}
                                />
                            </View>
                        </View>

                        {/* ── Password Input ── */}
                        <View className="mb-4">
                            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                Password
                            </Text>
                            <View
                                className={`flex-row items-center rounded-xl border px-4 py-3 ${
                                    passwordFocused
                                        ? 'border-emerald-500 bg-white/10'
                                        : 'border-white/10 bg-white/5'
                                }`}
                            >
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={18}
                                    color={
                                        passwordFocused ? '#34d399' : '#94a3b8'
                                    }
                                />
                                <TextInput
                                    className="ml-3 flex-1 text-base text-white"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    placeholder="Enter password"
                                    placeholderTextColor="#64748b"
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                />
                                <Pressable
                                    onPress={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    hitSlop={8}
                                >
                                    <Ionicons
                                        name={
                                            showPassword
                                                ? 'eye-off-outline'
                                                : 'eye-outline'
                                        }
                                        size={20}
                                        color="#94a3b8"
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {/* ── Forgot Password ── */}
                        <Pressable className="mb-5 self-end">
                            <Text className="text-xs font-medium text-emerald-400">
                                Forgot password?
                            </Text>
                        </Pressable>

                        {/* ── Error Message ── */}
                        {!!error && (
                            <View className="mb-4 flex-row items-center rounded-xl bg-red-500/10 px-4 py-3">
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={18}
                                    color="#ef4444"
                                />
                                <Text className="ml-2 text-sm text-red-400">
                                    {error}
                                </Text>
                            </View>
                        )}

                        {/* ── Login Button ── */}
                        <Pressable
                            className="items-center rounded-xl bg-emerald-500 py-4 active:bg-emerald-600"
                            onPress={handleSubmit}
                        >
                            <View className="flex-row items-center">
                                <Ionicons
                                    name="log-in-outline"
                                    size={20}
                                    color="#fff"
                                />
                                <Text className="ml-2 text-base font-bold text-white">
                                    Sign In
                                </Text>
                            </View>
                        </Pressable>

                        {/* ── Divider ── */}
                        <View className="my-6 flex-row items-center">
                            <View className="h-px flex-1 bg-white/10" />
                            <Text className="mx-4 text-xs text-slate-500">
                                OR
                            </Text>
                            <View className="h-px flex-1 bg-white/10" />
                        </View>

                        {/* ── Google Sign-In Button ── */}
                        <Pressable className="flex-row items-center justify-center rounded-xl border border-white/10 bg-white/5 py-4 active:bg-white/10">
                            <Ionicons
                                name="logo-google"
                                size={20}
                                color="#94a3b8"
                            />
                            <Text className="ml-3 text-base font-semibold text-slate-300">
                                Continue with Google
                            </Text>
                        </Pressable>
                    </View>

                    {/* ── Footer ── */}
                    <View className="mt-8 flex-row">
                        <Text className="text-sm text-slate-500">
                            Don't have an account?{' '}
                        </Text>
                        <Pressable>
                            <Text className="text-sm font-bold text-emerald-400">
                                Sign Up
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}