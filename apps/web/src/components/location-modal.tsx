'use client';

import { useState, useEffect, useMemo } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [locSuccessMsg, setLocSuccessMsg] = useState('');
  const [locErrorMsg, setLocErrorMsg] = useState('');

  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return zones;
    const q = searchQuery.toLowerCase().trim();
    return zones.filter((z) => z.name.toLowerCase().includes(q) || z.slug.toLowerCase().includes(q));
  }, [zones, searchQuery]);

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

            {/* Quick Society Shortcuts */}
            <div>
              <div className="flex items-center justify-between text-xs text-ink-mute mb-1.5">
                <span className="font-semibold">Popular Societies</span>
                <span className="text-[11px] text-ink-soft">{zones.length} areas covered</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['Valencia Town', 'DHA', 'Johar Town', 'Wapda Town', 'Gulberg', 'Model Town', 'Bahria Town'].map((quickName) => {
                  const matched = zones.find((z) => z.name.toLowerCase().includes(quickName.toLowerCase()));
                  if (!matched) return null;
                  const isSelected = activeZone?.id === matched.id;
                  return (
                    <button
                      key={quickName}
                      type="button"
                      onClick={() => {
                        setActiveZone(matched);
                        setSelectedZone(matched);
                      }}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        isSelected
                          ? 'bg-chili-500 text-white shadow-sm'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {quickName}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Area Search & Selectable List */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-mute">
                Search or Select Your Area in Lahore
              </label>

              {/* Search input */}
              <div className="relative mb-2">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  🔍
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type area (e.g. Valencia, Wapda, Lake City)..."
                  className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-8 text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Scrollable list of areas */}
              <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-stone-100 bg-stone-50/50 p-1.5 scrollbar-thin">
                {filteredZones.length === 0 ? (
                  <div className="p-4 text-center text-xs text-stone-500">
                    No matching area found for &ldquo;{searchQuery}&rdquo;.
                  </div>
                ) : (
                  filteredZones.map((z) => {
                    const isSelected = activeZone?.id === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          setActiveZone(z);
                          setSelectedZone(z);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition ${
                          isSelected
                            ? 'bg-chili-50 border border-chili-200 text-chili-900 shadow-sm'
                            : 'bg-white border border-stone-100 hover:border-stone-200 hover:bg-stone-50 text-stone-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${isSelected ? 'text-chili-500' : 'text-stone-400'}`}>
                            {isSelected ? '✓' : '📍'}
                          </span>
                          <div>
                            <p className="text-xs font-semibold leading-tight">{z.name}</p>
                            <p className="text-[10px] text-stone-500">
                              ETA: {z.etaMinutesMin}–{z.etaMinutesMax} mins
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                            isSelected ? 'bg-chili-500 text-white' : 'bg-stone-100 text-stone-700'
                          }`}>
                            {formatPkr(z.feePkr)}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
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
