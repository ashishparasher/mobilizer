import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Mobilize for Organizers',
  description: 'Real-time human mobilization marketplace platform campaigner console.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-[#F8FAFC]">
      <body className={`${inter.className} h-full antialiased text-[#1A1A2E]`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
