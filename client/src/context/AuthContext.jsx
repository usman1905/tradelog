import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/index.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  // Restore the session from the saved token on first load.
  useEffect(() => {
    let live = true;
    api.me().then(u => live && setUser(u)).catch(() => {}).finally(() => live && setChecking(false));
    return () => { live = false; };
  }, []);

  const login = useCallback(async data => setUser(await api.login(data)), []);
  const register = useCallback(async data => setUser(await api.register(data)), []);
  const logout = useCallback(async () => { await api.logout(); setUser(null); }, []);

  const value = useMemo(() => ({ user, checking, login, register, logout }), [user, checking, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
