'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, type AdminZone } from '@/lib/api';

let cachedZones: AdminZone[] = [];

export default function ZonesPage() {
  const [items, setItems] = useState<AdminZone[]>(() => cachedZones);
  const [editing, setEditing] = useState<AdminZone | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [feePkr, setFeePkr] = useState<number | ''>('');
  const [etaMinutesMin, setEtaMinutesMin] = useState<number | ''>(30);
  const [etaMinutesMax, setEtaMinutesMax] = useState<number | ''>(60);
  const [displayOrder, setDisplayOrder] = useState<number | ''>(0);
  const [isActive, setIsActive] = useState(true);

  const formRef = useRef<HTMLFormElement>(null);

  async function load() {
    try {
      const z = await adminApi.zones();
      cachedZones = z;
      setItems(z);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load zones');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setName('');
    setSlug('');
    setFeePkr('');
    setEtaMinutesMin(30);
    setEtaMinutesMax(60);
    setDisplayOrder(items.length);
    setIsActive(true);
    setError('');
    setSuccess('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function startEdit(zone: AdminZone) {
    setEditing(zone);
    setName(zone.name);
    setSlug(zone.slug);
    setFeePkr(zone.feePkr);
    setEtaMinutesMin(zone.etaMinutesMin);
    setEtaMinutesMax(zone.etaMinutesMax);
    setDisplayOrder(zone.displayOrder);
    setIsActive(zone.isActive);
    setError('');
    setSuccess('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      name: name.trim(),
      slug: slug.trim() || generateSlug(name),
      feePkr: Number(feePkr || 0),
      etaMinutesMin: Number(etaMinutesMin || 30),
      etaMinutesMax: Number(etaMinutesMax || 60),
      displayOrder: Number(displayOrder || 0),
      isActive,
    };

    try {
      if (editing) {
        const updated = (await adminApi.updateZone(editing.id, payload)) as AdminZone;
        const nextList = items.map((z) => (z.id === editing.id ? { ...z, ...payload } : z));
        cachedZones = nextList;
        setItems(nextList);
        setSuccess(`Zone "${payload.name}" updated successfully.`);
        startCreate();
      } else {
        const created = (await adminApi.createZone(payload)) as AdminZone;
        await load();
        setSuccess(`Zone "${payload.name}" created successfully.`);
        startCreate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function toggleActive(zone: AdminZone) {
    setBusyId(zone.id);
    setError('');
    setSuccess('');
    const targetStatus = !zone.isActive;

    try {
      await adminApi.updateZone(zone.id, { isActive: targetStatus });
      const nextList = items.map((z) => (z.id === zone.id ? { ...z, isActive: targetStatus } : z));
      cachedZones = nextList;
      setItems(nextList);
      setSuccess(`Zone "${zone.name}" is now ${targetStatus ? 'ACTIVE' : 'DISABLED'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle zone status');
    } finally {
      setBusyId(null);
    }
  }

  const sortedZones = useMemo(() => {
    return [...items].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [items]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span>Logistics</span>
            <span>/</span>
            <span className="text-stone-300">Delivery Zones</span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
            Lahore Delivery Zones
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Configure delivery coverage areas, delivery fees, and estimated transit times across Lahore.
          </p>
        </div>

        {editing && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 hover:bg-white/10"
          >
            + Add New Zone Instead
          </button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Form */}
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={`card grid gap-4 transition-all md:grid-cols-3 ${
          editing ? 'ring-2 ring-accent/60 bg-ink-800/90' : ''
        }`}
      >
        <div className="md:col-span-3 flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">
              {editing ? `Edit Zone: ${editing.name}` : 'Add Delivery Zone'}
            </h2>
            <p className="text-xs text-stone-400">
              {editing ? 'Update zone name, delivery fee, or ETA.' : 'Register a new serviced locality.'}
            </p>
          </div>
          {editing && (
            <button
              type="button"
              onClick={startCreate}
              className="text-xs text-stone-400 hover:text-white"
            >
              Cancel Edit ✕
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Zone Name *
          </label>
          <input
            name="name"
            className="input mt-1.5"
            placeholder="e.g. DHA Phase 5"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!editing) setSlug(generateSlug(e.target.value));
            }}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Slug *
          </label>
          <input
            name="slug"
            className="input mt-1.5 font-mono text-xs"
            placeholder="e.g. dha-phase-5"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Delivery Fee (PKR) *
          </label>
          <input
            name="feePkr"
            type="number"
            min={0}
            className="input mt-1.5"
            placeholder="e.g. 150"
            value={feePkr}
            onChange={(e) => setFeePkr(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Min ETA (Minutes)
          </label>
          <input
            name="etaMinutesMin"
            type="number"
            min={5}
            className="input mt-1.5"
            placeholder="30"
            value={etaMinutesMin}
            onChange={(e) => setEtaMinutesMin(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Max ETA (Minutes)
          </label>
          <input
            name="etaMinutesMax"
            type="number"
            min={10}
            className="input mt-1.5"
            placeholder="60"
            value={etaMinutesMax}
            onChange={(e) => setEtaMinutesMax(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Display Order
          </label>
          <input
            name="displayOrder"
            type="number"
            min={0}
            className="input mt-1.5"
            placeholder="0"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div className="md:col-span-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-white/10">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-stone-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-ink-900 text-accent focus:ring-accent"
            />
            <span>Active for customer selection at checkout</span>
          </label>

          <div className="flex items-center justify-end gap-3">
            {editing && (
              <button type="button" className="btn-ghost" onClick={startCreate}>
                Cancel
              </button>
            )}
            <button className="btn" type="submit">
              {editing ? 'Update Zone' : 'Add Zone'}
            </button>
          </div>
        </div>
      </form>

      {/* Zones list */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          Configured Zones ({items.length})
        </h2>

        {sortedZones.map((z) => {
          const isBusy = busyId === z.id;

          return (
            <div
              key={z.id}
              className={`card flex flex-wrap items-center justify-between gap-4 transition ${
                !z.isActive ? 'opacity-70 bg-ink-800/30' : ''
              }`}
            >
              <div>
                <div className="flex items-center gap-2.5">
                  <p className="font-semibold text-white">{z.name}</p>
                  <span
                    className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      z.isActive
                        ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                        : 'bg-stone-500/20 text-stone-400 ring-1 ring-stone-500/30'
                    }`}
                  >
                    {z.isActive ? '● Active' : '○ Disabled'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-stone-400">
                  Fee: <strong className="text-stone-200">Rs {z.feePkr}</strong> · ETA: {z.etaMinutesMin}–
                  {z.etaMinutesMax} min · Order: #{z.displayOrder} · slug: {z.slug}
                </p>
              </div>

              <div className="flex w-full items-center justify-end gap-2 pt-2 border-t border-white/5 sm:w-auto sm:border-0 sm:pt-0">
                <button
                  type="button"
                  onClick={() => startEdit(z)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white"
                >
                  Edit
                </button>

                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => toggleActive(z)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    z.isActive
                      ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                      : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                >
                  {isBusy ? 'Saving...' : z.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
