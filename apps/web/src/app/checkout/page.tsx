'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart-provider';
import { useAuth } from '@/components/auth-provider';
import { api, formatPkr, fulfillmentLabel, setCartSession, type DeliveryZone } from '@/lib/api';

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneId, setZoneId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (!user) return;
    setName((prev) => prev || user.name);
    setPhone((prev) => prev || user.phone || '');
    setEmail((prev) => prev || user.email || '');
  }, [user]);

  useEffect(() => {
    api.zones().then((z) => {
      setZones(z);
      if (z[0]) setZoneId(z[0].id);
    });
  }, []);

  const fee = zones.find((z) => z.id === zoneId)?.feePkr || 0;
  const total = Math.max(0, cart.subtotalPkr + fee - discount);

  async function applyPromo() {
    setError('');
    try {
      const res = await api.validatePromo(promoCode, cart.subtotalPkr);
      setDiscount(res.discountPkr);
    } catch (e) {
      setDiscount(0);
      setError(e instanceof Error ? e.message : 'Invalid promo');
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const fd = new FormData(e.currentTarget);
    try {
      if (cart.sessionId) setCartSession(cart.sessionId);
      const order = (await api.checkout({
        customerName: name,
        customerPhone: phone,
        customerEmail: email || undefined,
        addressLine: address,
        deliveryZoneId: zoneId,
        paymentMethod,
        promoCode: promoCode || undefined,
        notes: fd.get('notes') || undefined,
        scheduledFor: fd.get('scheduledFor')
          ? new Date(String(fd.get('scheduledFor'))).toISOString()
          : undefined,
      })) as {
        id: string;
        payment?: { redirectUrl?: string; message?: string };
      };
      await refresh();
      if (order.payment?.redirectUrl && paymentMethod !== 'COD') {
        window.open(order.payment.redirectUrl, '_blank');
      }
      router.push(user ? '/account' : `/orders/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  const field =
    'w-full border border-ink/15 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-mute/60 focus:border-chili-500 focus:outline-none';

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-lg px-5 py-28 text-center">
        <h1 className="font-display text-3xl text-ink">Cart is empty</h1>
        <a href="/order-now" className="mt-6 inline-block font-semibold text-chili-500">
          Browse menu →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-paper pt-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="space-y-4 lg:col-span-3">
          <h1 className="font-display text-4xl text-ink">Checkout</h1>
          {!authLoading && !user && (
            <p className="border border-ink/10 bg-paper-warm px-4 py-3 text-sm text-ink-soft">
              <Link href="/login?next=/checkout" className="font-semibold text-chili-500">
                Sign in
              </Link>{' '}
              or{' '}
              <Link href="/signup?next=/checkout" className="font-semibold text-chili-500">
                create an account
              </Link>{' '}
              to keep orders on your side. Guest checkout still works.
            </p>
          )}
          {user && (
            <p className="text-sm text-ink-soft">
              Ordering as <span className="font-semibold text-ink">{user.name}</span> — saved to your account.
            </p>
          )}
          <input
            name="customerName"
            required
            placeholder="Full name"
            className={field}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            name="customerPhone"
            required
            placeholder="Phone (03XX…)"
            className={field}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <input
            name="customerEmail"
            type="email"
            placeholder="Email (optional)"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <textarea
            name="addressLine"
            required
            placeholder="Delivery address"
            rows={3}
            className={field}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={field} required>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} — {formatPkr(z.feePkr)} ({z.etaMinutesMin}–{z.etaMinutesMax} min)
              </option>
            ))}
          </select>
          {cart.items.some((i) => i.fulfillmentType === 'SCHEDULED') && (
            <div>
              <label className="mb-1 block text-sm text-ink-mute">Preferred delivery slot (frozen)</label>
              <input name="scheduledFor" type="datetime-local" className={field} />
            </div>
          )}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-ink">Payment</legend>
            {[
              ['COD', 'Cash on Delivery'],
              ['JAZZCASH', 'JazzCash (sandbox)'],
              ['EASYPAISA', 'Easypaisa (sandbox)'],
              ['STRIPE', 'Card / Stripe (stub)'],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="radio"
                  name="pay"
                  checked={paymentMethod === value}
                  onChange={() => setPaymentMethod(value)}
                />
                {label}
              </label>
            ))}
          </fieldset>
          <div className="flex gap-2">
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Promo code"
              className={`${field} flex-1`}
            />
            <button type="button" onClick={applyPromo} className="bg-ink px-4 text-sm font-semibold text-paper">
              Apply
            </button>
          </div>
          <textarea name="notes" placeholder="Order notes" rows={2} className={field} />
          {error && <p className="text-sm text-chili-500">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full disabled:opacity-50">
            {busy ? 'Placing order…' : `Place order · ${formatPkr(total)}`}
          </button>
        </form>

        <aside className="border border-ink/10 bg-paper-warm p-6 lg:col-span-2">
          <h2 className="font-display text-2xl text-ink">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <div>
                  <p className="text-ink">
                    {item.quantity}× {item.productName}
                  </p>
                  <span
                    className={`text-[10px] font-bold uppercase ${
                      item.fulfillmentType === 'HOT_NOW' ? 'text-chili-500' : 'text-frost-600'
                    }`}
                  >
                    {fulfillmentLabel(item.fulfillmentType)}
                  </span>
                </div>
                <span className="font-medium">{formatPkr(item.lineTotalPkr)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 space-y-1 border-t border-ink/10 pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-mute">Subtotal</span>
              <span>{formatPkr(cart.subtotalPkr)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-mute">Delivery</span>
              <span>{formatPkr(fee)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-frost-600">
                <span>Discount</span>
                <span>−{formatPkr(discount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 text-base font-semibold">
              <span>Total</span>
              <span>{formatPkr(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
