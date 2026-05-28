'use client';

import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import Link from 'next/link';

// Import steps & components
import StepOne from '@/components/campaign-create/StepOne';
import StepTwo from '@/components/campaign-create/StepTwo';
import StepThree from '@/components/campaign-create/StepThree';
import StepFour from '@/components/campaign-create/StepFour';
import StepFive from '@/components/campaign-create/StepFive';
import LivePreviewCard from '@/components/campaign-create/LivePreviewCard';

type FormFields = {
  title: string;
  category: string;
  description: string;
  event_date: string;
  start_time: string;
  duration: string;
  location_name: string;
  location_address: string;
  lat: number;
  lng: number;
  dress_code: string;
  behavior_guidelines: string;

  min_age: number;
  max_age: number;
  gender: string;
  languages: string[];
  min_reliability: number;
  education: string;
  interests: string[];
  min_events: string;

  slots_total: number;
  payout: number;
  payout_type: string;
  has_punctuality_bonus: boolean;
  punctuality_bonus_amount: number;
  has_duration_bonus: boolean;
  duration_bonus_amount: number;

  visibility_radius: string;
  campaign_type: string;
  mobilization_mode: string;
  offer_surge: boolean;
  surge_multiplier: string;
  allow_waitlist: boolean;
  max_waitlist: number;
};

const STORAGE_KEY = 'mobilize_new_campaign_form';

