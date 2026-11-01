'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  type AdminRole,
  type AvailablePermission,
} from '@/lib/api';

let cachedRoles: AdminRole[] = [];
let cachedPerms: AvailablePermission[] = [];

export default function RolesPage() {
  const [roles, setRoles] = useState<AdminRole[]>(() => cachedRoles);
  const [permissions, setPermissions] = useState<AvailablePermission[]>(() => cachedPerms);
  const [currentUser, setCurrentUser] = useState<{ role?: string; roleName?: string } | null>(null);
  const [loading, setLoading] = useState(() => !cachedRoles.length);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [data, me] = await Promise.all([adminApi.roles(), adminApi.me()]);
      cachedRoles = data.roles;
      cachedPerms = data.availablePermissions;
      setRoles(data.roles);
      setPermissions(data.availablePermissions);
      setCurrentUser(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  // Group permissions by module
  const permsByModule = useMemo(() => {
    const map = new Map<string, AvailablePermission[]>();
    for (const p of permissions) {
      const list = map.get(p.module) || [];
      list.push(p);
      map.set(p.module, list);
    }
    return map;
  }, [permissions]);

  function startCreate() {
    setEditingRole(null);
    setSelectedPerms([
      'orders:read',
      'orders:write',
      'catalog:read',
      'options:read',
      'zones:read',
    ]);
    setIsCreating(true);
    setError('');
    setSuccess('');
  }

  function startEdit(role: AdminRole) {
    if (!isSuperAdmin) {
      setError('Only Super Admin can edit roles.');
      return;
    }
    setEditingRole(role);
    setSelectedPerms(role.permissions || []);
    setIsCreating(true);
    setError('');
    setSuccess('');
  }

  function togglePerm(key: string) {
    // If not super admin, prevent selecting security edit/delete
    if (!isSuperAdmin && (key === 'roles:edit' || key === 'roles:delete')) {
      return;
    }
    setSelectedPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function selectOperational() {
    const operational = permissions
      .filter((p) => p.key !== 'roles:edit' && p.key !== 'roles:delete')
      .map((p) => p.key);
    setSelectedPerms(operational);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get('name') || '').trim();
    const description = String(fd.get('description') || '').trim();

    try {
      if (editingRole) {
        if (!isSuperAdmin) {
          throw new Error('Only Super Admin can edit roles.');
        }
        await adminApi.updateRole(editingRole.id, {
          name,
          description,
          permissions: selectedPerms,
        });
        setSuccess(`Role '${name}' updated successfully.`);
      } else {
        await adminApi.createRole({
          name,
          description,
          permissions: selectedPerms,
        });
        setSuccess(`Role '${name}' created successfully.`);
      }
      setIsCreating(false);
      setEditingRole(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(role: AdminRole) {
    if (!isSuperAdmin) {
      setError('Only Super Admin can delete roles.');
      return;
    }
    if (role.isSystem) {
      setError('System roles cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete role '${role.name}'?`)) {
      return;
    }

    setBusy(true);
    setError('');
    try {
      await adminApi.deleteRole(role.id);
      setSuccess(`Role '${role.name}' deleted successfully.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent">Security</p>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                isSuperAdmin
                  ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
              }`}
            >
              Signed in as {isSuperAdmin ? 'Super Admin (Full Access)' : 'Admin (Create Only)'}
            </span>
          </div>
          <h1 className="mt-1 font-display text-3xl text-white md:text-4xl">Roles & Permissions</h1>
          <p className="mt-1 text-sm text-stone-400">
            Define team authority, operational privileges, and security boundaries.
          </p>
        </div>

        <button
          type="button"
          onClick={startCreate}
          className="btn"
          disabled={!isSuperAdmin && !isAdmin}
        >
          + Create New Role
        </button>
      </div>

      {/* Role permission info banner */}
      <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4 text-xs text-stone-300">
        <p className="font-semibold text-white">Role Hierarchy Rules:</p>
        <ul className="mt-1 list-disc space-y-1 pl-4 text-stone-400">
          <li>
            <strong className="text-amber-400">Super Admin:</strong> Top level authority with all permissions. Can create, edit, and delete any role.
          </li>
          <li>
            <strong className="text-emerald-400">Admin:</strong> Operational authority. Can manage daily kitchen, catalog, and <em>create new roles</em>, but <strong>cannot edit or delete existing roles</strong>.
          </li>
        </ul>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Create / Edit Modal Form */}
      {isCreating && (
        <div className="card space-y-6 border border-amber-400/30 bg-ink-800 p-6 shadow-2xl ring-1 ring-amber-400/20">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingRole ? `Edit Role: ${editingRole.name}` : 'Create New Team Role'}
              </h2>
              <p className="text-xs text-stone-400">
                {editingRole
                  ? 'Update role name, description, and granted permissions.'
                  : 'Assign specific operational permissions to this role.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsCreating(false);
                setEditingRole(null);
              }}
              className="text-sm text-stone-400 hover:text-white"
            >
              ✕ Cancel
            </button>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Role Name</label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={editingRole?.name || ''}
                  disabled={editingRole?.isSystem}
                  placeholder="e.g. Kitchen Lead, Store Dispatcher"
                  className="input mt-1.5 w-full"
                />
                {editingRole?.isSystem && (
                  <p className="mt-1 text-[11px] text-stone-500">System role names cannot be renamed.</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">Description</label>
                <input
                  name="description"
                  type="text"
                  defaultValue={editingRole?.description || ''}
                  placeholder="Purpose and responsibilities of this role"
                  className="input mt-1.5 w-full"
                />
              </div>
            </div>

            {/* Permissions Checkbox Grid */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Granted Permissions ({selectedPerms.length} selected)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectOperational}
                    className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-amber-300 hover:bg-white/10"
                  >
                    Select Operational
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPerms([])}
                    className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-stone-400 hover:bg-white/10"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from(permsByModule.entries()).map(([moduleName, perms]) => (
                  <div key={moduleName} className="rounded-xl border border-white/5 bg-ink-900/60 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-accent">{moduleName}</p>
                    <div className="mt-2.5 space-y-2">
                      {perms.map((p) => {
                        const checked = selectedPerms.includes(p.key);
                        const isSuperAdminOnly = p.key === 'roles:edit' || p.key === 'roles:delete';
                        const disabled = !isSuperAdmin && isSuperAdminOnly;

                        return (
                          <label
                            key={p.key}
                            className={`flex cursor-pointer items-start gap-2.5 text-xs ${
                              disabled ? 'opacity-40 cursor-not-allowed' : 'text-stone-300 hover:text-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => togglePerm(p.key)}
                              className="mt-0.5 rounded border-white/20 bg-ink-700 text-accent focus:ring-accent"
                            />
                            <div>
                              <span className="font-medium">{p.label}</span>
                              <span className="block text-[10px] text-stone-500 font-mono">{p.key}</span>
                              {disabled && (
                                <span className="text-[10px] text-amber-400">Super Admin only</span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsCreating(false);
                  setEditingRole(null);
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button type="submit" className="btn" disabled={busy}>
                {busy ? 'Saving…' : editingRole ? 'Update Role' : 'Create Role'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Roles List */}
      <div className="space-y-4">
        {roles.map((role) => {
          const isSystem = role.isSystem;
          const userCount = role._count?.users || 0;
          const permCount = role.permissions?.length || 0;

          return (
            <div
              key={role.id}
              className={`card relative overflow-hidden transition ${
                role.slug === 'super_admin'
                  ? 'border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent'
                  : role.slug === 'admin'
                  ? 'border border-emerald-500/25 bg-gradient-to-r from-emerald-500/5 to-transparent'
                  : 'border border-white/5'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{role.name}</h3>
                    <span className="font-mono text-xs text-stone-500">({role.slug})</span>

                    {isSystem && (
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-300">
                        System Role
                      </span>
                    )}

                    {role.slug === 'super_admin' && (
                      <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-500/40">
                        Top Level · All Permissions
                      </span>
                    )}

                    {role.slug === 'admin' && (
                      <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-500/40">
                        Operational · Role Creation Only
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-400">
                    {role.description || 'No description provided.'}
                  </p>

                  <div className="flex items-center gap-4 pt-2 text-xs text-stone-400">
                    <span>
                      👥 <strong>{userCount}</strong> assigned user(s)
                    </span>
                    <span>
                      🔑 <strong>{permCount}</strong> / {permissions.length} permissions
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {isSuperAdmin ? (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(role)}
                        className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 hover:bg-white/10 hover:text-white"
                      >
                        Edit Permissions
                      </button>

                      {!isSystem && (
                        <button
                          type="button"
                          onClick={() => onDelete(role)}
                          className="rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                        >
                          Delete
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-[11px] text-stone-500">
                      <span>🔒</span>
                      <span>Super Admin Only to Edit/Delete</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions tags preview */}
              <div className="mt-4 border-t border-white/5 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                  Active Permissions:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {role.permissions?.map((pKey) => {
                    const permMeta = permissions.find((p) => p.key === pKey);
                    return (
                      <span
                        key={pKey}
                        className="rounded-md bg-ink-900/90 px-2 py-0.5 text-[11px] font-medium text-stone-300 ring-1 ring-white/10"
                        title={permMeta?.label || pKey}
                      >
                        {permMeta?.label || pKey}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
