'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface StepFiveProps {
  form: UseFormReturn<any>;
  isVerified?: boolean;
  onJumpToStep: (step: number) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

export default function StepFive({
  form,
  isVerified = true,
  onJumpToStep,
  onSaveDraft,
  onSubmit,
  loading = false,
}: StepFiveProps) {
  const { watch } = form;

  // Gather values
  const values = watch();
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
    min_age = 18,
    max_age = 35,
    gender = 'Any',
    min_reliability = 70,
    languages = [],
    interests = [],
    education = 'Any',
    visibility_radius = '10km',
    campaign_type = 'public',
    mobilization_mode = 'scheduled',
    offer_surge = false,
    surge_multiplier = '1.5x',
    allow_waitlist = true,
    max_waitlist = 2,
    has_punctuality_bonus = false,
    punctuality_bonus_amount = 0,
    has_duration_bonus = false,
    duration_bonus_amount = 0,
  } = values;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-[#1A1A2E]">Step 5: Review & Deploy</h2>
        <p className="text-xs text-gray-500 font-medium">Verify your configuration details before placing escrow commitments.</p>
      </div>

      <div className="space-y-4 text-xs font-semibold text-gray-600">
        
        {/* Step 1 Review */}
        <div className="border border-[#E2E8F0] bg-white rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-2">
            <h3 className="font-extrabold text-sm text-[#1A1A2E]">1. Event Schedule & Venue</h3>
            <button
              type="button"
              onClick={() => onJumpToStep(1)}
              className="text-[#FF6B35] font-extrabold text-[10px] uppercase hover:underline"
            >
              Edit Section
            </button>
          </div>
          <div className="grid grid-cols-3 gap-y-1.5 pt-1">
            <span className="text-gray-400">Campaign Title</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold">{title || 'Untitled'}</span>
            
            <span className="text-gray-400">Category</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold capitalize">{category.replace('_', ' ')}</span>

            <span className="text-gray-400">Schedule</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold">
              {formatDate(event_date)} at {start_time} ({duration})
            </span>

            <span className="text-gray-400">Venue Location</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold">
              {location_name} ({location_address})
            </span>
          </div>
        </div>

        {/* Step 2 Review */}
        <div className="border border-[#E2E8F0] bg-white rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-2">
            <h3 className="font-extrabold text-sm text-[#1A1A2E]">2. Criteria Filters</h3>
            <button
              type="button"
              onClick={() => onJumpToStep(2)}
              className="text-[#FF6B35] font-extrabold text-[10px] uppercase hover:underline"
            >
              Edit Section
            </button>
          </div>
          <div className="grid grid-cols-3 gap-y-1.5 pt-1">
            <span className="text-gray-400">Demographics</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold">
              Age {min_age}-{max_age} yrs • Gender: {gender}
            </span>

            <span className="text-gray-400">Spoken Languages</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold">
              {languages.length > 0 ? languages.join(', ') : 'Open to all'}
            </span>

            <span className="text-gray-400">Reliability Target</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold">
              Min score: {min_reliability}% or higher
            </span>

            {education !== 'Any' && (
              <>
                <span className="text-gray-400">Education level</span>
                <span className="col-span-2 text-[#1A1A2E] font-bold">{education}</span>
              </>
            )}
          </div>
        </div>

        {/* Step 3 Review */}
        <div className="border border-[#E2E8F0] bg-white rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-2">
            <h3 className="font-extrabold text-sm text-[#1A1A2E]">3. Compensation Payout</h3>
            <button
              type="button"
              onClick={() => onJumpToStep(3)}
              className="text-[#FF6B35] font-extrabold text-[10px] uppercase hover:underline"
            >
              Edit Section
            </button>
          </div>
          <div className="grid grid-cols-3 gap-y-1.5 pt-1">
            <span className="text-gray-400">Target Size</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold">{slots_total} slots</span>

            <span className="text-gray-400">Compensation</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold text-green-600">
              ₹{payout} per person ({payout_type})
            </span>

            {(has_punctuality_bonus || has_duration_bonus) && (
              <>
                <span className="text-gray-400">Extra Bonuses</span>
                <span className="col-span-2 text-[#1A1A2E] font-bold">
                  {has_punctuality_bonus && `Punctuality (+₹${punctuality_bonus_amount}) `}
                  {has_duration_bonus && `Duration (+₹${duration_bonus_amount})`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Step 4 Review */}
        <div className="border border-[#E2E8F0] bg-white rounded-2xl p-4 space-y-2">
          <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-2">
            <h3 className="font-extrabold text-sm text-[#1A1A2E]">4. Visibility & Modes</h3>
            <button
              type="button"
              onClick={() => onJumpToStep(4)}
              className="text-[#FF6B35] font-extrabold text-[10px] uppercase hover:underline"
            >
              Edit Section
            </button>
          </div>
          <div className="grid grid-cols-3 gap-y-1.5 pt-1">
            <span className="text-gray-400">Privacy Scope</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold capitalize">{campaign_type} listing</span>

            <span className="text-gray-400">Dispatch Mode</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold capitalize">
              {mobilization_mode} {offer_surge && `(Surge: ${surge_multiplier})`}
            </span>

            <span className="text-gray-400">Waitlist Setup</span>
            <span className="col-span-2 text-[#1A1A2E] font-bold">
              {allow_waitlist ? `Enabled (Max size: ${max_waitlist})` : 'Disabled'}
            </span>
          </div>
        </div>

      </div>

      {/* Verification alerts */}
      <div className="pt-2">
        {isVerified ? (
          <div className="flex items-start gap-2.5 bg-green-50 border border-green-200 text-green-800 rounded-xl p-3.5 text-[11px] font-bold">
            <ShieldCheck size={18} className="shrink-0 text-green-600 mt-0.5" />
            <div>
              <p className="font-extrabold text-[#1A1A2E] mb-0.5">Verified Profile Active</p>
              By launching, your campaign will go active instantly in participant feeds.
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-3.5 text-[11px] font-bold">
            <AlertTriangle size={18} className="shrink-0 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-extrabold text-[#1A1A2E] mb-0.5">Profile Review Pending</p>
              As an unverified campaigner, your event must pass a 24-hour safety review before listing.
            </div>
          </div>
        )}
      </div>

      {/* Launch Actions */}
      <div className="grid grid-cols-3 gap-3 border-t border-[#F1F5F9] pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={loading}
          className="col-span-1 rounded-xl border-[#E2E8F0] font-bold"
        >
          Save Draft
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          className="col-span-2 bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl shadow-lg shadow-orange-500/10 py-5"
        >
          {loading ? 'Processing Escrow...' : isVerified ? 'Launch Now 🚀' : 'Submit for Approval'}
        </Button>
      </div>
    </div>
  );
}
