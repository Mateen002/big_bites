'use client';

import { FormEvent, useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/cart-provider';
import { useAuth } from '@/components/auth-provider';
import { useLocation } from '@/components/location-provider';
import {
  api,
  formatPkr,
  fulfillmentLabel,
  isValidPakistaniPhone,
  formatPakistaniPhone,
  setCartSession,
  type DeliveryZone,
} from '@/lib/api';

export default function CheckoutPage() {
  const { cart, refresh } = useCart();
  const { user, loading: authLoading } = useAuth();
  const {
    selectedZone,
    setSelectedZone,
    orderType,
    setOrderType,
  } = useLocation();
  const router = useRouter();
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [zoneId, setZoneId] = useState(selectedZone?.id || '');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [promoSuccess, setPromoSuccess] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Delivery slot state for scheduled frozen items
  const [slotDay, setSlotDay] = useState('tomorrow');
  const [slotTime, setSlotTime] = useState('dinner');

  const hasHot = useMemo(() => cart.items.some((i) => i.fulfillmentType === 'HOT_NOW'), [cart.items]);
  const hasScheduled = useMemo(
    () => cart.items.some((i) => i.fulfillmentType === 'SCHEDULED'),
    [cart.items],
  );

  useEffect(() => {
    if (selectedZone) setZoneId(selectedZone.id);
  }, [selectedZone]);

  useEffect(() => {
    if (!user) return;
    setName((prev) => prev || user.name);
    setPhone((prev) => prev || user.phone || '');
    setEmail((prev) => prev || user.email || '');
  }, [user]);

  useEffect(() => {
    api.zones().then((z) => {
      setZones(z);
      if (!selectedZone && z[0]) {
        setZoneId(z[0].id);
        setSelectedZone(z[0]);
      }
    }).catch(() => {});
  }, [selectedZone, setSelectedZone]);

  const activeZone = zones.find((z) => z.id === zoneId) || selectedZone || zones[0];
  const fee = orderType === 'PICKUP' ? 0 : (activeZone?.feePkr || 0);
  const total = Math.max(0, cart.subtotalPkr + fee - discount);

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setError('');
    setPromoSuccess('');
    try {
      const res = await api.validatePromo(promoCode.trim(), cart.subtotalPkr);
      setDiscount(res.discountPkr);
      setPromoSuccess(`Applied: ${res.promo.name} (−${formatPkr(res.discountPkr)})`);
    } catch (e) {
      setDiscount(0);
      setPromoSuccess('');
      setError(e instanceof Error ? e.message : 'Invalid promo');
    }
  }

  function getCalculatedScheduledDate(): string {
    const target = new Date();
    if (slotDay === 'tomorrow') {
      target.setDate(target.getDate() + 1);
    } else if (slotDay === 'day_after') {
      target.setDate(target.getDate() + 2);
    }

    if (slotTime === 'lunch') {
      target.setHours(13, 0, 0, 0);
    } else if (slotTime === 'afternoon') {
      target.setHours(16, 30, 0, 0);
    } else {
      // dinner
      target.setHours(20, 0, 0, 0);
    }
    return target.toISOString();
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!isValidPakistaniPhone(phone)) {
      setError('Please provide a valid Pakistani mobile number (e.g. 0300-1234567 or +923001234567)');
      return;
    }

    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      if (cart.sessionId) setCartSession(cart.sessionId);
      const scheduledFor = hasScheduled ? getCalculatedScheduledDate() : undefined;

      const order = (await api.checkout({
        customerName: name.trim(),
        customerPhone: formatPakistaniPhone(phone),
        customerEmail: email.trim() || undefined,
        addressLine:
          orderType === 'PICKUP'
            ? 'Pick-Up from BigBites Lahore Central Kitchen (Gulberg III)'
            : address.trim(),
        deliveryZoneId: activeZone?.id || zoneId,
        paymentMethod,
        promoCode: promoCode.trim() || undefined,
        notes: (fd.get('notes') as string)?.trim() || undefined,
        scheduledFor,
      })) as {
        id: string;
        payment?: { redirectUrl?: string; message?: string };
      };

      if (typeof window !== 'undefined') {
        try {
          const stored = JSON.parse(localStorage.getItem('bigbites_recent_orders') || '[]');
          const updated = [order.id, ...stored.filter((x: string) => x !== order.id)].slice(0, 10);
          localStorage.setItem('bigbites_recent_orders', JSON.stringify(updated));
        } catch {}
      }

      await refresh();

      // Avoid popup blocker: direct navigation if payment gateway redirect is present
      if (order.payment?.redirectUrl && paymentMethod !== 'COD') {
        window.location.href = order.payment.redirectUrl;
        return;
      }
      router.push(`/orders/${order.id}?new=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setBusy(false);
    }
  }

  const field =
    'w-full rounded-xl border border-amber-400/30 bg-[#25083E] px-4 py-3 text-sm text-white placeholder:text-purple-300/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 transition';

  if (!cart.items.length) {
    return (
      <div className="mx-auto max-w-lg px-5 py-28 text-center">
        <h1 className="font-display text-3xl font-bold text-white">Cart is empty</h1>
        <p className="mt-2 text-sm text-purple-200/70">Add sizzling dishes or stock your freezer first.</p>
        <Link href="/order-now" className="btn-primary mt-6 inline-block">
          Browse menu →
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#1B042C] pt-20">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 lg:grid-cols-5">
        <form onSubmit={onSubmit} className="space-y-6 lg:col-span-3">
          <div>
            <h1 className="font-display text-4xl font-bold text-white">Checkout</h1>
            <p className="mt-1 text-sm text-purple-200/70">Fast delivery throughout Lahore.</p>
          </div>

          {!authLoading && !user && (
            <div className="rounded-xl border border-amber-400/20 bg-[#24073B] p-4 text-sm text-purple-200/90 shadow-md">
              <Link href="/login?next=/checkout" className="font-bold text-amber-400 hover:underline">
                Sign in
              </Link>{' '}
              or{' '}
              <Link href="/signup?next=/checkout" className="font-bold text-amber-400 hover:underline">
                create an account
              </Link>{' '}
              to track your orders automatically. Guest checkout is always available.
            </div>
          )}

          {hasHot && hasScheduled && (
            <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-200 shadow-md">
              <p className="font-bold text-amber-300">📦 Mixed Order Notice</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-200/80">
                Your cart has both <strong>Hot & Fast</strong> items and <strong>Stock Freezer</strong> packs.
                Your hot food is prepared right away, and your frozen packs will be delivered in the chosen
                schedule below.
              </p>
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-amber-400/20 bg-[#24073B] p-5 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">1. Delivery Contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
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
                placeholder="Phone (0300-1234567)"
                className={field}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <input
              name="customerEmail"
              type="email"
              placeholder="Email address (optional, for receipt)"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {/* Order Method: Delivery vs Pick-Up */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Order Type & Location
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOrderType('DELIVERY')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition ${
                    orderType === 'DELIVERY'
                      ? 'border-amber-400 bg-amber-400 text-purple-950 shadow-md shadow-amber-400/20'
                      : 'border-amber-400/30 bg-[#1C0430] text-purple-200/80 hover:border-amber-400/60'
                  }`}
                >
                  <span className="text-base">🛵</span> Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('PICKUP')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-xs font-bold transition ${
                    orderType === 'PICKUP'
                      ? 'border-amber-400 bg-amber-400 text-purple-950 shadow-md shadow-amber-400/20'
                      : 'border-amber-400/30 bg-[#1C0430] text-purple-200/80 hover:border-amber-400/60'
                  }`}
                >
                  <span className="text-base">🥡</span> Pick-Up
                </button>
              </div>

              {orderType === 'DELIVERY' ? (
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">
                    Delivery Address in Lahore
                  </label>
                  <textarea
                    name="addressLine"
                    required
                    placeholder="Complete delivery address (House/Flat #, Street #, Sector/Area, Landmark, Lahore)"
                    rows={3}
                    className={field}
                    value={address}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAddress(val);
                      const matched = zones.find((z) => val.toLowerCase().includes(z.name.toLowerCase()));
                      if (matched) {
                        setZoneId(matched.id);
                        setSelectedZone(matched);
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-amber-400/40 bg-[#1C0430] p-4 text-xs text-purple-200 leading-relaxed">
                  📍 <strong className="text-amber-300">Pickup Point:</strong> BigBites Lahore Central Kitchen, Main Boulevard, Gulberg III.
                  <p className="mt-1 text-purple-300/70">Your order will be fresh and ready for self-pickup in 20–30 minutes (Rs 0 delivery fee).</p>
                </div>
              )}
            </div>
          </div>

          {hasScheduled && (
            <div className="space-y-3 rounded-2xl border border-amber-400/20 bg-[#24073B] p-5 shadow-xl">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                2. Frozen Delivery Time Slot
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-purple-200/80 font-medium">Delivery Day</label>
                  <select
                    value={slotDay}
                    onChange={(e) => setSlotDay(e.target.value)}
                    className={`${field} cursor-pointer`}
                  >
                    <option value="today" className="bg-[#24073B] text-white">Today</option>
                    <option value="tomorrow" className="bg-[#24073B] text-white">Tomorrow (Recommended)</option>
                    <option value="day_after" className="bg-[#24073B] text-white">Day after tomorrow</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-purple-200/80 font-medium">Preferred Window</label>
                  <select
                    value={slotTime}
                    onChange={(e) => setSlotTime(e.target.value)}
                    className={`${field} cursor-pointer`}
                  >
                    <option value="lunch" className="bg-[#24073B] text-white">Lunch (12:30 PM – 2:30 PM)</option>
                    <option value="afternoon" className="bg-[#24073B] text-white">Afternoon (3:30 PM – 6:00 PM)</option>
                    <option value="dinner" className="bg-[#24073B] text-white">Dinner (7:30 PM – 10:00 PM)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-2xl border border-amber-400/20 bg-[#24073B] p-5 shadow-xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">3. Payment Method</h2>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {[
                ['COD', 'Cash on Delivery', 'Pay cash when rider arrives'],
                ['JAZZCASH', 'JazzCash', 'Mobile account or card sandbox'],
                ['EASYPAISA', 'Easypaisa', 'Wallet account sandbox'],
                ['STRIPE', 'Credit / Debit Card', 'Visa, Mastercard'],
              ].map(([value, label, desc]) => (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition ${
                    paymentMethod === value
                      ? 'border-amber-400 bg-amber-400/15 ring-1 ring-amber-400 shadow-md shadow-amber-400/10'
                      : 'border-purple-800/40 bg-[#1C0430] hover:border-amber-400/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="pay"
                      value={value}
                      checked={paymentMethod === value}
                      onChange={() => setPaymentMethod(value)}
                      className="accent-amber-400"
                    />
                    <span className="font-semibold text-white text-sm">{label}</span>
                  </div>
                  <span className="mt-1 pl-5 text-xs text-purple-200/70">{desc}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-amber-400/20 bg-[#24073B] p-5 shadow-xl">
            <label className="block text-xs font-bold uppercase tracking-wider text-amber-400">Promo Code</label>
            <div className="flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Enter coupon code"
                className={`${field} flex-1 uppercase tracking-wider font-semibold`}
              />
              <button
                type="button"
                onClick={applyPromo}
                className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-6 text-sm font-bold text-purple-950 transition hover:brightness-110 shadow-md shadow-amber-500/20"
              >
                Apply
              </button>
            </div>
            {promoSuccess && <p className="text-xs font-semibold text-emerald-400">{promoSuccess}</p>}
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-[#24073B] p-5 shadow-xl">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-400">Rider Instructions (Optional)</label>
            <textarea
              name="notes"
              placeholder="e.g. Ring doorbell twice, leave at guard room, call upon arrival…"
              rows={2}
              className={field}
            />
          </div>

          {error && <p className="rounded-xl border border-red-500/40 bg-red-950/60 p-4 text-sm font-semibold text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full py-4 text-base font-black disabled:opacity-50"
          >
            {busy ? 'Placing order…' : `Confirm Order · ${formatPkr(total)}`}
          </button>
        </form>

        <aside className="h-fit rounded-2xl border border-amber-400/25 bg-[#24073B] p-6 shadow-xl lg:col-span-2">
          <h2 className="font-display text-2xl font-bold text-white">Order Summary</h2>
          <ul className="mt-4 divide-y divide-purple-800/40">
            {cart.items.map((item) => (
              <li key={item.id} className="py-3 text-sm">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white">
                      {item.quantity}× {item.productName}
                    </p>
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        item.fulfillmentType === 'HOT_NOW'
                          ? 'bg-amber-400/15 text-amber-300 border border-amber-400/30'
                          : 'bg-purple-900/60 text-purple-200 border border-purple-700/40'
                      }`}
                    >
                      {fulfillmentLabel(item.fulfillmentType)}
                    </span>
                    {item.selections && item.selections.length > 0 && (
                      <p className="mt-1 text-xs text-purple-300/70">
                        {item.selections.map((s) => s.optionValueLabel).join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-amber-300">{formatPkr(item.lineTotalPkr)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-2.5 border-t border-purple-800/40 pt-4 text-sm">
            <div className="flex justify-between text-purple-200/80">
              <span>Subtotal</span>
              <span className="text-white font-medium">{formatPkr(cart.subtotalPkr)}</span>
            </div>
            <div className="flex justify-between text-purple-200/80">
              <span>Delivery Fee</span>
              <span className="text-white font-medium">{formatPkr(fee)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-semibold text-emerald-400">
                <span>Discount</span>
                <span>−{formatPkr(discount)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-purple-800/40 pt-3 text-lg font-bold text-white">
              <span>Total</span>
              <span className="text-amber-400 text-xl font-black">{formatPkr(total)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
