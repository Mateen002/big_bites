'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminApi, type AdminCategory, type AdminPromo } from '@/lib/api';

export default function PromosPage() {
  const [items, setItems] = useState<AdminPromo[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [error, setError] = useState('');

  async function load() {
    const [p, c] = await Promise.all([adminApi.promos(), adminApi.categories()]);
    setItems(p);
    setCategories(c);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await adminApi.createPromo({
        code: String(fd.get('code')),
        name: String(fd.get('name')),
        discountType: String(fd.get('discountType')),
        discountValue: Number(fd.get('discountValue')),
        minOrderPkr: Number(fd.get('minOrderPkr') || 0),
        categoryId: String(fd.get('categoryId') || '') || null,
        isActive: true,
      });
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">Promos & discounts</h1>
      <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-2">
        <input name="code" className="input" placeholder="CODE" required />
        <input name="name" className="input" placeholder="Display name" required />
        <select name="discountType" className="input">
          <option value="PERCENT">PERCENT</option>
          <option value="FIXED">FIXED (PKR)</option>
        </select>
        <input name="discountValue" type="number" className="input" placeholder="Value" required />
        <input name="minOrderPkr" type="number" className="input" placeholder="Min order PKR" defaultValue={0} />
        <select name="categoryId" className="input" defaultValue="">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-400 md:col-span-2">{error}</p>}
        <button className="btn md:col-span-2" type="submit">
          Create promo
        </button>
      </form>
      <div className="space-y-2">
        {items.map((p) => (
          <div key={p.id} className="card flex justify-between gap-3">
            <div>
              <p className="font-medium">
                {p.code} — {p.name}
              </p>
              <p className="text-xs text-stone-400">
                {p.discountType} {p.discountValue} · min Rs {p.minOrderPkr} · {p.isActive ? 'active' : 'off'}
              </p>
            </div>
            <button type="button" className="btn-ghost text-red-300" onClick={() => adminApi.deletePromo(p.id).then(load)}>
              Disable
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
