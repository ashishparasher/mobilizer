'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Eye, Shield, CalendarDays, Zap } from 'lucide-react';

interface StepFourProps {
  form: UseFormReturn<any>;
}

export default function StepFour({ form }: StepFourProps) {
  const { register, watch, setValue } = form;

  const visibilityRadius = watch('visibility_radius') || '10km';
  const campaignType = watch('campaign_type') || 'public';
  const mobilizationMode = watch('mobilization_mode') || 'scheduled';
  const offerSurge = watch('offer_surge') || false;
  const surgeMultiplier = watch('surge_multiplier') || '1.5x';
  const allowWaitlist = watch('allow_waitlist') || true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-[#1A1A2E]">Step 4: Visibility & Dispatch Mode</h2>
        <p className="text-xs text-gray-500 font-medium">Configure radius limits, mobilization options, surge triggers, and waitlists.</p>
      </div>

      {/* Visibility Radius */}
      <div className="space-y-1.5">
        <Label htmlFor="radius" className="text-xs font-extrabold text-[#1A1A2E]">Visibility Radius</Label>
        <Select value={visibilityRadius} onValueChange={(val) => setValue('visibility_radius', val)}>
          <SelectTrigger className="border-[#E2E8F0] rounded-xl focus:ring-[#FF6B35]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2km">2 km (Hyper-local)</SelectItem>
            <SelectItem value="5km">5 km</SelectItem>
            <SelectItem value="10km">10 km (City area)</SelectItem>
            <SelectItem value="25km">25 km (City-wide)</SelectItem>
            <SelectItem value="50km">50 km</SelectItem>
            <SelectItem value="100km">100 km</SelectItem>
            <SelectItem value="state-wide">State-wide</SelectItem>
            <SelectItem value="national">National</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Campaign Type (Public vs Private) */}
      <div className="space-y-2.5">
        <Label className="text-xs font-extrabold text-[#1A1A2E]">Listing Privacy</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue('campaign_type', 'public')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
              campaignType === 'public'
                ? 'bg-orange-50 border-orange-200 text-[#FF6B35] shadow-sm'
                : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Eye size={20} className="mb-1.5 shrink-0" />
            <span className="text-xs font-extrabold block">🌐 Public</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1">Listed openly in feed for search</span>
          </button>

          <button
            type="button"
            onClick={() => setValue('campaign_type', 'private')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
              campaignType === 'private'
                ? 'bg-orange-50 border-orange-200 text-[#FF6B35] shadow-sm'
                : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Shield size={20} className="mb-1.5 shrink-0" />
            <span className="text-xs font-extrabold block">🔒 Private</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1">Hidden from feed, invite only</span>
          </button>
        </div>
      </div>

      {/* Mobilization Mode (Scheduled vs Instant) */}
      <div className="space-y-3">
        <Label className="text-xs font-extrabold text-[#1A1A2E]">Mobilization Dispatch Mode</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue('mobilization_mode', 'scheduled')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
              mobilizationMode === 'scheduled'
                ? 'bg-orange-50 border-orange-200 text-[#FF6B35] shadow-sm'
                : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
            }`}
          >
            <CalendarDays size={20} className="mb-1.5 shrink-0" />
            <span className="text-xs font-extrabold block">📅 Scheduled</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1">Apply in advance, curate roster</span>
          </button>

          <button
            type="button"
            onClick={() => setValue('mobilization_mode', 'instant')}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl border text-center transition-all ${
              mobilizationMode === 'instant'
                ? 'bg-orange-50 border-orange-200 text-[#FF6B35] shadow-sm'
                : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Zap size={20} className="mb-1.5 shrink-0" />
            <span className="text-xs font-extrabold block">⚡ Instant Blast</span>
            <span className="text-[10px] text-gray-400 font-medium mt-1">Urgent notification to all online</span>
          </button>
        </div>

        {/* Surge pricing options */}
        {mobilizationMode === 'instant' && (
          <div className="border border-orange-100 bg-orange-50/50 p-4 rounded-2xl space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="offer_surge"
                  type="checkbox"
                  {...register('offer_surge')}
                  className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                />
                <Label htmlFor="offer_surge" className="text-xs font-extrabold text-[#1A1A2E] cursor-pointer">Offer Instant Surge Payout?</Label>
              </div>
              <Badge className="bg-orange-600 text-white font-bold text-[10px]">Surge Available</Badge>
            </div>
            
            {offerSurge && (
              <div className="space-y-2 pl-6">
                <span className="text-[10px] text-gray-400 font-bold block mb-1">Select Multiplier Surge Rate</span>
                <div className="grid grid-cols-3 gap-2">
                  {['1.5x', '2x', '2.5x'].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setValue('surge_multiplier', mult)}
                      className={`text-xs font-bold py-2 rounded-lg border transition-all text-center ${
                        surgeMultiplier === mult
                          ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]'
                          : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {mult}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Waitlist Settings */}
      <div className="space-y-4 border border-[#E2E8F0] p-4 bg-[#F8FAFC] rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              id="allow_waitlist"
              type="checkbox"
              {...register('allow_waitlist')}
              className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
            />
            <Label htmlFor="allow_waitlist" className="text-xs font-extrabold text-[#1A1A2E] cursor-pointer">Enable Waitlist Roster?</Label>
          </div>
        </div>

        {allowWaitlist && (
          <div className="space-y-1.5 pl-6">
            <Label htmlFor="max_waitlist" className="text-xs font-extrabold text-[#1A1A2E]">Max Waitlist Size</Label>
            <Input
              id="max_waitlist"
              type="number"
              min="0"
              placeholder="e.g. 5"
              className="border-[#E2E8F0] bg-white focus-visible:ring-[#FF6B35] rounded-xl text-xs font-bold h-9"
              {...register('max_waitlist', { min: 0 })}
            />
            <p className="text-[10px] text-gray-400 font-semibold italic">
              Roster matches waitlist capacity if slots are filled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
