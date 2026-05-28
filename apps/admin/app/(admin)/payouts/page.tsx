'use client';

import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/lib/api';
import { formatCurrency, formatDateTime, timeAgo, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Search, X, CheckCircle, XCircle, Loader2, RefreshCw,
  ChevronRight, DollarSign, Clock, AlertTriangle,
} from 'lucide-react';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'processed', label: 'Completed' },
  { key: 'disputed', label: 'Disputed' },
  { key: 'reversed', label: 'Reversed' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  processed: 'bg-green-100 text-green-800',
  disputed: 'bg-red-100 text-red-800',
  reversed: 'bg-slate-100 text-slate-600',
};

// ─────────────────────────────────────────────
// Dispute Resolution Drawer
// ─────────────────────────────────────────────
function DisputeDrawer({ payout, onClose, onRefresh }: { payout: any; onClose: () => void; onRefresh: () => void }) {
  const [action, setAction] = useState<'approve' | 'reject' | 'partial' | null>(null);
  const [partialAmount, setPartialAmount] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    if (!action) return;
    if (action === 'partial' && (!partialAmount || parseFloat(partialAmount) <= 0)) {
      toast.error('Please enter a valid partial amount');
      return;
    }
    setLoading(true);
    try {
      await adminApi.patch(`/admin/payouts/${payout.id}/resolve`, {
        action,
        custom_amount: action === 'partial' ? parseFloat(partialAmount) : undefined,
        admin_notes: adminNotes,
      });
      toast.success(`Payout ${action}d successfully`);
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to resolve payout');
    } finally {
      setLoading(false);
    }
  }

  const user = payout.user;
  const campaign = payout.campaign;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-bold text-slate-900">Payout Details</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {payout.status === 'disputed' ? '⚠️ Disputed — requires resolution' : `Status: ${payout.status}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Payout Summary */}
          <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Payout Amount</p>
              <p className="text-3xl font-bold text-slate-900">{formatCurrency(payout.amount)}</p>
            </div>
            <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full', STATUS_STYLES[payout.status] || 'bg-slate-100 text-slate-600')}>
              {payout.status}
            </span>
          </div>

          {/* Participant Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Participant</h4>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="font-semibold text-slate-900">{user?.name || '—'}</p>
              <p className="text-sm text-slate-500">{user?.phone}</p>
              {payout.upi_id && (
                <p className="text-xs font-mono text-slate-600 mt-1 bg-slate-50 px-2 py-1 rounded w-fit">
                  UPI: {payout.upi_id}
                </p>
              )}
            </div>
          </div>

          {/* Campaign Info */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Campaign</h4>
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="font-semibold text-slate-900">{campaign?.title || '—'}</p>
              <p className="text-xs text-slate-400 capitalize mt-0.5">{campaign?.category?.replace('_', ' ')}</p>
            </div>
          </div>

          {/* Timeline Evidence */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Evidence</h4>
            <div className="space-y-2">
              {[
                ['Check-in Time', payout.checkin_time ? formatDateTime(payout.checkin_time) : 'Not available'],
                ['Checkout Time', payout.checkout_time ? formatDateTime(payout.checkout_time) : 'Not available'],
                ['GPS Match', payout.gps_verified ? '✅ Verified within 200m' : '❌ GPS not verified'],
                ['Selfie', payout.selfie_url ? '✅ Captured' : '—'],
                ['Submitted', timeAgo(payout.created_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <span className="text-xs font-medium text-slate-500">{k}</span>
                  <span className="text-xs font-semibold text-slate-800">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dispute notes */}
          {payout.dispute_reason && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-xs font-bold text-red-700 mb-1">Dispute Reason</p>
              <p className="text-sm text-red-600">{payout.dispute_reason}</p>
            </div>
          )}

          {/* Resolution Controls */}
          {payout.status === 'disputed' && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Resolution</h4>
              <div className="flex gap-2 mb-4">
                {(['approve', 'partial', 'reject'] as const).map(a => (
                  <button
                    key={a}
                    onClick={() => setAction(a === action ? null : a)}
                    className={cn(
                      'flex-1 py-2 text-sm font-semibold rounded-lg border transition-colors capitalize',
                      action === a
                        ? a === 'approve' ? 'bg-green-600 text-white border-green-600'
                          : a === 'reject' ? 'bg-red-600 text-white border-red-600'
                          : 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    {a === 'approve' ? '✅ Approve' : a === 'reject' ? '❌ Reject' : '⚡ Partial'}
                  </button>
                ))}
              </div>

              {action === 'partial' && (
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Custom Amount (₹)</label>
                  <input
                    type="number"
                    value={partialAmount}
                    onChange={e => setPartialAmount(e.target.value)}
                    max={payout.amount}
                    min={1}
                    placeholder={`Max: ${payout.amount}`}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
                  />
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-700 mb-1">Admin Notes</label>
                <textarea
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Internal notes logged with this resolution..."
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {payout.status === 'disputed' && (
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4">
            <button
              onClick={handleResolve}
              disabled={!action || loading}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold py-3 rounded-xl disabled:opacity-50 transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {action ? `Confirm ${action.charAt(0).toUpperCase() + action.slice(1)}` : 'Select an action above'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Payouts Page
// ─────────────────────────────────────────────
export default function PayoutsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const fetchPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const data = await adminApi.get(`/admin/payouts?${params}`);
      setPayouts(data.payouts || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  const totalAmount = payouts.reduce((s, p) => s + (p.amount || 0), 0);
  const disputedCount = payouts.filter(p => p.status === 'disputed').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payout Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} payouts &bull; {formatCurrency(totalAmount)} total</p>
        </div>
        <button onClick={fetchPayouts} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Disputed Alert */}
      {disputedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            {disputedCount} disputed payout{disputedCount > 1 ? 's' : ''} require manual resolution
          </p>
          <button onClick={() => setStatusFilter('disputed')} className="ml-auto text-xs font-bold text-red-600 hover:underline">
            View Disputed
          </button>
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={cn(
              'px-3 py-2 text-xs font-semibold rounded-lg transition-colors',
              statusFilter === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Participant</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Campaign</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : payouts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">No payouts found</td>
              </tr>
            ) : (
              payouts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelected(p)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{p.user?.name || '—'}</p>
                    <p className="text-xs text-slate-400 font-mono">{p.upi_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 line-clamp-1">{p.campaign?.title || '—'}</p>
                    <p className="text-xs text-slate-400 capitalize">{p.campaign?.category?.replace('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">{formatCurrency(p.amount)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLES[p.status] || 'bg-slate-100 text-slate-600')}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(p.created_at)}</td>
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
        <DisputeDrawer payout={selected} onClose={() => setSelected(null)} onRefresh={fetchPayouts} />
      )}
    </div>
  );
}
