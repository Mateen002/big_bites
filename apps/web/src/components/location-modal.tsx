'use client';

import { useState, useEffect } from 'react';
import { useLocation, type OrderType } from './location-provider';
import { formatPkr, type DeliveryZone } from '@/lib/api';

export function LocationModal() {
  const {
    isModalOpen,
    closeModal,
    orderType,
    setOrderType,
    selectedZone,
    setSelectedZone,
    zones,
    detectLocation,
    detecting,
    detectedAddress,
    confirmLocation,
  } = useLocation();

  const [activeType, setActiveType] = useState<OrderType>(orderType);
  const [activeZone, setActiveZone] = useState<DeliveryZone | null>(selectedZone);
  const [locSuccessMsg, setLocSuccessMsg] = useState('');
  const [locErrorMsg, setLocErrorMsg] = useState('');

  useEffect(() => {
    setActiveType(orderType);
    if (selectedZone) setActiveZone(selectedZone);
  }, [orderType, selectedZone]);

  if (!isModalOpen) return null;

  const handleDetect = async () => {
    setLocSuccessMsg('');
    setLocErrorMsg('');
    const res = await detectLocation();
    if (res) {
      setLocSuccessMsg(`Detected: ${res}`);
    } else {
      setLocErrorMsg('Could not detect location. Please select your area below.');
    }
  };

  const handleConfirm = () => {
    if (activeZone) {
      confirmLocation(activeZone, activeType);
    } else if (zones[0]) {
      confirmLocation(zones[0], activeType);
    } else {
      closeModal();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeModal}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={closeModal}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-chili-50 text-2xl shadow-inner">
            🥘
          </div>
          <h2 className="mt-3 font-display text-2xl font-bold text-ink">BigBites Lahore</h2>
          <p className="mt-1 text-xs text-ink-mute">Hot from the tawa & frozen pantry packs</p>
        </div>

        {/* 1. Order Type Toggle */}
        <div className="mt-6 text-center">
          <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Select your order type
          </label>
          <div className="mt-2.5 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setActiveType('DELIVERY')}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition shadow-sm ${
                activeType === 'DELIVERY'
                  ? 'bg-chili-500 text-white shadow-chili-500/20'
                  : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>🛵</span> Delivery
            </button>

            <button
              type="button"
              onClick={() => setActiveType('PICKUP')}
              className={`flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold transition shadow-sm ${
                activeType === 'PICKUP'
                  ? 'bg-chili-500 text-white shadow-chili-500/20'
                  : 'border border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
              }`}
            >
              <span>🥡</span> Pick-Up
            </button>
          </div>
        </div>

        {/* 2. Location Section */}
        {activeType === 'DELIVERY' ? (
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <label className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Please select your location
              </label>

              {/* GPS Detection Button */}
              <button
                type="button"
                onClick={handleDetect}
                disabled={detecting}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-3 text-xs font-semibold text-stone-700 transition hover:border-chili-300 hover:bg-chili-50/50 hover:text-chili-600 active:scale-98 disabled:opacity-50"
              >
                {detecting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-chili-500 border-t-transparent" />
                    <span>Fetching Location…</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm">🎯</span>
                    <span>Use My Current Location</span>
                  </>
                )}
              </button>
              {locSuccessMsg && (
                <p className="mt-1.5 text-xs font-semibold text-emerald-600">{locSuccessMsg}</p>
              )}
              {locErrorMsg && (
                <p className="mt-1.5 text-xs font-medium text-rose-500">{locErrorMsg}</p>
              )}
            </div>

            {/* City / Area Dropdown */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-mute">
                Select City / Region
              </label>
              <div className="relative">
                <select
                  value={activeZone?.id || ''}
                  onChange={(e) => {
                    const found = zones.find((z) => z.id === e.target.value);
                    if (found) {
                      setActiveZone(found);
                      setSelectedZone(found);
                    }
                  }}
                  className="w-full appearance-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-ink shadow-sm focus:border-chili-500 focus:outline-none focus:ring-1 focus:ring-chili-500"
                >
                  <option value="" disabled>
                    Select City / Region
                  </option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      Lahore — {z.name} ({formatPkr(z.feePkr)} · {z.etaMinutesMin}–{z.etaMinutesMax} min)
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-stone-400">
                  ▼
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50 p-4 text-center">
            <p className="text-xs font-bold text-stone-900">BigBites Lahore Central Kitchen</p>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed">
              Main Boulevard, Gulberg III, Lahore · Pickup Ready in 20–30 mins.
            </p>
            <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold text-emerald-800">
              No Delivery Fee (Rs 0)
            </span>
          </div>
        )}

        {/* 3. Confirm / Start Ordering Button */}
        <button
          type="button"
          onClick={handleConfirm}
          className="btn-primary mt-6 w-full rounded-xl py-3.5 text-sm font-bold shadow-lg shadow-chili-500/20"
        >
          {activeType === 'DELIVERY'
            ? activeZone
              ? `Confirm & Deliver to ${activeZone.name}`
              : 'Select Location'
            : 'Confirm Pick-Up'}
        </button>
      </div>
    </div>
  );
}
