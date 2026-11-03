'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getApiUrl } from '../lib/api';

const TOKEN_KEY = 'bigbites_customer_token';

export type CustomerUser = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: 'customer';
};

type AuthContextValue = {
  user: CustomerUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  updateProfile: (input: { name?: string; phone?: string }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function getCustomerToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = useCallback((nextToken: string | null, nextUser: CustomerUser | null) => {
    setToken(nextToken);
    setUser(nextUser);
    if (nextToken) localStorage.setItem(TOKEN_KEY, nextToken);
    else localStorage.removeItem(TOKEN_KEY);
  }, []);

  const refresh = useCallback(async () => {
    const existing = getCustomerToken();
    if (!existing) {
      persist(null, null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${getApiUrl()}/auth/customer/me`, {
        headers: { Authorization: `Bearer ${existing}` },
        cache: 'no-store',
      });
      if (!res.ok) throw new Error('Session expired');
      const me = (await res.json()) as CustomerUser;
      persist(existing, me);
    } catch {
      persist(null, null);
    } finally {
      setLoading(false);
    }
  }, [persist]);

  useEffect(() => {
    refresh();
    const handleUnauthorized = () => persist(null, null);
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [refresh, persist]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await fetch(`${getApiUrl()}/auth/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Login failed',
        );
      }
      persist(data.accessToken, data.user);
    },
    [persist],
  );

  const signup = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string }) => {
      const res = await fetch(`${getApiUrl()}/auth/customer/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          Array.isArray(data.message) ? data.message.join(', ') : data.message || 'Signup failed',
        );
      }
      persist(data.accessToken, data.user);
    },
    [persist],
  );

  const logout = useCallback(() => {
    persist(null, null);
  }, [persist]);

  const updateProfile = useCallback(
    async (input: { name?: string; phone?: string }) => {
      const existing = getCustomerToken();
      if (!existing) throw new Error('Not signed in');
      const res = await fetch(`${getApiUrl()}/auth/customer/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${existing}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Could not update profile');
      }
      setUser(data);
    },
    [],
  );

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout, refresh, updateProfile }),
    [user, token, loading, login, signup, logout, refresh, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
