import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAccessToken, setUnauthorizedHandler, unwrap } from '../services/axios.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('booting');

  const login = useCallback(async (phone, password) => {
    const data = await unwrap(api.post('/auth/login', { phone, password }));
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }, []);

  const logout = useCallback(async (allDevices = false) => {
    try {
      await unwrap(api.post('/auth/logout', { allDevices }));
    } catch {
      // Clear local state regardless of network/API errors,since the whole point of logout is to stop being authenticated.
      
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  const forceLogout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);


  const updateUser = useCallback((partialUser) => {
    setUser((prev) => (prev ? { ...prev, ...partialUser } : prev));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(forceLogout);
  }, [forceLogout]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const refreshData = await unwrap(api.post('/auth/refresh-token'));
        if (cancelled) return;
        setAccessToken(refreshData.accessToken);

        // The refresh endpoint only proves the session is still valid — it doesn't return identity.

        const meData = await unwrap(api.get('/auth/me'));
        if (cancelled) return;
        setUser(meData.user);
        setStatus('authenticated');
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setUser(null);
          setStatus('anonymous');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ user, status, login, logout, updateUser, isAuthenticated: status === 'authenticated' }),
    [user, status, login, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};