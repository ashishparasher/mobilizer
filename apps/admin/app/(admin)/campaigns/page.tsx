'use client';

import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/lib/api';
import { formatCurrency, formatDateTime, timeAgo, cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Search, CheckCircle, XCircle, AlertTriangle, ChevronRight,
  X, ExternalLink, RefreshCw, Shield, ShieldAlert, Loader2,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const TABS = [
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'active',           label: 'Active' },
  { key: 'flagged',          label: 'Flagged' },
  { key: 'all',              label: 'All' },
];

const BANNED_KEYWORDS = ['cash only', 'no id', 'no questions', 'secret', 'anonymous payment', 'guaranteed money', 'fake'];

const CATEGORY_EMOJIS: Record<string, string> = {
  political_event: '🗳️', wedding_social: '💍', brand_activation: '🏷️',
  religious_gathering: '🙏', ngo_volunteer: '🌱', influencer_shoot: '📸',
  survey_research: '📋', entertainment: '🎭',
};

const STATUS_STYLES: Record<string, string> = {
  pending_approval: 'bg-yellow-100 text-yellow-800',
  active: 'bg-green-100 text-green-800',
  flagged: 'bg-red-100 text-red-800',
  draft: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-600',
  completed: 'bg-blue-100 text-blue-800',
};

