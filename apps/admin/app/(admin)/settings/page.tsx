'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, X, Save, AlertTriangle } from 'lucide-react';

const DEFAULT_FLAGGED_KEYWORDS = [
  'cash only', 'no id required', 'no questions asked',
  'anonymous payment', 'guaranteed money', 'secret assignment',
  'fake protest', 'paid crowd',
];

export default function SettingsPage() {
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_FLAGGED_KEYWORDS);
  const [newKeyword, setNewKeyword] = useState('');
  const [platformFee, setPlatformFee] = useState('8');
  const [autoFlagPayout, setAutoFlagPayout] = useState('5000');
  const [autoFlagSlots, setAutoFlagSlots] = useState('5000');
  const [saving, setSaving] = useState(false);

  function addKeyword() {
    const kw = newKeyword.trim().toLowerCase();
    if (!kw) return;
    if (keywords.includes(kw)) { toast.error('Keyword already in list'); return; }
    setKeywords(prev => [...prev, kw]);
    setNewKeyword('');
    toast.success(`"${kw}" added to flagged keywords`);
  }

  function removeKeyword(kw: string) {
    setKeywords(prev => prev.filter(k => k !== kw));
    toast.success(`"${kw}" removed`);
  }

  async function saveSettings() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800)); // Simulated save
    setSaving(false);
    toast.success('Settings saved successfully');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure platform-wide rules and thresholds</p>
      </div>

      {/* Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-yellow-700">
          Changes to these settings affect the entire platform. Review carefully before saving.
          Settings currently stored in-memory — connect to your config database to persist.
        </p>
      </div>

      {/* Platform Fee */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Platform Fee</h3>
        <p className="text-xs text-slate-500 mb-4">Percentage deducted from each campaign payout as platform revenue</p>
        <div className="flex items-center gap-3">
          <input
            type="number"
            value={platformFee}
            onChange={e => setPlatformFee(e.target.value)}
            min="0"
            max="30"
            step="0.5"
            className="w-32 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <span className="text-sm font-semibold text-slate-700">% per payout</span>
        </div>
      </div>

      {/* Auto-flag Thresholds */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Auto-Flag Thresholds</h3>
        <p className="text-xs text-slate-500 mb-4">Campaigns exceeding these values are automatically flagged for review</p>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Max payout per person</p>
              <p className="text-xs text-slate-400">Campaigns above this payout auto-flag</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">₹</span>
              <input
                type="number"
                value={autoFlagPayout}
                onChange={e => setAutoFlagPayout(e.target.value)}
                className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-right"
              />
            </div>
          </div>
          <div className="h-px bg-slate-100" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">Max participant slots</p>
              <p className="text-xs text-slate-400">Campaigns above this slot count auto-flag</p>
            </div>
            <input
              type="number"
              value={autoFlagSlots}
              onChange={e => setAutoFlagSlots(e.target.value)}
              className="w-28 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 text-right"
            />
          </div>
        </div>
      </div>

      {/* Flagged Keywords */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Flagged Keywords</h3>
        <p className="text-xs text-slate-500 mb-4">
          Campaign descriptions containing these phrases are auto-flagged for review
        </p>

        {/* Add Keyword */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newKeyword}
            onChange={e => setNewKeyword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addKeyword()}
            placeholder="Enter keyword or phrase..."
            className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300"
          />
          <button
            onClick={addKeyword}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Keyword List */}
        <div className="flex flex-wrap gap-2">
          {keywords.map(kw => (
            <span
              key={kw}
              className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-2.5 py-1.5 rounded-lg"
            >
              {kw}
              <button
                onClick={() => removeKeyword(kw)}
                className="text-red-400 hover:text-red-700 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl disabled:opacity-60 transition-colors"
      >
        {saving ? (
          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
        ) : (
          <><Save className="w-4 h-4" /> Save Settings</>
        )}
      </button>
    </div>
  );
}
