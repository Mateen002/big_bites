'use client';

import { FormEvent, useEffect, useState } from 'react';
import { adminApi, type AdminZone } from '@/lib/api';

export default function ZonesPage() {
  const [items, setItems] = useState<AdminZone[]>([]);
  const [error, setError] = useState('');

  async function load() {
    setItems(await adminApi.zones());
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await adminApi.createZone({
        name: String(fd.get('name')),
        slug: String(fd.get('slug')),
        feePkr: Number(fd.get('feePkr')),
        etaMinutesMin: Number(fd.get('etaMinutesMin') || 30),
        etaMinutesMax: Number(fd.get('etaMinutesMax') || 60),
        displayOrder: Number(fd.get('displayOrder') || 0),
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
      <h1 className="font-display text-3xl">Lahore delivery zones</h1>
      <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-3">
        <input name="name" className="input" placeholder="Zone name" required />
        <input name="slug" className="input" placeholder="slug" required />
        <input name="feePkr" type="number" className="input" placeholder="Fee PKR" required />
        <input name="etaMinutesMin" type="number" className="input" placeholder="ETA min" defaultValue={30} />
        <input name="etaMinutesMax" type="number" className="input" placeholder="ETA max" defaultValue={60} />
        <input name="displayOrder" type="number" className="input" placeholder="Order" defaultValue={0} />
        {error && <p className="text-sm text-red-400 md:col-span-3">{error}</p>}
        <button className="btn md:col-span-3" type="submit">
          Add zone
        </button>
      </form>
      <div className="space-y-2">
        {items
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((z) => (
            <div key={z.id} className="card flex justify-between gap-3">
              <div>
                <p className="font-medium">{z.name}</p>
                <p className="text-xs text-stone-400">
                  Rs {z.feePkr} · {z.etaMinutesMin}–{z.etaMinutesMax} min · {z.isActive ? 'active' : 'off'}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost text-red-300"
                onClick={() => adminApi.deleteZone(z.id).then(load)}
              >
                Disable
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}
