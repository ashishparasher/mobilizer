'use client';

import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/lib/api';
import { timeAgo, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, ChevronRight, Flag, X, Loader2 } from 'lucide-react';

const STATUS_TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'all',     label: 'All' },
];

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-red-100 text-red-700',
  reviewed: 'bg-green-100 text-green-700',
  escalated: 'bg-orange-100 text-orange-700',
  dismissed: 'bg-slate-100 text-slate-600',
};

function ReportDrawer({ report, onClose, onRefresh }: { report: any; onClose: () => void; onRefresh: () => void }) {
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleUpdate(status: string) {
    setLoading(true);
    try {
      await adminApi.patch(`/admin/reports/${report.id}`, { status, admin_notes: adminNotes });
      toast.success(`Report marked as ${status}`);
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-slate-900">Report Details</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', STATUS_STYLES[report.status] || 'bg-slate-100 text-slate-600')}>
              {report.status}
            </span>
            <span className="text-xs text-slate-400">{timeAgo(report.created_at)}</span>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Reporter</p>
              <p className="font-semibold text-sm text-slate-900">{report.reporter?.name || '—'}</p>
              <p className="text-xs text-slate-400">{report.reporter?.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Reported User</p>
              <p className="font-semibold text-sm text-slate-900">{report.reported_user?.name || '—'}</p>
              <p className="text-xs text-slate-400">{report.reported_user?.phone}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Report Type</p>
            <span className="text-sm font-semibold text-slate-800 capitalize">{report.type?.replace('_', ' ') || '—'}</span>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Description</p>
            <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4 leading-relaxed">
              {report.description || 'No description provided.'}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Admin Notes</p>
            <textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Internal notes for this report..."
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-2">
          <button
            onClick={() => handleUpdate('reviewed')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Mark Reviewed
          </button>
          <button
            onClick={() => handleUpdate('escalated')}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
          >
            <Flag className="w-4 h-4" />
            Escalate
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reports, setReports] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get(`/admin/reports?status=${statusFilter}`);
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports Queue</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} reports in current filter</p>
        </div>
        <button onClick={fetchReports} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setStatusFilter(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              statusFilter === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Reporter</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Against</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Type</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Received</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No reports in this category
                </td>
              </tr>
            ) : (
              reports.map(r => (
                <tr key={r.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelected(r)}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.reporter?.name || '—'}</p>
                    <p className="text-xs text-slate-400">{r.reporter?.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700">{r.reported_user?.name || '—'}</p>
                    <p className="text-xs text-slate-400">{r.reported_user?.phone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium text-slate-600 capitalize">{r.type?.replace('_', ' ') || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLES[r.status] || 'bg-slate-100 text-slate-600')}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <ReportDrawer report={selected} onClose={() => setSelected(null)} onRefresh={fetchReports} />}
    </div>
  );
}
