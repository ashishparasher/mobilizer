'use client';

import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Mail, Building, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [campaigner, setCampaigner] = useState<any>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        const profile = await api.get('/user/profile');
        setCampaigner(profile);
      } catch (err) {
        console.error('Failed to load settings profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <span className="text-gray-400 font-bold animate-pulse">Retrieving settings...</span>
      </div>
    );
  }

  const org = campaigner?.profile || {};

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black text-[#1A1A2E] tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 font-medium">Verify credentials and organization details.</p>
      </div>

      <Card className="border-[#E2E8F0] shadow-sm rounded-xl">
        <CardHeader className="pb-3 border-b border-[#F1F5F9]">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black text-[#1A1A2E]">Organization Profile</CardTitle>
            {org.verified ? (
              <Badge className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1">
                <ShieldCheck size={12} /> Verified Organizer
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Pending Review</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-bold text-gray-400 uppercase">Organization Name</Label>
              <div className="flex items-center gap-2 mt-1 text-sm font-bold text-[#1A1A2E]">
                <Building size={16} className="text-[#FF6B35]" />
                {org.org_name}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-400 uppercase">Industry / Type</Label>
              <div className="mt-1 text-sm font-semibold capitalize text-gray-700">
                {org.org_type?.replace('_', ' ')}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-400 uppercase">Registered Mobile</Label>
              <div className="mt-1 text-sm font-semibold text-gray-700">
                {campaigner?.phone}
              </div>
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-400 uppercase">Website URL</Label>
              <div className="flex items-center gap-2 mt-1 text-sm font-bold text-blue-600">
                <Globe size={16} />
                <a href={org.website_url || '#'} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {org.website_url || 'Not configured'}
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-[#F1F5F9] pt-4">
            <Label className="text-xs font-bold text-gray-400 uppercase">Business Description</Label>
            <p className="mt-1 text-sm text-gray-600 leading-relaxed font-medium">
              {org.description || 'No description provided.'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
