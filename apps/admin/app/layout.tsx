import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Mobilize Admin',
  description: 'Internal operations panel for Mobilize platform',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="h-full min-h-screen bg-[#f8fafc] text-[#0f172a] antialiased">
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
