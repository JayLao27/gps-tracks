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
            colors={['#030712', '#0c1122', '#030712']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
        >
            {/* Absolute Ambient Space Glows */}
            <View className="absolute top-[-50] right-[-50] h-60 w-60 rounded-full bg-emerald-500/10 opacity-30 blur-3xl" />
            <View className="absolute bottom-[100] left-[-50] h-80 w-80 rounded-full bg-violet-500/10 opacity-30 blur-3xl" />

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
                    {/* Header Logotype */}
                    <View className="mb-6 items-center">
                        <View className="relative mb-4 h-20 w-20 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-950/20 shadow-xl shadow-emerald-500/10">
                            {/* Inner glowing icon */}
                            <View className="h-14 w-14 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/15">
                                <Ionicons name="navigate" size={30} color="#34d399" />
                            </View>
                            {/* Active locator beacon pulse */}
                            <View className="absolute right-0 top-0 h-4.5 w-4.5 rounded-full border border-[#0c1122] bg-emerald-400" />
                        </View>
                        <Text className="text-3xl font-black tracking-widest text-white uppercase">
                            GPS TRACKS
                        </Text>
                        <Text className="mt-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
                            Initialize New Tracking Node
                        </Text>
                    </View>

                    {/* Authentication Glass Card */}
                    <View className="w-full max-w-[400px] self-center overflow-hidden rounded-[32px] border border-white/10 bg-slate-900/30 shadow-2xl">
                        <LinearGradient
                            colors={['rgba(30, 41, 59, 0.4)', 'rgba(15, 23, 42, 0.6)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={{ padding: 28 }}
                        >
                            <Text className="text-xl font-black text-white tracking-tight">
                                REGISTER PROFILE
                            </Text>
                            <Text className="mb-6 mt-0.5 text-xs font-semibold text-slate-400">
                                Connect your terminal to the spatial datastore
                            </Text>

                            {/* Full Name Input */}
                            <View className="mb-4">
                                <Text className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Operator Full Name
                                </Text>
                                <View
                                    className={`flex-row items-center rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                                        nameFocused
                                            ? 'border-emerald-500/50 bg-emerald-950/10 shadow-emerald-500/5'
                                            : 'border-white/5 bg-slate-950/40'
                                    }`}
                                >
                                    <Ionicons
                                        name="person-outline"
                                        size={18}
                                        color={nameFocused ? '#34d399' : '#64748b'}
                                    />
                                    <TextInput
                                        className="ml-3 flex-1 text-sm font-semibold text-white"
                                        value={name}
                                        onChangeText={setName}
                                        placeholder="John Doe"
                                        placeholderTextColor="#475569"
                                        onFocus={() => setNameFocused(true)}
                                        onBlur={() => setNameFocused(false)}
                                    />
                                </View>
                            </View>

                            {/* Email Input */}
                            <View className="mb-4">
                                <Text className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Identity / Email
                                </Text>
                                <View
                                    className={`flex-row items-center rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                                        emailFocused
                                            ? 'border-emerald-500/50 bg-emerald-950/10 shadow-emerald-500/5'
                                            : 'border-white/5 bg-slate-950/40'
                                    }`}
                                >
                                    <Ionicons
                                        name="mail-outline"
                                        size={18}
                                        color={emailFocused ? '#34d399' : '#64748b'}
                                    />
                                    <TextInput
                                        className="ml-3 flex-1 text-sm font-semibold text-white"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        placeholder="explorer@gps.io"
                                        placeholderTextColor="#475569"
                                        onFocus={() => setEmailFocused(true)}
                                        onBlur={() => setEmailFocused(false)}
                                    />
                                </View>
                            </View>

                            {/* Password Input */}
                            <View className="mb-4">
                                <Text className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Security Passcode
                                </Text>
                                <View
                                    className={`flex-row items-center rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                                        passwordFocused
                                            ? 'border-emerald-500/50 bg-emerald-950/10 shadow-emerald-500/5'
                                            : 'border-white/5 bg-slate-950/40'
                                    }`}
                                >
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={18}
                                        color={passwordFocused ? '#34d399' : '#64748b'}
                                    />
                                    <TextInput
                                        className="ml-3 flex-1 text-sm font-semibold text-white"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry={!showPassword}
                                        placeholder="••••••••"
                                        placeholderTextColor="#475569"
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => setPasswordFocused(false)}
                                    />
                                    <Pressable
                                        onPress={() => setShowPassword(!showPassword)}
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                            size={18}
                                            color="#64748b"
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Confirm Password Input */}
                            <View className="mb-6">
                                <Text className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    Confirm passcode
                                </Text>
                                <View
                                    className={`flex-row items-center rounded-2xl border px-4 py-3.5 transition-all duration-200 ${
                                        confirmFocused
                                            ? 'border-emerald-500/50 bg-emerald-950/10 shadow-emerald-500/5'
                                            : 'border-white/5 bg-slate-950/40'
                                    }`}
                                >
                                    <Ionicons
                                        name="lock-closed-outline"
                                        size={18}
                                        color={confirmFocused ? '#34d399' : '#64748b'}
                                    />
                                    <TextInput
                                        className="ml-3 flex-1 text-sm font-semibold text-white"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry={!showConfirm}
                                        placeholder="••••••••"
                                        placeholderTextColor="#475569"
                                        onFocus={() => setConfirmFocused(true)}
                                        onBlur={() => setConfirmFocused(false)}
                                    />
                                    <Pressable
                                        onPress={() => setShowConfirm(!showConfirm)}
                                        hitSlop={8}
                                    >
                                        <Ionicons
                                            name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                                            size={18}
                                            color="#64748b"
                                        />
                                    </Pressable>
                                </View>
                            </View>

                            {/* Error Badge */}
                            {!!displayError && (
                                <View className="mb-5 flex-row items-center rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3">
                                    <Ionicons
                                        name="alert-circle-outline"
                                        size={16}
                                        color="#f43f5e"
                                    />
                                    <Text className="ml-2 text-xs font-bold text-rose-300 flex-1 leading-snug">
                                        {displayError}
                                    </Text>
                                </View>
                            )}

                            {/* Submit Pill Button with Linear Gradient */}
                            <View className="overflow-hidden rounded-2xl">
                                <Pressable
                                    onPress={handleSignup}
                                    disabled={loading}
                                    className="active:opacity-90"
                                >
                                    <LinearGradient
                                        colors={['#10b981', '#059669']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ paddingVertical: 15, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <View className="flex-row items-center justify-center">
                                            {loading ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Ionicons
                                                    name="person-add-outline"
                                                    size={18}
                                                    color="#fff"
                                                />
                                            )}
                                            <Text className="ml-2 text-sm font-black uppercase tracking-widest text-white">
                                                {loading ? 'Registering...' : 'Register Terminal'}
                                            </Text>
                                        </View>
                                    </LinearGradient>
                                </Pressable>
                            </View>

                            {/* Divider */}
                            <View className="my-6 flex-row items-center">
                                <View className="h-[1px] flex-1 bg-white/5" />
                                <Text className="mx-4 text-[9px] font-black uppercase tracking-widest text-slate-600">
                                    OR SECURE SYNC
                                </Text>
                                <View className="h-[1px] flex-1 bg-white/5" />
                            </View>

                            {/* Google Sign-Up Button */}
                            <Pressable
                                className="flex-row items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 py-3.5 active:bg-slate-950/60"
                                onPress={handleGoogleSignIn}
                                disabled={googleLoading}
                            >
                                {googleLoading ? (
                                    <ActivityIndicator size="small" color="#34d399" />
                                ) : (
                                    <Ionicons
                                        name="logo-google"
                                        size={18}
                                        color="#cbd5e1"
                                    />
                                )}
                                <Text className="ml-3 text-xs font-black uppercase tracking-wider text-slate-300">
                                    Sign up via Google
                                </Text>
                            </Pressable>
                        </LinearGradient>
                    </View>

                    {/* Footer redacting link */}
                    <View className="mt-8 flex-row items-center self-center">
                        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            Already registered?{' '}
                        </Text>
                        <Pressable onPress={() => router.back()} className="active:opacity-75">
                            <Text className="text-xs font-black uppercase tracking-wider text-emerald-400">
                                Authorize Entry
                            </Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
}
