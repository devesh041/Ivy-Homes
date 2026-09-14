import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getStoredAuth, login as apiLogin, logout as apiLogout, clearAuth } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getStoredAuth();
    if (auth?.user) {
      setUser(auth.user);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const auth = await apiLogin(email, password);
    setUser(auth.user);
    return auth;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
