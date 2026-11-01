'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ImageField } from '@/components/image-field';
import { adminApi, assetUrl, type AdminCategory, type AdminOptionGroup } from '@/lib/api';

let cachedCatItems: AdminCategory[] = [];
let cachedCatGroups: AdminOptionGroup[] = [];

export default function CategoriesPage() {
  const [items, setItems] = useState<AdminCategory[]>(() => cachedCatItems);
  const [groups, setGroups] = useState<AdminOptionGroup[]>(() => cachedCatGroups);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [image, setImage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const [c, g] = await Promise.all([adminApi.categories(), adminApi.optionGroups()]);
    cachedCatItems = c;
    cachedCatGroups = g;
    setItems(c);
    setGroups(g);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setImage(editing?.image || '');
  }, [editing]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const fd = new FormData(e.currentTarget);
    const optionGroupIds = fd.getAll('optionGroupIds') as string[];
    const body = {
      name: String(fd.get('name')),
      slug: String(fd.get('slug')),
      description: String(fd.get('description') || ''),
      image: image || '',
      fulfillmentType: String(fd.get('fulfillmentType')),
      displayOrder: Number(fd.get('displayOrder') || 0),
      isActive: fd.get('isActive') === 'on',
      optionGroupIds,
    };
    try {
      if (editing) await adminApi.updateCategory(editing.id, body);
      else await adminApi.createCategory(body);
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
    const a = sorted[idx];
    const b = sorted[swap];
    await adminApi.reorderCategories([
      { id: a.id, displayOrder: b.displayOrder },
      { id: b.id, displayOrder: a.displayOrder },
    ]);
    await load();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Categories</h1>
        <p className="text-sm text-stone-400">
          HOT_NOW → Order Now · SCHEDULED → Stock Your Freezer. New categories appear on the storefront automatically.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card grid gap-3 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">{editing ? 'Edit category' : 'Add category'}</h2>
        <input name="name" className="input" placeholder="Name" required defaultValue={editing?.name} key={editing?.id + 'n'} />
        <input name="slug" className="input" placeholder="slug" required defaultValue={editing?.slug} key={editing?.id + 's'} />
        <ImageField value={image} onChange={setImage} />
        <textarea name="description" className="input md:col-span-2" placeholder="Description" defaultValue={editing?.description || ''} key={editing?.id + 'd'} />
        <select name="fulfillmentType" className="input" defaultValue={editing?.fulfillmentType || 'HOT_NOW'} key={editing?.id + 'f'}>
          <option value="HOT_NOW">HOT_NOW (Order Now)</option>
          <option value="SCHEDULED">SCHEDULED (Stock Freezer)</option>
        </select>
        <input name="displayOrder" type="number" className="input" placeholder="Display order" defaultValue={editing?.displayOrder ?? items.length + 1} key={editing?.id + 'o'} />
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input name="isActive" type="checkbox" defaultChecked={editing?.isActive ?? true} key={editing?.id + 'a'} />
          Active
        </label>
        <div className="md:col-span-2">
          <p className="mb-2 text-sm text-stone-400">Customization option groups</p>
          <div className="flex flex-wrap gap-3">
            {groups.map((g) => (
              <label key={g.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="optionGroupIds" value={g.id} />
                {g.name}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-red-400 md:col-span-2">{error}</p>}
        <div className="flex gap-2 md:col-span-2">
          <button type="submit" className="btn">
            {editing ? 'Update' : 'Create'}
          </button>
          {editing && (
            <button type="button" className="btn-ghost" onClick={() => { setEditing(null); setImage(''); }}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        {items
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-ink-700">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={assetUrl(c.image)} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="font-medium">
                    {c.name}{' '}
                    <span className="text-xs text-stone-500">#{c.displayOrder}</span>
                  </p>
                  <p className="text-xs text-stone-400">
                    {c.slug} · {c.fulfillmentType} · {c.isActive ? 'active' : 'inactive'} ·{' '}
                    {c._count?.products ?? 0} products
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-ghost" onClick={() => move(c.id, -1)}>
                  ↑
                </button>
                <button type="button" className="btn-ghost" onClick={() => move(c.id, 1)}>
                  ↓
                </button>
                <button type="button" className="btn-ghost" onClick={() => setEditing(c)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost text-red-300"
                  onClick={() => adminApi.deleteCategory(c.id).then(load)}
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
