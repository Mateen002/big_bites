'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminApi, type AdminOptionGroup } from '@/lib/api';

export default function OptionsPage() {
  const [items, setItems] = useState<AdminOptionGroup[]>([]);
  const [error, setError] = useState('');
  const [valuesText, setValuesText] = useState('Mild|0\nMedium|0\nHot|0');

  async function load() {
    setItems(await adminApi.optionGroups());
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values = valuesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        const [label, price] = line.split('|');
        return { label: label.trim(), priceDeltaPkr: Number(price || 0), displayOrder: i };
      });
    try {
      await adminApi.createOptionGroup({
        name: String(fd.get('name')),
        slug: String(fd.get('slug')),
        selectType: String(fd.get('selectType')),
        required: fd.get('required') === 'on',
        minSelect: Number(fd.get('minSelect') || 0),
        maxSelect: fd.get('maxSelect') ? Number(fd.get('maxSelect')) : null,
        displayOrder: Number(fd.get('displayOrder') || 0),
        values,
      });
      (e.target as HTMLFormElement).reset();
      setValuesText('Mild|0\nMedium|0\nHot|0');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Customization options</h1>
        <p className="text-sm text-stone-400">
          Reusable option groups (spice, size, add-ons, pack weight). Attach them to categories in Categories.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-2">
        <input name="name" className="input" placeholder="Group name" required />
        <input name="slug" className="input" placeholder="slug" required />
        <select name="selectType" className="input">
          <option value="SINGLE">SINGLE</option>
          <option value="MULTI">MULTI</option>
          <option value="QTY">QTY</option>
        </select>
        <input name="displayOrder" type="number" className="input" placeholder="Order" defaultValue={0} />
        <input name="minSelect" type="number" className="input" placeholder="Min select" defaultValue={0} />
        <input name="maxSelect" type="number" className="input" placeholder="Max select" />
        <label className="flex items-center gap-2 text-sm">
          <input name="required" type="checkbox" /> Required
        </label>
        <div className="md:col-span-2">
          <label className="mb-1 block text-sm text-stone-400">Values (one per line: Label|priceDelta)</label>
          <textarea className="input min-h-28" value={valuesText} onChange={(e) => setValuesText(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400 md:col-span-2">{error}</p>}
        <button className="btn md:col-span-2" type="submit">
          Create option group
        </button>
      </form>

      <div className="space-y-3">
        {items.map((g) => (
          <div key={g.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {g.name}{' '}
                  <span className="text-xs text-stone-500">
                    {g.selectType}
                    {g.required ? ' · required' : ''}
                  </span>
                </p>
                <p className="mt-2 text-sm text-stone-400">
                  {g.values.map((v) => `${v.label}${v.priceDeltaPkr ? ` (+${v.priceDeltaPkr})` : ''}`).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost text-red-300"
                onClick={() => adminApi.deleteOptionGroup(g.id).then(load)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
