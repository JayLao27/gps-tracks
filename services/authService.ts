
export const loginUser = async (email: string, password: string): Promise<boolean> => {
    return new Promise((resolve) => {
        setTimeout(() => {
            if (email === 'test@example.com' && password === 'password') {
                resolve(true);
            } else {
                resolve(false);
            }
        }, 500);
    });
};
