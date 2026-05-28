'use client';

import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Users, Coins, Clock, Eye, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface LivePreviewCardProps {
  formData: any;
  matchingEstimate?: number;
  walletBalance?: number;
  onAddFunds?: () => void;
}

export default function LivePreviewCard({
  formData,
  matchingEstimate = 2340,
  walletBalance = 10000,
  onAddFunds,
}: LivePreviewCardProps) {
  // Extract fields
  const {
    title = '',
    category = 'brand_activation',
    description = '',
    event_date = '',
    start_time = '',
    duration = '4hrs',
    location_name = '',
    location_address = '',
    payout = 500,
    slots_total = 10,
    payout_type = 'cash',
    has_punctuality_bonus = false,
    punctuality_bonus_amount = 0,
    has_duration_bonus = false,
    duration_bonus_amount = 0,
    dress_code = '',
    min_age = 16,
    max_age = 80,
    gender = 'Any',
    min_reliability = 70,
  } = formData;

  // Compensation Math
  const basePayout = Number(payout) || 0;
  const numParticipants = Number(slots_total) || 0;
  
  // Calculate potential bonuses per person
  const puncBonus = has_punctuality_bonus ? (Number(punctuality_bonus_amount) || 0) : 0;
  const durBonus = has_duration_bonus ? (Number(duration_bonus_amount) || 0) : 0;
  const totalPayoutPerPerson = basePayout + puncBonus + durBonus;

  const baseBudget = numParticipants * basePayout;
  const bonusesBudget = numParticipants * (puncBonus + durBonus);
  const totalEscrowBase = baseBudget + bonusesBudget;

  const platformFee = totalEscrowBase * 0.08; // 8% platform fee
  const safetyBuffer = totalEscrowBase * 0.10; // 10% buffer
  const totalRequired = totalEscrowBase + platformFee + safetyBuffer;
  const isSufficient = walletBalance >= totalRequired;

  const getCategoryEmoji = (cat: string) => {
    switch (cat) {
      case 'political': return '🗳️';
      case 'wedding': return '💍';
      case 'brand_activation': return '🏷️';
      case 'religious': return '🙏';
      case 'ngo_volunteer': return '🌱';
      case 'influencer_shoot': return '📸';
      case 'survey': return '📋';
      case 'entertainment': return '🎭';
      case 'startup_launch': return '💼';
      case 'emergency_response': return '🚨';
      default: return '⚡';
    }
  };

  const getCategoryLabel = (cat: string) => {
    return cat.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* 1. Live Preview Screen Mock */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
          <Eye size={14} /> Participant Feed Preview
        </h3>
        
        <Card className="border-[#E2E8F0] shadow-md rounded-2xl overflow-hidden bg-white">
          <CardHeader className="p-5 pb-3 bg-[#F8FAFC] border-b border-[#F1F5F9]">
            <div className="flex justify-between items-start gap-2">
              <Badge className="bg-orange-50 text-[#FF6B35] border-orange-100 hover:bg-orange-50 font-bold py-1 px-2.5 rounded-lg text-xs">
                {getCategoryEmoji(category)} {getCategoryLabel(category)}
              </Badge>
              <div className="text-right">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase block">Payout</span>
                <span className="text-lg font-black text-green-600 flex items-center justify-end gap-1">
                  ₹{totalPayoutPerPerson} <span className="text-[10px] text-gray-400 font-normal">/ person</span>
                </span>
              </div>
            </div>
            <CardTitle className="text-base font-extrabold text-[#1A1A2E] leading-tight pt-2">
              {title || 'Untitled Campaign Details'}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs text-gray-600 font-medium">
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="flex items-center gap-2">
                <Calendar className="text-[#FF6B35]" size={14} />
                <span>{event_date ? new Date(event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Date TBD'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-[#FF6B35]" size={14} />
                <span>{start_time || 'Time TBD'} ({duration})</span>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <MapPin className="text-gray-400 shrink-0" size={14} />
                <span className="truncate">{location_name || 'Venue Name TBD'}</span>
              </div>
            </div>

            <div className="border-t border-[#F1F5F9] pt-3">
              <p className="text-[11px] font-bold text-[#1A1A2E] mb-1">Target Participant Criteria</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 font-bold py-0.5 rounded-md text-[10px]">
                  Age: {min_age}-{max_age} yrs
                </Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 font-bold py-0.5 rounded-md text-[10px]">
                  Gender: {gender}
                </Badge>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 font-bold py-0.5 rounded-md text-[10px]">
                  Score: {min_reliability}+
                </Badge>
              </div>
            </div>

            {dress_code && (
              <div className="border-t border-[#F1F5F9] pt-2 text-[10px]">
                <span className="font-bold text-[#1A1A2E]">Dress Code:</span> {dress_code}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 2. Escrow Wallet & Budget Calculator */}
      <Card className="border-[#E2E8F0] shadow-lg rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-[#1A1A2E] text-white p-4">
          <CardTitle className="text-sm font-black flex items-center gap-2">
            <Coins size={16} className="text-[#FF6B35]" /> Escrow Budget Estimator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-5 space-y-4 text-xs font-medium text-gray-500">
          <div className="space-y-2 border-b border-[#F1F5F9] pb-3">
            <div className="flex justify-between">
              <span>Base Escrow Payout ({numParticipants} × ₹{basePayout})</span>
              <span className="font-bold text-[#1A1A2E]">₹{baseBudget.toLocaleString('en-IN')}</span>
            </div>
            
            {(has_punctuality_bonus || has_duration_bonus) && (
              <div className="flex justify-between text-orange-600">
                <span>Simulation Bonuses ({numParticipants} × ₹{puncBonus + durBonus})</span>
                <span className="font-bold">₹{bonusesBudget.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Platform Service Fee (8%)</span>
              <span className="font-bold text-[#1A1A2E]">₹{platformFee.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between">
              <span>Payment Escrow Buffer (10%)</span>
              <span className="font-bold text-[#1A1A2E]">₹{safetyBuffer.toLocaleString('en-IN')}</span>
            </div>
          </div>

          <div className="flex justify-between text-[#1A1A2E] font-black text-sm pt-1">
            <span>Total Escrow Required</span>
            <span className="text-green-600 text-base">₹{totalRequired.toLocaleString('en-IN')}</span>
          </div>

          {/* Wallet Balance Display & Validation */}
          <div className="pt-2 border-t border-[#F1F5F9]">
            <div className="flex justify-between text-[11px] mb-2 font-bold">
              <span>Your Escrow Balance:</span>
              <span className="text-[#1A1A2E]">₹{walletBalance.toLocaleString('en-IN')}</span>
            </div>

            {isSufficient ? (
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-150 rounded-xl p-3 text-[11px] font-bold">
                <CheckCircle2 size={16} className="shrink-0" />
                <span>Sufficient Escrow Balance to launch</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-150 rounded-xl p-3 text-[11px] font-bold">
                  <XCircle size={16} className="shrink-0 mt-0.5" />
                  <span>
                    Insufficient Balance. Add ₹{(totalRequired - walletBalance).toLocaleString('en-IN')} more to proceed with launching.
                  </span>
                </div>
                {onAddFunds && (
                  <Button
                    type="button"
                    onClick={onAddFunds}
                    className="w-full bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl py-4 text-xs shadow-lg shadow-orange-500/10"
                  >
                    Top up Escrow Wallet
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Real-time Audience Reach */}
          <div className="bg-blue-50 border border-blue-100 text-blue-800 rounded-xl p-3 flex items-start gap-2 text-[11px]">
            <Users size={16} className="shrink-0 text-blue-600 mt-0.5" />
            <div>
              <p className="font-extrabold text-[#1A1A2E] mb-0.5">Audience Penetration</p>
              <span>Estimated target participants: <strong className="font-extrabold text-[#1A1A2E]">{matchingEstimate.toLocaleString()}</strong> inside your search radius.</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
