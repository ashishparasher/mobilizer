'use client';

import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/lib/api';
import { formatDate, timeAgo, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Search, X, Shield, ShieldOff, Loader2, RefreshCw,
  AlertTriangle, CheckCircle, ChevronRight, UserX, UserCheck,
} from 'lucide-react';

const BAN_DURATIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'Permanent', value: null },
];

// ─────────────────────────────────────────────
// User Drawer
// ─────────────────────────────────────────────
function UserDrawer({ user, onClose, onRefresh }: { user: any; onClose: () => void; onRefresh: () => void }) {
  const [banMode, setBanMode] = useState(false);
  const [banReason, setBanReason] = useState('');
  const [banDuration, setBanDuration] = useState<number | null>(7);
  const [notifyUser, setNotifyUser] = useState(true);
  const [loading, setLoading] = useState(false);
  const profile = user.profile;

  async function handleBan() {
    if (!banReason.trim()) { toast.error('Ban reason is required'); return; }
    setLoading(true);
    try {
      await adminApi.patch(`/admin/users/${user.id}/ban`, {
        reason: banReason,
        duration_days: banDuration,
        notify: notifyUser,
      });
      toast.success(`User banned${banDuration ? ` for ${banDuration} days` : ' permanently'}`);
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to ban user');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnban() {
    setLoading(true);
    try {
      await adminApi.patch(`/admin/users/${user.id}/unban`, {});
      toast.success('User unbanned successfully');
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to unban user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-slate-900">User Profile</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-200 rounded-full flex items-center justify-center text-xl font-bold text-slate-600">
              {(user.name || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900">{user.name || 'Unknown'}</p>
                {user.is_banned && (
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">BANNED</span>
                )}
              </div>
              <p className="text-sm text-slate-500">{user.phone}</p>
              <p className="text-xs text-slate-400">
                {user.role} &bull; joined {timeAgo(user.created_at)}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ['City', profile?.city || user.city || '—'],
              ['Reliability', profile?.reliability_score != null ? `${profile.reliability_score}%` : '—'],
              ['Role', user.role],
              ['Status', user.is_online ? 'Online' : 'Offline'],
            ].map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                <p className="font-semibold text-sm text-slate-900">{v}</p>
              </div>
            ))}
          </div>

          {/* Ban Info */}
          {user.is_banned && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-bold text-red-700 mb-1">Account Suspended</p>
              <p className="text-xs text-red-600">Reason: {user.ban_reason || '—'}</p>
              {user.banned_until && (
                <p className="text-xs text-red-500 mt-1">Until: {formatDate(user.banned_until)}</p>
              )}
            </div>
          )}

          {/* Ban Form */}
          {banMode && !user.is_banned && (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50">
              <h4 className="text-sm font-bold text-red-700 mb-3">Ban User</h4>

              <div className="mb-3">
                <label className="block text-xs font-medium text-red-700 mb-1">Reason *</label>
                <textarea
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  placeholder="Why is this user being banned?"
                  rows={3}
                  className="w-full text-sm border border-red-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-red-700 mb-2">Duration</label>
                <div className="flex gap-2 flex-wrap">
                  {BAN_DURATIONS.map(d => (
                    <button
                      key={String(d.value)}
                      onClick={() => setBanDuration(d.value)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
                        banDuration === d.value
                          ? 'bg-red-600 text-white border-red-600'
                          : 'bg-white text-red-700 border-red-200 hover:bg-red-50'
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-red-700 font-medium mb-4 cursor-pointer">
                <input type="checkbox" checked={notifyUser} onChange={e => setNotifyUser(e.target.checked)} className="rounded" />
                Notify user via push notification
              </label>

              <div className="flex gap-2">
                <button
                  onClick={handleBan}
                  disabled={loading || !banReason.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  <UserX className="w-3.5 h-3.5" />
                  Ban User
                </button>
                <button onClick={() => setBanMode(false)} className="px-3 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-2">
          {user.is_banned ? (
            <button
              onClick={handleUnban}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              Unban User
            </button>
          ) : (
            <button
              onClick={() => setBanMode(!banMode)}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              <UserX className="w-4 h-4" />
              Ban User
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Users Page
// ─────────────────────────────────────────────
export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [bannedFilter, setBannedFilter] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      if (bannedFilter) params.set('is_banned', bannedFilter);
      const data = await adminApi.get(`/admin/users?${params}`);
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, bannedFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const reliabilityColor = (score: number | null) => {
    if (score == null) return 'text-slate-400';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} users found</p>
        </div>
        <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">All roles</option>
          <option value="participant">Participant</option>
          <option value="campaigner">Campaigner</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={bannedFilter}
          onChange={e => setBannedFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
        >
          <option value="">All statuses</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Phone</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reliability</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Joined</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">No users found</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelected(u)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                        {(u.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{u.name || '—'}</p>
                        <p className="text-xs text-slate-400">{u.profile?.city || u.city || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-sm ${reliabilityColor(u.profile?.reliability_score)}`}>
                      {u.profile?.reliability_score != null ? `${u.profile.reliability_score}%` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(u.created_at)}</td>
                  <td className="px-4 py-3">
                    {u.is_banned ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 w-fit">
                        <ShieldOff className="w-3 h-3" /> Banned
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <UserDrawer user={selected} onClose={() => setSelected(null)} onRefresh={fetchUsers} />
      )}
    </div>
  );
}
