'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

  // Print Ticket Modal State
  const [printOrder, setPrintOrder] = useState<AdminOrder | null>(null);

  // Mobile Alerts Modal State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<string>('');
  const [testingTelegram, setTestingTelegram] = useState(false);

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

  // Keep track of known order IDs to detect newly arrived orders
  const knownOrderIdsRef = useRef<Set<string>>(new Set(cachedOrders.map((o) => o.id)));
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  // Initialize sound preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('bigbites_kitchen_sound');
    if (saved === 'true') {
      setSoundEnabled(true);
    }
  }, []);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('bigbites_kitchen_sound', String(next));
    if (next) {
      playKitchenBuzzer();
      // Request desktop notifications if not granted
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

      // Check for newly arrived orders (orders not in known set)
      if (knownOrderIdsRef.current.size > 0) {
        const newOrders = fresh.filter((o) => !knownOrderIdsRef.current.has(o.id));
        if (newOrders.length > 0) {
          // Play loud chime if sound is enabled
          if (soundEnabledRef.current) {
            playKitchenBuzzer();
          }

          // Trigger Desktop Notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            const first = newOrders[0];
            new Notification(`🚨 BigBites: New Order ${first.orderNumber}`, {
              body: `${first.customerName} · Rs ${first.totalPkr.toLocaleString()} · ${first.deliveryZone?.name ?? 'Lahore'}`,
              icon: '/logo.png',
            });
          }
        }
      }

      // Update known set
      knownOrderIdsRef.current = new Set(fresh.map((o) => o.id));
      cachedOrders = fresh;
      setItems(fresh);
    } catch (e) {
      if (!isSilent) {
        setError(e instanceof Error ? e.message : 'Update failed');
      }
    }
  }

  // Initial load
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

  // Quick Action: Acknowledge & Start Cooking
  async function acknowledgeOrder(order: AdminOrder) {
    await updateStatus(order.id, 'PREPARING');
  }

  // Quick Action: Advance to next logical workflow step
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

        {/* Live Audio & Sync Action Controls */}
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

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => load(false)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-stone-300 hover:bg-white/10"
            title="Refresh now"
          >
            🔄 Sync
          </button>

          {/* Mobile Alerts Modal Button */}
          <button
            type="button"
            onClick={() => {
              setIsTelegramModalOpen(true);
              setTelegramStatus('');
            }}
            className="rounded-xl border border-sky-500/20 bg-sky-500/10 px-3.5 py-2.5 text-xs font-semibold text-sky-300 hover:bg-sky-500/20"
            title="Configure Telegram mobile phone push alerts"
          >
            📱 Phone Alerts
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

                  <div className="flex items-center gap-2">
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
                      className="input w-auto min-w-[150px] py-1.5 text-xs"
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

      {/* Telegram Mobile Alerts Setup Modal */}
      {isTelegramModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-white/15 bg-ink-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Tier 2: Mobile Phone Push Alerts</h3>
                  <p className="text-xs text-stone-400">Receive instant push notifications for new orders on Telegram.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTelegramModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-stone-300">
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs text-sky-200 space-y-1">
                <p className="font-bold">⚡ How It Works (100% Free & Unlimited):</p>
                <p>Whenever a customer places an order, your server sends an instant notification to your Telegram staff group or personal chat with loud sound alert on your phone.</p>
              </div>

              <div className="space-y-2 text-xs">
                <p className="font-semibold text-white">Quick 60-second setup on your VPS:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-stone-400">
                  <li>Open Telegram and message <strong className="text-white">@BotFather</strong> to create a free bot and get your token.</li>
                  <li>Message your bot or add it to a staff group, then get your chat ID (via <strong className="text-white">@userinfobot</strong>).</li>
                  <li>Add these 2 lines into your <code className="text-accent">/var/www/bigbites/.env</code> file:
                    <pre className="mt-1 rounded-lg bg-black/50 p-2 font-mono text-[11px] text-amber-300">
                      TELEGRAM_BOT_TOKEN="your_bot_token_here"<br />
                      TELEGRAM_CHAT_ID="your_chat_id_here"
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
                  onClick={() => setIsTelegramModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-stone-400 hover:text-white"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
