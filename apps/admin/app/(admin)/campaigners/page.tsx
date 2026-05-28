'use client';

import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/lib/api';
import { timeAgo, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RefreshCw, Shield, ShieldOff, ChevronRight, X, CheckCircle, Loader2 } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
  suspended: 'bg-slate-100 text-slate-600',
};

function CampaignerDrawer({ c, onClose, onRefresh }: { c: any; onClose: () => void; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleVerify(verified: boolean) {
    setLoading(true);
    try {
      await adminApi.patch(`/admin/campaigns/${c.id}/approve`, { admin_notes: verified ? 'Verified by admin' : 'Rejected by admin' });
      toast.success(verified ? 'Campaigner verified' : 'Campaigner rejected');
      onRefresh();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-bold text-slate-900">Campaigner Profile</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center text-2xl font-bold text-orange-600">
              {(c.org_name || 'O')[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900">{c.org_name}</p>
                {c.verified && <Shield className="w-4 h-4 text-blue-500" />}
              </div>
              <p className="text-sm text-slate-500">{c.user?.name} &bull; {c.user?.phone}</p>
              <p className="text-xs text-slate-400">Joined {timeAgo(c.created_at)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              ['Verification', c.verification_status],
              ['Verified', c.verified ? 'Yes' : 'No'],
              ['Total Campaigns', c.total_campaigns || 0],
              ['Rating', c.rating ? `${c.rating}/5` : '—'],
            ].map(([k, v]) => (
              <div key={String(k)} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                <p className="font-semibold text-sm text-slate-900">{String(v)}</p>
              </div>
            ))}
          </div>

          {c.description && (
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">About</p>
              <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-4">{c.description}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-2">
          <button
            onClick={() => handleVerify(true)}
            disabled={loading || c.verified}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Verify
          </button>
          <button
            onClick={() => handleVerify(false)}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
          >
            <ShieldOff className="w-4 h-4" />
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignersPage() {
  const [campaigners, setCampaigners] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const fetchCampaigners = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get('/admin/users?role=campaigner');
      setCampaigners(data.users || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load campaigners');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigners(); }, [fetchCampaigners]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaigner Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total} campaigners registered</p>
        </div>
        <button onClick={fetchCampaigners} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Organization</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Contact</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Verification</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Joined</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : campaigners.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-sm">No campaigners found</td>
              </tr>
            ) : (
              campaigners.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => setSelected(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-xs font-bold text-orange-600">
                        {(c.name || 'O')[0].toUpperCase()}
                      </div>
                      <p className="font-medium text-slate-900">{c.name || '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.phone}</td>
                  <td className="px-4 py-3">
                    {c.is_banned ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Suspended</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 w-fit">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{timeAgo(c.created_at)}</td>
                  <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-slate-400" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && <CampaignerDrawer c={selected} onClose={() => setSelected(null)} onRefresh={fetchCampaigners} />}
    </div>
  );
}
