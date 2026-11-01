'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, type AdminOrder } from '@/lib/api';
import { formatPkr } from '@/components/charts';

const STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'SCHEDULED',
  'DELIVERED',
  'CANCELLED',
];

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
  CONFIRMED: 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/30',
  PREPARING: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30',
  OUT_FOR_DELIVERY: 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/30',
  SCHEDULED: 'bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/30',
  DELIVERED: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
  CANCELLED: 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/30',
};

// Web Audio API Synthesizer: 3-tone pleasant & loud kitchen bell (A5 -> E6 -> C6)
function playKitchenBuzzer() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Tone 1: High crisp bell (880 Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.7, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Tone 2: Harmonic brightness (1318.5 Hz / E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.16);
    gain2.gain.setValueAtTime(0.8, now + 0.16);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.16);
    osc2.stop(now + 0.75);

    // Tone 3: Resolving warm chime (1046.5 Hz / C6)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1046.5, now + 0.32);
    gain3.gain.setValueAtTime(0.9, now + 0.32);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.1);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.32);
    osc3.stop(now + 1.15);
  } catch (err) {
    console.warn('Kitchen chime playback could not be started:', err);
  }
}

// Format Pakistani phone numbers to clean international format for WhatsApp wa.me links
function cleanPhoneForWhatsApp(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('92')) return digits;
  if (digits.startsWith('0')) return `92${digits.slice(1)}`;
  if (digits.length === 10) return `92${digits}`;
  return digits;
}

function generateWhatsAppOrderSlip(order: AdminOrder): string {
  const itemsText = order.items
    .map((i) => `• *${i.quantity}×* ${i.productName}`)
    .join('\n');

  return `🔔 *BIGBITES KITCHEN ORDER #${order.orderNumber}*
━━━━━━━━━━━━━━━━━━
👤 *Customer:* ${order.customerName}
📞 *Phone:* ${order.customerPhone}
📍 *Zone:* ${order.deliveryZone?.name ?? 'Standard'}
${order.addressLine ? `🏠 *Address:* ${order.addressLine}\n` : ''}💰 *Total:* Rs ${order.totalPkr.toLocaleString()} (${order.paymentMethod})

📋 *Items:*
${itemsText}
${order.notes ? `\n📝 *Notes:* "${order.notes}"\n` : ''}━━━━━━━━━━━━━━━━━━
🕒 ${new Date(order.createdAt).toLocaleString('en-PK')}`;
}

function generateWhatsAppCustomerMsg(order: AdminOrder): string {
  return `Assalam-o-Alaikum ${order.customerName}! 🍽
Your BigBites Order #${order.orderNumber} (Rs ${order.totalPkr.toLocaleString()}) has been confirmed and is being prepared fresh in our kitchen!
Our rider will contact you upon dispatch. Thank you for choosing BigBites!`;
}

let cachedOrders: AdminOrder[] = [];

