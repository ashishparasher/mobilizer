'use client';

import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Check, X, Mail, UserMinus, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

interface ParticipantTableProps {
  campaignId: string;
  onRefreshStats?: () => void;
  onOpenBroadcast?: (targetIds: string[]) => void;
}

export default function ParticipantTable({
  campaignId,
  onRefreshStats,
  onOpenBroadcast,
}: ParticipantTableProps) {
  const [activeTab, setActiveTab] = useState<'confirmed' | 'pending' | 'waitlisted' | 'no_show'>('pending');
  const [loading, setLoading] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchParticipants = React.useCallback(async () => {
    setLoading(true);
    try {
      // Fetch applications for this campaign
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          applied_at,
          user:users (
            id,
            name,
            phone,
            reliability_score,
            avatar_url
          )
        `)
        .eq('campaign_id', campaignId);

      if (error) throw error;
      setParticipants(data || []);
    } catch (err: any) {
      console.error('Error fetching participants:', err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Set up real-time subscription for applications updates
  useEffect(() => {
    const channel = supabase
      .channel(`campaign-participants-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `campaign_id=eq.${campaignId}`,
        },
        () => {
          fetchParticipants();
          if (onRefreshStats) onRefreshStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, fetchParticipants, onRefreshStats]);

  // Filter based on active tab
  const filtered = participants.filter((p) => {
    if (activeTab === 'confirmed') return p.status === 'confirmed';
    if (activeTab === 'pending') return p.status === 'pending';
    if (activeTab === 'waitlisted') return p.status === 'waitlisted';
    return p.status === 'no_show';
  });

  const getReliabilityBadge = (score: number) => {
    let color = 'bg-red-50 text-red-700 border-red-200';
    if (score >= 85) color = 'bg-green-50 text-green-700 border-green-200';
    else if (score >= 70) color = 'bg-orange-50 text-orange-700 border-orange-200';
    return <Badge className={`${color} font-bold text-[10px]`}>{score}%</Badge>;
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diff = new Date().getTime() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `${mins}m ago`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `${hrs}h ago`;
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    } catch {
      return '';
    }
  };

  // Row Selection logic
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filtered.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  // Status Action Handlers
  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);

      if (error) throw error;
      toast.success(`Application updated to ${newStatus}`);
      fetchParticipants();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      toast.error('Failed to update application');
    }
  };

  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .in('id', selectedIds);

      if (error) throw error;
      toast.success(`Updated ${selectedIds.length} profiles to ${newStatus}`);
      setSelectedIds([]);
      fetchParticipants();
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      toast.error('Bulk update failed');
    }
  };

  const handleMessageSelected = () => {
    if (selectedIds.length === 0) {
      toast.error('No participants selected');
      return;
    }
    // Map selected application IDs to user IDs
    const userIds = participants
      .filter((p) => selectedIds.includes(p.id))
      .map((p) => p.user?.id)
      .filter(Boolean);

    if (onOpenBroadcast) {
      onOpenBroadcast(userIds);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs Row */}
      <div className="flex border-b border-[#E2E8F0] gap-4">
        {(['pending', 'confirmed', 'waitlisted', 'no_show'] as const).map((tab) => {
          const count = participants.filter((p) => {
            if (tab === 'confirmed') return p.status === 'confirmed';
            if (tab === 'pending') return p.status === 'pending';
            if (tab === 'waitlisted') return p.status === 'waitlisted';
            return p.status === 'no_show';
          }).length;

          return (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSelectedIds([]);
              }}
              className={`pb-3 text-xs font-black capitalize tracking-wide transition-all border-b-2 -mb-[2px] ${
                activeTab === tab
                  ? 'border-[#FF6B35] text-[#FF6B35]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.replace('_', ' ')} ({count})
            </button>
          );
        })}
      </div>

      {/* Bulk Actions Panel */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-100 rounded-xl p-3.5 text-xs text-orange-900 animate-fadeIn">
          <span className="font-bold">{selectedIds.length} participants selected</span>
          <div className="flex gap-2">
            {activeTab === 'pending' && (
              <>
                <Button
                  onClick={() => handleBulkAction('confirmed')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold h-8 px-3 rounded-lg text-[10px]"
                >
                  Confirm Selected
                </Button>
                <Button
                  onClick={() => handleBulkAction('rejected')}
                  variant="outline"
                  className="border-red-200 text-red-700 hover:bg-red-50 font-bold h-8 px-3 rounded-lg text-[10px]"
                >
                  Reject Selected
                </Button>
              </>
            )}
            <Button
              onClick={handleMessageSelected}
              className="bg-[#1A1A2E] hover:bg-[#2A2A4E] text-white font-bold h-8 px-3 rounded-lg text-[10px] flex items-center gap-1"
            >
              <Mail size={10} /> Message Selected
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="border border-[#E2E8F0] rounded-2xl overflow-hidden bg-white">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
            <Loader2 className="animate-spin text-[#FF6B35] h-6 w-6" />
            <span className="text-xs font-bold text-gray-400">Syncing database changes...</span>
          </div>
        ) : filtered.length > 0 ? (
          <Table>
            <TableHeader className="bg-[#F8FAFC]">
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                  />
                </TableHead>
                <TableHead className="text-xs font-bold text-gray-400">Participant</TableHead>
                <TableHead className="text-xs font-bold text-gray-400">Reliability</TableHead>
                <TableHead className="text-xs font-bold text-gray-400">Proximity</TableHead>
                <TableHead className="text-xs font-bold text-gray-400">Applied At</TableHead>
                <TableHead className="text-xs font-bold text-gray-400 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <TableRow key={item.id} className="hover:bg-gray-50/30">
                  <TableCell className="text-center py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-xs text-[#FF6B35]">
                        {item.user?.avatar_url ? (
                          <img src={item.user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          item.user?.name?.substring(0, 2).toUpperCase() || 'P'
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-xs text-[#1A1A2E]">{item.user?.name || 'Mobilize User'}</p>
                        <p className="text-[9px] text-gray-400 font-bold">{item.user?.phone}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getReliabilityBadge(item.user?.reliability_score || 70)}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-gray-600">
                    ~3.5 km
                  </TableCell>
                  <TableCell className="text-xs font-semibold text-gray-500">
                    {timeAgo(item.applied_at)}
                  </TableCell>
                  <TableCell className="text-right">
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
                      
                      {item.status === 'confirmed' && (
                        <Button
                          onClick={() => handleUpdateStatus(item.id, 'pending')}
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <UserMinus size={12} />
                        </Button>
                      )}

                      <Button
                        onClick={() => onOpenBroadcast ? onOpenBroadcast([item.user?.id]) : null}
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-gray-400 hover:text-[#FF6B35]"
                      >
                        <Mail size={12} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-12 text-center text-gray-400 font-bold text-xs">
            No participants in this roster state.
          </div>
        )}
      </div>
    </div>
  );
}
