'use client';

import React, { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, Download, Mail, Check, X, Search, User, ShieldAlert, Calendar, Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import BroadcastModal from '@/components/campaign/BroadcastModal';

type ParticipantPageProps = {
  params: Promise<{ id: string }>;
};

export default function CampaignParticipantsPage({ params }: ParticipantPageProps) {
  const { id: campaignId } = use(params);

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Drawer state
  const [selectedParticipant, setSelectedParticipant] = useState<any | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Broadcast Modal State
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [broadcastTargetIds, setBroadcastTargetIds] = useState<string[]>([]);

  const fetchData = React.useCallback(async () => {
    try {
      // 1. Fetch Campaign
      const campData = await api.get(`/campaigns/${campaignId}`);
      setCampaign(campData);

      // 2. Fetch Applications with User detail
      const { data: apps, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          confirmed_at,
          user:users (
            id,
            name,
            phone,
            age,
            gender,
            reliability_score,
            avatar_url,
            city,
            state
          )
        `)
        .eq('campaign_id', campaignId);

      if (error) throw error;
      setParticipants(apps || []);
    } catch (err: any) {
      console.error('Error fetching participants page data:', err);
      toast.error('Failed to load roster data');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Supabase Subscription
  useEffect(() => {
    const channel = supabase
      .channel(`roster-realtime-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchData]);

  // Filtering Logic
  const filteredParticipants = participants.filter((item) => {
    const matchesSearch = item.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.user?.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getReliabilityBadge = (score: number) => {
    let color = 'bg-red-50 text-red-700 border-red-200';
    if (score >= 85) color = 'bg-green-50 text-green-700 border-green-200';
    else if (score >= 70) color = 'bg-orange-50 text-orange-700 border-orange-200';
    return <Badge className={`${color} font-bold text-[10px]`}>{score}%</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Confirmed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending</Badge>;
      case 'waitlisted':
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Waitlist</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };

  // Actions
  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus, confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null })
        .eq('id', applicationId);

      if (error) throw error;
      toast.success(`Application updated to ${newStatus}`);
      fetchData();
      
      // If updating the active drawer participant, sync state
      if (selectedParticipant && selectedParticipant.id === applicationId) {
        setSelectedParticipant((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus, confirmed_at: newStatus === 'confirmed' ? new Date().toISOString() : null })
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`Updated ${selectedIds.length} profiles to ${newStatus}`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error('Bulk update failed');
    }
  };

  // Simple CSV Export
  const exportToCSV = () => {
    if (filteredParticipants.length === 0) {
      toast.error('No participant records to export');
      return;
    }

    const headers = ['Name', 'Phone', 'Age', 'Gender', 'Reliability Score', 'City', 'Status', 'Applied At'];
    const rows = filteredParticipants.map(p => [
      p.user?.name || 'N/A',
      p.user?.phone || 'N/A',
      p.user?.age || 'N/A',
      p.user?.gender || 'N/A',
      p.user?.reliability_score ? `${p.user.reliability_score}%` : 'N/A',
      p.user?.city || 'N/A',
      p.status,
      new Date(p.applied_at).toLocaleDateString('en-IN')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${campaign?.title?.replace(/\s+/g, '_')}_participants.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Roster list exported successfully');
  };

  const handleOpenDrawer = (item: any) => {
    setSelectedParticipant(item);
    setIsDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <p className="text-gray-400 font-bold animate-pulse">Syncing campaign database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 relative min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#F1F5F9] pb-5">
        <div className="flex items-center gap-3">
          <Link href={`/campaigns/${campaignId}`} className="flex items-center justify-center h-10 w-10 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-[#1A1A2E] tracking-tight">Roster Management</h1>
            <p className="text-xs text-gray-500 mt-1">Campaign: <span className="font-semibold text-[#1A1A2E]">{campaign?.title}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={exportToCSV} variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl flex items-center gap-1.5 text-xs">
            <Download size={14} /> Export CSV
          </Button>
          <Button
            onClick={() => {
              setBroadcastTargetIds([]);
              setIsBroadcastOpen(true);
            }}
            className="bg-[#1A1A2E] hover:bg-[#2A2A4E] text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
          >
            <Mail size={14} /> Message All
          </Button>
        </div>
      </div>

      {/* FILTER AND SEARCH BAR */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Status Pills */}
        <div className="flex border-b border-[#E2E8F0] w-full md:w-auto gap-4">
          {['all', 'pending', 'confirmed', 'waitlisted', 'rejected'].map((status) => {
            const count = status === 'all' 
              ? participants.length 
              : participants.filter((p) => p.status === status).length;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`pb-3 text-xs font-black capitalize tracking-wide transition-all border-b-2 -mb-[2px] ${
                  statusFilter === status
                    ? 'border-[#FF6B35] text-[#FF6B35]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {status} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="pl-10 pr-4 py-2 border-gray-200 focus:border-[#FF6B35] focus:ring-[#FF6B35] rounded-xl text-xs"
          />
        </div>
      </div>

      {/* BULK ACTIONS BANNER */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl p-4 text-xs text-orange-950 animate-fadeIn">
          <span className="font-bold">{selectedIds.length} profiles selected for batch operations</span>
          <div className="flex gap-2">
            <Button
              onClick={() => handleBulkAction('confirmed')}
              className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 px-3 rounded-lg text-[10px]"
            >
              Approve Selected
            </Button>
            <Button
              onClick={() => handleBulkAction('rejected')}
              variant="outline"
              className="border-red-200 text-red-700 hover:bg-red-50 font-bold h-8 px-3 rounded-lg text-[10px]"
            >
              Reject Selected
            </Button>
            <Button
              onClick={() => {
                const userIds = participants
                  .filter((p) => selectedIds.includes(p.id))
                  .map((p) => p.user?.id)
                  .filter(Boolean);
                setBroadcastTargetIds(userIds);
                setIsBroadcastOpen(true);
              }}
              className="bg-[#1A1A2E] hover:bg-[#2A2A4E] text-white font-bold h-8 px-3 rounded-lg text-[10px] flex items-center gap-1"
            >
              <Mail size={10} /> Message Selected
            </Button>
          </div>
        </div>
      )}

      {/* PARTICIPANTS TABLE */}
      <Card className="border-[#E2E8F0] shadow-sm rounded-2xl bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-[#F8FAFC]">
            <TableRow>
              <TableHead className="w-12 text-center">
                <input
                  type="checkbox"
                  checked={filteredParticipants.length > 0 && selectedIds.length === filteredParticipants.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredParticipants.map(p => p.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                />
              </TableHead>
              <TableHead className="text-xs font-bold text-gray-400">Participant</TableHead>
              <TableHead className="text-xs font-bold text-gray-400">Reliability</TableHead>
              <TableHead className="text-xs font-bold text-gray-400">Location</TableHead>
              <TableHead className="text-xs font-bold text-gray-400">Status</TableHead>
              <TableHead className="text-xs font-bold text-gray-400">Applied At</TableHead>
              <TableHead className="text-xs font-bold text-gray-400 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50/40 cursor-pointer" onClick={() => handleOpenDrawer(item)}>
                  <TableCell className="text-center py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, item.id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== item.id));
                        }
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                    />
                  </TableCell>
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
                        <p className="font-bold text-xs text-[#1A1A2E]">{item.user?.name || 'Mobilize Participant'}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{item.user?.phone}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getReliabilityBadge(item.user?.reliability_score || 70)}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gray-600">
                    {item.user?.city ? `${item.user.city}, ${item.user.state || ''}` : 'N/A'}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-gray-500">
                    {new Date(item.applied_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => handleUpdateStatus(item.id, 'confirmed')}
                            size="icon"
                            className="h-7 w-7 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-200"
                          >
                            <Check size={12} />
                          </Button>
                          <Button
                            onClick={() => handleUpdateStatus(item.id, 'rejected')}
                            size="icon"
                            className="h-7 w-7 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                          >
                            <X size={12} />
                          </Button>
                        </>
                      )}
                      
                      <Button
                        onClick={() => {
                          setBroadcastTargetIds([item.user?.id]);
                          setIsBroadcastOpen(true);
                        }}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-gray-400 hover:text-[#FF6B35]"
                      >
                        <Mail size={12} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-gray-400 font-bold text-xs">
                  No participants matched the filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* PROFILE SLIDE-IN DRAWER */}
      {isDrawerOpen && selectedParticipant && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay background */}
          <div className="absolute inset-0 bg-black/40 transition-opacity" onClick={() => setIsDrawerOpen(false)} />
          
          {/* Drawer sheet */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-6 animate-slideInRight">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-4 mb-6">
              <h2 className="text-base font-black text-[#1A1A2E]">Participant Profile</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500">
                <X size={18} />
              </button>
            </div>

            {/* Profile Avatar and Main Card */}
            <div className="flex flex-col items-center text-center space-y-3 mb-6">
              <div className="h-20 w-20 rounded-full bg-orange-100 flex items-center justify-center font-extrabold text-2xl text-[#FF6B35] shadow-inner">
                {selectedParticipant.user?.avatar_url ? (
                  <img src={selectedParticipant.user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                ) : (
                  selectedParticipant.user?.name?.substring(0, 2).toUpperCase() || 'P'
                )}
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-[#1A1A2E]">{selectedParticipant.user?.name}</h3>
                <p className="text-xs text-gray-400 font-bold">{selectedParticipant.user?.phone}</p>
                <div className="mt-2">{getStatusBadge(selectedParticipant.status)}</div>
              </div>
            </div>

            {/* Profile Details List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold uppercase">Reliability Score</span>
                  {getReliabilityBadge(selectedParticipant.user?.reliability_score || 70)}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold uppercase">Age / Gender</span>
                  <span className="text-[#1A1A2E] font-bold capitalize">{selectedParticipant.user?.age || 'N/A'} yrs / {selectedParticipant.user?.gender || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 font-bold uppercase">Region</span>
                  <span className="text-[#1A1A2E] font-bold">{selectedParticipant.user?.city ? `${selectedParticipant.user.city}, ${selectedParticipant.user.state || ''}` : 'N/A'}</span>
                </div>
              </div>

              {/* Event History / Reputation */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-[#1A1A2E] uppercase tracking-wider">Reputation & Experience</h4>
                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1"><Calendar size={13} /> Completed Events</span>
                    <span className="font-extrabold text-[#1A1A2E]">12 events</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1"><Star size={13} /> Avg Rating Received</span>
                    <span className="font-extrabold text-yellow-600 flex items-center gap-0.5">4.8 <Star size={10} className="fill-yellow-500" /></span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-semibold flex items-center gap-1"><MessageSquare size={13} /> Organizer Reviews</span>
                    <span className="font-extrabold text-blue-600 underline cursor-pointer">View 5 reviews</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t border-[#F1F5F9] pt-4 mt-6 flex gap-2">
              {selectedParticipant.status === 'pending' && (
                <>
                  <Button
                    onClick={() => handleUpdateStatus(selectedParticipant.id, 'confirmed')}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl py-5 text-xs"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleUpdateStatus(selectedParticipant.id, 'rejected')}
                    variant="outline"
                    className="flex-1 border-red-200 text-red-700 hover:bg-red-50 font-bold rounded-xl py-5 text-xs"
                  >
                    Reject
                  </Button>
                </>
              )}
              {selectedParticipant.status === 'confirmed' && (
                <Button
                  onClick={() => handleUpdateStatus(selectedParticipant.id, 'pending')}
                  variant="outline"
                  className="flex-1 border-gray-200 text-gray-500 hover:bg-gray-50 font-bold rounded-xl py-5 text-xs"
                >
                  Move to Pending
                </Button>
              )}
              <Button
                onClick={() => {
                  setBroadcastTargetIds([selectedParticipant.user?.id]);
                  setIsBroadcastOpen(true);
                  setIsDrawerOpen(false);
                }}
                className="bg-[#1A1A2E] hover:bg-[#2A2A4E] text-white font-bold rounded-xl py-5 text-xs flex items-center justify-center gap-1"
                style={{ flex: selectedParticipant.status === 'confirmed' ? 1 : 'unset' }}
              >
                <Mail size={14} /> Message
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Broadcast Message Modal */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => {
          setIsBroadcastOpen(false);
          setBroadcastTargetIds([]);
        }}
        campaignId={campaignId}
        targetUserIds={broadcastTargetIds}
      />
    </div>
  );
}
