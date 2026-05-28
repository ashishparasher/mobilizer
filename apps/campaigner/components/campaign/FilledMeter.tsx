'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Progress } from '@/components/ui/progress';

interface FilledMeterProps {
  campaignId: string;
  target: number;
  initialFilled: number;
}

export default function FilledMeter({ campaignId, target, initialFilled }: FilledMeterProps) {
  const [filledCount, setFilledCount] = useState(initialFilled);

  useEffect(() => {
    setFilledCount(initialFilled);
  }, [initialFilled]);

  // Set up Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`campaign-filled-meter-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'applications',
          filter: `campaign_id=eq.${campaignId}`,
        },
        async (payload) => {
          // Refetch count from DB on application insert or status update
          const { count, error } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaignId)
            .eq('status', 'confirmed');

          if (!error && count !== null) {
            setFilledCount(count);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId]);

  const total = Math.max(1, target);
  const percent = Math.min(100, Math.round((filledCount / total) * 100));

  // Determine progress color
  const getProgressColor = (pct: number) => {
    if (pct < 60) return '#22C55E'; // Green
    if (pct <= 85) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  const color = getProgressColor(percent);
  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white border border-[#E2E8F0] rounded-2xl shadow-sm space-y-6">
      {/* Circular Donut Chart */}
      <div className="relative flex items-center justify-center h-40 w-40">
        <svg className="h-full w-full transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-[#1A1A2E]">{percent}%</span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Fill Rate</span>
        </div>
      </div>

      {/* Details & Linear Progress */}
      <div className="w-full text-center space-y-3">
        <div className="space-y-0.5">
          <p className="text-sm font-extrabold text-[#1A1A2E]">
            {filledCount.toLocaleString()} / {total.toLocaleString()} confirmed
          </p>
          <p className="text-[11px] font-bold text-gray-400">
            {Math.max(0, total - filledCount)} slots remaining
          </p>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            style={{ width: `${percent}%`, backgroundColor: color }}
            className="h-full rounded-full transition-all duration-1000 ease-out"
          />
        </div>
      </div>
    </div>
  );
}
