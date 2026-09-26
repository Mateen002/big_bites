'use client';

import { useMemo, useState } from 'react';
import { useCart } from './cart-provider';
import { formatPkr, type OptionGroup, type Product } from '@/lib/api';

type SelectionMap = Record<string, string[]>;

export function ProductOptionsForm({ product }: { product: Product }) {
  const groups = product.optionGroups || [];
  const [selections, setSelections] = useState<SelectionMap>(() => {
    const initial: SelectionMap = {};
    for (const g of groups) {
      if (g.required && g.selectType === 'SINGLE' && g.values[0]) {
        initial[g.id] = [g.values[0].id];
      } else {
        initial[g.id] = [];
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
      for (const id of selections[g.id] || []) {
        const v = g.values.find((x) => x.id === id);
        if (v) sum += v.priceDeltaPkr;
      }
    }
    return sum;
  }, [groups, selections]);

  const unit = product.pricePkr + extra;

  function toggle(group: OptionGroup, valueId: string) {
    setSelections((prev) => {
      const current = prev[group.id] || [];
      if (group.selectType === 'SINGLE') {
        return { ...prev, [group.id]: [valueId] };
      }
      const exists = current.includes(valueId);
      let next = exists ? current.filter((id) => id !== valueId) : [...current, valueId];
      if (group.maxSelect && next.length > group.maxSelect) {
        next = next.slice(-group.maxSelect);
      }
      return { ...prev, [group.id]: next };
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    for (const g of groups) {
      if (g.required && (selections[g.id] || []).length < (g.minSelect || 1)) {
        setError(`Please choose ${g.name}`);
        return;
      }
    }
    setBusy(true);
    try {
      const payload = {
        productId: product.id,
        quantity: qty,
        notes: notes || undefined,
        selections: Object.entries(selections).flatMap(([optionGroupId, ids]) =>
          ids.map((optionValueId) => ({ optionGroupId, optionValueId, quantity: 1 })),
        ),
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
      {groups.map((group) => (
        <fieldset key={group.id}>
          <legend className="mb-2 font-medium text-ink">
            {group.name}
            {group.required && <span className="text-chili-500"> *</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {group.values.map((v) => {
              const active = (selections[group.id] || []).includes(v.id);
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => toggle(group, v.id)}
                  className={`px-3.5 py-2 text-sm font-medium transition duration-200 active:scale-95 ${
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
        </fieldset>
      ))}

      <div>
        <label className="mb-2 block text-sm text-ink-mute">Special instructions</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-ink/10 bg-white px-3 py-2 text-sm text-ink focus:border-chili-500 focus:outline-none"
          placeholder="Less oil, no onions…"
        />
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <button type="button" className="h-10 w-10 bg-paper-deep text-ink" onClick={() => setQty((q) => Math.max(1, q - 1))}>
            −
          </button>
          <span className="w-8 text-center font-medium">{qty}</span>
          <button type="button" className="h-10 w-10 bg-paper-deep text-ink" onClick={() => setQty((q) => Math.min(99, q + 1))}>
            +
          </button>
        </div>
        <button
          type="submit"
          disabled={busy}
          className={`btn-primary flex-1 disabled:opacity-50 ${added ? 'added-pop !bg-frost-600 hover:!bg-frost-600' : ''}`}
        >
          {busy ? 'Adding…' : added ? 'Added to cart ✓' : `Add · ${formatPkr(unit * qty)}`}
        </button>
      </div>
      {error && <p className="text-sm text-chili-500">{error}</p>}
    </form>
  );
}