export default function OrdersPage() {
  const [items, setItems] = useState<AdminOrder[]>(() => cachedOrders);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [q, setQ] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Audio & Notification state
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Dynamic Settings (Kitchen & Manager Phone Numbers)
  const [kitchenPhone, setKitchenPhone] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState('');

  // Print Ticket Modal State
  const [printOrder, setPrintOrder] = useState<AdminOrder | null>(null);

  // Mobile Alerts Modal State
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [alertsTab, setAlertsTab] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [telegramStatus, setTelegramStatus] = useState<string>('');
  const [testingTelegram, setTestingTelegram] = useState(false);

  // Keep track of known order IDs to detect newly arrived orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set(cachedOrders.map((o) => o.id)));
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Initialize sound preference from localStorage & load dynamic settings
  useEffect(() => {
    const saved = localStorage.getItem('bigbites_kitchen_sound');
    if (saved === 'true') {
      setSoundEnabled(true);
    }

    // Load dynamic phone settings from API
    adminApi.settings()
      .then((s) => {
        setKitchenPhone(s.kitchen_phone || '');
        setManagerPhone(s.manager_phone || '');
      })
      .catch(() => {});
  }, []);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('bigbites_kitchen_sound', String(next));
    if (next) {
      playKitchenBuzzer();
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }

  // Load orders from API
  async function load(isSilent = false) {
    try {
      const fresh = await adminApi.orders();
      setLastSyncTime(new Date());

      if (knownOrderIdsRef.current.size > 0) {
        const newOrders = fresh.filter((o) => !knownOrderIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          if (soundEnabledRef.current) {
            playKitchenBuzzer();
          }

          if ('Notification' in window && Notification.permission === 'granted') {
            const first = newOrders[0];
            new Notification(`🚨 BigBites: New Order ${first.orderNumber}`, {
              body: `${first.customerName} · Rs ${first.totalPkr.toLocaleString()} · ${first.deliveryZone?.name ?? 'Lahore'}`,
              icon: '/logo.png',
            });
          }
        }
      }

      knownOrderIdsRef.current = new Set(fresh.map((o) => o.id));
      cachedOrders = fresh;
      setItems(fresh);
    } catch (e) {
      if (!isSilent) {
        setError(e instanceof Error ? e.message : 'Update failed');
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Background Auto-Sync every 6 seconds
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      load(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [autoSync]);

  // Unacknowledged orders (PENDING or CONFIRMED orders waiting for kitchen to start preparing)
  const unacknowledgedOrders = useMemo(() => {
    return items.filter((o) => o.status === 'CONFIRMED' || o.status === 'PENDING');
  }, [items]);

  // Repeating buzzer interval: if there are unacknowledged orders, chime every 18 seconds
  useEffect(() => {
    if (!soundEnabled || unacknowledgedOrders.length === 0) return;
    const buzzerInterval = setInterval(() => {
      playKitchenBuzzer();
    }, 18000);
    return () => clearInterval(buzzerInterval);
  }, [soundEnabled, unacknowledgedOrders.length]);

  const filtered = useMemo(() => {
    return items.filter((o) => {
      if (filter !== 'ALL' && o.status !== filter) return false;
      if (!q.trim()) return true;
      const zone = o.deliveryZone?.name || '';
      const hay = `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${zone}`.toLowerCase();
      return hay.includes(q.trim().toLowerCase());
    });
  }, [items, filter, q]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: items.length };
    for (const s of STATUSES) map[s] = items.filter((o) => o.status === s).length;
    return map;
  }, [items]);

  async function updateStatus(id: string, status: string) {
    setBusyId(id);
    try {
      await adminApi.updateOrderStatus(id, status);
      await load(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  async function acknowledgeOrder(order: AdminOrder) {
    await updateStatus(order.id, 'PREPARING');
  }

  async function advanceWorkflow(order: AdminOrder) {
    if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
      await updateStatus(order.id, 'PREPARING');
    } else if (order.status === 'PREPARING') {
      await updateStatus(order.id, 'OUT_FOR_DELIVERY');
    } else if (order.status === 'OUT_FOR_DELIVERY') {
      await updateStatus(order.id, 'DELIVERED');
    }
  }

  function handlePrint(order: AdminOrder) {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  // Save Dynamic Notification Phone Numbers
  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsStatus('');
    try {
      const updated = await adminApi.updateSettings({
        kitchen_phone: kitchenPhone.trim(),
        manager_phone: managerPhone.trim(),
      });
      setKitchenPhone(updated.kitchen_phone || '');
      setManagerPhone(updated.manager_phone || '');
      setSettingsStatus('✅ Notification phone numbers saved successfully!');
    } catch (err) {
      setSettingsStatus(`❌ ${err instanceof Error ? err.message : 'Save failed'}`);
    } finally {
      setSavingSettings(false);
    }
  }

  // Dispatch Order to Kitchen WhatsApp
  function dispatchToKitchenWhatsApp(order: AdminOrder) {
    const targetPhone = cleanPhoneForWhatsApp(kitchenPhone);
    if (!targetPhone) {
      setIsAlertsModalOpen(true);
      setAlertsTab('whatsapp');
      setSettingsStatus('⚠️ Please configure your Kitchen Phone Number below first!');
      return;
    }
    const text = encodeURIComponent(generateWhatsAppOrderSlip(order));
    window.open(`https://wa.me/${targetPhone}?text=${text}`, '_blank');
  }

  // Dispatch Customer WhatsApp Update
  function dispatchToCustomerWhatsApp(order: AdminOrder) {
    const targetPhone = cleanPhoneForWhatsApp(order.customerPhone);
    const text = encodeURIComponent(generateWhatsAppCustomerMsg(order));
    window.open(`https://wa.me/${targetPhone}?text=${text}`, '_blank');
  }

  async function handleTestTelegram() {
    setTestingTelegram(true);
    setTelegramStatus('');
    try {
      const res = await adminApi.testTelegram();
      setTelegramStatus(`✅ ${res.message}`);
    } catch (err) {
      setTelegramStatus(`❌ ${err instanceof Error ? err.message : 'Failed to test Telegram'}`);
    } finally {
      setTestingTelegram(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Live Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Live Kitchen Board
            </p>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">Orders & Dispatch</h1>
          <p className="mt-1 text-xs text-stone-400">
            {items.length} total orders · Auto-synced every 6s{' '}
            {lastSyncTime && `(Last updated: ${lastSyncTime.toLocaleTimeString()})`}
          </p>
        </div>

        {/* Live Audio, Phone Settings, and Search Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-lg ${
              soundEnabled
                ? 'bg-amber-500 text-ink-950 shadow-amber-500/20 hover:bg-amber-400'
                : 'border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{soundEnabled ? '🔔' : '🔕'}</span>
            <span>{soundEnabled ? 'Audio Chime: ON (Testing)' : 'Audio Chime: OFF'}</span>
          </button>

          {/* Dynamic Phone Alerts Settings Button */}
          <button
            type="button"
            onClick={() => {
              setIsAlertsModalOpen(true);
              setSettingsStatus('');
              setTelegramStatus('');
            }}
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            title="Configure dynamic phone numbers for WhatsApp & Telegram alerts"
          >
            <span>📱</span>
            <span>Phone & WhatsApp Alerts</span>
            {kitchenPhone && (
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.2 text-[10px] text-emerald-300">
                Active
              </span>
            )}
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => load(false)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-stone-300 hover:bg-white/10"
            title="Refresh now"
          >
            🔄 Sync
          </button>

          {/* Search Box */}
          <input
            className="input max-w-xs"
            placeholder="Search order#, phone, zone…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Unacknowledged Order Alert Banner */}
      {unacknowledgedOrders.length > 0 && (
        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-4 shadow-xl shadow-amber-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-xl font-bold text-ink-950 animate-bounce">
                🔔
              </span>
              <div>
                <p className="text-base font-bold text-amber-200">
                  {unacknowledgedOrders.length} New Order
                  {unacknowledgedOrders.length > 1 ? 's' : ''} Awaiting Kitchen Acceptance!
                </p>
                <p className="text-xs text-amber-300/80">
                  Orders: {unacknowledgedOrders.map((o) => `${o.orderNumber} (${o.customerName})`).join(', ')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  unacknowledgedOrders.forEach((o) => acknowledgeOrder(o));
                }}
                className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-ink-950 transition hover:bg-amber-400"
              >
                ✓ Accept All & Start Preparing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {['ALL', ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === s
                ? 'bg-accent text-ink-900 ring-2 ring-accent/30'
                : 'bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {s === 'ALL' ? 'All Orders' : s.replace(/_/g, ' ')} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-3.5">
        {filtered.map((o) => {
          const isAwaiting = o.status === 'PENDING' || o.status === 'CONFIRMED';
          const isPreparing = o.status === 'PREPARING';
          const isOut = o.status === 'OUT_FOR_DELIVERY';

          return (
            <div
              key={o.id}
              className={`card transition border ${
                isAwaiting
                  ? 'border-amber-500/50 bg-amber-500/[0.04] ring-1 ring-amber-500/30 shadow-lg shadow-amber-500/5'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                {/* Order Details */}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-lg font-bold text-accent tracking-wider">
                      {o.orderNumber}
                    </span>
                    <span
                      className={`rounded-md px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        STATUS_COLOR[o.status] || 'bg-stone-500/20 text-stone-300'
                      }`}
                    >
                      {o.status.replace(/_/g, ' ')}
                    </span>
                    {isAwaiting && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 animate-pulse ring-1 ring-amber-500/40">
                        ⚡ Action Needed
                      </span>
                    )}
                  </div>

                  {/* Customer & Address */}
                  <div>
                    <p className="font-semibold text-white">
                      {o.customerName}
                      <span className="text-stone-400 font-normal"> · {o.customerPhone}</span>
                      <span className="text-accent font-normal"> · {o.deliveryZone?.name ?? 'Standard Zone'}</span>
                    </p>
                    {o.addressLine && (
                      <p className="text-xs text-stone-400 mt-0.5">
                        📍 {o.addressLine}
                      </p>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="rounded-xl border border-white/5 bg-ink-900/60 p-2.5 text-xs space-y-1">
                    {o.items.map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-stone-300">
                        <span>
                          <strong className="text-white font-mono">{i.quantity}×</strong> {i.productName}
                          {i.notes && <em className="text-stone-400 ml-1">({i.notes})</em>}
                        </span>
                        <span className="text-stone-500 text-[11px] uppercase tracking-wider">
                          {i.fulfillmentType?.replace(/_/g, ' ')}
                        </span>
                      </div>
                    ))}
                    {o.notes && (
                      <div className="mt-1 pt-1 border-t border-white/5 text-[11px] text-amber-300/90">
                        📝 Customer Note: &ldquo;{o.notes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Financial & Time */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
                    <span className="text-sm font-bold text-white">{formatPkr(o.totalPkr)}</span>
                    <span>·</span>
                    <span className="rounded bg-white/5 px-2 py-0.5 font-medium text-stone-300">
                      {o.paymentMethod} ({o.paymentStatus})
                    </span>
                    <span>·</span>
                    <span>{new Date(o.createdAt).toLocaleString('en-PK')}</span>
                  </div>
                </div>

                {/* Workflow Actions */}
                <div className="flex flex-col items-end gap-2.5 shrink-0">
                  {/* Primary Workflow Fast-Forward Button */}
                  {isAwaiting && (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => acknowledgeOrder(o)}
                      className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-ink-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
                    >
                      <span>🍳</span>
                      <span>Accept & Start Cooking</span>
                    </button>
                  )}

                  {isPreparing && (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => advanceWorkflow(o)}
                      className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 disabled:opacity-50"
                    >
                      <span>🛵</span>
                      <span>Dispatch (Out for Delivery)</span>
                    </button>
                  )}

                  {isOut && (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => advanceWorkflow(o)}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <span>✓</span>
                      <span>Mark Delivered</span>
                    </button>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {/* One-Tap WhatsApp to Kitchen Phone */}
                    <button
                      type="button"
                      onClick={() => dispatchToKitchenWhatsApp(o)}
                      className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                      title={kitchenPhone ? `Send order slip to kitchen (${kitchenPhone})` : 'Configure kitchen phone number'}
                    >
                      <span>💬</span>
                      <span>WhatsApp Kitchen</span>
                    </button>

                    {/* One-Tap WhatsApp to Customer Phone */}
                    <button
                      type="button"
                      onClick={() => dispatchToCustomerWhatsApp(o)}
                      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white"
                      title={`Message customer at ${o.customerPhone}`}
                    >
                      <span>💬</span>
                      <span>Customer</span>
                    </button>

                    {/* Print Kitchen Slip Button */}
                    <button
                      type="button"
                      onClick={() => handlePrint(o)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white"
                      title="Print 80mm Kitchen Order Ticket"
                    >
                      🖨 Print KOT Slip
                    </button>

                    {/* Full Status Dropdown */}
                    <select
                      className="input w-auto min-w-[140px] py-1.5 text-xs"
                      value={o.status}
                      disabled={busyId === o.id}
                      onChange={(e) => updateStatus(o.id, e.target.value)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!filtered.length && (
          <div className="card text-center py-12 text-stone-400">
            No orders match the current filter.
          </div>
        )}
      </div>

      {/* Hidden Print Slip View (Rendered only on print dialog) */}
      {printOrder && (
        <div id="print-kot-slip" className="hidden print:block fixed inset-0 bg-white text-black p-4 font-mono text-xs">
          <div className="max-w-[80mm] mx-auto space-y-2 border-b border-black pb-2 text-center">
            <h1 className="text-base font-bold uppercase tracking-wider">BIGBITES LAHORE</h1>
            <p className="text-[10px]">KITCHEN ORDER TICKET (KOT)</p>
            <p className="text-xl font-black mt-1">ORDER #{printOrder.orderNumber}</p>
            <p className="text-[10px]">{new Date(printOrder.createdAt).toLocaleString('en-PK')}</p>
          </div>

          <div className="max-w-[80mm] mx-auto py-2 border-b border-black space-y-1 text-[11px]">
            <p><strong>Customer:</strong> {printOrder.customerName}</p>
            <p><strong>Phone:</strong> {printOrder.customerPhone}</p>
            <p><strong>Zone:</strong> {printOrder.deliveryZone?.name ?? 'Standard'}</p>
            {printOrder.addressLine && <p><strong>Address:</strong> {printOrder.addressLine}</p>}
            <p><strong>Payment:</strong> {printOrder.paymentMethod} ({printOrder.paymentStatus})</p>
          </div>

          <div className="max-w-[80mm] mx-auto py-2 border-b border-black space-y-1">
            <p className="font-bold border-b border-dashed border-black pb-1">ITEMS:</p>
            {printOrder.items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start text-xs pt-0.5">
                <span className="font-bold">{item.quantity}× {item.productName}</span>
                <span>{item.fulfillmentType}</span>
              </div>
            ))}
          </div>

          {printOrder.notes && (
            <div className="max-w-[80mm] mx-auto py-2 border-b border-black text-[11px]">
              <p className="font-bold">SPECIAL INSTRUCTIONS:</p>
              <p>&ldquo;{printOrder.notes}&rdquo;</p>
            </div>
          )}

          <div className="max-w-[80mm] mx-auto pt-2 flex justify-between font-bold text-sm">
            <span>TOTAL AMOUNT:</span>
            <span>Rs {printOrder.totalPkr.toLocaleString()}</span>
          </div>

          <p className="max-w-[80mm] mx-auto pt-4 text-center text-[10px] text-gray-500">
            *** End of Kitchen Ticket ***
          </p>
        </div>
      )}

      {/* Dynamic Phone Numbers & Mobile Alerts Setup Modal */}
      {isAlertsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-ink-900 p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Mobile Order Notifications</h3>
                  <p className="text-xs text-stone-400">Configure phone numbers for WhatsApp & Telegram alerts.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAlertsModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="mt-4 flex border-b border-white/10 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAlertsTab('whatsapp')}
                className={`pb-2.5 border-b-2 transition ${
                  alertsTab === 'whatsapp'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                💬 WhatsApp Phone Numbers
              </button>
              <button
                type="button"
                onClick={() => setAlertsTab('telegram')}
                className={`ml-5 pb-2.5 border-b-2 transition ${
                  alertsTab === 'telegram'
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-stone-400 hover:text-stone-200'
                }`}
              >
                🔔 Telegram Staff Bot
              </button>
            </div>

            {/* WhatsApp Tab: Dynamic Phone Numbers */}
            {alertsTab === 'whatsapp' && (
              <form onSubmit={handleSaveSettings} className="mt-4 space-y-4 text-xs">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200 space-y-1">
                  <p className="font-bold">⚡ Dynamic Phone Numbers:</p>
                  <p>
                    Set your Kitchen & Manager phone numbers below. On every order, staff can tap{' '}
                    <strong className="text-white">&ldquo;WhatsApp Kitchen&rdquo;</strong> to dispatch the complete order slip directly to this phone number!
                  </p>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-stone-400">
                    Kitchen Dispatch WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 03001234567 or +923001234567"
                    value={kitchenPhone}
                    onChange={(e) => setKitchenPhone(e.target.value)}
                    className="input mt-1.5 w-full text-sm font-mono text-white placeholder-stone-500"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    The kitchen tablet or chef phone that receives incoming orders.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-stone-400">
                    Store Manager Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 03217654321"
                    value={managerPhone}
                    onChange={(e) => setManagerPhone(e.target.value)}
                    className="input mt-1.5 w-full text-sm font-mono text-white placeholder-stone-500"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">
                    Backup number for store manager or owner.
                  </p>
                </div>

                {settingsStatus && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                    {settingsStatus}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    {savingSettings ? 'Saving...' : '💾 Save Phone Numbers'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAlertsModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-stone-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </form>
            )}

            {/* Telegram Tab: Free Unlimited Alerts */}
            {alertsTab === 'telegram' && (
              <div className="mt-4 space-y-4 text-xs text-stone-300">
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-200 space-y-1">
                  <p className="font-bold">⚡ Automated Bot Alerts (Free & Unlimited):</p>
                  <p>Sends an automated push notification to your phone or Telegram staff group whenever an order is submitted online.</p>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold text-white">Setup via /var/www/bigbites/.env:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-stone-400">
                    <li>Message <strong className="text-white">@BotFather</strong> on Telegram to get your bot token.</li>
                    <li>Message <strong className="text-white">@userinfobot</strong> to get your chat ID (or group ID).</li>
                    <li>Add to <code className="text-accent">/var/www/bigbites/.env</code>:
                      <pre className="mt-1 rounded-lg bg-black/50 p-2 font-mono text-[11px] text-amber-300">
                        TELEGRAM_BOT_TOKEN=&ldquo;your_bot_token&rdquo;<br />
                        TELEGRAM_CHAT_ID=&ldquo;your_chat_id&rdquo;
                      </pre>
                    </li>
                    <li>Restart PM2: <code className="text-accent">pm2 restart bigbites-api</code></li>
                  </ol>
                </div>

                {telegramStatus && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                    {telegramStatus}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    type="button"
                    disabled={testingTelegram}
                    onClick={handleTestTelegram}
                    className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-500 disabled:opacity-50"
                  >
                    {testingTelegram ? 'Sending Test…' : '🔔 Send Test Alert to Phone'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAlertsModalOpen(false)}
                    className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-stone-400 hover:text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
