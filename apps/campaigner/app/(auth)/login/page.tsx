'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  // Resend code countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length !== 10) {
      toast.error('Invalid phone number', { description: 'Please enter a valid 10-digit mobile number' });
      return;
    }

    setLoading(true);
    const fullPhone = `+91${phone}`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        toast.error('OTP Send Failed', { description: error.message });
      } else {
        toast.success('OTP sent successfully', { description: `SMS sent to +91 ${phone}` });
        setStep('otp');
        setResendTimer(30);
      }
    } catch (err: any) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Invalid code', { description: 'Please enter the 6-digit OTP code' });
      return;
    }

    setLoading(true);
    const fullPhone = `+91${phone}`;

    try {
      // 1. Verify token with Supabase Auth
      const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otp,
        type: 'sms',
      });

      if (verifyError || !session) {
        toast.error('Verification Failed', { description: verifyError?.message || 'Invalid code' });
        setLoading(false);
        return;
      }

      toast.success('Successfully authenticated');

      // 2. Query our public.users/campaigners database to check registration
      try {
        const profile = await api.get('/user/profile');
        
        if (profile && profile.role === 'campaigner') {
          toast.success('Welcome back!', { description: 'Redirecting to organizer dashboard...' });
          window.location.href = '/';
        } else {
          // If profile exists but not campaigner, block or let them register
          if (profile && profile.role !== 'campaigner') {
            toast.error('Account Role Conflict', { description: 'This number is registered as a participant' });
            await supabase.auth.signOut();
          } else {
            window.location.href = '/onboarding';
          }
        }
      } catch (apiErr: any) {
        // Not registered in db table yet
        window.location.href = '/onboarding';
      }
    } catch (err: any) {
      console.error('Login verify error:', err);
      toast.error('Server error during registration validation');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    const fullPhone = `+91${phone}`;
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) {
        toast.error('Failed to resend OTP', { description: error.message });
      } else {
        toast.success('OTP Resent', { description: `SMS sent to +91 ${phone}` });
        setResendTimer(30);
      }
    } catch (err) {
      toast.error('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-[#E2E8F0] bg-white shadow-xl shadow-gray-200/50 rounded-2xl overflow-hidden">
      <CardHeader className="space-y-2 pb-6 text-center border-b border-[#F1F5F9] bg-[#F8FAFC]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 mb-2">
          <span className="text-3xl">⚡</span>
        </div>
        <CardTitle className="text-2xl font-black text-[#1A1A2E] tracking-tight">
          Mobilize for Organizers
        </CardTitle>
        <CardDescription className="text-sm text-gray-500 font-medium px-4">
          Discover participants, deploy taskforces, and handle UPI payouts instantly.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-8">
        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-bold text-[#1A1A2E]">
                Mobile Number
              </Label>
              <div className="flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden focus-within:border-[#FF6B35]">
                <span className="flex items-center px-4 py-3 bg-[#F1F5F9] text-sm font-extrabold text-[#1A1A2E] border-r border-[#E2E8F0]">
                  +91
                </span>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="98765 43210"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  className="border-0 bg-transparent flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 px-4 py-3 text-slate-900"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || phone.length !== 10}
              className="w-full py-6 bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 text-base"
            >
              {loading ? 'Sending Verification SMS...' : 'Send OTP Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="otp" className="text-sm font-bold text-[#1A1A2E]">
                Verification Code (OTP)
              </Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                className="border-[#E2E8F0] bg-[#F8FAFC] focus-visible:ring-[#FF6B35] rounded-xl text-center text-lg font-black tracking-widest py-6 text-slate-900"
                required
                disabled={loading}
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center mt-1">
                Enter the 6-digit code sent to +91 {phone}
              </p>
            </div>

            <div className="flex justify-between items-center text-sm pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('phone')}
                className="text-gray-500 hover:text-[#1A1A2E]"
                disabled={loading}
              >
                Change Number
              </Button>

              {resendTimer > 0 ? (
                <span className="text-gray-400">
                  Resend in <strong className="text-gray-600 font-bold">{resendTimer}s</strong>
                </span>
              ) : (
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResend}
                  className="text-[#FF6B35] font-bold p-0"
                  disabled={loading}
                >
                  Resend Code
                </Button>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-6 bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 text-base"
            >
              {loading ? 'Verifying OTP...' : 'Login to Dashboard'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
