'use client';

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowLeft, UserCheck, AlertTriangle, Users, Coins, Mail, Phone, ExternalLink, RefreshCw, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

type EventDayPageProps = {
  params: Promise<{ id: string }>;
};

export default function CampaignEventDayPage({ params }: EventDayPageProps) {
  const { id: campaignId } = use(params);

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [confirmedApps, setConfirmedApps] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'checked_in' | 'not_arrived' | 'no_show_risk'>('checked_in');

  // Payout states
  const [releasingPayouts, setReleasingPayouts] = useState(false);
  const [payoutProgress, setPayoutProgress] = useState(0);
  const [payoutSummary, setPayoutSummary] = useState<any | null>(null);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);

  const fetchRosterStatus = React.useCallback(async () => {
    try {
      // 1. Fetch campaign
      const campData = await api.get(`/campaigns/${campaignId}`);
      setCampaign(campData);

      // 2. Fetch confirmed applications
      const { data: apps, error: appsErr } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          user_id,
          user:users (
            id,
            name,
            phone,
            avatar_url,
            reliability_score
          )
        `)
        .eq('campaign_id', campaignId)
        .eq('status', 'confirmed');

      if (appsErr) throw appsErr;
      setConfirmedApps(apps || []);

      // 3. Fetch checkins
      const { data: checks, error: checksErr } = await supabase
        .from('checkins')
        .select('*')
        .eq('campaign_id', campaignId);

      if (checksErr) throw checksErr;
      setCheckins(checks || []);
    } catch (err) {
      console.error('Error fetching event day data:', err);
      toast.error('Failed to reload event day roster');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchRosterStatus();
  }, [fetchRosterStatus]);

  // Real-time updates via Supabase subscription on checkins table
  useEffect(() => {
    const channel = supabase
      .channel(`event-day-checkins-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'checkins',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchRosterStatus();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchRosterStatus]);

  // Helper check: No Show Risk condition
  const isNoShowRisk = () => {
    if (!campaign) return false;
    try {
      const parts = campaign.start_time.split(':');
      const start = new Date(campaign.event_date || campaign.date);
      start.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10) || 0, 0, 0);
      
      const now = new Date();
      const cutoffTime = new Date(start.getTime() + 30 * 60 * 1000); // 30 minutes after start
      return now > cutoffTime;
    } catch {
      return false;
    }
  };

  // Group participants by check-in status
  const checkedInList = confirmedApps.filter(app => checkins.some(c => c.application_id === app.id));
  const notArrivedList = confirmedApps.filter(app => !checkins.some(c => c.application_id === app.id));

  // No-Show Risk represents anyone who hasn't checked in 30 minutes after the scheduled start time
  const noShowRiskList = isNoShowRisk() ? notArrivedList : [];

  const getActiveList = () => {
    if (activeTab === 'checked_in') return checkedInList;
    if (activeTab === 'not_arrived') return notArrivedList;
    return noShowRiskList;
  };

  const getCheckinTime = (appId: string) => {
    const log = checkins.find(c => c.application_id === appId);
    if (!log) return null;
    return new Date(log.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  // Bulk actions
  const handleNotifyNoShows = async () => {
    if (noShowRiskList.length === 0) {
      toast.error('No participants currently match no-show risk criteria');
      return;
    }

    try {
      const targetUserIds = noShowRiskList.map(a => a.user_id).filter(Boolean);
      await api.post(`/campaigns/${campaignId}/broadcast`, {
        target_range: 'selected',
        user_ids: targetUserIds,
        title: '⚠️ Urgent: Attendance Check',
        body: `The event "${campaign.title}" has started. Please proceed to checking in or contact coordinator immediately.`,
      });
      toast.success(`Broadcasting alerts to ${targetUserIds.length} no-show candidates`);
    } catch (err) {
      toast.error('Failed to notify no-show participants');
    }
  };

  const handlePullFromWaitlist = async () => {
    try {
      // Find waitlisted applicants
      const { data: waitlisted, error } = await supabase
        .from('applications')
        .select('id, user_id')
        .eq('campaign_id', campaignId)
        .eq('status', 'waitlisted')
        .order('applied_at', { ascending: true })
        .limit(Math.max(1, noShowRiskList.length));

      if (error) throw error;
      if (!waitlisted || waitlisted.length === 0) {
        toast.error('Waitlist queue is empty');
        return;
      }

      const waitlistIds = waitlisted.map(w => w.id);
      
      // Auto-confirm them
      const { error: confirmError } = await supabase
        .from('applications')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .in('id', waitlistIds);

      if (confirmError) throw confirmError;

      toast.success(`Promoted and confirmed ${waitlistIds.length} users from waitlist`);
      fetchRosterStatus();
    } catch (err) {
      toast.error('Failed to pull from waitlist');
    }
  };

  const handleTriggerReleasePayouts = async () => {
    // Check if payouts have already been registered on checkout
    const { data: pendingPayouts } = await supabase
      .from('payouts')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'pending');

    const totalAmount = (pendingPayouts || []).reduce((sum, p) => sum + Number(p.amount), 0);
    
    setPayoutSummary({
      attended: checkedInList.length,
      noShows: notArrivedList.length,
      amount: totalAmount,
    });
    setShowPayoutDialog(true);
  };

  const handleConfirmReleasePayouts = async () => {
    setShowPayoutDialog(false);
    setReleasingPayouts(true);
    setPayoutProgress(15);

    try {
      // Simulate incremental progress bar loading for high-feedback UI
      const timer1 = setTimeout(() => setPayoutProgress(45), 400);
      const timer2 = setTimeout(() => setPayoutProgress(80), 800);

      const response = await api.post(`/payouts/release-all/${campaignId}`);

      clearTimeout(timer1);
      clearTimeout(timer2);
      setPayoutProgress(100);

      toast.success(`Released payouts! ₹${response.released_amount} disbursed to ${response.count} participants.`);
      fetchRosterStatus();
    } catch (err: any) {
      toast.error(err.message || 'Escrow transfer failed');
    } finally {
      setReleasingPayouts(false);
      setPayoutProgress(0);
      setPayoutSummary(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <p className="text-gray-400 font-bold animate-pulse">Syncing campaign database...</p>
      </div>
    );
  }

  const attendanceRatio = confirmedApps.length > 0 
    ? Math.round((checkedInList.length / confirmedApps.length) * 100) 
    : 0;

  return (
    <div className="space-y-6 relative min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#F1F5F9] pb-5">
        <div className="flex items-center gap-3">
          <Link href={`/campaigns/${campaignId}`} className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight">🔴 Live Event Operations</h1>
            <p className="text-xs text-gray-500 mt-1">Event: <span className="font-semibold text-[#1A1A2E]">{campaign?.title}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchRosterStatus} variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl flex items-center gap-1.5 text-xs">
            <RefreshCw size={12} /> Sync Data
          </Button>
          <Button
            onClick={handleTriggerReleasePayouts}
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
          >
            <Coins size={14} /> Release All Payouts
          </Button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Checked In</p>
              <h3 className="text-2xl font-black text-green-600 pt-0.5">{checkedInList.length}</h3>
            </div>
            <UserCheck size={28} className="text-green-500 bg-green-50 p-1.5 rounded-xl shrink-0" />
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Not Arrived</p>
              <h3 className="text-2xl font-black text-gray-700 pt-0.5">{notArrivedList.length}</h3>
            </div>
            <Users size={28} className="text-gray-400 bg-gray-50 p-1.5 rounded-xl shrink-0" />
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">No-Show Risk</p>
              <h3 className="text-2xl font-black text-red-600 pt-0.5">{noShowRiskList.length}</h3>
            </div>
            <AlertTriangle size={28} className="text-red-500 bg-red-50 p-1.5 rounded-xl shrink-0" />
          </CardContent>
        </Card>

        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Attendance Rate</p>
              <h3 className="text-2xl font-black text-[#1A1A2E] pt-0.5">{attendanceRatio}%</h3>
            </div>
            <div className="text-xs font-black text-blue-600 bg-blue-50 py-1.5 px-2.5 rounded-xl">
              {checkedInList.length}/{confirmedApps.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PAYOUT LOADER OVERLAY */}
      {releasingPayouts && (
        <div className="bg-white/90 border border-gray-100 rounded-2xl p-6 shadow-md items-center text-center space-y-4">
          <p className="font-extrabold text-sm text-[#1A1A2E]">Releasing attendance payouts from escrow...</p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-green-600 h-full transition-all duration-300" style={{ width: `${payoutProgress}%` }} />
          </div>
          <p className="text-xs text-gray-400">{payoutProgress}% complete</p>
        </div>
      )}

      {/* NO SHOW ACTIONS BAR */}
      {noShowRiskList.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-red-50 border border-red-100 rounded-xl p-4 gap-3 text-xs text-red-950">
          <span className="font-bold flex items-center gap-1.5"><AlertTriangle size={14} className="text-red-600 animate-pulse" /> {noShowRiskList.length} participants are overdue (no-show risk)</span>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              onClick={handleNotifyNoShows}
              className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-700 text-white font-bold h-8 px-4 rounded-lg text-xs"
            >
              Notify Overdue Candidates
            </Button>
            <Button
              onClick={handlePullFromWaitlist}
              variant="outline"
              className="flex-1 sm:flex-initial border-red-200 text-red-700 hover:bg-red-100 bg-white font-bold h-8 px-4 rounded-lg text-xs"
            >
              Confirm Waitlisted Replacements
            </Button>
          </div>
        </div>
      )}

      {/* ROSTER TABS AND DETAILED VIEW */}
      <div className="space-y-4">
        <div className="flex border-b border-[#E2E8F0] gap-4">
          <button
            onClick={() => setActiveTab('checked_in')}
            className={`pb-3 text-xs font-black capitalize tracking-wide transition-all border-b-2 -mb-[2px] ${
              activeTab === 'checked_in'
                ? 'border-[#FF6B35] text-[#FF6B35]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Checked In ({checkedInList.length})
          </button>
          <button
            onClick={() => setActiveTab('not_arrived')}
            className={`pb-3 text-xs font-black capitalize tracking-wide transition-all border-b-2 -mb-[2px] ${
              activeTab === 'not_arrived'
                ? 'border-[#FF6B35] text-[#FF6B35]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Not Yet Arrived ({notArrivedList.length})
          </button>
          <button
            onClick={() => setActiveTab('no_show_risk')}
            className={`pb-3 text-xs font-black capitalize tracking-wide transition-all border-b-2 -mb-[2px] ${
              activeTab === 'no_show_risk'
                ? 'border-[#FF6B35] text-[#FF6B35]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            No Show Risk ({noShowRiskList.length})
          </button>
        </div>

        <Card className="border-[#E2E8F0] shadow-sm rounded-2xl bg-white overflow-hidden">
          <Table>
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow>
                <TableHead className="text-xs font-bold text-gray-400">Participant</TableHead>
                <TableHead className="text-xs font-bold text-gray-400">Reliability</TableHead>
                <TableHead className="text-xs font-bold text-gray-400">Status Info</TableHead>
                <TableHead className="text-xs font-bold text-gray-400 text-right">Contact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getActiveList().length > 0 ? (
                getActiveList().map((item) => {
                  const hasCheckedIn = checkins.some(c => c.application_id === item.id);
                  const chkTime = getCheckinTime(item.id);

                  return (
                    <TableRow key={item.id} className="hover:bg-gray-50/40">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-xs text-[#FF6B35] shrink-0">
                            {item.user?.avatar_url ? (
                              <img src={item.user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              item.user?.name?.substring(0, 2).toUpperCase() || 'P'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-[#1A1A2E]">{item.user?.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold">{item.user?.phone}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-orange-50 text-orange-700 border-orange-200 font-bold text-[10px]">
                          {item.user?.reliability_score || 70}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {hasCheckedIn ? (
                          <span className="text-xs font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Checked in at {chkTime}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                            ⚠️ Not yet arrived
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a href={`tel:${item.user?.phone}`} className="h-7 w-7 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 flex items-center justify-center">
                            <Phone size={12} />
                          </a>
                          <a href={`https://wa.me/91${item.user?.phone}`} target="_blank" className="h-7 w-7 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-gray-400 font-bold text-xs">
                    No participants found in this state.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* CONFIRM PAYOUTS DIALOG */}
      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-[#1A1A2E]">Confirm Bulk Payout Release</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Please verify the event summary before releasingsecured funds.
            </DialogDescription>
          </DialogHeader>

          {payoutSummary && (
            <div className="space-y-3 bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl p-4 text-xs font-bold">
              <div className="flex justify-between">
                <span className="text-gray-500">Checked-in Attended</span>
                <span className="text-[#1A1A2E]">{payoutSummary.attended} users</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">No-show absentees</span>
                <span className="text-red-500">{payoutSummary.noShows} users</span>
              </div>
              <div className="border-t border-[#F1F5F9] pt-2 flex justify-between items-baseline">
                <span className="text-[#1A1A2E] uppercase">Total Payouts Released</span>
                <span className="text-lg text-green-600 font-black">₹{payoutSummary.amount}</span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPayoutDialog(false)} className="rounded-xl border-gray-200 text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleConfirmReleasePayouts} className="bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold">
              Release Payouts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
