import { useGoogleAuth } from '@/hooks/Auth/useGoogleAuth';
import { useSignup } from '@/hooks/Auth/useSignup';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function Signup() {
    const router = useRouter();
    const {
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
    } = useSignup();
    const {
        handleGoogleSignIn,
        loading: googleLoading,
        error: googleError,
    } = useGoogleAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const [nameFocused, setNameFocused] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmFocused, setConfirmFocused] = useState(false);

    const displayError = error || googleError;

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
                <ScrollView
                    contentContainerStyle={{
                        flexGrow: 1,
                        justifyContent: 'center',
                        paddingHorizontal: 24,
                        paddingVertical: 48,
                    }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Branding Section ── */}
                    <View className="mb-8 items-center">
                        <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20">
                            <Ionicons name="location" size={40} color="#34d399" />
                        </View>
                        <Text className="text-3xl font-bold tracking-wider text-white">
                            GPS Tracks
                        </Text>
                        <Text className="mt-1 text-sm tracking-wide text-slate-400">
                            Start tracking your adventures
                        </Text>
                    </View>

                    {/* ── Signup Card ── */}
                    <View className="w-full max-w-[400px] self-center rounded-3xl border border-white/10 bg-white/5 p-7">
                        <Text className="mb-1 text-xl font-bold text-white">
                            Create Account
                        </Text>
                        <Text className="mb-6 text-sm text-slate-400">
                            Join and start recording your routes
                        </Text>

                        {/* ── Name Input ── */}
                        <View className="mb-4">
                            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                Full Name
                            </Text>
                            <View
                                className={`flex-row items-center rounded-xl border px-4 py-3 ${
                                    nameFocused
                                        ? 'border-emerald-500 bg-white/10'
                                        : 'border-white/10 bg-white/5'
                                }`}
                            >
                                <Ionicons
                                    name="person-outline"
                                    size={18}
                                    color={nameFocused ? '#34d399' : '#94a3b8'}
                                />
                                <TextInput
                                    className="ml-3 flex-1 text-base text-white"
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="John Doe"
                                    placeholderTextColor="#64748b"
                                    onFocus={() => setNameFocused(true)}
                                    onBlur={() => setNameFocused(false)}
                                />
                            </View>
                        </View>

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
                                    color={emailFocused ? '#34d399' : '#94a3b8'}
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
                                    color={passwordFocused ? '#34d399' : '#94a3b8'}
                                />
                                <TextInput
                                    className="ml-3 flex-1 text-base text-white"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    placeholder="Min. 6 characters"
                                    placeholderTextColor="#64748b"
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                />
                                <Pressable
                                    onPress={() => setShowPassword(!showPassword)}
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

                        {/* ── Confirm Password Input ── */}
                        <View className="mb-5">
                            <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                                Confirm Password
                            </Text>
                            <View
                                className={`flex-row items-center rounded-xl border px-4 py-3 ${
                                    confirmFocused
                                        ? 'border-emerald-500 bg-white/10'
                                        : 'border-white/10 bg-white/5'
                                }`}
                            >
                                <Ionicons
                                    name="lock-closed-outline"
                                    size={18}
                                    color={confirmFocused ? '#34d399' : '#94a3b8'}
                                />
                                <TextInput
                                    className="ml-3 flex-1 text-base text-white"
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    secureTextEntry={!showConfirm}
                                    placeholder="Re-enter password"
                                    placeholderTextColor="#64748b"
                                    onFocus={() => setConfirmFocused(true)}
                                    onBlur={() => setConfirmFocused(false)}
                                />
                                <Pressable
                                    onPress={() => setShowConfirm(!showConfirm)}
                                    hitSlop={8}
                                >
                                    <Ionicons
                                        name={
                                            showConfirm
                                                ? 'eye-off-outline'
                                                : 'eye-outline'
                                        }
                                        size={20}
                                        color="#94a3b8"
                                    />
                                </Pressable>
                            </View>
                        </View>

                        {/* ── Error Message ── */}
                        {!!displayError && (
                            <View className="mb-4 flex-row items-center rounded-xl bg-red-500/10 px-4 py-3">
                                <Ionicons
                                    name="alert-circle-outline"
                                    size={18}
                                    color="#ef4444"
                                />
                                <Text className="ml-2 text-sm text-red-400">
                                    {displayError}
                                </Text>
                            </View>
                        )}

                        {/* ── Sign Up Button ── */}
                        <Pressable
                            className="items-center rounded-xl bg-emerald-500 py-4 active:bg-emerald-600"
                            onPress={handleSignup}
                            disabled={loading}
                        >
                            <View className="flex-row items-center">
                                {loading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Ionicons
                                        name="person-add-outline"
                                        size={20}
                                        color="#fff"
                                    />
                                )}
                                <Text className="ml-2 text-base font-bold text-white">
                                    {loading ? 'Creating Account...' : 'Create Account'}
                                </Text>
                            </View>
                        </Pressable>

                        {/* ── Divider ── */}
                        <View className="my-6 flex-row items-center">
                            <View className="h-px flex-1 bg-white/10" />
                            <Text className="mx-4 text-xs text-slate-500">OR</Text>
                            <View className="h-px flex-1 bg-white/10" />
                        </View>

                        {/* ── Google Sign-Up Button ── */}
                        <Pressable
                            className="flex-row items-center justify-center rounded-xl border border-white/10 bg-white/5 py-4 active:bg-white/10"
                            onPress={handleGoogleSignIn}
                            disabled={googleLoading}
                        >
                            {googleLoading ? (
                                <ActivityIndicator size="small" color="#94a3b8" />
                            ) : (
                                <Ionicons
                                    name="logo-google"
                                    size={20}
                                    color="#94a3b8"
                                />
                            )}
                            <Text className="ml-3 text-base font-semibold text-slate-300">
                                Sign up with Google
                            </Text>
                        </Pressable>
                    </View>

                    {/* ── Footer ── */}
                    <View className="mt-8 flex-row self-center">
                        <Text className="text-sm text-slate-500">
                            Already have an account?{' '}
                        </Text>
                        <Pressable onPress={() => router.back()}>
                            <Text className="text-sm font-bold text-emerald-400">
                                Sign In
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}
