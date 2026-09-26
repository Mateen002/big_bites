'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ImageField } from '@/components/image-field';
import { adminApi, assetUrl, type AdminCategory, type AdminProduct } from '@/lib/api';

export default function ProductsPage() {
  const [items, setItems] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [p, c] = await Promise.all([adminApi.products(), adminApi.categories()]);
    setItems(p);
    setCategories(c);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setImage(editing?.image || '');
  }, [editing]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get('name')),
      slug: String(fd.get('slug')),
      description: String(fd.get('description') || ''),
      image: image || '',
      pricePkr: Number(fd.get('pricePkr')),
      costPkr: fd.get('costPkr') !== '' && fd.get('costPkr') != null ? Number(fd.get('costPkr')) : null,
      categoryId: String(fd.get('categoryId')),
      displayOrder: Number(fd.get('displayOrder') || 0),
      isActive: fd.get('isActive') === 'on',
      packSize: String(fd.get('packSize') || '') || null,
      weightGrams: fd.get('weightGrams') ? Number(fd.get('weightGrams')) : null,
      piecesPerPack: fd.get('piecesPerPack') ? Number(fd.get('piecesPerPack')) : null,
    };
    try {
      if (editing) await adminApi.updateProduct(editing.id, body);
      else await adminApi.createProduct(body);
      setEditing(null);
      setImage('');
      (e.target as HTMLFormElement).reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  async function move(id: string, dir: -1 | 1) {
    const sorted = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((i) => i.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= sorted.length) return;
    await adminApi.reorderProducts([
      { id: sorted[idx].id, displayOrder: sorted[swap].displayOrder },
      { id: sorted[swap].id, displayOrder: sorted[idx].displayOrder },
    ]);
    await load();
  }

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl">Products</h1>
      <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">{editing ? 'Edit product' : 'Add product'}</h2>
        <input name="name" className="input" placeholder="Name" required defaultValue={editing?.name} key={editing?.id + 'n'} />
        <input name="slug" className="input" placeholder="slug" required defaultValue={editing?.slug} key={editing?.id + 's'} />
        <input name="pricePkr" type="number" className="input" placeholder="Sell price PKR" required defaultValue={editing?.pricePkr} key={editing?.id + 'p'} />
        <input name="costPkr" type="number" className="input" placeholder="Cost / COGS PKR" defaultValue={editing?.costPkr ?? ''} key={editing?.id + 'cost'} />
        <select
          name="categoryId"
          className="input md:col-span-2"
          required
          defaultValue={editing?.categoryId || categories[0]?.id}
          key={editing?.id + 'c'}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.fulfillmentType})
            </option>
          ))}
        </select>
        <ImageField value={image} onChange={setImage} />
        <textarea
          name="description"
          className="input md:col-span-2"
          placeholder="Description"
          defaultValue={editing?.description || ''}
          key={editing?.id + 'd'}
        />
        <input name="packSize" className="input" placeholder="Pack size (frozen)" defaultValue={editing?.packSize || ''} key={editing?.id + 'ps'} />
        <input name="weightGrams" type="number" className="input" placeholder="Weight grams" defaultValue={editing?.weightGrams ?? ''} key={editing?.id + 'w'} />
        <input name="piecesPerPack" type="number" className="input" placeholder="Pieces per pack" defaultValue={editing?.piecesPerPack ?? ''} key={editing?.id + 'pp'} />
        <input name="displayOrder" type="number" className="input" placeholder="Order" defaultValue={editing?.displayOrder ?? 0} key={editing?.id + 'o'} />
        <label className="flex items-center gap-2 text-sm">
          <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} key={editing?.id + 'a'} />
          Active
        </label>
        {error && <p className="text-sm text-red-400 md:col-span-2">{error}</p>}
        <div className="flex gap-2 md:col-span-2">
          <button className="btn" type="submit">
            {editing ? 'Update' : 'Create'}
          </button>
          {editing && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setEditing(null);
                setImage('');
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {items
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-700">
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(p.image)} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">
                    {p.name} · Rs {p.pricePkr}
                    {p.costPkr != null && (
                      <span className="ml-2 text-sm font-normal text-emerald-400">
                        margin {Math.round(((p.pricePkr - p.costPkr) / p.pricePkr) * 100)}%
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-stone-400">
                    {p.category.name} · cost {p.costPkr != null ? `Rs ${p.costPkr}` : '—'} · {p.slug}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => move(p.id, -1)}>
                  ↑
                </button>
                <button type="button" className="btn-ghost" onClick={() => move(p.id, 1)}>
                  ↓
                </button>
                <button type="button" className="btn-ghost" onClick={() => setEditing(p)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-300"
                  onClick={() => adminApi.deleteProduct(p.id).then(load)}
                >
                  Disable
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
