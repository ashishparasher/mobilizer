'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Coins, CheckCircle2, XCircle } from 'lucide-react';

interface StepThreeProps {
  form: UseFormReturn<any>;
  walletBalance?: number;
  onAddFunds?: () => void;
}

export default function StepThree({ form, walletBalance = 10000, onAddFunds }: StepThreeProps) {
  const { register, watch, setValue, formState: { errors } } = form;

  // Watch inputs
  const slotsTotal = Number(watch('slots_total')) || 0;
  const payout = Number(watch('payout')) || 0;
  const payoutType = watch('payout_type') || 'cash';
  
  const hasPunctualityBonus = watch('has_punctuality_bonus') || false;
  const punctualityBonusAmount = Number(watch('punctuality_bonus_amount')) || 0;
  
  const hasDurationBonus = watch('has_duration_bonus') || false;
  const durationBonusAmount = Number(watch('duration_bonus_amount')) || 0;

  const numPresets = [10, 25, 50, 100, 250, 500, 1000, 2000];
  const payPresets = [100, 200, 300, 500, 800, 1000, 1500];

  // Budget Calculations
  const puncBonus = hasPunctualityBonus ? punctualityBonusAmount : 0;
  const durBonus = hasDurationBonus ? durationBonusAmount : 0;
  
  const baseBudget = slotsTotal * payout;
  const bonusesBudget = slotsTotal * (puncBonus + durBonus);
  const totalEscrowBase = baseBudget + bonusesBudget;

  const platformFee = totalEscrowBase * 0.08; // 8% fee
  const safetyBuffer = totalEscrowBase * 0.10; // 10% buffer
  const totalRequired = totalEscrowBase + platformFee + safetyBuffer;
  const isSufficient = walletBalance >= totalRequired;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-[#1A1A2E]">Step 3: Compensation</h2>
        <p className="text-xs text-gray-500 font-medium">Configure payout values, non-monetary awards, and escrow parameters.</p>
      </div>

      {/* Participants needed */}
      <div className="space-y-2.5">
        <Label htmlFor="slots_total" className="text-xs font-extrabold text-[#1A1A2E]">Total Participants Needed</Label>
        <Input
          id="slots_total"
          type="number"
          min="1"
          placeholder="e.g. 50"
          className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-sm font-bold"
          {...register('slots_total', { required: 'Please enter participant count', min: 1 })}
        />
        {errors.slots_total && <p className="text-[10px] text-red-500 font-bold">{errors.slots_total.message as string}</p>}
        <div className="flex flex-wrap gap-1.5">
          {numPresets.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setValue('slots_total', val)}
              className={`text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all ${
                slotsTotal === val
                  ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]'
                  : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
              }`}
            >
              {val.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      {/* Payout per person */}
      <div className="space-y-2.5">
        <Label htmlFor="payout" className="text-xs font-extrabold text-[#1A1A2E]">Payout Per Person (₹)</Label>
        <Input
          id="payout"
          type="number"
          min="0"
          placeholder="e.g. 500"
          className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-sm font-bold"
          {...register('payout', { required: 'Please enter payout per person', min: 0 })}
        />
        {errors.payout && <p className="text-[10px] text-red-500 font-bold">{errors.payout.message as string}</p>}
        <div className="flex flex-wrap gap-1.5">
          {payPresets.map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => setValue('payout', val)}
              className={`text-[10px] font-bold py-1.5 px-3 rounded-lg border transition-all ${
                payout === val
                  ? 'bg-orange-50 text-[#FF6B35] border-orange-200'
                  : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
              }`}
            >
              ₹{val}
            </button>
          ))}
        </div>
      </div>

      {/* Payout Type Toggle */}
      <div className="space-y-2">
        <Label className="text-xs font-extrabold text-[#1A1A2E]">Payout Type</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setValue('payout_type', 'cash')}
            className={`text-xs font-bold py-3 px-4 rounded-xl border transition-all text-center ${
              payoutType === 'cash'
                ? 'bg-orange-50 text-[#FF6B35] border-orange-200 shadow-sm'
                : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
            }`}
          >
            💵 Cash via UPI
          </button>
          <button
            type="button"
            onClick={() => setValue('payout_type', 'non_monetary')}
            className={`text-xs font-bold py-3 px-4 rounded-xl border transition-all text-center ${
              payoutType === 'non_monetary'
                ? 'bg-orange-50 text-[#FF6B35] border-orange-200 shadow-sm'
                : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
            }`}
          >
            🎁 Non-monetary Exposure
          </button>
        </div>
      </div>

      {/* Bonus Structure */}
      <div className="space-y-4 border border-[#E2E8F0] p-4 bg-[#F8FAFC] rounded-2xl">
        <h3 className="text-xs font-extrabold text-[#1A1A2E] flex items-center gap-1.5 uppercase tracking-wide">
          ⚡ Bonus Structure Presets
        </h3>

        {/* Punctuality */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              id="has_punc"
              type="checkbox"
              {...register('has_punctuality_bonus')}
              className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
            />
            <Label htmlFor="has_punc" className="text-xs font-extrabold text-[#1A1A2E] cursor-pointer">Punctuality Bonus (arriving within 15 min)</Label>
          </div>
          {hasPunctualityBonus && (
            <div className="pl-6">
              <Input
                type="number"
                placeholder="Bonus amount in ₹"
                className="border-[#E2E8F0] bg-white focus-visible:ring-[#FF6B35] rounded-xl text-xs font-bold h-9"
                {...register('punctuality_bonus_amount', { min: 0 })}
              />
            </div>
          )}
        </div>

        {/* Full Duration */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              id="has_dur"
              type="checkbox"
              {...register('has_duration_bonus')}
              className="h-4 w-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
            />
            <Label htmlFor="has_dur" className="text-xs font-extrabold text-[#1A1A2E] cursor-pointer">Full Duration Bonus (staying full time)</Label>
          </div>
          {hasDurationBonus && (
            <div className="pl-6">
              <Input
                type="number"
                placeholder="Bonus amount in ₹"
                className="border-[#E2E8F0] bg-white focus-visible:ring-[#FF6B35] rounded-xl text-xs font-bold h-9"
                {...register('duration_bonus_amount', { min: 0 })}
              />
            </div>
          )}
        </div>
      </div>

      {/* Prominent Budget Calculator */}
      <div className="border border-orange-100 bg-orange-50/50 p-5 rounded-2xl space-y-4">
        <h3 className="text-xs font-black text-[#1A1A2E] flex items-center gap-1.5 uppercase tracking-wide">
          <Coins size={14} className="text-[#FF6B35]" /> Escrow Calculator
        </h3>

        <div className="space-y-2 border-b border-orange-200/50 pb-3 text-xs font-bold text-gray-500">
          <div className="flex justify-between">
            <span>Base Escrow Payout ({slotsTotal} × ₹{payout})</span>
            <span className="text-[#1A1A2E]">₹{baseBudget.toLocaleString('en-IN')}</span>
          </div>

          {(hasPunctualityBonus || hasDurationBonus) && (
            <div className="flex justify-between text-orange-700">
              <span>Simulation Bonuses ({slotsTotal} × ₹{puncBonus + durBonus})</span>
              <span>₹{bonusesBudget.toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Platform Commission Fee (8%)</span>
            <span className="text-[#1A1A2E]">₹{platformFee.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex justify-between">
            <span>Hold Buffer Refund (10%)</span>
            <span className="text-[#1A1A2E]">₹{safetyBuffer.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex justify-between items-baseline">
          <span className="text-xs font-black text-[#1A1A2E] uppercase">Total Required Funds</span>
          <span className="text-xl font-black text-green-600">₹{totalRequired.toLocaleString('en-IN')}</span>
        </div>

        <div className="pt-2 border-t border-orange-200/50">
          <div className="flex justify-between text-[11px] font-bold text-gray-600 mb-2">
            <span>Available Escrow Balance:</span>
            <span className="text-[#1A1A2E]">₹{walletBalance.toLocaleString('en-IN')}</span>
          </div>

          {isSufficient ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50/60 border border-green-200 rounded-xl p-3 text-[11px] font-bold">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Sufficient Balance to reserve campaign slots</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-red-700 bg-red-50/60 border border-red-200 rounded-xl p-3 text-[11px] font-bold">
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Escrow budget requires ₹{(totalRequired - walletBalance).toLocaleString('en-IN')} more to proceed.
                </span>
              </div>
              {onAddFunds && (
                <Button
                  type="button"
                  onClick={onAddFunds}
                  className="w-full bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl py-5 shadow-lg shadow-orange-500/10"
                >
                  Deposit Escrow Wallet
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
