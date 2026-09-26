'use client';

import { useMemo, useState } from 'react';
import { useCart } from './cart-provider';
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
          <fieldset key={group.id} className="rounded-lg border border-ink/8 bg-white/40 p-4">
            <legend className="px-1 text-sm font-semibold text-ink">
              {group.name}
              {group.required ? (
                <span className="ml-1 text-xs font-bold text-chili-500">* Required</span>
              ) : (
                <span className="ml-1 text-xs font-normal text-ink-mute">Optional</span>
              )}
            </legend>

            {group.selectType === 'QTY' ? (
              <div className="mt-3 space-y-2.5">
                {group.values.map((v) => {
                  const count = groupMap[v.id] || 0;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-md border border-ink/10 bg-white px-3.5 py-2.5 transition hover:border-ink/20"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink">{v.label}</p>
                        {v.priceDeltaPkr > 0 && (
                          <p className="text-xs text-ink-mute">+{formatPkr(v.priceDeltaPkr)} each</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded bg-paper-deep text-sm font-bold text-ink transition active:scale-90 disabled:opacity-30"
                          disabled={count <= 0}
                          onClick={() => adjustQty(group, v.id, -1)}
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-ink">{count}</span>
                        <button
                          type="button"
                          className="flex h-8 w-8 items-center justify-center rounded bg-paper-deep text-sm font-bold text-ink transition active:scale-90"
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
                      className={`rounded-full px-4 py-2 text-sm font-medium transition duration-200 active:scale-95 ${
                        active
                          ? 'bg-ink text-paper shadow-sm'
                          : 'bg-paper-deep text-ink-soft ring-1 ring-ink/10 hover:ring-ink/25'
                      }`}
                    >
                      {v.label}
                      {v.priceDeltaPkr > 0 && (
                        <span className="ml-1 opacity-80">+{formatPkr(v.priceDeltaPkr)}</span>
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
        <label className="mb-2 block text-sm font-medium text-ink-mute">Special instructions</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-ink/10 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-mute/50 focus:border-chili-500 focus:outline-none"
          placeholder="e.g. Medium spice, extra tissues, separate gravy…"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-md border border-ink/10 bg-white p-1">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded bg-paper-deep text-base font-bold text-ink transition active:scale-90 disabled:opacity-40"
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-bold text-ink">{qty}</span>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded bg-paper-deep text-base font-bold text-ink transition active:scale-90"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
          >
            +
          </button>
        </div>
        <button
          type="submit"
          disabled={busy}
          className={`btn-primary flex-1 rounded-md disabled:opacity-50 ${
            added ? 'added-pop !bg-frost-600 hover:!bg-frost-600' : ''
          }`}
        >
          {busy ? 'Adding…' : added ? 'Added to cart ✓' : `Add to Cart · ${formatPkr(unit * qty)}`}
        </button>
      </div>
      {error && <p className="rounded-md bg-chili-50 p-2.5 text-sm font-medium text-chili-600">{error}</p>}
    </form>
  );
}
