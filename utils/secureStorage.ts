import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Indicates whether the current platform is a web browser.
 * Web browsers do not support native keychain/secure store encryption.
 */
const isWeb = Platform.OS === 'web';

/**
 * Securely writes a key-value string pair to storage.
 * On native platforms (iOS/Android), it uses hardware-backed keychain encryption via `expo-secure-store`.
 * On web platforms, it falls back to unencrypted `AsyncStorage`.
 * 
 * @param key The storage key.
 * @param value The raw string value to encrypt and save.
 */
export async function setSecureItem(key: string, value: string): Promise<void> {
    if (isWeb) {
        await AsyncStorage.setItem(key, value);
    } else {
        await SecureStore.setItemAsync(key, value);
    }
}

/**
 * Securely retrieves a key-value string pair from storage.
 * On native platforms (iOS/Android), it reads from hardware-backed encrypted store.
 * On web platforms, it falls back to reading from `AsyncStorage`.
 * If native secure retrieval fails, it prints an error and returns null.
 * 
 * @param key The storage key.
 * @returns A promise that resolves to the retrieved string or null if not found.
 */
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

/**
 * Removes a key-value pair from storage.
 * On native platforms (iOS/Android), it deletes the item from hardware-backed encrypted store.
 * On web platforms, it removes it from `AsyncStorage`.
 * 
 * @param key The storage key to delete.
 */
export async function removeSecureItem(key: string): Promise<void> {
    if (isWeb) {
        await AsyncStorage.removeItem(key);
    } else {
        await SecureStore.deleteItemAsync(key);
    }
}
