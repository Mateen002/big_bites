'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api, type StoreStatus } from '@/lib/api';

type StoreStatusContextValue = {
  isOpen: boolean;
  notice: string;
  loading: boolean;
  refresh: () => Promise<void>;
};

const defaultStatus: StoreStatusContextValue = {
  isOpen: true,
  notice: 'BigBites is currently closed for orders. Feel free to explore our menu!',
  loading: true,
  refresh: async () => {},
};

const StoreStatusContext = createContext<StoreStatusContextValue>(defaultStatus);

export function StoreStatusProvider({
  initialStatus,
  children,
}: {
  initialStatus?: StoreStatus;
  children: ReactNode;
}) {
  const [status, setStatus] = useState<StoreStatus>(() => ({
    isOpen: initialStatus?.isOpen ?? true,
    notice:
      initialStatus?.notice ||
      'BigBites is currently closed for orders. Feel free to explore our menu!',
  }));
  const [loading, setLoading] = useState(!initialStatus);

  const refresh = useCallback(async () => {
    try {
      const res = await api.storeStatus();
      setStatus(res);
    } catch {
      // fallback to open on network error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Poll store status every 30 seconds so if admin closes store, open tabs update automatically
    const timer = setInterval(refresh, 30_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return (
    <StoreStatusContext.Provider
      value={{
        isOpen: status.isOpen,
        notice: status.notice,
        loading,
        refresh,
      }}
    >
      {children}
    </StoreStatusContext.Provider>
  );
}

export function useStoreStatus() {
  const ctx = useContext(StoreStatusContext);
  return ctx || defaultStatus;
}
