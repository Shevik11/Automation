const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user_data';

export const storage = {
  // Token management
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  removeToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  // User data management
  getUser(): any | null {
    const userData = localStorage.getItem(USER_KEY);
    if (!userData) {
      return null;
    }

    try {
      return JSON.parse(userData);
    } catch (error) {
      console.warn('Failed to parse user data from localStorage:', error);
      // Clear corrupted data to prevent future errors
      this.removeUser();
      return null;
    }
  },

  setUser(user: any): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser(): void {
    localStorage.removeItem(USER_KEY);
  },

  // Clear all auth data
  clear(): void {
    this.removeToken();
    this.removeUser();
  },
};

