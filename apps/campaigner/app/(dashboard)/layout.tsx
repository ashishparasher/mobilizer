'use client';

import React, { useEffect, useState } from 'react';
import { supabase, getSession } from '@/lib/supabase';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Megaphone, Wallet, Settings, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [campaigner, setCampaigner] = useState<any>(null);

  useEffect(() => {
    async function fetchCampaignerProfile() {
      try {
        const session = await getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }

        const profileRes = await api.get('/user/profile');
        if (profileRes && profileRes.role === 'campaigner') {
          setCampaigner(profileRes);
        } else {
          // If not campaigner, force signout & redirect
          await supabase.auth.signOut();
          window.location.href = '/login';
        }
      } catch (err) {
        console.error('Error loading campaigner layout data:', err);
        window.location.href = '/login';
      } finally {
        setLoading(false);
      }
    }

    fetchCampaignerProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#FF6B35]" />
          <p className="text-sm font-bold text-gray-500">Loading Organizer Workspace...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Campaigns', href: '/campaigns', icon: Megaphone },
    { label: 'Wallet', href: '/wallet', icon: Wallet },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  const orgName = campaigner?.profile?.org_name || 'My Organization';
  const balance = campaigner?.profile?.wallet_balance || 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#E2E8F0] bg-white text-[#1A1A2E]">
        {/* Brand header */}
        <div className="h-16 flex items-center px-6 border-b border-[#F1F5F9] gap-2">
          <span className="text-2xl">⚡</span>
          <span className="font-black text-lg tracking-tight text-[#1A1A2E]">
            Mobilize <span className="text-[#FF6B35]">Organizers</span>
          </span>
        </div>

        {/* Profile Card */}
        <div className="p-4 mx-4 my-4 bg-orange-50/50 border border-orange-100 rounded-xl">
          <p className="text-xs text-orange-600 font-extrabold uppercase tracking-wider">Escrow Wallet</p>
          <p className="text-2xl font-black text-[#1A1A2E] pt-0.5">₹{Number(balance).toLocaleString('en-IN')}</p>
          <div className="text-[11px] text-gray-500 font-semibold mt-1">
            Linked to: <span className="text-[#1A1A2E] font-bold">{orgName}</span>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[#FF6B35] text-white shadow-lg shadow-orange-500/10'
                    : 'text-gray-500 hover:text-[#1A1A2E] hover:bg-gray-50'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#F1F5F9]">
          <Button
            onClick={handleSignOut}
            variant="ghost"
            className="w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl text-gray-500 hover:text-red-600 hover:bg-red-50 font-bold"
          >
            <LogOut size={18} />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main content body */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-[#E2E8F0] bg-white flex items-center justify-between px-6 z-20">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <span className="font-black text-base text-[#1A1A2E]">Mobilize</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] text-gray-400 font-bold">Escrow</p>
              <p className="text-xs font-black text-green-600">₹{Number(balance).toLocaleString('en-IN')}</p>
            </div>
            <Button onClick={handleSignOut} variant="ghost" size="icon" className="text-gray-500">
              <LogOut size={18} />
            </Button>
          </div>
        </header>

        {/* Scrollable dashboard panels */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
