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
import { api, setCartSession, type Cart } from '@/lib/api';

type CartContextValue = {
  cart: Cart;
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  refresh: () => Promise<void>;
  addItem: (body: unknown) => Promise<void>;
  updateQty: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
};

const emptyCart: Cart = { sessionId: '', items: [], itemCount: 0, subtotalPkr: 0 };

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart>(emptyCart);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.cart.get();
      if (data.sessionId) setCartSession(data.sessionId);
      setCart(data);
    } catch {
      /* ignore offline */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (body: unknown) => {
      const prev = cart;
      setCart({
        ...prev,
        itemCount: prev.itemCount + 1,
      });
      try {
        const next = await api.cart.add(body);
        if (next.sessionId) setCartSession(next.sessionId);
        setCart(next);
        setOpen(true);
      } catch (e) {
        setCart(prev);
        throw e;
      }
    },
    [cart],
  );

  const updateQty = useCallback(
    async (itemId: string, quantity: number) => {
      const prev = cart;
      setCart({
        ...prev,
        items: prev.items
          .map((i) =>
            i.id === itemId
              ? { ...i, quantity, lineTotalPkr: i.unitPricePkr * quantity }
              : i,
          )
          .filter((i) => i.quantity > 0),
        itemCount: Math.max(0, prev.itemCount + (quantity - (prev.items.find((i) => i.id === itemId)?.quantity || 0))),
        subtotalPkr: prev.items.reduce((s, i) => {
          const q = i.id === itemId ? quantity : i.quantity;
          return s + i.unitPricePkr * q;
        }, 0),
      });
      try {
        const next = await api.cart.update(itemId, quantity);
        setCart(next);
      } catch {
        setCart(prev);
      }
    },
    [cart],
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      const prev = cart;
      setCart({
        ...prev,
        items: prev.items.filter((i) => i.id !== itemId),
        itemCount: prev.items.filter((i) => i.id !== itemId).reduce((s, i) => s + i.quantity, 0),
        subtotalPkr: prev.items
          .filter((i) => i.id !== itemId)
          .reduce((s, i) => s + i.lineTotalPkr, 0),
      });
      try {
        const next = await api.cart.remove(itemId);
        setCart(next);
      } catch {
        setCart(prev);
      }
    },
    [cart],
  );

  const value = useMemo(
    () => ({ cart, loading, open, setOpen, refresh, addItem, updateQty, removeItem }),
    [cart, loading, open, refresh, addItem, updateQty, removeItem],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
