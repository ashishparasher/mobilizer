'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, ClipboardList, Users, Briefcase,
  DollarSign, Flag, Settings, LogOut, ShieldAlert,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/',           label: 'Overview',     icon: LayoutDashboard },
  { href: '/campaigns',  label: 'Campaigns',    icon: ClipboardList },
  { href: '/users',      label: 'Users',        icon: Users },
  { href: '/campaigners',label: 'Campaigners',  icon: Briefcase },
  { href: '/payouts',    label: 'Payouts',      icon: DollarSign },
  { href: '/reports',    label: 'Reports',      icon: Flag },
  { href: '/settings',   label: 'Settings',     icon: Settings },
];

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success('Logged out');
    router.push('/login');
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-slate-900 text-white flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-white leading-none">Mobilize</p>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = item.href === '/'
            ? pathname === '/'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 ml-[240px] min-w-0">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
