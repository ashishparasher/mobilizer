'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Landmark, Users, Calendar, AlertCircle, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    budgetLocked: 0,
    totalSlots: 0,
    slotsFilled: 0,
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const list = await api.get('/campaigns/my/list');
        setCampaigns(list || []);

        // Compute statistical metrics
        const total = list.length;
        const active = list.filter((c: any) => c.status === 'active').length;
        const budget = list.reduce((sum: number, c: any) => sum + Number(c.budget_locked || 0), 0);
        const slots = list.reduce((sum: number, c: any) => sum + Number(c.slots_total || 0), 0);
        const filled = list.reduce((sum: number, c: any) => sum + Number(c.slots_filled || 0), 0);

        setStats({
          totalCampaigns: total,
          activeCampaigns: active,
          budgetLocked: budget,
          totalSlots: slots,
          slotsFilled: filled,
        });
      } catch (err) {
        console.error('Failed to load campaigns list:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Format date utility
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Status badge coloring mapping
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200" variant="outline">Draft</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Review</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };

  // Recharts campaign stats transformation
  const chartData = campaigns.slice(0, 5).map((c) => ({
    name: c.title.length > 12 ? `${c.title.substring(0, 10)}...` : c.title,
    slots: c.slots_total,
    filled: c.slots_filled,
  }));

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <span className="text-gray-400 font-bold animate-pulse">Fetching metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1A1A2E] tracking-tight">Campaigner Console</h1>
          <p className="text-sm text-gray-500 font-medium">Coordinate taskforces and disburse instant compensation.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/campaigns/new"
            className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl shadow-lg shadow-orange-500/10 text-sm transition-all"
          >
            <PlusCircle size={16} /> Deploy Campaign
          </Link>
        </div>
      </div>

      {/* Grid statistics metrics panel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-[#FF6B35] rounded-xl">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">Total Campaigns</p>
              <h3 className="text-2xl font-black text-[#1A1A2E]">{stats.totalCampaigns}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">Active Campaigns</p>
              <h3 className="text-2xl font-black text-[#1A1A2E]">{stats.activeCampaigns}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">Participants Recruited</p>
              <h3 className="text-2xl font-black text-[#1A1A2E]">
                {stats.slotsFilled} <span className="text-xs font-semibold text-gray-400">/ {stats.totalSlots}</span>
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 bg-violet-100 text-violet-600 rounded-xl">
              <Landmark size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase">Locked in Escrow</p>
              <h3 className="text-2xl font-black text-[#1A1A2E]">₹{stats.budgetLocked.toLocaleString('en-IN')}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Charts & Participation Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1A1A2E]">Active Recruitment Allocation</CardTitle>
            <CardDescription className="text-xs text-gray-400 font-semibold">
              Comparison between total targets and confirmed slots.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {chartData.length > 0 ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} fontWeight={600} />
                    <YAxis stroke="#94A3B8" fontSize={11} fontWeight={600} />
                    <Tooltip cursor={{ fill: '#F8FAFC' }} />
                    <Bar dataKey="slots" name="Target Slots" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="filled" name="Confirmed Slots" fill="#FF6B35" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center border border-dashed border-[#E2E8F0] rounded-xl text-xs text-gray-400 font-bold">
                Deploy campaigns to view participation metrics.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Action Panels / Alert Feeds */}
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-[#1A1A2E]">Organizer Guidelines</CardTitle>
            <CardDescription className="text-xs text-gray-400 font-semibold">Important notes for active deployments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 text-xs leading-relaxed text-gray-600 bg-orange-50 border border-orange-100 rounded-xl p-3">
              <AlertCircle className="text-[#FF6B35] shrink-0" size={16} />
              <div>
                <p className="font-bold text-[#1A1A2E] mb-0.5">Budget Locks</p>
                A 10% platform commission fee is added to campaign budgets upon creation. Ensure your escrow balance holds enough funds.
              </div>
            </div>

            <div className="flex gap-3 text-xs leading-relaxed text-gray-600 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <AlertCircle className="text-blue-600 shrink-0" size={16} />
              <div>
                <p className="font-bold text-[#1A1A2E] mb-0.5">Instant Payouts</p>
                Upon participant checkout and selfie approval, funds are disbursed directly to their registered UPI IDs.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Campaign table listing campaigns */}
      <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
        <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-black text-[#1A1A2E]">Active Campaign Deployment</CardTitle>
            <CardDescription className="text-xs text-gray-400 font-semibold">Monitor recruitment, waitlists, and budget locks.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {campaigns.length > 0 ? (
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow>
                  <TableHead className="font-bold text-xs text-gray-400">Campaign Details</TableHead>
                  <TableHead className="font-bold text-xs text-gray-400">Event Date</TableHead>
                  <TableHead className="font-bold text-xs text-gray-400 text-center">Participation Slots</TableHead>
                  <TableHead className="font-bold text-xs text-gray-400">Compensation</TableHead>
                  <TableHead className="font-bold text-xs text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((item) => (
                  <TableRow key={item.id} className="hover:bg-gray-50/50">
                    <TableCell className="py-4">
                      <p className="font-bold text-sm text-[#1A1A2E]">{item.title}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{item.location_name}</p>
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-gray-600">
                      {formatDate(item.event_date)}
                    </TableCell>
                    <TableCell className="text-center font-bold text-sm text-[#1A1A2E]">
                      {item.slots_filled} <span className="text-xs font-medium text-gray-400">/ {item.slots_total}</span>
                    </TableCell>
                    <TableCell className="font-extrabold text-sm text-green-600">
                      ₹{item.payout}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-gray-400 font-bold text-sm">
              No active deployments found. Deploy your first campaign to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
