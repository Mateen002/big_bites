'use client';

import { useRef, useState } from 'react';
import { adminApi, assetUrl } from '@/lib/api';

export function ImageField({
  name = 'image',
  value,
  onChange,
  label = 'Image',
}: {
  name?: string;
  value: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const res = await adminApi.uploadImage(file);
      onChange(res.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const preview = value ? assetUrl(value) : '';

  return (
    <div className="md:col-span-2 space-y-3">
      <p className="text-sm text-stone-400">{label}</p>
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-28 w-28 overflow-hidden rounded-xl bg-ink-700 ring-1 ring-white/10">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-[11px] text-stone-500">No image</div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? 'Uploading…' : 'Upload image'}
            </button>
            {value && (
              <button type="button" className="btn-ghost" onClick={() => onChange('')}>
                Clear
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <input
            name={name}
            className="input"
            placeholder="Or paste image URL / path"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-[11px] text-stone-500">JPG, PNG, WebP or GIF · max 5MB</p>
          {error && <p className="text-sm text-rose-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
