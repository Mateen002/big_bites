'use client';

import { useMemo, useState } from 'react';
import { useCart } from './cart-provider';
import { useStoreStatus } from './store-status-provider';
import { formatPkr, type OptionGroup, type Product } from '@/lib/api';

type GroupSelections = Record<string, Record<string, number>>;

export function ProductOptionsForm({ product }: { product: Product }) {
  const groups = product.optionGroups || [];
  const [selections, setSelections] = useState<GroupSelections>(() => {
    const initial: GroupSelections = {};
    for (const g of groups) {
      initial[g.id] = {};
      if (g.required && g.selectType === 'SINGLE' && g.values[0]) {
        initial[g.id][g.values[0].id] = 1;
      }
    }
    return initial;
  });
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const { addItem, setOpen } = useCart();
  const { isOpen, notice } = useStoreStatus();

  const extra = useMemo(() => {
    let sum = 0;
    for (const g of groups) {
      const groupMap = selections[g.id] || {};
      for (const [valId, count] of Object.entries(groupMap)) {
        if (count > 0) {
          const v = g.values.find((x) => x.id === valId);
          if (v) sum += v.priceDeltaPkr * count;
        }
      }
    }
    return sum;
  }, [groups, selections]);

  const unit = product.pricePkr + extra;

  function toggleSingleOrMulti(group: OptionGroup, valueId: string) {
    setSelections((prev) => {
      const current = prev[group.id] || {};
      if (group.selectType === 'SINGLE') {
        return { ...prev, [group.id]: { [valueId]: 1 } };
      }
      const isSelected = (current[valueId] || 0) > 0;
      const nextGroup = { ...current };
      if (isSelected) {
        delete nextGroup[valueId];
      } else {
        const selectedCount = Object.keys(nextGroup).length;
        if (group.maxSelect && selectedCount >= group.maxSelect) {
          // If maxSelect reached, drop the oldest one
          const firstKey = Object.keys(nextGroup)[0];
          if (firstKey) delete nextGroup[firstKey];
        }
        nextGroup[valueId] = 1;
      }
      return { ...prev, [group.id]: nextGroup };
    });
  }

  function adjustQty(group: OptionGroup, valueId: string, delta: number) {
    setSelections((prev) => {
      const current = prev[group.id] || {};
      const currentVal = current[valueId] || 0;
      const nextVal = Math.max(0, currentVal + delta);
      const nextGroup = { ...current };
      if (nextVal <= 0) {
        delete nextGroup[valueId];
      } else {
        if (group.maxSelect) {
          const totalOther = Object.entries(nextGroup)
            .filter(([k]) => k !== valueId)
            .reduce((s, [, c]) => s + c, 0);
          if (totalOther + nextVal > group.maxSelect) return prev;
        }
        nextGroup[valueId] = nextVal;
      }
      return { ...prev, [group.id]: nextGroup };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!isOpen) {
      setError('BigBites is currently closed for orders.');
      return;
    }
    for (const g of groups) {
      const groupMap = selections[g.id] || {};
      const count =
        g.selectType === 'QTY'
          ? Object.values(groupMap).reduce((s, c) => s + c, 0)
          : Object.keys(groupMap).length;
      if (g.required && count < (g.minSelect || 1)) {
        setError(`Please choose ${g.name}`);
        return;
      }
    }
    setBusy(true);
    try {
      const formattedSelections: { optionGroupId: string; optionValueId: string; quantity: number }[] = [];
      for (const [optionGroupId, valMap] of Object.entries(selections)) {
        for (const [optionValueId, count] of Object.entries(valMap)) {
          if (count > 0) {
            formattedSelections.push({ optionGroupId, optionValueId, quantity: count });
          }
        }
      }
      const payload = {
        productId: product.id,
        productSlug: product.slug,
        quantity: qty,
        notes: notes || undefined,
        selections: formattedSelections,
      };
      await addItem(payload);
      setAdded(true);
      setOpen(true);
      window.setTimeout(() => setAdded(false), 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add to cart');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {groups.map((group) => {
        const groupMap = selections[group.id] || {};
        return (
          <fieldset key={group.id} className="rounded-2xl border border-amber-400/25 bg-[#25083E] p-4 shadow-lg">
            <legend className="px-1 text-sm font-bold text-amber-400">
              {group.name}
              {group.required ? (
                <span className="ml-1 text-xs font-bold text-amber-300">* Required</span>
              ) : (
                <span className="ml-1 text-xs font-normal text-purple-200/70">Optional</span>
              )}
            </legend>

            {group.selectType === 'QTY' ? (
              <div className="mt-3 space-y-2.5">
                {group.values.map((v) => {
                  const count = groupMap[v.id] || 0;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-xl border border-amber-400/20 bg-[#1C0430] px-3.5 py-2.5 transition"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white">{v.label}</p>
                        {v.priceDeltaPkr > 0 && (
                          <p className="text-xs text-amber-400">+{formatPkr(v.priceDeltaPkr)} each</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E0A4E] text-sm font-bold text-amber-300 transition hover:bg-amber-400 hover:text-purple-950 active:scale-90 disabled:opacity-30"
                          disabled={count <= 0}
                          onClick={() => adjustQty(group, v.id, -1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-black text-amber-300">{count}</span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2E0A4E] text-sm font-bold text-amber-300 transition hover:bg-amber-400 hover:text-purple-950 active:scale-90"
                          onClick={() => adjustQty(group, v.id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {group.values.map((v) => {
                  const active = (groupMap[v.id] || 0) > 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => toggleSingleOrMulti(group, v.id)}
                      className={`rounded-xl px-4 py-2 text-sm font-bold transition duration-200 active:scale-95 ${
                        active
                          ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-purple-950 shadow-md shadow-amber-500/20'
                          : 'bg-[#1C0430] text-purple-200 border border-amber-400/25 hover:border-amber-400/60 hover:text-amber-300'
                      }`}
                    >
                      {v.label}
                      {v.priceDeltaPkr > 0 && (
                        <span className="ml-1 opacity-90">+{formatPkr(v.priceDeltaPkr)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        );
      })}

      <div>
        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-amber-400/90">
          Special instructions
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-amber-400/30 bg-[#1C0430] px-3.5 py-2.5 text-sm text-white placeholder:text-purple-300/40 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          placeholder="e.g. Medium spice, extra tissues, separate gravy…"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-[#1C0430] p-1">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2E0A4E] text-base font-bold text-amber-300 transition hover:bg-amber-400 hover:text-purple-950 active:scale-90 disabled:opacity-30"
            disabled={!isOpen || qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-black text-amber-300">{qty}</span>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2E0A4E] text-base font-bold text-amber-300 transition hover:bg-amber-400 hover:text-purple-950 active:scale-90 disabled:opacity-30"
            disabled={!isOpen}
            onClick={() => setQty((q) => Math.min(99, q + 1))}
          >
            +
          </button>
        </div>
        <button
          type="submit"
          disabled={busy || !isOpen}
          className={`flex-1 py-3 text-sm font-black uppercase tracking-wider rounded-xl transition ${
            !isOpen
              ? 'bg-stone-800 text-stone-400 border border-white/10 cursor-not-allowed'
              : 'btn-primary'
          }`}
        >
          {!isOpen
            ? 'Store Closed'
            : busy
              ? 'Adding…'
              : added
                ? 'Added to cart ✓'
                : `Add to Cart · ${formatPkr(unit * qty)}`}
        </button>
      </div>
      {!isOpen && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-2.5 text-center text-xs font-semibold text-amber-200">
          🌙 {notice || 'BigBites is currently closed for orders. Feel free to explore our menu!'}
        </p>
      )}
      {error && <p className="rounded-xl border border-rose-500/40 bg-rose-950/60 p-2.5 text-sm font-semibold text-rose-300">{error}</p>}
    </form>
  );
}
