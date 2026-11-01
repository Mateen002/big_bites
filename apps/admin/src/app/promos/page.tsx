'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, type AdminCategory, type AdminPromo } from '@/lib/api';

let cachedPromos: AdminPromo[] = [];
let cachedCategories: AdminCategory[] = [];

export default function PromosPage() {
  const [items, setItems] = useState<AdminPromo[]>(() => cachedPromos);
  const [categories, setCategories] = useState<AdminCategory[]>(() => cachedCategories);
  const [editing, setEditing] = useState<AdminPromo | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deletingPromo, setDeletingPromo] = useState<AdminPromo | null>(null);

  // Form state for editing or creating
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [discountType, setDiscountType] = useState('PERCENT');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [minOrderPkr, setMinOrderPkr] = useState<number | ''>(0);
  const [categoryId, setCategoryId] = useState('');
  const [isActive, setIsActive] = useState(true);

  const formRef = useRef<HTMLFormElement>(null);

  async function load() {
    try {
      const [p, c] = await Promise.all([adminApi.promos(), adminApi.categories()]);
      cachedPromos = p;
      cachedCategories = c;
      setItems(p);
      setCategories(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load promos');
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startCreate() {
    setEditing(null);
    setCode('');
    setName('');
    setDiscountType('PERCENT');
    setDiscountValue('');
    setMinOrderPkr(0);
    setCategoryId('');
    setIsActive(true);
    setError('');
    setSuccess('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  function startEdit(promo: AdminPromo) {
    setEditing(promo);
    setCode(promo.code);
    setName(promo.name);
    setDiscountType(promo.discountType);
    setDiscountValue(promo.discountValue);
    setMinOrderPkr(promo.minOrderPkr ?? 0);
    setCategoryId(promo.categoryId || '');
    setIsActive(promo.isActive);
    setError('');
    setSuccess('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const payload = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      discountType,
      discountValue: Number(discountValue),
      minOrderPkr: Number(minOrderPkr || 0),
      categoryId: categoryId || null,
      isActive,
    };

    try {
      if (editing) {
        const updated = await adminApi.updatePromo(editing.id, payload);
        const nextList = items.map((p) => (p.id === updated.id ? updated : p));
        cachedPromos = nextList;
        setItems(nextList);
        setSuccess(`Promo code "${updated.code}" updated successfully.`);
        startCreate();
      } else {
        const created = await adminApi.createPromo(payload);
        const nextList = [created, ...items];
        cachedPromos = nextList;
        setItems(nextList);
        setSuccess(`Promo code "${created.code}" created successfully.`);
        startCreate();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function toggleActive(promo: AdminPromo) {
    setBusyId(promo.id);
    setError('');
    setSuccess('');
    const targetStatus = !promo.isActive;

    try {
      const updated = await adminApi.updatePromo(promo.id, { isActive: targetStatus });
      const nextList = items.map((p) => (p.id === promo.id ? { ...p, isActive: targetStatus } : p));
      cachedPromos = nextList;
      setItems(nextList);
      setSuccess(`Promo code "${promo.code}" is now ${targetStatus ? 'ACTIVE' : 'DISABLED'}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update promo status');
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deletingPromo) return;
    setBusyId(deletingPromo.id);
    setError('');
    setSuccess('');

    try {
      const res = await adminApi.deletePromo(deletingPromo.id, true);
      if (res.softDeleted) {
        const nextList = items.map((p) =>
          p.id === deletingPromo.id ? { ...p, isActive: false } : p,
        );
        cachedPromos = nextList;
        setItems(nextList);
        setSuccess(res.message || `Promo "${deletingPromo.code}" disabled (linked to past orders).`);
      } else {
        const nextList = items.filter((p) => p.id !== deletingPromo.id);
        cachedPromos = nextList;
        setItems(nextList);
        setSuccess(`Promo code "${deletingPromo.code}" removed.`);
      }
      setDeletingPromo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((p) => p.isActive).length;
    const disabled = total - active;
    return { total, active, disabled };
  }, [items]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span>Marketing</span>
            <span>/</span>
            <span className="text-stone-300">Discounts</span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
            Promos & Discounts
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Create coupon vouchers, manage percentage and flat discounts, and toggle voucher active status.
          </p>
        </div>

        {editing && (
          <button
            type="button"
            onClick={startCreate}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-stone-300 hover:bg-white/10"
          >
            + Create New Promo Instead
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Total Vouchers</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/80">Active Coupons</p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400/80">Disabled Coupons</p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{stats.disabled}</p>
        </div>
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

      {/* Create / Edit Form */}
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className={`card grid gap-4 transition-all md:grid-cols-2 ${
          editing ? 'ring-2 ring-accent/60 bg-ink-800/90' : ''
        }`}
      >
        <div className="md:col-span-2 flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-bold text-white">
              {editing ? `Edit Promo: ${editing.code}` : 'Create New Promo Code'}
            </h2>
            <p className="text-xs text-stone-400">
              {editing
                ? 'Update discount parameters, minimum spend requirement, or category limitation.'
                : 'Define voucher code, discount amount, and customer eligibility.'}
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
            Promo Code *
          </label>
          <input
            name="code"
            className="input mt-1.5 uppercase font-mono font-bold tracking-wider"
            placeholder="e.g. SUMMER20"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Display Name *
          </label>
          <input
            name="name"
            className="input mt-1.5"
            placeholder="e.g. 20% Off Hot Food"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Discount Type *
          </label>
          <select
            name="discountType"
            className="input mt-1.5"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
          >
            <option value="PERCENT">PERCENT (%)</option>
            <option value="FIXED">FIXED AMOUNT (PKR)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Discount Value ({discountType === 'PERCENT' ? '%' : 'PKR'}) *
          </label>
          <input
            name="discountValue"
            type="number"
            min={1}
            className="input mt-1.5"
            placeholder={discountType === 'PERCENT' ? 'e.g. 10 for 10%' : 'e.g. 200 for Rs 200'}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Minimum Order (PKR)
          </label>
          <input
            name="minOrderPkr"
            type="number"
            min={0}
            className="input mt-1.5"
            placeholder="0 for no minimum"
            value={minOrderPkr}
            onChange={(e) => setMinOrderPkr(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
            Category Restriction
          </label>
          <select
            name="categoryId"
            className="input mt-1.5"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All Categories (Storewide)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="md:col-span-2 flex items-center gap-3 pt-2">
          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-stone-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-ink-900 text-accent focus:ring-accent"
            />
            <span>Active immediately (customers can use code at checkout)</span>
          </label>
        </div>

        <div className="md:col-span-2 flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          {editing && (
            <button
              type="button"
              className="btn-ghost"
              onClick={startCreate}
            >
              Cancel
            </button>
          )}
          <button className="btn" type="submit">
            {editing ? 'Update Promo' : 'Create Promo'}
          </button>
        </div>
      </form>

      {/* Promos List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
          Existing Promo Codes ({items.length})
        </h2>

        {items.length === 0 ? (
          <div className="card text-center py-12 text-stone-400">
            No promo codes found. Create your first voucher using the form above!
          </div>
        ) : (
          items.map((p) => {
            const isBusy = busyId === p.id;
            const cat = categories.find((c) => c.id === p.categoryId);

            return (
              <div
                key={p.id}
                className={`card flex flex-wrap items-center justify-between gap-4 transition ${
                  !p.isActive ? 'opacity-70 bg-ink-800/30' : ''
                }`}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-base font-bold text-accent tracking-wider">
                      {p.code}
                    </span>
                    <span className="text-stone-300 font-medium">— {p.name}</span>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        p.isActive
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'bg-stone-500/20 text-stone-400 ring-1 ring-stone-500/30'
                      }`}
                    >
                      {p.isActive ? '● Active' : '○ Disabled'}
                    </span>
                  </div>

                  <p className="text-xs text-stone-400">
                    <strong className="text-stone-200">
                      {p.discountType === 'PERCENT' ? `${p.discountValue}% OFF` : `Rs ${p.discountValue} OFF`}
                    </strong>
                    {' · '}
                    Min Order: {p.minOrderPkr ? `Rs ${p.minOrderPkr}` : 'None'}
                    {' · '}
                    Scope: {cat ? `Only ${cat.name}` : 'Storewide'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => toggleActive(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      p.isActive
                        ? 'border border-amber-500/20 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                        : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    {isBusy ? 'Saving...' : p.isActive ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setDeletingPromo(p)}
                    className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/20 bg-ink-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete Promo Code?</h3>
            <p className="mt-2 text-sm text-stone-400">
              Are you sure you want to delete promo code <strong className="text-white font-mono">{deletingPromo.code}</strong> (
              {deletingPromo.name})?
            </p>
            <p className="mt-2 text-xs text-stone-500">
              Note: If this promo code has been used in past customer orders, it will be safely disabled instead to preserve historical accounting records.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingPromo(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-stone-400 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyId === deletingPromo.id}
                onClick={confirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
              >
                {busyId === deletingPromo.id ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
