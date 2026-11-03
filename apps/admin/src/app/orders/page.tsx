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

export interface StaffContact {
  id: string;
  label: string;
  phone: string;
}

// Global shared AudioContext so modern browsers never block or suspend background playback
let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

// Web Audio API Synthesizer: 3-tone pleasant & loud kitchen buzzer (A5 -> E6 -> C6)
function playKitchenBuzzer() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Tone 1: High crisp bell (880 Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.85, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.42);

    // Tone 2: Bright harmonic (1318.5 Hz / E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.15);
    gain2.gain.setValueAtTime(0.9, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.68);

    // Tone 3: Resolving warm chime (1046.5 Hz / C6)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1046.5, now + 0.3);
    gain3.gain.setValueAtTime(1.0, now + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.95);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(now + 0.3);
    osc3.stop(now + 1.0);
  } catch (err) {
    console.warn('Kitchen buzzer playback failed:', err);
  }
}

// Gentle tactile confirmation chime when staff accepts an order (never triggers alarm)
function playAcceptChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch {}
}

// Clean and format Pakistani numbers to international 923...
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

  // Audio & Continuous Buzzer State
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isAlarmMuted, setIsAlarmMuted] = useState(false);
  const [autoSync, setAutoSync] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Dynamic Staff WhatsApp Contacts (Multiple Numbers) & Gateway Credentials
  const [staffContacts, setStaffContacts] = useState<StaffContact[]>([
    { id: '1', label: 'Kitchen / Chef', phone: '03200095612' },
  ]);
  const [ultraInstanceInput, setUltraInstanceInput] = useState('');
  const [ultraTokenInput, setUltraTokenInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState('');

  // Print Ticket Modal State
  const [printOrder, setPrintOrder] = useState<AdminOrder | null>(null);

  // Mobile Alerts Modal State
  const [isAlertsModalOpen, setIsAlertsModalOpen] = useState(false);
  const [alertsTab, setAlertsTab] = useState<'whatsapp' | 'telegram'>('whatsapp');
  const [telegramStatus, setTelegramStatus] = useState<string>('');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingWhatsApp, setTestingWhatsApp] = useState(false);
  const [whatsAppTestStatus, setWhatsAppTestStatus] = useState<string>('');

  // Keep track of known order IDs to detect genuinely new arrivals
  const knownOrderIdsRef = useRef<Set<string>>(new Set(cachedOrders.map((o) => o.id)));
  const prevUnackOrderIdsRef = useRef<Set<string>>(new Set());

  // Initialize sound preference & dynamic settings from backend
  useEffect(() => {
    const saved = localStorage.getItem('bigbites_kitchen_sound');
    if (saved === 'true') {
      setSoundEnabled(true);
      getAudioContext();
    }

    // Load settings from API
    adminApi
      .settings()
      .then((s) => {
        if (s.staff_contacts_json) {
          try {
            const parsed = JSON.parse(s.staff_contacts_json);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setStaffContacts(parsed);
            }
          } catch {}
        } else if (s.kitchen_phone) {
          const phones = s.kitchen_phone
            .split(/[,;\n/]+/)
            .map((p) => p.trim())
            .filter(Boolean);
          if (phones.length > 0) {
            setStaffContacts(
              phones.map((p, idx) => ({
                id: String(idx + 1),
                label: idx === 0 ? 'Kitchen' : idx === 1 ? 'Manager' : `Staff #${idx + 1}`,
                phone: p,
              })),
            );
          }
        }
        setUltraInstanceInput(s.whatsapp_instance_id || '');
        setUltraTokenInput(s.whatsapp_token || '');
      })
      .catch(() => {});
  }, []);

  function toggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('bigbites_kitchen_sound', String(next));
    if (next) {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
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

      // If new orders arrived, trigger desktop notification (audio is controlled by unacknowledged loop)
      if (knownOrderIdsRef.current.size > 0) {
        const newOrders = fresh.filter((o) => !knownOrderIdsRef.current.has(o.id));
        if (newOrders.length > 0 && 'Notification' in window && Notification.permission === 'granted') {
          const first = newOrders[0];
          new Notification(`🚨 BigBites: New Order ${first.orderNumber}`, {
            body: `${first.customerName} · Rs ${first.totalPkr.toLocaleString()} · ${first.deliveryZone?.name ?? 'Lahore'}`,
            icon: '/logo.png',
          });
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

  // Background Auto-Sync every 5 seconds
  useEffect(() => {
    if (!autoSync) return;
    const interval = setInterval(() => {
      load(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoSync]);

  // Unacknowledged orders (orders waiting for kitchen to accept: PENDING or CONFIRMED)
  const unacknowledgedOrders = useMemo(() => {
    return items.filter((o) => o.status === 'CONFIRMED' || o.status === 'PENDING');
  }, [items]);

  const hasUnacknowledged = unacknowledgedOrders.length > 0;

  // Un-mute automatically whenever a genuinely BRAND-NEW order arrives
  useEffect(() => {
    const hasBrandNew = unacknowledgedOrders.some((o) => !prevUnackOrderIdsRef.current.has(o.id));
    if (hasBrandNew && unacknowledgedOrders.length > 0) {
      setIsAlarmMuted(false);
    }
    prevUnackOrderIdsRef.current = new Set(unacknowledgedOrders.map((o) => o.id));
  }, [unacknowledgedOrders]);

  // Continuous Repeating Kitchen Buzzer:
  // Rings every 4.5 seconds until accepted or muted. Stops immediately upon accept!
  useEffect(() => {
    if (!soundEnabled || isAlarmMuted || !hasUnacknowledged) {
      return;
    }

    // Immediately play first alert
    playKitchenBuzzer();

    // Repeat every 4.5 seconds
    const buzzerInterval = setInterval(() => {
      playKitchenBuzzer();
    }, 4500);

    return () => clearInterval(buzzerInterval);
  }, [soundEnabled, isAlarmMuted, hasUnacknowledged]);

  const validStaffContacts = useMemo(() => {
    return staffContacts.filter((c) => cleanPhoneForWhatsApp(c.phone).length >= 10);
  }, [staffContacts]);

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

  // Accept Order: Gives instant soft chime confirmation and transitions to PREPARING
  async function acknowledgeOrder(order: AdminOrder) {
    playAcceptChime();
    await updateStatus(order.id, 'PREPARING');
  }

  async function advanceWorkflow(order: AdminOrder) {
    if (order.status === 'PENDING' || order.status === 'CONFIRMED') {
      await acknowledgeOrder(order);
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

  // Save Dynamic Notification Phone Numbers & Gateway credentials
  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsStatus('');
    try {
      const valid = staffContacts.filter((c) => cleanPhoneForWhatsApp(c.phone).length >= 7);
      if (valid.length === 0) {
        setSettingsStatus('⚠️ Please enter at least one valid phone number');
        setSavingSettings(false);
        return;
      }

      const allPhoneStrings = valid.map((c) => cleanPhoneForWhatsApp(c.phone)).join(', ');

      const updated = await adminApi.updateSettings({
        staff_contacts_json: JSON.stringify(valid),
        kitchen_phone: allPhoneStrings,
        whatsapp_instance_id: ultraInstanceInput.trim(),
        whatsapp_token: ultraTokenInput.trim(),
      });

      if (updated.staff_contacts_json) {
        try {
          setStaffContacts(JSON.parse(updated.staff_contacts_json));
        } catch {}
      }
      setUltraInstanceInput(updated.whatsapp_instance_id || '');
      setUltraTokenInput(updated.whatsapp_token || '');
      setSettingsStatus(`✅ Successfully saved ${valid.length} WhatsApp contact(s)!`);
      setTimeout(() => setSettingsStatus(''), 4000);
    } catch (err: unknown) {
      setSettingsStatus(`❌ Failed to save: ${err instanceof Error ? err.message : 'Error'}`);
    } finally {
      setSavingSettings(false);
    }
  }

  // Dispatch Order Slip to a specific staff WhatsApp number
  function dispatchToWhatsApp(order: AdminOrder, phone: string) {
    const cleaned = cleanPhoneForWhatsApp(phone);
    if (!cleaned) {
      setIsAlertsModalOpen(true);
      return;
    }
    const msg = generateWhatsAppOrderSlip(order);
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  // Dispatch Customer Confirmation
  function dispatchToCustomerWhatsApp(order: AdminOrder) {
    const cleaned = cleanPhoneForWhatsApp(order.customerPhone);
    if (!cleaned) return;
    const msg = generateWhatsAppCustomerMsg(order);
    const url = `https://wa.me/${cleaned}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  }

  async function handleTestTelegram() {
    setTestingTelegram(true);
    setTelegramStatus('');
    try {
      const res = await adminApi.testTelegram();
      setTelegramStatus(`✅ ${res.message}`);
    } catch (err: unknown) {
      setTelegramStatus(`❌ ${err instanceof Error ? err.message : 'Failed to test Telegram'}`);
    } finally {
      setTestingTelegram(false);
    }
  }

  async function handleTestWhatsApp() {
    setTestingWhatsApp(true);
    setWhatsAppTestStatus('');
    try {
      const res = await adminApi.testWhatsApp();
      if (res.requiresGateway) {
        setWhatsAppTestStatus(`ℹ️ ${res.message}`);
      } else {
        setWhatsAppTestStatus(`✅ ${res.message}`);
      }
    } catch (err: unknown) {
      setWhatsAppTestStatus(`❌ ${err instanceof Error ? err.message : 'WhatsApp test failed'}`);
    } finally {
      setTestingWhatsApp(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Live Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Live Kitchen Board
            </p>
          </div>
          <h1 className="mt-1 font-display text-2xl font-bold text-white sm:text-3xl">Orders & Dispatch</h1>
          <p className="mt-1 text-xs text-stone-400">
            {items.length} total orders · Auto-synced every 5s{' '}
            {lastSyncTime && `(Last updated: ${lastSyncTime.toLocaleTimeString()})`}
          </p>
        </div>

        {/* Live Audio, Phone Settings, and Search Controls */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold transition shadow-lg ${
              soundEnabled
                ? 'bg-amber-500 text-ink-950 shadow-amber-500/20 hover:bg-amber-400'
                : 'border border-white/10 bg-white/5 text-stone-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{soundEnabled ? '🔔' : '🔕'}</span>
            <span>{soundEnabled ? 'Buzzer: ON' : 'Buzzer: OFF'}</span>
          </button>

          {/* Multiple Phone Numbers Modal Button */}
          <button
            type="button"
            onClick={() => {
              setIsAlertsModalOpen(true);
              setSettingsStatus('');
              setTelegramStatus('');
              setWhatsAppTestStatus('');
            }}
            className="flex flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20"
            title="Configure multiple phone numbers for WhatsApp & Telegram alerts"
          >
            <span>📱</span>
            <span>WhatsApp ({validStaffContacts.length})</span>
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
          <div className="w-full sm:w-auto">
            <input
              className="input w-full sm:max-w-xs"
              placeholder="Search order#, phone, zone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Repeating Unacknowledged Order Alert Banner */}
      {hasUnacknowledged && (
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-500/15 p-4 shadow-2xl shadow-amber-500/20 animate-pulse">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-ink-950 shadow-md">
                🔔
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-extrabold text-amber-200 uppercase tracking-wide">
                    🚨 {unacknowledgedOrders.length} New Order
                    {unacknowledgedOrders.length > 1 ? 's' : ''} Awaiting Acceptance!
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white ${
                      isAlarmMuted ? 'bg-stone-600' : 'bg-rose-500 animate-bounce'
                    }`}
                  >
                    {isAlarmMuted ? 'Buzzer Silenced' : 'Alarm Beeping'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-amber-300/90 font-medium">
                  Orders:{' '}
                  {unacknowledgedOrders
                    .map((o) => `${o.orderNumber} (${o.customerName} · Rs ${o.totalPkr.toLocaleString()})`)
                    .join(', ')}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setIsAlarmMuted((m) => !m)}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-bold text-stone-200 transition hover:bg-white/20 sm:w-auto"
              >
                {isAlarmMuted ? '🔔 Unmute Buzzer' : '🔕 Silence Buzzer'}
              </button>

              <button
                type="button"
                onClick={() => {
                  playAcceptChime();
                  unacknowledgedOrders.forEach((o) => acknowledgeOrder(o));
                }}
                className="w-full rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-ink-950 shadow-lg shadow-amber-500/30 transition hover:bg-amber-400 sm:w-auto"
              >
                ✓ Accept All & Stop Alarm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
        {['ALL', ...STATUSES].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
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
                  ? 'border-amber-500/60 bg-amber-500/[0.05] ring-2 ring-amber-500/40 shadow-xl shadow-amber-500/10'
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
                      <span className="text-accent font-normal">
                        {' '}
                        · {o.deliveryZone?.name ?? 'Standard Zone'}
                      </span>
                    </p>
                    {o.addressLine && (
                      <p className="text-xs text-stone-400 mt-0.5">📍 {o.addressLine}</p>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="rounded-xl border border-white/5 bg-ink-900/60 p-2.5 text-xs space-y-1">
                    {o.items.map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-stone-300">
                        <span>
                          <strong className="text-white font-mono">{i.quantity}×</strong>{' '}
                          {i.productName}
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
                <div className="w-full sm:w-auto flex flex-col items-stretch sm:items-end gap-2.5 shrink-0 pt-3 border-t border-white/5 sm:pt-0 sm:border-0">
                  {/* Primary Workflow Fast-Forward Button */}
                  {isAwaiting && (
                    <button
                      type="button"
                      disabled={busyId === o.id}
                      onClick={() => acknowledgeOrder(o)}
                      className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-ink-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
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
                      className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-400 disabled:opacity-50"
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
                      className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      <span>✓</span>
                      <span>Mark Delivered</span>
                    </button>
                  )}

                  {/* WhatsApp Staff & Customer Dispatch Controls */}
                  <div className="flex w-full flex-wrap items-center justify-start sm:justify-end gap-1.5">
                    {/* Render button for each configured staff contact */}
                    {validStaffContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => dispatchToWhatsApp(o, contact.phone)}
                        className="flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95"
                        title={`Send complete order ticket to ${contact.label} (+${cleanPhoneForWhatsApp(contact.phone)})`}
                      >
                        <span>💬</span>
                        <span>{contact.label}</span>
                      </button>
                    ))}

                    {/* Customer WhatsApp Notification */}
                    <button
                      type="button"
                      onClick={() => dispatchToCustomerWhatsApp(o)}
                      className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-stone-300 transition hover:bg-white/10 hover:text-white"
                      title={`Send order update to customer (${o.customerPhone})`}
                    >
                      <span>💬</span>
                      <span>Customer</span>
                    </button>

                    {/* Print Kitchen Slip Button */}
                    <button
                      type="button"
                      onClick={() => handlePrint(o)}
                      className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-stone-300 transition hover:bg-white/10 hover:text-white"
                      title="Print 80mm Kitchen Order Ticket (KOT)"
                    >
                      🖨 KOT Slip
                    </button>

                    {/* Full Status Dropdown */}
                    <select
                      className="input flex-1 sm:flex-initial sm:w-auto min-w-[130px] py-1.5 text-xs"
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

        {filtered.length === 0 && (
          <div className="card py-12 text-center text-stone-500">
            No orders found matching the filter.
          </div>
        )}
      </div>

      {/* Hidden Print Slip View (Rendered only on print dialog for 80mm/58mm thermal printers) */}
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
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-ink-900 p-5 sm:p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Mobile Order Notifications</h3>
                  <p className="text-xs text-stone-400">Configure multiple phone numbers for WhatsApp & Telegram alerts.</p>
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
                💬 Multiple WhatsApp Numbers ({validStaffContacts.length})
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
                🔔 Free Telegram Bot (Automated)
              </button>
            </div>

            {/* WhatsApp Tab: Multiple Dynamic Contacts & Optional Automated Gateway */}
            {alertsTab === 'whatsapp' && (
              <form onSubmit={handleSaveSettings} className="mt-4 space-y-4 text-xs">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200 space-y-1">
                  <p className="font-bold">⚡ Dynamic Multi-Number WhatsApp Dispatch:</p>
                  <p>
                    Add your kitchen tablets, store managers, and chefs below. Each contact gets an instant 1-tap dispatch button on every incoming order!
                  </p>
                </div>

                {/* Multiple Phone Numbers List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold uppercase tracking-wider text-stone-300">
                      Staff WhatsApp Numbers ({staffContacts.length})
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setStaffContacts((prev) => [
                          ...prev,
                          {
                            id: Date.now().toString(),
                            label: prev.length === 1 ? 'Manager' : `Staff #${prev.length + 1}`,
                            phone: '',
                          },
                        ]);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
                    >
                      <span>+</span> Add Another Phone Number
                    </button>
                  </div>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {staffContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-2.5"
                      >
                        <div className="w-1/3">
                          <label className="block text-[10px] text-stone-400 uppercase font-semibold">
                            Role / Label
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Kitchen"
                            value={contact.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStaffContacts((prev) =>
                                prev.map((c) => (c.id === contact.id ? { ...c, label: val } : c)),
                              );
                            }}
                            className="input mt-1 w-full text-xs font-semibold"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] text-stone-400 uppercase font-semibold">
                            WhatsApp Phone (Pakistani)
                          </label>
                          <input
                            type="tel"
                            placeholder="03200095612"
                            value={contact.phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              setStaffContacts((prev) =>
                                prev.map((c) => (c.id === contact.id ? { ...c, phone: val } : c)),
                              );
                            }}
                            className="input mt-1 w-full text-xs font-mono"
                          />
                        </div>
                        {staffContacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setStaffContacts((prev) => prev.filter((c) => c.id !== contact.id));
                            }}
                            className="mt-4 rounded-lg p-2 text-stone-400 hover:bg-rose-500/20 hover:text-rose-300 transition"
                            title="Remove contact"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Active badges preview */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-stone-400">Active Contacts:</span>
                    {validStaffContacts.map((c) => (
                      <span
                        key={c.id}
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 font-mono text-[11px] text-emerald-300"
                      >
                        {c.label}: +{cleanPhoneForWhatsApp(c.phone)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Optional WhatsApp Automated Gateway */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white">Automated Background WhatsApp (UltraMsg Gateway)</p>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase">
                      Optional
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed">
                    WhatsApp is end-to-end encrypted. To send WhatsApp alerts <strong>automatically in the background</strong> without tapping buttons, link an UltraMsg instance by entering your credentials below:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase text-stone-400">Instance ID</label>
                      <input
                        type="text"
                        placeholder="e.g. instance12345"
                        value={ultraInstanceInput}
                        onChange={(e) => setUltraInstanceInput(e.target.value)}
                        className="input mt-1 w-full text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase text-stone-400">Token</label>
                      <input
                        type="password"
                        placeholder="e.g. abc123xyz"
                        value={ultraTokenInput}
                        onChange={(e) => setUltraTokenInput(e.target.value)}
                        className="input mt-1 w-full text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {settingsStatus && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
                    {settingsStatus}
                  </div>
                )}
                {whatsAppTestStatus && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                    {whatsAppTestStatus}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {savingSettings ? 'Saving...' : '💾 Save All Phone Numbers'}
                    </button>

                    <button
                      type="button"
                      disabled={testingWhatsApp}
                      onClick={handleTestWhatsApp}
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                    >
                      {testingWhatsApp ? 'Testing...' : '🔔 Test Alert'}
                    </button>
                  </div>

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
                  <p className="font-bold">⚡ 100% Free & Unlimited Background Alerts:</p>
                  <p>Sends an automated push notification to your phone or Telegram staff group the exact millisecond an order is placed.</p>
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
