'use client';

import React, { useEffect, useState } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Check, ShieldAlert, Sparkles } from 'lucide-react';

interface StepTwoProps {
  form: UseFormReturn<any>;
}

export default function StepTwo({ form }: StepTwoProps) {
  const { watch, setValue } = form;

  // Track values
  const minAge = watch('min_age') || 18;
  const maxAge = watch('max_age') || 35;
  const gender = watch('gender') || 'Any';
  const minReliability = watch('min_reliability') || 70;
  const selectedLanguages = watch('languages') || [];
  const selectedInterests = watch('interests') || [];
  const education = watch('education') || 'Any';
  const minEvents = watch('min_events') || 'Any';

  const [estimate, setEstimate] = useState(2340);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  const languagesList = [
    'Hindi', 'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi'
  ];

  const interestsList = [
    'Technology', 'Politics', 'Fashion', 'Sports', 'Music', 'Social Work', 'Marketing', 'Photography', 'Art'
  ];

  // Mock API Call for Matching Participants Estimate (Debounced)
  useEffect(() => {
    setLoadingEstimate(true);
    const delayDebounceFn = setTimeout(() => {
      // Calculate a pseudo-random mock estimate based on selected criteria
      let base = 5000;
      if (gender !== 'Any') base *= 0.5;
      base *= (1 - (minReliability - 50) / 100);
      base *= (1 - (selectedLanguages.length * 0.05));
      if (education !== 'Any') base *= 0.6;
      if (minEvents !== 'Any') base *= 0.4;
      
      const roundedEstimate = Math.max(12, Math.round(base));
      setEstimate(roundedEstimate);
      setLoadingEstimate(false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [minAge, maxAge, gender, minReliability, selectedLanguages, selectedInterests, education, minEvents]);

  const toggleLanguage = (lang: string) => {
    if (selectedLanguages.includes(lang)) {
      setValue('languages', selectedLanguages.filter((l: string) => l !== lang));
    } else {
      setValue('languages', [...selectedLanguages, lang]);
    }
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setValue('interests', selectedInterests.filter((i: string) => i !== interest));
    } else {
      setValue('interests', [...selectedInterests, interest]);
    }
  };

  const getReliabilityLabel = (score: number) => {
    if (score < 60) return 'Open to all';
    if (score < 75) return 'Standard (Recommended)';
    if (score < 90) return 'Trusted participants';
    return 'Elite only';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-[#1A1A2E]">Step 2: Participant Requirements</h2>
        <p className="text-xs text-gray-500 font-medium">Define age ranges, target parameters, and reliability thresholds.</p>
      </div>

      {/* Age Range Inputs */}
      <div className="space-y-2 border border-[#E2E8F0] p-4 bg-[#F8FAFC] rounded-2xl">
        <Label className="text-xs font-extrabold text-[#1A1A2E]">Age Criteria Range</Label>
        <div className="flex items-center gap-4">
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-gray-400 font-bold">Min Age</span>
            <input
              type="number"
              min={16}
              max={80}
              value={minAge}
              onChange={(e) => setValue('min_age', Math.max(16, Number(e.target.value)))}
              className="w-full text-sm border border-[#E2E8F0] bg-white rounded-xl p-2.5 outline-none font-bold text-[#1A1A2E]"
            />
          </div>
          <span className="text-gray-400 font-black mt-4">to</span>
          <div className="flex-1 space-y-1">
            <span className="text-[10px] text-gray-400 font-bold">Max Age</span>
            <input
              type="number"
              min={16}
              max={80}
              value={maxAge}
              onChange={(e) => setValue('max_age', Math.min(80, Number(e.target.value)))}
              className="w-full text-sm border border-[#E2E8F0] bg-white rounded-xl p-2.5 outline-none font-bold text-[#1A1A2E]"
            />
          </div>
        </div>
        <p className="text-[10px] text-gray-500 font-semibold italic">
          Targeting participants aged {minAge} to {maxAge} years old.
        </p>
      </div>

      {/* Gender Select Radio Buttons */}
      <div className="space-y-2">
        <Label className="text-xs font-extrabold text-[#1A1A2E]">Gender Preference</Label>
        <div className="grid grid-cols-3 gap-2">
          {['Any', 'Male only', 'Female only'].map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setValue('gender', opt)}
              className={`text-xs font-bold py-3 px-4 rounded-xl border transition-all text-center ${
                gender === opt
                  ? 'bg-orange-50 text-[#FF6B35] border-orange-200 shadow-sm'
                  : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Languages Chip Picker */}
      <div className="space-y-2.5">
        <Label className="text-xs font-extrabold text-[#1A1A2E]">Required Spoken Languages</Label>
        <div className="flex flex-wrap gap-1.5">
          {languagesList.map((lang) => {
            const isSelected = selectedLanguages.includes(lang);
            return (
              <button
                key={lang}
                type="button"
                onClick={() => toggleLanguage(lang)}
                className={`text-[10px] font-bold py-1.5 px-3 rounded-lg border flex items-center gap-1 transition-all ${
                  isSelected
                    ? 'bg-[#1A1A2E] text-white border-[#1A1A2E]'
                    : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
                }`}
              >
                {isSelected && <Check size={10} />}
                {lang}
              </button>
            );
          })}
        </div>
      </div>

      {/* Reliability score slider */}
      <div className="space-y-3 border border-[#E2E8F0] p-4 bg-[#F8FAFC] rounded-2xl">
        <div className="flex justify-between items-center">
          <Label htmlFor="reliability" className="text-xs font-extrabold text-[#1A1A2E]">Minimum Reliability Score</Label>
          <Badge className="bg-[#1A1A2E] text-white font-bold">{minReliability}%</Badge>
        </div>
        <input
          id="reliability"
          type="range"
          min={0}
          max={100}
          value={minReliability}
          onChange={(e) => setValue('min_reliability', Number(e.target.value))}
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B35]"
        />
        <div className="flex justify-between text-[10px] text-gray-400 font-extrabold uppercase">
          <span>0%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
        <p className="text-[11px] font-bold text-orange-600 flex items-center gap-1">
          <ShieldAlert size={14} /> Tier Level: {getReliabilityLabel(minReliability)}
        </p>
      </div>

      {/* Education Level & Min Events */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="education" className="text-xs font-extrabold text-[#1A1A2E]">Education Level</Label>
          <Select value={education} onValueChange={(val) => setValue('education', val)}>
            <SelectTrigger className="border-[#E2E8F0] rounded-xl focus:ring-[#FF6B35]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any level</SelectItem>
              <SelectItem value="Class 10+">Class 10+</SelectItem>
              <SelectItem value="Class 12+">Class 12+</SelectItem>
              <SelectItem value="Graduate">Graduate</SelectItem>
              <SelectItem value="Postgraduate">Postgraduate</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="minEvents" className="text-xs font-extrabold text-[#1A1A2E]">Min Events Attended</Label>
          <Select value={minEvents} onValueChange={(val) => setValue('min_events', val)}>
            <SelectTrigger className="border-[#E2E8F0] rounded-xl focus:ring-[#FF6B35]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Any">Any history</SelectItem>
              <SelectItem value="1+">1+ events</SelectItem>
              <SelectItem value="3+">3+ events</SelectItem>
              <SelectItem value="5+">5+ events</SelectItem>
              <SelectItem value="10+">10+ events</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Required Interests */}
      <div className="space-y-2.5">
        <Label className="text-xs font-extrabold text-[#1A1A2E]">Target Interests <span className="text-gray-400 font-normal">(Optional)</span></Label>
        <div className="flex flex-wrap gap-1.5">
          {interestsList.map((interest) => {
            const isSelected = selectedInterests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-orange-50 border-orange-200 text-[#FF6B35]'
                    : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </div>

      {/* MATCHING AUDIENCE INDICATOR */}
      <div className="bg-orange-50 border border-orange-100 text-orange-900 rounded-2xl p-4 space-y-2">
        <h3 className="text-xs font-extrabold text-[#1A1A2E] flex items-center gap-1.5 uppercase tracking-wide">
          <Sparkles size={14} className="text-[#FF6B35]" /> Reach Estimation
        </h3>
        <div className="flex items-baseline gap-2">
          {loadingEstimate ? (
            <span className="text-lg font-black animate-pulse text-[#1A1A2E]">Calculating...</span>
          ) : (
            <span className="text-2xl font-black text-[#1A1A2E]">~{estimate.toLocaleString()}</span>
          )}
          <span className="text-[10px] text-gray-400 font-bold uppercase">matching participants in city</span>
        </div>
        <p className="text-[10px] text-gray-500 leading-relaxed font-semibold">
          This estimate reflects participants matching selected demographics who are active in the greater metropolitan radius.
        </p>
      </div>
    </div>
  );
}
