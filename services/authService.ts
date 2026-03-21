import AsyncStorage from '@react-native-async-storage/async-storage';

const USERS_KEY = 'gps_tracks_users';

interface StoredUser {
    name: string;
    email: string;
    password: string;
}

/**
 * Get all registered users from local storage.
 */
const getStoredUsers = async (): Promise<StoredUser[]> => {
    const data = await AsyncStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
};

/**
 * Login – checks against registered users in AsyncStorage.
 */
export const loginUser = async (
    email: string,
    password: string
): Promise<boolean> => {
    const users = await getStoredUsers();
    return users.some(
        (u) =>
            u.email.toLowerCase() === email.toLowerCase() &&
            u.password === password
    );
};

/**
 * Sign up – stores a new user in AsyncStorage.
 * Returns an error message if validation fails, or null on success.
 */
export const registerUser = async (
    name: string,
    email: string,
    password: string
): Promise<string | null> => {
    if (!name.trim()) return 'Please enter your name';
    if (!email.trim()) return 'Please enter your email';
    if (password.length < 6) return 'Password must be at least 6 characters';

    const users = await getStoredUsers();
    const exists = users.some(
        (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (exists) return 'An account with this email already exists';

    users.push({ name: name.trim(), email: email.trim().toLowerCase(), password });
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    return null;
};

/**
 * Login or register via Google profile info.
 * If the email doesn't exist yet, auto-registers the user.
 */
export const loginOrRegisterWithGoogle = async (
    name: string,
    email: string
): Promise<boolean> => {
    const users = await getStoredUsers();
    const exists = users.some(
        (u) => u.email.toLowerCase() === email.toLowerCase()
    );

    if (!exists) {
        // Auto-register with a random placeholder password (never used for login)
        users.push({
            name,
            email: email.toLowerCase(),
            password: `__google_${Date.now()}`,
        });
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    }

    return true;
};
