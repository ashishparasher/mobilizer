'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Calendar, MapPin, Users, Play, Pause, XCircle, MoreVertical, Eye, Copy, Edit2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function CampaignsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const [stats, setStats] = useState({
    active: 0,
    completed: 0,
    draft: 0,
  });

  const loadCampaigns = React.useCallback(async () => {
    try {
      const list = await api.get('/campaigns/my/list');
      setCampaigns(list || []);

      // Calculate statistics
      const active = list.filter((c: any) => c.status === 'active').length;
      const completed = list.filter((c: any) => c.status === 'completed').length;
      const draft = list.filter((c: any) => c.status === 'draft').length;
      setStats({ active, completed, draft });
    } catch (err) {
      console.error('Failed to load campaigner campaigns list:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  // Action status adjust handlers
  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/campaigns/${id}/status`, { status: newStatus });
      toast.success(`Campaign updated to ${newStatus}`);
      loadCampaigns();
    } catch (err: any) {
      toast.error('Failed to adjust campaign status', { description: err.message || 'Escrow verify error.' });
    }
  };

  const handleDuplicate = async (campaign: any) => {
    try {
      const { id, created_at, updated_at, status, slots_filled, slots_waitlist, ...rest } = campaign;
      const duplicatedPayload = {
        ...rest,
        title: `${campaign.title} (Copy)`,
        event_date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], // 2 days in future
        status: 'draft',
      };

      await api.post('/campaigns', duplicatedPayload);
      toast.success('Campaign duplicated as Draft!');
      loadCampaigns();
    } catch (err: any) {
      toast.error('Failed to duplicate campaign', { description: err.message });
    }
  };

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

  // Filters logic
  const filteredCampaigns = campaigns.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header and stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1A1A2E] tracking-tight">My Campaigns</h1>
          <div className="flex gap-3 text-xs font-bold text-gray-500 mt-1">
            <span>{stats.active} Active</span>
            <span>•</span>
            <span>{stats.completed} Completed</span>
            <span>•</span>
            <span>{stats.draft} Drafts</span>
          </div>
        </div>
        
        <Link
          href="/campaigns/new"
          className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl shadow-lg shadow-orange-500/10 text-sm transition-all self-start sm:self-auto"
        >
          <PlusCircle size={16} /> Create Campaign
        </Link>
      </div>

      {/* Filter and Search actions bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex border-b border-[#E2E8F0] gap-4 w-full sm:w-auto">
          {['all', 'active', 'draft', 'completed', 'cancelled'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`pb-2 text-xs font-black capitalize tracking-wide border-b-2 -mb-[2px] transition-all ${
                activeFilter === filter
                  ? 'border-[#FF6B35] text-[#FF6B35]'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
            <Search size={14} />
          </span>
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 border-[#E2E8F0] rounded-xl text-xs"
          />
        </div>
      </div>

      {/* Main Campaign table container */}
      <Card className="border-[#E2E8F0] shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-gray-400 font-bold animate-pulse">Loading deployments...</div>
          ) : filteredCampaigns.length > 0 ? (
            <>
              {/* Desktop view */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-[#F8FAFC]">
                    <TableRow>
                      <TableHead className="font-bold text-xs text-gray-400">Campaign Details</TableHead>
                      <TableHead className="font-bold text-xs text-gray-400">Schedule & Location</TableHead>
                      <TableHead className="font-bold text-xs text-gray-400 text-center">Roster Slots</TableHead>
                      <TableHead className="font-bold text-xs text-gray-400">Compensation</TableHead>
                      <TableHead className="font-bold text-xs text-gray-400">Status</TableHead>
                      <TableHead className="font-bold text-xs text-gray-400 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampaigns.map((item) => {
                      const slotsPercent = Math.min(100, Math.round(((item.slots_filled || 0) / (item.slots_total || 1)) * 100));
                      return (
                        <TableRow key={item.id} className="hover:bg-gray-50/50">
                          <TableCell className="py-4">
                            <Link href={`/campaigns/${item.id}`} className="font-bold text-sm text-[#1A1A2E] hover:underline">
                              {item.title}
                            </Link>
                            <div className="pt-1">
                              <Badge className="bg-orange-50 text-[#FF6B35] border-orange-100 hover:bg-orange-50 font-bold text-[9px] py-0.5">
                                {item.category.replace('_', ' ')}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-semibold text-gray-600">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Calendar size={12} className="text-[#FF6B35]" /> {formatDate(item.event_date)} at {item.start_time?.substring(0,5)}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-gray-400" /> {item.location_name}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs text-[#1A1A2E]">
                            <div className="flex flex-col items-center gap-1 w-24 mx-auto">
                              <div className="flex justify-between w-full text-[10px]">
                                <span>{item.slots_filled} / {item.slots_total}</span>
                                <span>{slotsPercent}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-150 rounded-full overflow-hidden">
                                <div style={{ width: `${slotsPercent}%` }} className="h-full bg-[#FF6B35]" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-extrabold text-sm text-green-600">
                            ₹{item.payout}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(item.status)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                href={`/campaigns/${item.id}`}
                                className="h-7 w-7 rounded-lg border border-[#E2E8F0] hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-[#1A1A2E]"
                              >
                                <Eye size={12} />
                              </Link>
                              
                              {item.status === 'active' && (
                                <Button
                                  onClick={() => handleUpdateStatus(item.id, 'paused')}
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-lg text-gray-400 hover:text-orange-600"
                                >
                                  <Pause size={12} />
                                </Button>
                              )}

                              {item.status === 'paused' && (
                                <Button
                                  onClick={() => handleUpdateStatus(item.id, 'active')}
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-lg text-gray-400 hover:text-green-600"
                                >
                                  <Play size={12} />
                                </Button>
                              )}

                              <Button
                                onClick={() => handleDuplicate(item)}
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 rounded-lg text-gray-400 hover:text-[#FF6B35]"
                              >
                                <Copy size={12} />
                              </Button>

                              {['active', 'paused'].includes(item.status) && (
                                <Button
                                  onClick={() => handleUpdateStatus(item.id, 'cancelled')}
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 rounded-lg text-gray-400 hover:text-red-600"
                                >
                                  <XCircle size={12} />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card view */}
              <div className="md:hidden p-4 space-y-4">
                {filteredCampaigns.map((item) => (
                  <Card key={item.id} className="border border-[#E2E8F0] rounded-xl overflow-hidden p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/campaigns/${item.id}`} className="font-bold text-sm text-[#1A1A2E] hover:underline">
                          {item.title}
                        </Link>
                        <div className="pt-1.5 flex gap-1">
                          <Badge className="bg-orange-50 text-[#FF6B35] border-orange-100 hover:bg-orange-50 font-bold text-[8px] py-0.5">
                            {item.category.replace('_', ' ')}
                          </Badge>
                          {getStatusBadge(item.status)}
                        </div>
                      </div>
                      <span className="font-black text-green-600 text-sm">₹{item.payout}</span>
                    </div>

                    <div className="text-[11px] text-gray-500 font-semibold space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-[#FF6B35]" /> {formatDate(item.event_date)} at {item.start_time?.substring(0,5)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-gray-400" /> {item.location_name}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-[#FF6B35]" /> Slots: {item.slots_filled} / {item.slots_total} confirmed
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-[#F1F5F9]">
                      <Link
                        href={`/campaigns/${item.id}`}
                        className="flex-1 bg-[#1A1A2E] hover:bg-[#2A2A4E] text-white text-[10px] font-bold h-8 rounded-lg inline-flex items-center justify-center transition-colors"
                      >
                        View Ops Center
                      </Link>
                      <Button
                        onClick={() => handleDuplicate(item)}
                        variant="outline"
                        className="border-[#E2E8F0] text-gray-500 hover:bg-gray-50 text-[10px] font-bold h-8 rounded-lg"
                      >
                        Duplicate
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-gray-400 font-bold text-sm">No campaigns found matching targets.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
