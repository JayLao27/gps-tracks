import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

export async function setSecureItem(key: string, value: string): Promise<void> {
    if (isWeb) {
        await AsyncStorage.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}

export async function getSecureItem(key: string): Promise<string | null> {
    if (isWeb) {
        return AsyncStorage.getItem(key);
    } else {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (e) {
            console.error('Failed to get secure item:', e);
            return null;
        }
    }
}

export async function removeSecureItem(key: string): Promise<void> {
    if (isWeb) {
        await AsyncStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}
