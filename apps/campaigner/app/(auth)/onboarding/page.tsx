'use client';

import React, { useState, useEffect } from 'react';
import { getSession } from '@/lib/supabase';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Check, ShieldCheck, Landmark, Briefcase, ChevronRight, ChevronLeft } from 'lucide-react';

type Step = 1 | 2 | 3 | 4;

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [userPhone, setUserPhone] = useState('');

  // Form states
  const [orgName, setOrgName] = useState('');
  const [orgType, setOrgType] = useState('brand_activation');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [description, setDescription] = useState('');

  const [pan, setPan] = useState('');
  const [gstin, setGstin] = useState('');
  const [contactName, setContactName] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');

  const [walletAmount, setWalletAmount] = useState('10000');
  const [upiId, setUpiId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');

  // Verify auth on mount
  useEffect(() => {
    async function checkAuth() {
      const session = await getSession();
      if (!session) {
        toast.error('Session expired', { description: 'Please login again' });
        window.location.href = '/login';
        return;
      }
      setUserPhone(session.user?.phone || '');
    }
    checkAuth();
  }, []);

  const progressPercent = (currentStep / 4) * 100;

  const validateStep1 = () => {
    if (!orgName.trim()) {
      toast.error('Organization Name is required');
      return false;
    }
    if (!description.trim()) {
      toast.error('Please enter a short description');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(pan.toUpperCase())) {
      toast.error('Invalid PAN Number format', { description: 'Format: ABCDE1234F' });
      return false;
    }
    if (!contactName.trim()) {
      toast.error('Contact Person Name is required');
      return false;
    }
    if (!city.trim() || !state.trim()) {
      toast.error('City and State are required');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!upiId.trim() || !upiId.includes('@')) {
      toast.error('Valid UPI ID is required', { description: 'e.g. name@upi or org@okaxis' });
      return false;
    }
    if (Number(walletAmount) < 1000) {
      toast.error('Minimum mock deposit is ₹1,000');
      return false;
    }
    if (paymentStatus !== 'success') {
      toast.error('Please complete the mock payment to proceed');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;

    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleMockPayment = () => {
    if (!upiId.trim() || !upiId.includes('@')) {
      toast.error('Enter UPI ID first');
      return;
    }
    setPaymentStatus('processing');
    setTimeout(() => {
      setPaymentStatus('success');
      toast.success('Mock Payment Success!', { description: `Received ₹${Number(walletAmount).toLocaleString()} from ${upiId}` });
    }, 2000);
  };

  const handleCompleteRegistration = async () => {
    setLoading(true);
    try {
      // 1. Submit Auth Register payload
      const registerPayload = {
        phone: userPhone,
        name: contactName,
        age: 30, // Default age for representative
        gender: 'prefer_not_to_say',
        city,
        district: district || city,
        state,
        role: 'campaigner',
        org_name: orgName,
        org_type: orgType,
      };

      const userRecord = await api.post('/auth/register', registerPayload);
      
      if (!userRecord || !userRecord.id) {
        throw new Error('Registration failed to return user record');
      }

      // 2. Complete onboarding via API (uses service key, bypasses RLS)
      await api.post('/auth/complete-onboarding', {
        description,
        website_url: websiteUrl || null,
        wallet_amount: Number(walletAmount),
        upi_id: upiId,
      });

      toast.success('Setup Completed Successfully!', { description: 'Welcome to Mobilize! Redirecting...' });
      
      // Redirect to main dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (err: any) {
      console.warn('Onboarding submission error:', err);
      toast.error('Failed to complete onboarding', { description: err.message || 'Server error' });
      setLoading(false);
    }
  };

  return (
    <Card className="border-[#E2E8F0] bg-white shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden min-w-[340px] sm:min-w-[400px]">
      <CardHeader className="space-y-1 pb-4 text-center border-b border-[#F1F5F9] bg-[#F8FAFC]">
        <CardTitle className="text-xl font-black text-[#1A1A2E] flex items-center justify-center gap-2">
          <span>💼</span> Organizer Setup
        </CardTitle>
        <CardDescription className="text-xs text-gray-500 font-medium">
          Step {currentStep} of 4: {
            currentStep === 1 ? 'Organization Details' :
            currentStep === 2 ? 'Identity Verification' :
            currentStep === 3 ? 'Wallet Funds' : 'Review & Confirm'
          }
        </CardDescription>
        <div className="pt-2 px-6">
          <Progress value={progressPercent} className="h-1 bg-gray-100" />
        </div>
      </CardHeader>

      <CardContent className="pt-6 min-h-[320px]">
        {/* STEP 1: Organization Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="orgName" className="text-xs font-extrabold text-[#1A1A2E]">
                Organization Name
              </Label>
              <Input
                id="orgName"
                placeholder="e.g. Apex Events Pvt Ltd"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="orgType" className="text-xs font-extrabold text-[#1A1A2E]">
                Organization Type
              </Label>
              <Select value={orgType} onValueChange={(val) => setOrgType(val || 'brand_activation')}>
                <SelectTrigger className="border-[#E2E8F0] rounded-xl focus:ring-[#FF6B35] text-slate-900">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brand_activation">Brand Activation Agency</SelectItem>
                  <SelectItem value="wedding">Wedding / Events Planner</SelectItem>
                  <SelectItem value="political">Political Representative / Campaign</SelectItem>
                  <SelectItem value="ngo_volunteer">NGO / Charitable Trust</SelectItem>
                  <SelectItem value="startup_launch">Startup / Business Group</SelectItem>
                  <SelectItem value="emergency_response">Emergency Service / Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="website" className="text-xs font-extrabold text-[#1A1A2E]">
                Website URL <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="website"
                type="url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description" className="text-xs font-extrabold text-[#1A1A2E]">
                Brief Description
              </Label>
              <textarea
                id="description"
                placeholder="What events do you organize?"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full text-sm border border-[#E2E8F0] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-xl p-3 outline-none resize-none text-slate-900"
              />
            </div>
          </div>
        )}

        {/* STEP 2: Identity & Verification */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="contactName" className="text-xs font-extrabold text-[#1A1A2E]">
                Authorized Signatory / Representative Name
              </Label>
              <Input
                id="contactName"
                placeholder="e.g. Ashish Kumar"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="pan" className="text-xs font-extrabold text-[#1A1A2E] flex justify-between">
                <span>PAN (Permanent Account Number)</span>
                <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1">
                  <ShieldCheck size={12} /> Indian Tax Requirement
                </span>
              </Label>
              <Input
                id="pan"
                maxLength={10}
                placeholder="ABCDE1234F"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl uppercase font-mono tracking-wider text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="gstin" className="text-xs font-extrabold text-[#1A1A2E]">
                GSTIN <span className="text-gray-400 font-normal">(Optional)</span>
              </Label>
              <Input
                id="gstin"
                maxLength={15}
                placeholder="22AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl uppercase font-mono tracking-wider text-slate-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="city" className="text-xs font-extrabold text-[#1A1A2E]">
                  City
                </Label>
                <Input
                  id="city"
                  placeholder="Mumbai"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-slate-900"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="state" className="text-xs font-extrabold text-[#1A1A2E]">
                  State
                </Label>
                <Input
                  id="state"
                  placeholder="Maharashtra"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-slate-900"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Wallet Funds & Razorpay Mock */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-800">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <Landmark size={14} /> Campaign Escrow Account
              </p>
              To post active campaigns, you must lock the budget in escrow. Top up mock funds below.
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-extrabold text-[#1A1A2E]">
                Select Deposit Amount (INR)
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {['5000', '10000', '25000'].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant={walletAmount === amt ? 'default' : 'outline'}
                    onClick={() => setWalletAmount(amt)}
                    className={
                      walletAmount === amt
                        ? 'bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl'
                        : 'border-[#E2E8F0] text-[#1A1A2E] font-medium rounded-xl hover:bg-gray-50'
                    }
                  >
                    ₹{Number(amt).toLocaleString()}
                  </Button>
                ))}
              </div>
              <div className="pt-1">
                <Input
                  type="number"
                  placeholder="Or enter custom amount"
                  value={walletAmount}
                  onChange={(e) => setWalletAmount(e.target.value)}
                  className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl text-slate-900"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="upi" className="text-xs font-extrabold text-[#1A1A2E]">
                UPI ID for Mock Simulation
              </Label>
              <Input
                id="upi"
                placeholder="org@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="border-[#E2E8F0] focus-visible:ring-[#FF6B35] rounded-xl font-mono text-sm text-slate-900"
              />
            </div>

            <div className="pt-2">
              {paymentStatus === 'idle' && (
                <Button
                  type="button"
                  onClick={handleMockPayment}
                  className="w-full bg-[#1A1A2E] hover:bg-[#2A2A4E] text-white font-bold rounded-xl py-5"
                >
                  Mock Razorpay UPI Transfer
                </Button>
              )}

              {paymentStatus === 'processing' && (
                <Button disabled className="w-full bg-gray-200 text-gray-500 rounded-xl py-5">
                  <span className="animate-pulse">Waiting for UPI Confirmation...</span>
                </Button>
              )}

              {paymentStatus === 'success' && (
                <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 font-bold text-sm">
                  <Check size={16} /> Funds Loaded Successfully
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Summary & Confirm */}
        {currentStep === 4 && (
          <div className="space-y-4 text-sm text-[#1A1A2E]">
            <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC] space-y-3">
              <h3 className="font-extrabold text-base border-b border-[#E2E8F0] pb-2 text-[#1A1A2E]">
                Verify Details
              </h3>
              
              <div className="grid grid-cols-3 gap-y-2 text-xs">
                <span className="text-gray-400 font-bold">Organization</span>
                <span className="col-span-2 font-bold">{orgName} ({orgType.replace('_', ' ')})</span>

                <span className="text-gray-400 font-bold">Representative</span>
                <span className="col-span-2 font-bold">{contactName}</span>

                <span className="text-gray-400 font-bold">PAN / Tax ID</span>
                <span className="col-span-2 font-mono font-bold">{pan}</span>

                {gstin && (
                  <>
                    <span className="text-gray-400 font-bold">GSTIN</span>
                    <span className="col-span-2 font-mono font-bold">{gstin}</span>
                  </>
                )}

                <span className="text-gray-400 font-bold">Location</span>
                <span className="col-span-2 font-bold">{city}, {state}</span>

                <span className="text-gray-400 font-bold">Starting Escrow</span>
                <span className="col-span-2 text-green-600 font-extrabold">₹{Number(walletAmount).toLocaleString()}</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              By completing setup, you agree to our campaigner terms of service. Payout guarantees will be locked directly from your active wallet balance.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t border-[#F1F5F9] bg-[#F8FAFC] py-4">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrev}
            disabled={loading}
            className="border-[#E2E8F0] text-gray-600 rounded-xl"
          >
            <ChevronLeft size={16} className="mr-1" /> Back
          </Button>
        ) : (
          <div />
        )}

        {currentStep < 4 ? (
          <Button
            type="button"
            onClick={handleNext}
            className="bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl"
          >
            Next <ChevronRight size={16} className="ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleCompleteRegistration}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl px-6"
          >
            {loading ? 'Creating Account...' : 'Complete Setup & Launch'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
