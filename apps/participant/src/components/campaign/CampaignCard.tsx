import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Campaign } from '@mobilize/shared';
import ProgressBar from '../common/ProgressBar';
import StatusBadge from '../common/StatusBadge';

interface CampaignCardProps {
  campaign: Campaign & { distance_km?: number; campaigner_rating?: number; campaigner_org_name?: string };
  onPress: () => void;
  onApply: () => void;
  onSave?: () => void;
  isSaved?: boolean;
}

export function CampaignCard({ campaign, onPress, onApply, onSave, isSaved = false }: CampaignCardProps) {
  const {
    title,
    category,
    payout,
    slots_total = 0,
    slots_filled = 0,
    is_urgent = false,
    duration_hrs = 0,
    dress_code,
    distance_km,
  } = campaign;

  // Format Category display
  const categoryDisplay = category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  // Format Date and Time
  const formatDate = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(`${dateStr}T${timeStr}`);
      return date.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return `${dateStr} • ${timeStr}`;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.95}
      className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-[#F1F5F9]"
    >
      {/* Top badges row */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row space-x-1.5">
          <StatusBadge status="active" label={categoryDisplay} />
          {is_urgent && <StatusBadge status="urgent" label="URGENT" />}
        </View>
        <Text className="text-2xl font-black text-[#22C55E]">₹{payout}</Text>
      </View>

      {/* Title */}
      <Text className="text-lg font-bold text-[#1A1A2E] leading-6 mb-1" numberOfLines={2}>
        {title}
      </Text>

      {/* Organizer Row */}
      <View className="flex-row items-center mb-4">
        <Text className="text-xs font-semibold text-gray-500 mr-2">
          By {campaign.campaigner_org_name || campaign.campaigner?.org_name || 'Organizer'}
        </Text>
        <View className="flex-row items-center bg-[#F8FAFC] px-1.5 py-0.5 rounded-md">
          <Text className="text-[10px] text-yellow-500 mr-0.5">★</Text>
          <Text className="text-[10px] font-bold text-gray-600">
            {campaign.campaigner_rating || campaign.campaigner?.rating || '0.0'}
          </Text>
        </View>
      </View>

      {/* Details list */}
      <View className="space-y-1.5 mb-4 border-t border-[#F8FAFC] pt-3">
        <View className="flex-row items-center">
          <Text className="text-sm mr-2">📍</Text>
          <Text className="text-xs text-gray-600 font-medium">
            {distance_km !== undefined ? `${distance_km.toFixed(1)} km away` : campaign.location_name}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-sm mr-2">📅</Text>
          <Text className="text-xs text-gray-600 font-medium">
            {formatDate(campaign.date || (campaign as any).event_date, campaign.start_time)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-sm mr-2">⏱️</Text>
          <Text className="text-xs text-gray-600 font-medium">{duration_hrs} hours duration</Text>
        </View>
        {dress_code && (
          <View className="flex-row items-center">
            <Text className="text-sm mr-2">👗</Text>
            <Text className="text-xs text-gray-600 font-medium">Dress: {dress_code}</Text>
          </View>
        )}
      </View>

      {/* Slots fill bar */}
      <View className="mb-4">
        <ProgressBar current={slots_filled} total={slots_total} showLabel />
      </View>

      {/* Bottom Button Actions */}
      <View className="flex-row space-x-3 mt-1">
        {onSave && (
          <TouchableOpacity
            onPress={onSave}
            className={`flex-1 border py-3 rounded-2xl items-center justify-center ${
              isSaved ? 'bg-orange-50 border-[#FF6B35]' : 'bg-white border-[#E2E8F0]'
            }`}
            activeOpacity={0.8}
          >
            <Text className={`text-sm font-bold ${isSaved ? 'text-[#FF6B35]' : 'text-gray-600'}`}>
              {isSaved ? '♥ Saved' : '♡ Save'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={onApply}
          className="flex-2 bg-[#FF6B35] py-3 rounded-2xl items-center justify-center shadow-sm shadow-orange-500/10 flex-grow"
          activeOpacity={0.8}
        >
          <Text className="text-white text-sm font-bold">Apply Now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
export default CampaignCard;
