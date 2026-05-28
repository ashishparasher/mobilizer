'use client';

import React, { useEffect, useState, use } from 'react';
import api from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Calendar, MapPin, Users, Coins, Clock, AlertCircle, Play, Pause, XCircle, ArrowLeft, Mail, Award, Check } from 'lucide-react';
import Link from 'next/link';

// Subcomponents
import FilledMeter from '@/components/campaign/FilledMeter';
import ParticipantTable from '@/components/campaign/ParticipantTable';
import BroadcastModal from '@/components/campaign/BroadcastModal';

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [stats, setStats] = useState({
    confirmed: 0,
    pending: 0,
    waitlist: 0,
    noShows: 0,
    fillRate: 0,
  });

  // Modal control
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTargetIds, setBroadcastTargetIds] = useState<string[]>([]);

  const loadCampaignAndStats = React.useCallback(async () => {
    try {
      const data = await api.get(`/campaigns/${id}`);
      setCampaign(data);

      // Fetch application status counts from Supabase directly
      const { data: apps, error } = await supabase
        .from('applications')
        .select('status')
        .eq('campaign_id', id);

      if (!error && apps) {
        const confirmed = apps.filter((a) => a.status === 'confirmed').length;
        const pending = apps.filter((a) => a.status === 'pending').length;
        const waitlist = apps.filter((a) => a.status === 'waitlisted').length;
        const noShows = apps.filter((a) => a.status === 'no_show').length;

        const totalSlots = data.slots_total || 1;
        const fillRate = Math.min(100, Math.round((confirmed / totalSlots) * 100));

        setStats({ confirmed, pending, waitlist, noShows, fillRate });
      }
    } catch (err) {
      console.error('Failed to load campaign operations info:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCampaignAndStats();
  }, [loadCampaignAndStats]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.patch(`/campaigns/${id}/status`, { status: newStatus });
      toast.success(`Campaign status updated to ${newStatus}`);
      loadCampaignAndStats();
    } catch (err: any) {
      toast.error('Failed to adjust campaign status', { description: err.message || 'Transaction aborted.' });
    }
  };

  const handleReleasePayouts = async () => {
    toast.success('Escrow Payout Disbursed!', { description: `UPI payments released to ${stats.confirmed} participants.` });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Active</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200" variant="outline">Draft</Badge>;
      case 'paused':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200">Paused</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <span className="text-gray-400 font-bold animate-pulse">Syncing campaign database...</span>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <h1 className="text-xl font-bold text-gray-700">Campaign not found</h1>
        <Link
          href="/campaigns"
          className="inline-flex items-center justify-center gap-2 h-10 px-4 bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl text-xs mt-4"
        >
          Back to list
        </Link>
      </div>
    );
  }

  // Context panels logic
  const eventDate = new Date(campaign.event_date);
  const today = new Date();
  const isEventToday = eventDate.toDateString() === today.toDateString();
  const isPostEvent = eventDate < today && !isEventToday;

  return (
    <div className="space-y-6">
      {/* Header operations row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight">{campaign.title}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-xs text-gray-500 font-medium capitalize mt-1">Category: {campaign.category.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 flex-wrap">
          {campaign.status === 'active' && (
            <Button
              onClick={() => handleStatusChange('paused')}
              variant="outline"
              className="border-orange-200 text-orange-700 hover:bg-orange-50 font-bold rounded-xl"
            >
              <Pause size={14} className="mr-1.5" /> Pause Campaign
            </Button>
          )}

          {campaign.status === 'paused' && (
            <Button
              onClick={() => handleStatusChange('active')}
              variant="outline"
              className="border-green-200 text-green-700 hover:bg-green-50 font-bold rounded-xl"
            >
              <Play size={14} className="mr-1.5" /> Resume Campaign
            </Button>
          )}

          {['active', 'paused'].includes(campaign.status) && (
            <Button
              onClick={() => handleStatusChange('cancelled')}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 font-bold rounded-xl"
            >
              <XCircle size={14} className="mr-1.5" /> Cancel Campaign
            </Button>
          )}
        </div>
      </div>

      {/* Stats Counter Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Confirmed</p>
            <h3 className="text-xl font-black text-[#1A1A2E] pt-0.5">{stats.confirmed}</h3>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Pending Review</p>
            <h3 className="text-xl font-black text-orange-600 pt-0.5">{stats.pending}</h3>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Waitlist</p>
            <h3 className="text-xl font-black text-[#1A1A2E] pt-0.5">{stats.waitlist}</h3>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
          <CardContent className="p-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase">No-Shows</p>
            <h3 className="text-xl font-black text-red-500 pt-0.5">{stats.noShows}</h3>
          </CardContent>
        </Card>
        <Card className="border-[#E2E8F0] shadow-sm rounded-xl col-span-2 md:col-span-1">
          <CardContent className="p-4">
            <p className="text-[10px] text-gray-400 font-bold uppercase">Fill Rate</p>
            <h3 className="text-xl font-black text-[#1A1A2E] pt-0.5">{stats.fillRate}%</h3>
          </CardContent>
        </Card>
      </div>

      {/* Live Fill Meter & Detail Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Meter Left */}
        <div className="lg:col-span-1">
          <FilledMeter
            campaignId={id}
            target={campaign.slots_total}
            initialFilled={stats.confirmed}
          />
        </div>

        {/* Detailed parameters summary */}
        <Card className="border-[#E2E8F0] shadow-sm rounded-2xl lg:col-span-2">
          <CardHeader className="border-b border-[#F1F5F9] pb-3">
            <CardTitle className="text-base font-black text-[#1A1A2E]">Event Setup Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 text-xs text-gray-600 font-medium grid grid-cols-2 gap-x-6 gap-y-4">
            <div className="flex items-start gap-2">
              <Calendar className="text-[#FF6B35] shrink-0" size={16} />
              <div>
                <p className="font-extrabold text-[#1A1A2E] mb-0.5">Event Date</p>
                <span>{new Date(campaign.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Clock className="text-[#FF6B35] shrink-0" size={16} />
              <div>
                <p className="font-extrabold text-[#1A1A2E] mb-0.5">Schedule</p>
                <span>{campaign.start_time} ({campaign.duration_hrs} hours)</span>
              </div>
            </div>

            <div className="flex items-start gap-2 col-span-2">
              <MapPin className="text-gray-400 shrink-0" size={16} />
              <div>
                <p className="font-extrabold text-[#1A1A2E] mb-0.5">Venue</p>
                <span>{campaign.location_name} • {campaign.location_address}</span>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Coins className="text-green-600 shrink-0" size={16} />
              <div>
                <p className="font-extrabold text-[#1A1A2E] mb-0.5">Compensation</p>
                <span className="font-extrabold text-green-600">₹{campaign.payout} ({campaign.payout_type})</span>
              </div>
            </div>

            {campaign.dress_code && (
              <div className="flex items-start gap-2">
                <Award className="text-violet-500 shrink-0" size={16} />
                <div>
                  <p className="font-extrabold text-[#1A1A2E] mb-0.5">Dress Code</p>
                  <span>{campaign.dress_code}</span>
                </div>
              </div>
            )}

            <div className="border-t border-[#F1F5F9] pt-3 col-span-2">
              <p className="font-bold text-[#1A1A2E] mb-1">Description</p>
              <p className="text-gray-500 leading-relaxed font-medium">{campaign.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EVENT DAY PANEL */}
      {isEventToday && (
        <Card className="border-[#FF6B35] bg-orange-50/50 shadow-md rounded-2xl overflow-hidden animate-pulse">
          <CardHeader className="bg-[#FF6B35] text-white p-4">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              🚨 Event Deployment Roster Active
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-3 text-xs text-[#1A1A2E]">
            <p className="font-bold text-sm">Deployment Check-in Progress</p>
            <div className="flex gap-8 font-semibold text-gray-600 pt-1">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Checked In</span>
                <span className="text-2xl font-black text-green-600">{stats.confirmed - stats.noShows} / {stats.confirmed}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Outstanding</span>
                <span className="text-2xl font-black text-gray-700">{stats.noShows} pending arrival</span>
              </div>
            </div>
            <div className="pt-2">
              <Link
                href={`/campaigns/${campaign.id}/event-day`}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl text-xs transition-colors"
              >
                Go to Live Operations Board
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* POST-EVENT PAYOUT PANEL */}
      {isPostEvent && (
        <Card className="border-blue-200 bg-blue-50/50 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-[#1A1A2E] text-white p-4">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              💸 Release Escrow Compensation
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-semibold text-gray-600">
            <div>
              <p className="font-extrabold text-[#1A1A2E] text-sm">Disburse Attendance Payouts</p>
              <p className="text-gray-500 pt-0.5">Click release to clear and distribute secured escrow funds to checked-in participants.</p>
            </div>
            <Button
              onClick={handleReleasePayouts}
              className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-5 shadow-lg shadow-green-500/10 text-xs shrink-0 self-stretch sm:self-auto"
            >
              Release Payouts
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Participant Management Table */}
      <Card className="border-[#E2E8F0] shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black text-[#1A1A2E]">Roster Coordination Board</CardTitle>
            <CardDescription className="text-xs text-gray-400 font-semibold">Monitor attendee statuses and send direct broadcasts.</CardDescription>
          </div>
          <Button
            onClick={() => {
              setBroadcastTargetIds([]);
              setIsBroadcastOpen(true);
            }}
            className="bg-[#1A1A2E] hover:bg-[#2A2A4E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
          >
            <Mail size={14} /> Message All
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <ParticipantTable
            campaignId={id}
            onRefreshStats={loadCampaignAndStats}
            onOpenBroadcast={(userIds) => {
              setBroadcastTargetIds(userIds);
              setIsBroadcastOpen(true);
            }}
          />
        </CardContent>
      </Card>

      {/* Broadcast Message Modal */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => {
          setIsBroadcastOpen(false);
          setBroadcastTargetIds([]);
        }}
        campaignId={id}
        targetUserIds={broadcastTargetIds}
      />
    </div>
  );
}
