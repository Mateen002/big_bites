'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  adminApi,
  type AdminRole,
  type AdminUserMember,
} from '@/lib/api';

let cachedUsers: AdminUserMember[] = [];
let cachedRoles: AdminRole[] = [];

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUserMember[]>(() => cachedUsers);
  const [roles, setRoles] = useState<AdminRole[]>(() => cachedRoles);
  const [currentUser, setCurrentUser] = useState<{
    id?: string;
    role?: string;
    roleName?: string;
  } | null>(null);
  const [loading, setLoading] = useState(() => !cachedUsers.length);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    roleId: '',
  });
  const [busy, setBusy] = useState(false);

  // Delete State
  const [deletingUser, setDeletingUser] = useState<AdminUserMember | null>(null);

  // Super Admin Direct Password Reset State
  const [resetUser, setResetUser] = useState<AdminUserMember | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  function generateStrongPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setResetPasswordInput(`BigBites#${pwd}`);
  }

  async function handleResetPassword(e: FormEvent) {
    e.preventDefault();
    if (!resetUser) return;
    setResetBusy(true);
    setResetStatus(null);
    try {
      const res = await adminApi.resetUserPassword(resetUser.id, resetPasswordInput.trim());
      setResetStatus({ type: 'success', message: res.message });
      setTimeout(() => {
        setResetUser(null);
        setResetPasswordInput('');
        setResetStatus(null);
      }, 2500);
    } catch (err) {
      setResetStatus({
        type: 'error',
        message: err instanceof Error ? err.message : 'Password reset failed',
      });
    } finally {
      setResetBusy(false);
    }
  }

  async function load() {
    try {
      const [uList, rData, me] = await Promise.all([
        adminApi.users(),
        adminApi.roles(),
        adminApi.me(),
      ]);
      cachedUsers = uList;
      cachedRoles = rData.roles;
      setUsers(uList);
      setRoles(rData.roles);
      setCurrentUser(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin';

  function openCreateModal() {
    setEditingUser(null);
    const defaultRole = roles.find((r) => r.slug === 'admin') || roles[0];
    setFormData({
      name: '',
      email: '',
      password: '',
      roleId: defaultRole?.id || '',
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  }

  function openEditModal(user: AdminUserMember) {
    if (!isSuperAdmin && user.role?.slug === 'super_admin') {
      setError('Only Super Admin can modify Super Admin accounts.');
      return;
    }
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: '', // blank unless changing
      roleId: user.roleId || '',
    });
    setError('');
    setSuccess('');
    setIsModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      if (editingUser) {
        // Update user
        const payload: { name?: string; email?: string; password?: string; roleId?: string } = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          roleId: formData.roleId || undefined,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }

        const updated = await adminApi.updateUser(editingUser.id, payload);
        const nextList = users.map((u) => (u.id === updated.id ? updated : u));
        cachedUsers = nextList;
        setUsers(nextList);
        setSuccess(`User "${updated.name}" updated successfully.`);
      } else {
        // Create user
        if (!formData.password.trim()) {
          throw new Error('Password is required for new team members.');
        }
        const created = await adminApi.createUser({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          roleId: formData.roleId || undefined,
        });
        const nextList = [created, ...users];
        cachedUsers = nextList;
        setUsers(nextList);
        setSuccess(`User "${created.name}" created successfully. They can now log in.`);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deletingUser) return;
    setBusy(true);
    setError('');
    setSuccess('');

    try {
      await adminApi.deleteUser(deletingUser.id);
      const nextList = users.filter((u) => u.id !== deletingUser.id);
      cachedUsers = nextList;
      setUsers(nextList);
      setSuccess(`User "${deletingUser.name}" removed successfully.`);
      setDeletingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setBusy(false);
    }
  }

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.role?.name || '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role?.slug === 'super_admin').length;
    const admins = users.filter((u) => u.role?.slug === 'admin').length;
    const customStaff = total - superAdmins - admins;
    return { total, superAdmins, admins, customStaff };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Switcher */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
            <span>Administration</span>
            <span>/</span>
            <span className="text-stone-300">Team & Staff</span>
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-white">
            Team Members & Staff
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Manage admin users, staff accounts, credentials, and role assignments.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link
            href="/roles"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white sm:flex-initial"
          >
            🛡 Manage Roles & Permissions
          </Link>
          {(isSuperAdmin || isAdmin) && (
            <button
              type="button"
              onClick={openCreateModal}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-ink-950 shadow-lg shadow-accent/20 transition hover:bg-accent-hover sm:flex-initial"
            >
              <span className="text-base leading-none">+</span>
              Add Team Member
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 text-sm font-semibold">
        <span className="border-b-2 border-accent pb-3 text-accent">
          👥 Team Members ({users.length})
        </span>
        <Link
          href="/roles"
          className="ml-6 border-b-2 border-transparent pb-3 text-stone-400 transition hover:text-stone-200"
        >
          🛡 Roles & Permissions ({roles.length})
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">Total Staff</p>
          <p className="mt-1 text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400/80">
            Super Admins
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-300">{stats.superAdmins}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/80">
            Operational Admins
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-300">{stats.admins}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-800/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-indigo-400/80">
            Custom Roles
          </p>
          <p className="mt-1 text-2xl font-bold text-indigo-300">{stats.customStaff}</p>
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

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search team members by name, email, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-ink-800/70 py-2.5 pl-9 pr-4 text-sm text-white placeholder-stone-500 transition focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="rounded-xl border border-white/10 bg-ink-800 px-3 py-2.5 text-xs text-stone-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Mobile Team Member Cards (Visible on screens < md) */}
      <div className="space-y-3 md:hidden">
        {loading && !users.length ? (
          <div className="card text-center py-10 text-stone-400">Loading team members...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="card text-center py-10 text-stone-400">
            {search ? 'No team members match your search.' : 'No team members found.'}
          </div>
        ) : (
          filteredUsers.map((member) => {
            const isCurrent = currentUser?.id === member.id;
            const isMemberSuperAdmin = member.role?.slug === 'super_admin';
            const initials = member.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div key={member.id} className="card border border-white/10 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                        isMemberSuperAdmin
                          ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                          : member.role?.slug === 'admin'
                            ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                            : 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                      }`}
                    >
                      {initials || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{member.name}</span>
                        {isCurrent && (
                          <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 truncate">{member.email}</p>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-semibold ${
                      isMemberSuperAdmin
                        ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                        : member.role?.slug === 'admin'
                          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                    }`}
                  >
                    <span>{isMemberSuperAdmin ? '👑' : member.role?.slug === 'admin' ? '🛡' : '👤'}</span>
                    <span>{member.role?.name || 'Unassigned'}</span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-500 pt-2 border-t border-white/5">
                  <span>
                    Joined{' '}
                    {new Date(member.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  <span>ID: {member.id.slice(-6)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                  {(isSuperAdmin || isCurrent) && (
                    <button
                      type="button"
                      onClick={() => {
                        setResetUser(member);
                        setResetPasswordInput('');
                        setResetStatus(null);
                      }}
                      className="col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20 text-center"
                    >
                      🔑 Reset Password
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEditModal(member)}
                    className={`rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white text-center ${
                      !isCurrent && (isSuperAdmin || (!isMemberSuperAdmin && isAdmin)) ? '' : 'col-span-2'
                    }`}
                  >
                    Edit Details
                  </button>
                  {!isCurrent && (isSuperAdmin || (!isMemberSuperAdmin && isAdmin)) && (
                    <button
                      type="button"
                      onClick={() => setDeletingUser(member)}
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 text-center"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Directory Desktop Table (Visible on screens >= md) */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-white/10 bg-ink-800/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-ink-800/80 text-xs font-semibold uppercase tracking-wider text-stone-400">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Assigned Role</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading && !users.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                    Loading team members...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-stone-400">
                    {search ? 'No team members match your search.' : 'No team members found.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((member) => {
                  const isCurrent = currentUser?.id === member.id;
                  const isMemberSuperAdmin = member.role?.slug === 'super_admin';
                  const initials = member.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={member.id} className="transition hover:bg-white/[0.02]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold ${
                              isMemberSuperAdmin
                                ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40'
                                : member.role?.slug === 'admin'
                                  ? 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40'
                                  : 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40'
                            }`}
                          >
                            {initials || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{member.name}</span>
                              {isCurrent && (
                                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold text-accent">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-stone-500">ID: {member.id.slice(-6)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-stone-300">{member.email}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            isMemberSuperAdmin
                              ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                              : member.role?.slug === 'admin'
                                ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                                : 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30'
                          }`}
                        >
                          <span>{isMemberSuperAdmin ? '👑' : member.role?.slug === 'admin' ? '🛡' : '👤'}</span>
                          {member.role?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-stone-400">
                        {new Date(member.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(isSuperAdmin || isCurrent) && (
                            <button
                              type="button"
                              onClick={() => {
                                setResetUser(member);
                                setResetPasswordInput('');
                                setResetStatus(null);
                              }}
                              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/20"
                              title="Reset Password"
                            >
                              🔑 Reset Password
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(member)}
                            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-stone-300 transition hover:bg-white/10 hover:text-white"
                          >
                            Edit
                          </button>
                          {!isCurrent && (isSuperAdmin || (!isMemberSuperAdmin && isAdmin)) && (
                            <button
                              type="button"
                              onClick={() => setDeletingUser(member)}
                              className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-ink-900 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">
                  {editingUser ? `Edit ${editingUser.name}` : 'Add New Team Member'}
                </h3>
                <p className="mt-0.5 text-xs text-stone-400">
                  {editingUser
                    ? 'Update account details, role, or reset password.'
                    : 'Provide account credentials and assign an administrative role.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-stone-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Usman Tariq"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. usman@bigbites.pk"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                  {editingUser ? 'New Password (Leave blank to keep unchanged)' : 'Initial Password *'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  placeholder={editingUser ? '•••••••• (leave blank to keep)' : 'Minimum 6 characters'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                  Assigned Role *
                </label>
                <select
                  value={formData.roleId}
                  onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm text-white focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {roles.map((r) => {
                    const disabled = !isSuperAdmin && r.slug === 'super_admin';
                    return (
                      <option key={r.id} value={r.id} disabled={disabled}>
                        {r.name} {disabled ? '(Super Admin Only)' : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="mt-1.5 text-xs text-stone-500">
                  {roles.find((r) => r.id === formData.roleId)?.description ||
                    'Select a role to define permissions and accessibility.'}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-stone-400 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-accent px-5 py-2.5 text-xs font-bold text-ink-950 transition hover:bg-accent-hover disabled:opacity-50"
                >
                  {busy ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-rose-500/20 bg-ink-900 p-5 sm:p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Remove Team Member?</h3>
            <p className="mt-2 text-sm text-stone-400">
              Are you sure you want to remove <strong className="text-white">{deletingUser.name}</strong> (
              {deletingUser.email})? This user will immediately lose all access to the BigBites admin panel.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-stone-400 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmDelete}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-50"
              >
                {busy ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Super Admin Direct Password Reset Modal */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/30 bg-ink-900 p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔑</span>
                <div>
                  <h3 className="text-lg font-bold text-white">Reset User Password</h3>
                  <p className="text-xs text-stone-400">
                    Set a new password for <strong className="text-white">{resetUser.name}</strong> ({resetUser.email}).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetUser(null)}
                className="rounded-lg p-1 text-stone-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-400">
                    New Password *
                  </label>
                  <button
                    type="button"
                    onClick={generateStrongPassword}
                    className="text-xs font-semibold text-accent hover:underline"
                  >
                    🎲 Generate Strong Password
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="Minimum 6 characters"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-ink-800 px-3.5 py-2.5 text-sm font-mono text-white placeholder-stone-500 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="mt-1 text-[11px] text-stone-500">
                  Must be at least 6 characters. The user can log in with this password immediately.
                </p>
              </div>

              {resetStatus && (
                <div
                  className={`rounded-xl border p-3 text-xs ${
                    resetStatus.type === 'success'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  {resetStatus.message}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold text-stone-400 transition hover:bg-white/5 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetBusy || !resetPasswordInput.trim()}
                  className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-ink-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400 disabled:opacity-50"
                >
                  {resetBusy ? 'Resetting...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

