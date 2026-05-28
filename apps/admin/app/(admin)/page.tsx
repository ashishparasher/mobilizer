'use client';

import { useState, useEffect, useCallback } from 'react';
import adminApi from '@/lib/api';
import { formatCurrency, timeAgo } from '@/lib/utils';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  Users, Megaphone, Clock, DollarSign, UserPlus,
  TrendingUp, AlertTriangle, RefreshCw, Wifi,
} from 'lucide-react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface Stats {
  online_participants: number;
  active_campaigns: number;
  pending_approvals: number;
  payouts_today_count: number;
  payouts_today_sum: number;
  new_registrations_today: number;
  revenue_today: number;
  unreviewed_reports: number;
}

interface ChartData {
  registrationsChart: Array<{ date: string; participants: number; campaigners: number }>;
  categoriesChart: Array<{ category: string; count: number }>;
  statusChart: Array<{ name: string; value: number }>;
}

// ─────────────────────────────────────────────
// Metric Card
// ─────────────────────────────────────────────
function MetricCard({
  label, value, sub, icon: Icon, accent = false, alert = false,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; accent?: boolean; alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${alert ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? 'bg-slate-900 text-white' : alert ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${alert ? 'text-orange-700' : 'text-slate-900'}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Alerts Box
// ─────────────────────────────────────────────
function AlertsBox({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const alerts = [];
  if (stats.pending_approvals > 0)
    alerts.push({ type: 'warning', msg: `${stats.pending_approvals} campaigns/campaigners awaiting approval` });
  if (stats.unreviewed_reports > 0)
    alerts.push({ type: 'error', msg: `${stats.unreviewed_reports} reports unreviewed for >24hrs` });
  if (stats.payouts_today_count > 100)
    alerts.push({ type: 'info', msg: `High payout volume today: ${stats.payouts_today_count} transactions` });

  if (alerts.length === 0) return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <p className="text-sm font-medium text-green-700">All systems normal — no pending alerts</p>
    </div>
  );

  return (
    <div className="bg-white border border-orange-200 rounded-xl overflow-hidden">
      <div className="bg-orange-500 px-4 py-2.5 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-white" />
        <h3 className="text-sm font-bold text-white">Action Required ({alerts.length})</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {alerts.map((a, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
              a.type === 'error' ? 'bg-red-500' : a.type === 'warning' ? 'bg-orange-500' : 'bg-blue-500'
            }`} />
            <p className="text-sm text-slate-700">{a.msg}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

const CATEGORY_LABELS: Record<string, string> = {
  political_event: 'Political', wedding_social: 'Wedding', brand_activation: 'Brand',
  religious_gathering: 'Religious', ngo_volunteer: 'NGO', influencer_shoot: 'Influencer',
  survey_research: 'Survey', entertainment: 'Entertainment',
};

// ─────────────────────────────────────────────
// Main Overview Page
// ─────────────────────────────────────────────
export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [charts, setCharts] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    try {
      const [statsData, chartsData] = await Promise.all([
        adminApi.get('/admin/stats'),
        adminApi.get('/admin/stats/charts'),
      ]);
      setStats(statsData);
      setCharts(chartsData);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30s
    const timer = setInterval(fetchData, 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const formattedCats = (charts?.categoriesChart || []).map(c => ({
    ...c,
    category: CATEGORY_LABELS[c.category] || c.category,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Last updated: {timeAgo(lastRefresh)} &bull; Auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard
              label="Online Participants"
              value={stats?.online_participants?.toLocaleString() ?? 0}
              sub="Currently active on app"
              icon={Wifi}
              accent
            />
            <MetricCard
              label="Active Campaigns"
              value={stats?.active_campaigns?.toLocaleString() ?? 0}
              sub="Live and recruiting"
              icon={Megaphone}
            />
            <MetricCard
              label="Pending Approvals"
              value={stats?.pending_approvals ?? 0}
              sub="Campaigns + campaigners"
              icon={Clock}
              alert={(stats?.pending_approvals ?? 0) > 0}
            />
            <MetricCard
              label="Payouts Today"
              value={stats?.payouts_today_count ?? 0}
              sub={formatCurrency(stats?.payouts_today_sum ?? 0) + ' total'}
              icon={DollarSign}
            />
            <MetricCard
              label="New Registrations"
              value={stats?.new_registrations_today ?? 0}
              sub="Joined today"
              icon={UserPlus}
            />
            <MetricCard
              label="Revenue Today"
              value={formatCurrency(stats?.revenue_today ?? 0)}
              sub="Platform fees collected"
              icon={TrendingUp}
            />
          </div>

          {/* Alerts */}
          <AlertsBox stats={stats} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Registrations Line Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Registrations — Last 7 Days</h3>
              <p className="text-xs text-slate-500 mb-4">Participants vs Campaigners</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={charts?.registrationsChart || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} />
                  <Line type="monotone" dataKey="participants" stroke="#3b82f6" strokeWidth={2} dot={false} name="Participants" />
                  <Line type="monotone" dataKey="campaigners" stroke="#f59e0b" strokeWidth={2} dot={false} name="Campaigners" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Categories Bar Chart */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Campaigns by Category</h3>
              <p className="text-xs text-slate-500 mb-4">Created this month</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={formattedCats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1e293b" radius={[0, 4, 4, 0]} name="Campaigns" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Pie Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 max-w-lg">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Campaign Status Distribution</h3>
            <p className="text-xs text-slate-500 mb-4">All time breakdown</p>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={charts?.statusChart || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(charts?.statusChart || []).map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {(charts?.statusChart || []).map((item, index) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                    <span className="text-slate-600 capitalize">{item.name.replace('_', ' ')}</span>
                    <span className="font-bold text-slate-900 ml-auto">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