export default function NewCampaignWizard() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<any>(null);

  // Profile context variables
  const [walletBalance, setWalletBalance] = useState<number>(10000);
  const [isVerified, setIsVerified] = useState<boolean>(true);

  // 1. Initialize Form
  const form = useForm<FormFields>({
    defaultValues: {
      title: '',
      category: 'brand_activation',
      description: '',
      event_date: '',
      start_time: '09:00',
      duration: '4hrs',
      location_name: '',
      location_address: '',
      lat: 19.0760,
      lng: 72.8777,
      dress_code: 'Smart Casuals',
      behavior_guidelines: '',

      min_age: 18,
      max_age: 35,
      gender: 'Any',
      languages: [],
      min_reliability: 70,
      education: 'Any',
      interests: [],
      min_events: 'Any',

      slots_total: 10,
      payout: 500,
      payout_type: 'cash',
      has_punctuality_bonus: false,
      punctuality_bonus_amount: 50,
      has_duration_bonus: false,
      duration_bonus_amount: 100,

      visibility_radius: '10km',
      campaign_type: 'public',
      mobilization_mode: 'scheduled',
      offer_surge: false,
      surge_multiplier: '1.5x',
      allow_waitlist: true,
      max_waitlist: 2,
    }
  });

  const { watch, reset, trigger } = form;
  const watchedValues = watch();

  // 2. Fetch User verification and wallet balance on mount
  useEffect(() => {
    async function loadCampaignerDetails() {
      try {
        const profile = await api.get('/user/profile');
        if (profile && profile.profile) {
          setWalletBalance(profile.profile.wallet_balance || 0);
          setIsVerified(profile.profile.verified || false);
        }
      } catch (err) {
        console.error('Failed to load wallet profile context:', err);
      }
    }

    // Load cached session storage form values if any
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        reset(parsed);
      }
    } catch (e) {
      console.error('Failed to parse cached form data:', e);
    }

    loadCampaignerDetails();
  }, [reset]);

  // 3. Sync form values to SessionStorage on updates
  useEffect(() => {
    const subscription = watch((value) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch (e) {
        console.error('Failed to save form cache:', e);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // 4. Stepper control handlers
  const handleNext = async () => {
    // Validate current step fields before going next
    let isValid = false;
    if (currentStep === 1) {
      isValid = await trigger([
        'title', 'category', 'description', 'event_date',
        'start_time', 'duration', 'location_name', 'location_address'
      ]);
    } else if (currentStep === 2) {
      isValid = await trigger(['min_age', 'max_age', 'min_reliability']);
    } else if (currentStep === 3) {
      isValid = await trigger(['slots_total', 'payout']);
    } else if (currentStep === 4) {
      isValid = true;
    }

    if (isValid && currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // 5. Create draft simulated trigger
  const handleSaveDraft = async () => {
    toast.success('Campaign Saved as Draft', { description: 'You can restore and edit this event under campaigns dashboard.' });
  };

  // 6. Submit creation payload
  const handleLaunch = async () => {
    // Double check balance logic
    const slots = Number(watchedValues.slots_total) || 0;
    const basePay = Number(watchedValues.payout) || 0;
    const punc = watchedValues.has_punctuality_bonus ? (Number(watchedValues.punctuality_bonus_amount) || 0) : 0;
    const dur = watchedValues.has_duration_bonus ? (Number(watchedValues.duration_bonus_amount) || 0) : 0;
    const totalPayout = basePay + punc + dur;

    const baseBudget = slots * basePay;
    const bonusesBudget = slots * (punc + dur);
    const totalEscrowBase = baseBudget + bonusesBudget;

    const platformFee = totalEscrowBase * 0.08;
    const safetyBuffer = totalEscrowBase * 0.10;
    const totalRequired = totalEscrowBase + platformFee + safetyBuffer;

    if (walletBalance < totalRequired) {
      toast.error('Insufficient Escrow Balance', { description: 'Please add funds to your wallet balance first.' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: watchedValues.title,
        description: watchedValues.description,
        category: watchedValues.category,
        event_date: watchedValues.event_date,
        start_time: `${watchedValues.start_time}:00`,
        duration_hrs: watchedValues.duration === 'Full Day' ? 8 : parseFloat(watchedValues.duration),
        location_name: watchedValues.location_name,
        location_address: watchedValues.location_address,
        lat: watchedValues.lat || 19.0760,
        lng: watchedValues.lng || 72.8777,
        payout: watchedValues.payout,
        payout_type: watchedValues.payout_type,
        slots_total: slots,
        dress_code: watchedValues.dress_code || null,
        requirements: {
          min_age: Number(watchedValues.min_age),
          max_age: Number(watchedValues.max_age),
          gender: watchedValues.gender,
          languages: watchedValues.languages || [],
          min_reliability: Number(watchedValues.min_reliability),
          education: watchedValues.education || 'Any',
          interests: watchedValues.interests || [],
          min_events: watchedValues.min_events || 'Any',
          has_punctuality_bonus: watchedValues.has_punctuality_bonus,
          punctuality_bonus_amount: watchedValues.punctuality_bonus_amount,
          has_duration_bonus: watchedValues.has_duration_bonus,
          duration_bonus_amount: watchedValues.duration_bonus_amount,
        },
        visibility_radius: parseInt(watchedValues.visibility_radius) || 10,
        is_private: watchedValues.campaign_type === 'private',
        is_urgent: watchedValues.mobilization_mode === 'instant',
        allow_waitlist: watchedValues.allow_waitlist,
        max_waitlist: watchedValues.allow_waitlist ? Number(watchedValues.max_waitlist) : 0,
      };

      const result = await api.post('/campaigns', payload);
      setCreatedCampaign(result);
      
      // Clear session cache
      sessionStorage.removeItem(STORAGE_KEY);
      
      setIsSuccess(true);
      toast.success(isVerified ? 'Campaign Launched!' : 'Submitted for Approval');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to post campaign', { description: err.message || 'Verification rejected.' });
    } finally {
      setLoading(false);
    }
  };

  // 7. Render success screen
  if (isSuccess) {
    return (
      <div className="max-w-md mx-auto py-12 flex flex-col items-center justify-center text-center space-y-6">
        <div className="h-16 w-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
          <CheckCircle2 size={36} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[#1A1A2E]">🎉 Campaign Successfully Created!</h1>
          <p className="text-sm font-bold text-gray-500 max-w-xs mx-auto">
            {isVerified
              ? 'Your campaign is now live! Discoverable participants within visibility radius are being dispatched alerts.'
              : 'Your campaign was submitted successfully and is currently undergoing safety reviews.'}
          </p>
        </div>

        <Card className="w-full border border-green-200 bg-green-50/50 p-4 rounded-2xl text-left">
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Campaign Details</p>
          <h3 className="text-sm font-black text-[#1A1A2E] mt-1">{createdCampaign?.title || watchedValues.title}</h3>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-gray-500">
            <Calendar size={14} className="text-[#FF6B35]" />
            <span>{watchedValues.event_date} at {watchedValues.start_time}</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 w-full">
          <Link
            href="/campaigns"
            className="inline-flex items-center justify-center border border-[#E2E8F0] hover:bg-gray-50 text-[#1A1A2E] font-bold rounded-xl py-4 text-xs transition-all text-center"
          >
            View Roster Dashboard
          </Link>
          <Button
            onClick={() => {
              reset();
              setCurrentStep(1);
              setIsSuccess(false);
              setCreatedCampaign(null);
            }}
            className="bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl shadow-lg shadow-orange-500/10 py-5 text-xs"
          >
            Create Another
          </Button>
        </div>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: 'Event Details' },
    { num: 2, label: 'Requirements' },
    { num: 3, label: 'Compensation' },
    { num: 4, label: 'Visibility' },
    { num: 5, label: 'Review & Launch' },
  ];

  return (
    <FormProvider {...form}>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Step Indicator */}
        <div className="border-b border-[#E2E8F0] pb-4">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            {stepsList.map((step) => {
              const isCurrent = currentStep === step.num;
              const isPassed = currentStep > step.num;
              return (
                <div key={step.num} className="flex flex-col items-center flex-1 relative">
                  <div
                    onClick={() => {
                      if (isPassed) setCurrentStep(step.num);
                    }}
                    className={`h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-xs cursor-pointer transition-all border ${
                      isCurrent
                        ? 'bg-[#FF6B35] border-[#FF6B35] text-white ring-4 ring-orange-100'
                        : isPassed
                        ? 'bg-[#1A1A2E] border-[#1A1A2E] text-white'
                        : 'bg-white border-[#E2E8F0] text-gray-400'
                    }`}
                  >
                    {step.num}
                  </div>
                  <span className={`text-[10px] font-bold mt-1.5 hidden sm:block ${
                    isCurrent ? 'text-[#FF6B35]' : isPassed ? 'text-[#1A1A2E]' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dual Layout: Left 60% Wizard Form, Right 40% Sticky Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Wizard Forms Left */}
          <div className="lg:col-span-3 space-y-6">
            <Card className="border-[#E2E8F0] shadow-sm rounded-2xl bg-white">
              <CardContent className="p-6">
                {currentStep === 1 && <StepOne form={form} />}
                {currentStep === 2 && <StepTwo form={form} />}
                {currentStep === 3 && (
                  <StepThree
                    form={form}
                    walletBalance={walletBalance}
                    onAddFunds={() => {
                      toast.info('Redirecting to wallet page...');
                      window.location.href = '/wallet';
                    }}
                  />
                )}
                {currentStep === 4 && <StepFour form={form} />}
                {currentStep === 5 && (
                  <StepFive
                    form={form}
                    isVerified={isVerified}
                    onJumpToStep={(step) => setCurrentStep(step)}
                    onSaveDraft={handleSaveDraft}
                    onSubmit={handleLaunch}
                    loading={loading}
                  />
                )}

                {/* Navigation Footer */}
                {currentStep < 5 && (
                  <div className="flex justify-between items-center border-t border-[#F1F5F9] pt-4 mt-6">
                    {currentStep > 1 ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrev}
                        className="rounded-xl border-[#E2E8F0] font-bold"
                      >
                        <ChevronLeft size={16} className="mr-1" /> Back
                      </Button>
                    ) : (
                      <div />
                    )}

                    <Button
                      type="button"
                      onClick={handleNext}
                      className="bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl shadow-lg shadow-orange-500/10"
                    >
                      Next <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sticky Right Preview Panel */}
          <div className="lg:col-span-2 sticky top-8">
            <LivePreviewCard
              formData={watchedValues}
              walletBalance={walletBalance}
              onAddFunds={() => {
                toast.info('Redirecting to wallet page...');
                window.location.href = '/wallet';
              }}
            />
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
