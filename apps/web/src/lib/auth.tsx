'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string | null;
  tenantId: string;
}

interface Session {
  user: SessionUser;
  tenant: { id: string; name: string; slug: string };
  permissions: string[];
  warehouses: { id: string; code: string; name: string }[];
}

interface AuthState {
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string, otp?: string) => Promise<{ mfaRequired?: boolean }>;
  logout: () => void;
  can: (perm: string) => boolean;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setSession(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<Session>('/api/auth/me');
      setSession(data);
    } catch {
      setToken(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback<AuthState['login']>(async (email, password, otp) => {
    try {
      const data = await api<{ token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password, otp }),
      });
      setToken(data.token);
      await refresh();
      return {};
    } catch (err: any) {
      if (err?.status === 401 && err?.body?.mfaRequired) {
        return { mfaRequired: true };
      }
      throw err;
    }
  }, [refresh]);

  const logout = useCallback(() => {
    setToken(null);
    setSession(null);
  }, []);

  const can = useCallback(
    (perm: string) => !!session && (session.permissions.includes('*') || session.permissions.includes(perm)),
    [session],
  );

  return <AuthContext.Provider value={{ session, loading, login, logout, can }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
