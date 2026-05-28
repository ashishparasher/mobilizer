'use client';

import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';

interface StepOneProps {
  form: UseFormReturn<any>;
}

export default function StepOne({ form }: StepOneProps) {
  const { register, watch, setValue, formState: { errors } } = form;

  const titleValue = watch('title') || '';
  const descriptionValue = watch('description') || '';
  const selectedCategory = watch('category') || 'brand_activation';
  const selectedDuration = watch('duration') || '4hrs';
  const selectedDressCode = watch('dress_code') || '';

  const categories = [
    { value: 'political', label: '🗳️ Political Event' },
    { value: 'wedding', label: '💍 Wedding & Social' },
    { value: 'brand_activation', label: '🏷️ Brand Activation' },
    { value: 'religious', label: '🙏 Religious Gathering' },
    { value: 'ngo_volunteer', label: '🌱 NGO & Volunteer' },
    { value: 'influencer_shoot', label: '📸 Influencer Shoot' },
    { value: 'survey', label: '📋 Survey & Research' },
    { value: 'entertainment', label: '🎭 Entertainment' },
    { value: 'startup_launch', label: '💼 Startup Launch' },
    { value: 'emergency_response', label: '🚨 Emergency Response' },
  ];

  const presets = ['Formal', 'Casual', 'Traditional', 'Color: White', 'No requirements'];

  // Tomorrow's date helper
  const getTomorrowString = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-[#1A1A2E]">Step 1: Event Details</h2>
        <p className="text-xs text-gray-500 font-medium">Outline the core scope, schedule, and venue of your mobilization.</p>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="title" className="text-xs font-extrabold text-[#1A1A2E]">Campaign Title</Label>
          <span className="text-[10px] text-gray-400 font-bold">{titleValue.length}/200</span>
        </div>
        <Input
          id="title"
          maxLength={200}
          placeholder="e.g. Political Rally Volunteer Stewards at Ground"
          className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-sm"
          {...register('title', { required: 'Title is required', maxLength: 200 })}
        />
        {errors.title && <p className="text-[10px] text-red-500 font-bold">{errors.title.message as string}</p>}
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category" className="text-xs font-extrabold text-[#1A1A2E]">Category</Label>
        <Select value={selectedCategory} onValueChange={(val) => setValue('category', val)}>
          <SelectTrigger className="border-[#E2E8F0] rounded-xl focus:ring-[#FF6B35]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label htmlFor="description" className="text-xs font-extrabold text-[#1A1A2E]">Rich Description</Label>
          <span className="text-[10px] text-gray-400 font-bold">{descriptionValue.length}/2000</span>
        </div>
        <textarea
          id="description"
          placeholder="Describe what participants will do, what to expect, and any important details..."
          rows={5}
          className="w-full text-sm border border-[#E2E8F0] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-xl p-3 outline-none resize-none font-medium text-gray-700"
          {...register('description', {
            required: 'Description is required',
            minLength: { value: 50, message: 'Description must be at least 50 characters' },
            maxLength: { value: 2000, message: 'Description cannot exceed 2000 characters' }
          })}
        />
        {errors.description && <p className="text-[10px] text-red-500 font-bold">{errors.description.message as string}</p>}
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="event_date" className="text-xs font-extrabold text-[#1A1A2E]">Event Date</Label>
          <Input
            id="event_date"
            type="date"
            min={getTomorrowString()}
            className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-sm"
            {...register('event_date', { required: 'Event date is required' })}
          />
          {errors.event_date && <p className="text-[10px] text-red-500 font-bold">{errors.event_date.message as string}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="start_time" className="text-xs font-extrabold text-[#1A1A2E]">Start Time</Label>
          <Input
            id="start_time"
            type="time"
            className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-sm"
            {...register('start_time', { required: 'Start time is required' })}
          />
          {errors.start_time && <p className="text-[10px] text-red-500 font-bold">{errors.start_time.message as string}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="duration" className="text-xs font-extrabold text-[#1A1A2E]">Duration</Label>
          <Select value={selectedDuration} onValueChange={(val) => setValue('duration', val)}>
            <SelectTrigger className="border-[#E2E8F0] rounded-xl focus:ring-[#FF6B35]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1hr">1 Hour</SelectItem>
              <SelectItem value="2hrs">2 Hours</SelectItem>
              <SelectItem value="3hrs">3 Hours</SelectItem>
              <SelectItem value="4hrs">4 Hours</SelectItem>
              <SelectItem value="6hrs">6 Hours</SelectItem>
              <SelectItem value="8hrs">8 Hours</SelectItem>
              <SelectItem value="Full Day">Full Day</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Location Name & Address */}
      <div className="space-y-4 border border-[#E2E8F0] p-4 bg-[#F8FAFC] rounded-2xl">
        <h3 className="text-xs font-extrabold text-[#1A1A2E] flex items-center gap-1">
          <MapPin size={14} className="text-[#FF6B35]" /> Venue Mapping
        </h3>

        <div className="space-y-1.5">
          <Label htmlFor="location_name" className="text-xs font-extrabold text-[#1A1A2E]">Location Venue Name</Label>
          <Input
            id="location_name"
            placeholder="e.g. Ramlila Maidan"
            className="border-[#E2E8F0] bg-white focus-visible:ring-[#FF6B35] rounded-xl text-sm"
            {...register('location_name', { required: 'Location name is required' })}
          />
          {errors.location_name && <p className="text-[10px] text-red-500 font-bold">{errors.location_name.message as string}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location_address" className="text-xs font-extrabold text-[#1A1A2E]">Full Address</Label>
          <textarea
            id="location_address"
            placeholder="Complete postal address details..."
            rows={2}
            className="w-full text-sm border border-[#E2E8F0] bg-white focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-xl p-3 outline-none resize-none font-medium text-gray-700"
            {...register('location_address', { required: 'Address is required' })}
          />
          {errors.location_address && <p className="text-[10px] text-red-500 font-bold">{errors.location_address.message as string}</p>}
        </div>

        {/* Map Picker Simulation */}
        <div className="h-44 border border-[#E2E8F0] bg-gray-200 rounded-xl overflow-hidden relative flex flex-col items-center justify-center text-center px-4">
          <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />
          <MapPin size={32} className="text-[#FF6B35] animate-bounce z-10" />
          <p className="text-[11px] font-extrabold text-[#1A1A2E] z-10">Google Maps Simulation Pin Dropped</p>
          <p className="text-[10px] text-gray-400 font-bold z-10">Coordinates: Mumbai (19.0760° N, 72.8777° E)</p>
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-10">
            <Input placeholder="Search address map..." className="h-8 text-[11px] bg-white border-[#E2E8F0]" />
            <Button type="button" size="icon" className="h-8 w-8 bg-[#1A1A2E] hover:bg-[#2A2A4E] text-white shrink-0"><Search size={12} /></Button>
          </div>
        </div>
      </div>

      {/* Dress Code & Presets */}
      <div className="space-y-2.5">
        <Label htmlFor="dress_code" className="text-xs font-extrabold text-[#1A1A2E]">Dress Code <span className="text-gray-400 font-normal">(Optional)</span></Label>
        <Input
          id="dress_code"
          placeholder="e.g. Color: White, Traditional Dress"
          className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-sm"
          {...register('dress_code')}
        />
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setValue('dress_code', preset)}
              className={`text-[10px] font-bold py-1 px-2.5 rounded-lg border transition-all ${
                selectedDressCode === preset
                  ? 'bg-orange-50 text-[#FF6B35] border-orange-200'
                  : 'bg-white border-[#E2E8F0] text-gray-500 hover:bg-gray-50'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Behavior Guidelines */}
      <div className="space-y-1.5">
        <Label htmlFor="behavior" className="text-xs font-extrabold text-[#1A1A2E]">Expected Behavior Guidelines <span className="text-gray-400 font-normal">(Optional)</span></Label>
        <textarea
          id="behavior"
          placeholder="Enter guidelines, e.g. Be polite, remain silent, follow coordinator instructions..."
          rows={3}
          className="w-full text-sm border border-[#E2E8F0] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-xl p-3 outline-none resize-none font-medium text-gray-700"
          {...register('behavior_guidelines')}
        />
      </div>
    </div>
  );
}