// ─────────────────────────────────────────────
// Auto-flag checker
// ─────────────────────────────────────────────
function getAutoFlags(campaign: any): string[] {
  const flags: string[] = [];
  const campaigner = campaign.campaigner;
  const isNewCampaigner = campaigner && new Date(campaigner.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if (campaign.payout > 5000) flags.push(`High payout: ₹${campaign.payout}/person`);
  if (campaign.slots_total > 5000) flags.push(`Large scale: ${campaign.slots_total} participants`);
  if (campaign.category === 'political_event' && isNewCampaigner) flags.push('Political event from new campaigner');
  if (!campaigner?.verified) flags.push('Unverified campaigner');
  if (isNewCampaigner) flags.push('New campaigner (<30 days)');

  const desc = (campaign.description || '').toLowerCase();
  const keyword = BANNED_KEYWORDS.find(k => desc.includes(k));
  if (keyword) flags.push(`Flagged keyword: "${keyword}"`);

  return flags;
}

// ─────────────────────────────────────────────
// Review Checks
// ─────────────────────────────────────────────
function AutoChecks({ campaign }: { campaign: any }) {
  const checks = [
    {
      label: 'Campaigner verified',
      pass: !!campaign.campaigner?.verified,
    },
    {
      label: 'Reasonable participant count',
      pass: campaign.slots_total <= 5000,
    },
    {
      label: 'Payout within normal range',
      pass: campaign.payout <= 5000,
    },
    {
      label: 'No flagged keywords in description',
      pass: !BANNED_KEYWORDS.some(k => (campaign.description || '').toLowerCase().includes(k)),
    },
    {
      label: 'Not a new campaigner with large budget',
      pass: !(new Date(campaign.campaigner?.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) && campaign.budget > 50000),
    },
  ];

  return (
    <div className="space-y-2">
      {checks.map(c => (
        <div key={c.label} className="flex items-center gap-2 text-sm">
          {c.pass
            ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
            : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          }
          <span className={c.pass ? 'text-slate-700' : 'text-red-700 font-medium'}>{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Campaign Review Drawer
// ─────────────────────────────────────────────
function ReviewDrawer({
  campaign,
  onClose,
  onAction,
}: {
  campaign: any;
  onClose: () => void;
  onAction: (id: string, action: 'approve' | 'reject' | 'flag', extra?: any) => Promise<void>;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const [flagNotes, setFlagNotes] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [mode, setMode] = useState<'view' | 'reject' | 'flag'>('view');
  const [loading, setLoading] = useState(false);
  const flags = getAutoFlags(campaign);
  const campaigner = campaign.campaigner;

  async function submit(action: 'approve' | 'reject' | 'flag') {
    setLoading(true);
    try {
      if (action === 'approve') await onAction(campaign.id, 'approve', { admin_notes: adminNotes });
      else if (action === 'reject') await onAction(campaign.id, 'reject', { reason: rejectReason });
      else await onAction(campaign.id, 'flag', { notes: flagNotes });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />

      {/* Drawer */}
      <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-start justify-between z-10">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{CATEGORY_EMOJIS[campaign.category] || '📋'}</span>
              <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLES[campaign.status] || 'bg-slate-100 text-slate-600')}>
                {campaign.status?.replace('_', ' ')}
              </span>
            </div>
            <h2 className="font-bold text-slate-900 text-base leading-tight">{campaign.title}</h2>
          </div>
          <button onClick={onClose} className="ml-3 p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 p-5 space-y-5">
          {/* Auto flags */}
          {flags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                <p className="text-sm font-bold text-red-700">Auto-Flags ({flags.length})</p>
              </div>
              <ul className="space-y-1">
                {flags.map((f, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Campaigner Info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Campaigner</h4>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-sm font-bold text-slate-600">
                {(campaigner?.org_name || 'O')[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-sm text-slate-900">{campaigner?.org_name || '—'}</p>
                  {campaigner?.verified && <Shield className="w-3.5 h-3.5 text-blue-500" />}
                </div>
                <p className="text-xs text-slate-500">{campaigner?.user?.phone} &bull; {campaigner?.verification_status}</p>
                <p className="text-xs text-slate-400">Joined {timeAgo(campaigner?.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Campaign Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              ['Payout/person', formatCurrency(campaign.payout)],
              ['Total slots', campaign.slots_total?.toLocaleString()],
              ['Total budget', formatCurrency(campaign.budget || campaign.payout * campaign.slots_total)],
              ['Event date', formatDateTime(campaign.event_date || campaign.date)],
              ['Location', campaign.location_name],
              ['Duration', `${campaign.duration_hrs}h`],
            ].map(([k, v]) => (
              <div key={String(k)} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-0.5">{k}</p>
                <p className="font-semibold text-slate-900 text-xs">{v}</p>
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Description</h4>
            <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-3">
              {campaign.description || 'No description provided.'}
            </p>
          </div>

          {/* Auto Checks */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase mb-3">Automated Checks</h4>
            <AutoChecks campaign={campaign} />
          </div>

          {/* Reject Modal */}
          {mode === 'reject' && (
            <div className="border border-red-200 rounded-xl p-4 bg-red-50">
              <h4 className="text-sm font-bold text-red-700 mb-3">Rejection Reason</h4>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this campaign is being rejected (sent to campaigner)..."
                rows={4}
                className="w-full text-sm border border-red-200 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => submit('reject')}
                  disabled={!rejectReason.trim() || loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Confirm Rejection
                </button>
                <button onClick={() => setMode('view')} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          )}

          {/* Flag Modal */}
          {mode === 'flag' && (
            <div className="border border-orange-200 rounded-xl p-4 bg-orange-50">
              <h4 className="text-sm font-bold text-orange-700 mb-3">Flag for Investigation</h4>
              <textarea
                value={flagNotes}
                onChange={e => setFlagNotes(e.target.value)}
                placeholder="Internal notes about what needs investigation..."
                rows={3}
                className="w-full text-sm border border-orange-200 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => submit('flag')}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Flag Campaign
                </button>
                <button onClick={() => setMode('view')} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              </div>
            </div>
          )}

          {/* Admin Notes for approve */}
          {mode === 'view' && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Admin Notes (optional)</h4>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Internal notes logged with this approval..."
                rows={2}
                className="w-full text-sm border border-slate-200 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {mode === 'view' && (
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-5 py-4 flex gap-2">
            <button
              onClick={() => submit('approve')}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold py-2.5 rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Approve
            </button>
            <button
              onClick={() => setMode('flag')}
              className="px-4 py-2.5 text-sm font-bold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setMode('reject')}
              className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 rounded-lg transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Campaigns Page
// ─────────────────────────────────────────────
export default function CampaignsPage() {
  const [tab, setTab] = useState('pending_approval');
  const [search, setSearch] = useState('');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get(`/admin/campaigns?status=${tab}&search=${encodeURIComponent(search)}`);
      setCampaigns(data.campaigns || []);
      setTotal(data.total || 0);
    } catch {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [tab, search]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  async function handleAction(id: string, action: 'approve' | 'reject' | 'flag', extra?: any) {
    try {
      await adminApi.patch(`/admin/campaigns/${id}/${action}`, extra);
      toast.success(`Campaign ${action}d successfully`);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} campaign`);
      throw err;
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Campaign Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">{total.toLocaleString()} campaigns in current filter</p>
        </div>
        <button onClick={fetchCampaigns} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
              tab === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Campaign</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Campaigner</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Slots</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payout</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Submitted</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400 text-sm">
                  No campaigns found in this filter
                </td>
              </tr>
            ) : (
              campaigns.map(c => {
                const flags = getAutoFlags(c);
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => setSelected(c)}>
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <span className="text-base mt-0.5">{CATEGORY_EMOJIS[c.category] || '📋'}</span>
                        <div>
                          <p className="font-medium text-slate-900 line-clamp-1">{c.title}</p>
                          <p className="text-xs text-slate-400 capitalize">{c.category?.replace('_', ' ')}</p>
                        </div>
                        {flags.length > 0 && (
                          <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                            {flags.length} flag{flags.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{c.campaigner?.org_name || '—'}</p>
                      <div className="flex items-center gap-1">
                        {c.campaigner?.verified
                          ? <span className="text-xs text-blue-600 flex items-center gap-0.5"><Shield className="w-3 h-3" /> Verified</span>
                          : <span className="text-xs text-orange-600">Unverified</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{c.slots_total?.toLocaleString()}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(c.payout)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{timeAgo(c.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', STATUS_STYLES[c.status] || 'bg-slate-100 text-slate-600')}>
                        {c.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      {selected && (
        <ReviewDrawer
          campaign={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
        />
      )}
    </div>
  );
}
