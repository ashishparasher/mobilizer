'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Mail, Loader2, X } from 'lucide-react';

interface BroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignId: string;
  targetUserIds?: string[];
}

export default function BroadcastModal({
  isOpen,
  onClose,
  campaignId,
  targetUserIds = [],
}: BroadcastModalProps) {
  const [message, setMessage] = useState('');
  const [targetScope, setTargetScope] = useState('all');
  const [loading, setLoading] = useState(false);

  const maxChars = 500;

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      toast.error('Message content is required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        message,
        targetScope: targetUserIds.length > 0 ? undefined : targetScope,
        targetUserIds: targetUserIds.length > 0 ? targetUserIds : undefined,
      };

      await api.post(`/campaigns/${campaignId}/broadcast`, payload);
      toast.success('Broadcast sent successfully!', { description: `Alerts dispatched to target participants.` });
      setMessage('');
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to broadcast message');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-[#E2E8F0] shadow-2xl rounded-2xl w-full max-w-md overflow-hidden relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>

        <form onSubmit={handleSend}>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-[#1A1A2E]">
              <Mail className="text-[#FF6B35]" size={20} />
              <div>
                <h3 className="font-black text-base">Broadcast Message</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Send Instant Push Alert</p>
              </div>
            </div>

            {/* Target Scope Dropdown (only visible if no specific target user list is selected) */}
            {targetUserIds.length === 0 ? (
              <div className="space-y-1">
                <Label htmlFor="target" className="text-xs font-extrabold text-[#1A1A2E]">
                  Target Scope
                </Label>
                <Select value={targetScope} onValueChange={(val) => setTargetScope(val || 'all')}>
                  <SelectTrigger className="border-[#E2E8F0] rounded-xl text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Applicants</SelectItem>
                    <SelectItem value="confirmed">Confirmed Only</SelectItem>
                    <SelectItem value="pending">Pending Roster Only</SelectItem>
                    <SelectItem value="waitlisted">Waitlisted Roster Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-100 rounded-xl p-2.5 text-[11px] font-bold text-orange-800">
                Direct alert to {targetUserIds.length} selected participant(s)
              </div>
            )}

            {/* Message input */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="msg" className="text-xs font-extrabold text-[#1A1A2E]">
                  Message Body
                </Label>
                <span className="text-[10px] text-gray-400 font-bold">
                  {message.length} / {maxChars}
                </span>
              </div>
              <textarea
                id="msg"
                rows={4}
                maxLength={maxChars}
                placeholder="Type your message updates here..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full text-xs border border-[#E2E8F0] focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] rounded-xl p-3 outline-none resize-none font-semibold text-gray-700"
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 rounded-xl border-[#E2E8F0] font-bold text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !message.trim()}
                className="flex-1 bg-[#FF6B35] hover:bg-[#E05621] text-white font-bold rounded-xl text-xs py-5"
              >
                {loading ? (
                  <>
                    <Loader2 size={12} className="animate-spin mr-1" /> Dispatched...
                  </>
                ) : (
                  'Send Broadcast 🚀'
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
