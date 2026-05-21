import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = '@gps_tracks:theme_mode';

export const lightColors = {
    isDark: false,
    bgGradient: ['#f8fafc', '#f1f5f9', '#f8fafc'] as [string, string, string],
    tabBarBg: '#ffffff',
    tabBarBorder: 'rgba(15, 23, 42, 0.08)',
    tabBarInactive: '#94a3b8',
    cardBg: 'rgba(15, 23, 42, 0.03)',
    cardBgSolid: '#ffffff',
    cardBorder: 'rgba(15, 23, 42, 0.08)',
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textTertiary: '#64748b',
    
    // Card specifics
    productivityBg: '#ecfdf5',
    productivityBorder: '#a7f3d0',
    productivityText: '#047857',
    productivitySub: '#065f46',
    
    patternBg: 'rgba(15, 23, 42, 0.03)',
    patternBorder: 'rgba(15, 23, 42, 0.06)',
    patternText: '#334155',

    aiBg: '#e0e7ff',
    aiBorder: '#c7d2fe',
    aiText: '#3730a3',
    aiBadgeBg: '#dbeafe',
    aiBadgeText: '#1e40af',

    dangerBg: '#fee2e2',
    dangerBorder: '#fecaca',
    dangerText: '#991b1b',

    warnBg: '#fef3c7',
    warnBorder: '#fde68a',
    warnText: '#92400e',
};

export const darkColors = {
    isDark: true,
    bgGradient: ['#0f172a', '#1e293b', '#0f172a'] as [string, string, string],
    tabBarBg: '#090d16',
    tabBarBorder: 'rgba(255, 255, 255, 0.05)',
    tabBarInactive: '#64748b',
    cardBg: 'rgba(255, 255, 255, 0.05)',
    cardBgSolid: 'rgba(255, 255, 255, 0.05)',
    cardBorder: 'rgba(255, 255, 255, 0.1)',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    textTertiary: '#94a3b8',
    
    // Card specifics
    productivityBg: 'rgba(16, 185, 129, 0.1)',
    productivityBorder: 'rgba(52, 211, 153, 0.2)',
    productivityText: '#34d399',
    productivitySub: '#a7f3d0',

    patternBg: 'rgba(255, 255, 255, 0.05)',
    patternBorder: 'rgba(255, 255, 255, 0.1)',
    patternText: '#ffffff',

    aiBg: 'rgba(99, 102, 241, 0.1)',
    aiBorder: 'rgba(129, 140, 248, 0.2)',
    aiText: '#c7d2fe',
    aiBadgeBg: 'rgba(16, 185, 129, 0.1)',
    aiBadgeText: '#34d399',

    dangerBg: 'rgba(239, 68, 68, 0.1)',
    dangerBorder: 'rgba(239, 68, 68, 0.2)',
    dangerText: '#fca5a5',

    warnBg: 'rgba(245, 158, 11, 0.1)',
    warnBorder: 'rgba(245, 158, 11, 0.2)',
    warnText: '#fde68a',
};

export type ThemeColors = typeof darkColors;

interface ThemeContextType {
    theme: ThemeMode;
    colors: ThemeColors;
    isDark: boolean;
    toggleTheme: () => void;
    setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<ThemeMode>('dark');

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_KEY);
                if (savedTheme === 'light' || savedTheme === 'dark') {
                    setThemeState(savedTheme);
                }
            } catch (err) {
                console.error('Failed to load theme preference:', err);
            }
        };
        loadTheme();
    }, []);

    const setTheme = useCallback(async (newTheme: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_KEY, newTheme);
            setThemeState(newTheme);
        } catch (err) {
            console.error('Failed to save theme preference:', err);
        }
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    }, [theme, setTheme]);

    const colors = theme === 'dark' ? darkColors : lightColors;

    return (
        <ThemeContext.Provider value={{ theme, colors, isDark: theme === 'dark', toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
