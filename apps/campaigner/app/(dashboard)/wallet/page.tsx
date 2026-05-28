'use client';

import React, { useEffect, useState } from 'react';
import { supabase, getSession } from '@/lib/supabase';
import api from '@/lib/api';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ArrowUpRight, ArrowDownLeft, Landmark, Check, AlertCircle, Coins, Download, Filter } from 'lucide-react';

declare const window: any;

export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [campaignerId, setCampaignerId] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);

  // Statistics
  const [spentMonth, setSpentMonth] = useState(0);
  const [spentAllTime, setSpentAllTime] = useState(0);

  // Topup states
  const [amount, setAmount] = useState('5000');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);

  // Transaction filters
  const [filterType, setFilterType] = useState<string>('all');

  async function loadWalletData() {
    try {
      const session = await getSession();
      if (!session) return;

      // Fetch wallet data from API (uses service key, bypasses RLS)
      const walletData = await api.get('/wallet/balance');
      
      if (walletData) {
        setBalance(walletData.wallet_balance || 0);
        
        const list = walletData.transactions || [];
        setTransactions(list);

        // Calculate statistics
        let monthSum = 0;
        let allTimeSum = 0;
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();

        list.forEach((tx: any) => {
          const amt = Number(tx.amount || 0);
          if (tx.type === 'withdrawal' || amt < 0) {
            const absAmt = Math.abs(amt);
            allTimeSum += absAmt;
            const txDate = new Date(tx.created_at);
            if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
              monthSum += absAmt;
            }
          }
        });

        setSpentMonth(monthSum);
        setSpentAllTime(allTimeSum);

        // Get campaigner ID from profile for CSV export
        const profile = await api.get('/user/profile');
        if (profile?.profile?.id) {
          setCampaignerId(profile.profile.id);
        }
      }
    } catch (err) {
      console.error('Failed to load wallet metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWalletData();
  }, []);

  // Dynamically load Razorpay Checkout SDK script
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleDepositCheckout = async () => {
    const depositAmt = Number(amount);
    if (!depositAmt || depositAmt < 500) {
      toast.error('Minimum deposit is ₹500');
      return;
    }

    setShowAddFundsModal(false);
    setPaymentStatus('processing');

    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        toast.error('Failed to load Razorpay payment gateway script. Check your internet connection.');
        setPaymentStatus('idle');
        return;
      }

      // 2. Create Order on backend
      const orderRes = await api.post('/wallet/create-order', { amount: depositAmt });
      const orderData = orderRes;

      // 3. Launch Razorpay Web Checkout overlay
      const options = {
        key: orderData.key_id,
        amount: orderData.amount * 100, // paise
        currency: orderData.currency,
        name: 'Mobilize Escrow Wallet',
        description: `Deposit ₹${depositAmt} to Escrow Wallet`,
        order_id: orderData.order_id,
        handler: async function (response: any) {
          toast.info('Verifying secure transaction logs...');
          try {
            // Verify payment
            const verifyRes = await api.post('/wallet/verify-payment', {
              amount: depositAmt,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              setBalance(verifyRes.new_balance);
              setPaymentStatus('success');
              toast.success(`Successfully loaded ₹${depositAmt.toLocaleString()} to Escrow Wallet!`);
              loadWalletData();
              setTimeout(() => setPaymentStatus('idle'), 3000);
            }
          } catch (verifyErr) {
            toast.error('Payment verification failed. Please contact support.');
            setPaymentStatus('idle');
          }
        },
        prefill: {
          name: 'Organizer Client',
          email: 'campaigner@mobilize.org',
        },
        theme: {
          color: '#FF6B35', // Saffron brand color
        },
        modal: {
          ondismiss: function () {
            setPaymentStatus('idle');
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Checkout launch error:', err);
      toast.error(err.message || 'Escrow top-up transaction failed to initialize.');
      setPaymentStatus('idle');
    }
  };

  // Export transaction logs to CSV
  const exportTransactionsToCSV = () => {
    if (transactions.length === 0) {
      toast.error('No transactions available to export');
      return;
    }

    const headers = ['Date', 'Description', 'Type', 'Amount', 'Balance After'];
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString('en-IN'),
      t.description,
      t.type,
      t.amount,
      t.balance_after,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payout_transactions_${campaignerId.substring(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Transaction history exported');
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType === 'all') return true;
    return t.type === filterType;
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <span className="text-gray-400 font-bold animate-pulse">Accessing Escrow Ledger...</span>
      </div>
    );
  }

  const isLowBalance = balance < 1000;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-[#1A1A2E] tracking-tight">Campaigner Wallet</h1>
          <p className="text-sm text-gray-500 font-medium">Verify campaign budget allocations, top up balance, and manage disbursements.</p>
        </div>
      </div>

      {/* LOW BALANCE WARNING BANNER */}
      {isLowBalance && (
        <div className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex items-center gap-3 animate-pulse">
          <AlertCircle size={20} className="shrink-0 text-orange-600" />
          <div className="text-xs font-semibold">
            <span className="font-extrabold uppercase">⚠️ Low Wallet Balance Warning:</span> Your balance is currently less than ₹1,000. Top up soon to avoid pausing active campaigns when slots start filling!
          </div>
        </div>
      )}

      {/* KEY STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Available Balance Card */}
        <Card className="border-[#E2E8F0] shadow-sm rounded-2xl bg-gradient-to-br from-[#1A1A2E] to-[#2B2B4E] text-white">
          <CardContent className="p-6 space-y-6">
            <div>
              <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Available Balance</p>
              <h3 className="text-4xl font-black pt-1">₹{Number(balance).toLocaleString('en-IN')}</h3>
            </div>

            <div className="flex justify-between items-center border-t border-white/10 pt-4 text-xs font-semibold text-gray-300">
              <div>
                <p className="text-gray-400">Escrow Quality</p>
                <p className="text-green-500 font-bold">Secure</p>
              </div>
              <Button
                onClick={() => setShowAddFundsModal(true)}
                className="bg-[#FF6B35] hover:bg-[#E05621] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20"
              >
                Add Funds
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Spent Month Card */}
        <Card className="border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Disbursed This Month</p>
              <h3 className="text-2xl font-black text-[#1A1A2E] pt-0.5">₹{spentMonth.toLocaleString('en-IN')}</h3>
            </div>
            <ArrowUpRight size={28} className="text-[#FF6B35] bg-orange-50 p-1.5 rounded-xl shrink-0" />
          </CardContent>
        </Card>

        {/* Spent All Time Card */}
        <Card className="border-[#E2E8F0] shadow-sm rounded-2xl">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase">Disbursed All Time</p>
              <h3 className="text-2xl font-black text-[#1A1A2E] pt-0.5">₹{spentAllTime.toLocaleString('en-IN')}</h3>
            </div>
            <Landmark size={28} className="text-green-600 bg-green-50 p-1.5 rounded-xl shrink-0" />
          </CardContent>
        </Card>
      </div>

      {/* TRANSACTION HISTORY TABLE */}
      <Card className="border-[#E2E8F0] shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="pb-3 border-b border-[#F1F5F9] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-black text-[#1A1A2E]">Transaction History</CardTitle>
            <CardDescription className="text-xs text-gray-400 font-semibold">Verify deposit logs, slots holds, and attendance payouts.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter buttons */}
            <div className="flex border border-[#E2E8F0] rounded-xl overflow-hidden text-[10px] font-bold text-gray-500 bg-[#F8FAFC]">
              <button onClick={() => setFilterType('all')} className={`px-3 py-1.5 ${filterType === 'all' ? 'bg-[#1A1A2E] text-white' : 'hover:bg-gray-100'}`}>All</button>
              <button onClick={() => setFilterType('deposit')} className={`px-3 py-1.5 ${filterType === 'deposit' ? 'bg-[#1A1A2E] text-white' : 'hover:bg-gray-100'}`}>Deposits</button>
              <button onClick={() => setFilterType('withdrawal')} className={`px-3 py-1.5 ${filterType === 'withdrawal' ? 'bg-[#1A1A2E] text-white' : 'hover:bg-gray-100'}`}>Payouts</button>
            </div>

            <Button onClick={exportTransactionsToCSV} variant="outline" className="border-gray-200 text-gray-700 hover:bg-gray-50 font-bold rounded-xl flex items-center gap-1.5 text-xs h-9">
              <Download size={12} /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTransactions.length > 0 ? (
            <Table>
              <TableHeader className="bg-[#F8FAFC]">
                <TableRow>
                  <TableHead className="font-bold text-xs text-gray-400">Date</TableHead>
                  <TableHead className="font-bold text-xs text-gray-400">Description</TableHead>
                  <TableHead className="font-bold text-xs text-gray-400">Type</TableHead>
                  <TableHead className="font-bold text-xs text-gray-400 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-gray-50/50">
                    <TableCell className="text-xs text-gray-500 font-semibold">
                      {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-[#1A1A2E] max-w-[300px] truncate">
                      {tx.description}
                    </TableCell>
                    <TableCell className="capitalize text-xs font-semibold text-gray-500">
                      {tx.type}
                    </TableCell>
                    <TableCell className={`text-right font-black text-sm ${
                      Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {Number(tx.amount) > 0 ? '+' : ''}₹{Number(tx.amount).toLocaleString('en-IN')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-12 text-center text-gray-400 font-bold text-sm">
              No transactions recorded for this filter type.
            </div>
          )}
        </CardContent>
      </Card>

      {/* ADD FUNDS MODAL OVERLAY */}
      <Dialog open={showAddFundsModal} onOpenChange={setShowAddFundsModal}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-[#1A1A2E]">Escrow Wallet Deposit</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Select or input the top-up amount to proceed to payments checkout.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap gap-2">
              {['5000', '10000', '25000', '50000'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    amount === val
                      ? 'bg-orange-50 text-[#FF6B35] border-orange-200'
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  ₹{Number(val).toLocaleString('en-IN')}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-extrabold text-[#1A1A2E]">Custom Deposit Amount (₹)</Label>
              <Input
                type="number"
                min="500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border-gray-200 focus-visible:ring-[#FF6B35] rounded-xl font-bold text-sm"
              />
            </div>

            {/* Simulated scale details */}
            <div className="bg-orange-50/50 border border-orange-100/50 rounded-xl p-3.5 text-[10px] text-gray-500 font-semibold">
              ℹ️ ₹{Number(amount || 0).toLocaleString()} can secure and fund approximately{' '}
              <span className="font-extrabold text-[#1A1A2E]">
                {Math.floor(Number(amount || 0) / 200)} participant slots
              </span>{' '}
              at ₹200/each.
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowAddFundsModal(false)} className="rounded-xl border-gray-200 text-xs font-bold">
              Cancel
            </Button>
            <Button onClick={handleDepositCheckout} className="bg-[#FF6B35] hover:bg-[#E05621] text-white rounded-xl text-xs font-bold shadow-lg shadow-orange-500/10">
              Proceed to Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* LOADER OVERLAY */}
      {paymentStatus === 'processing' && (
        <div className="fixed inset-0 z-50 bg-black/40 flex justify-center items-center">
          <Card className="max-w-xs p-6 rounded-2xl items-center text-center space-y-3">
            <span className="text-gray-400 font-bold animate-pulse text-xs">Awaiting authorization from payment gateway...</span>
          </Card>
        </div>
      )}
    </div>
  );
}
