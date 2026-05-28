import React from 'react';
import { View, Text } from 'react-native';
import { ApplicationStatus } from '@mobilize/shared';

interface StatusBadgeProps {
  status: ApplicationStatus | 'active' | 'completed' | 'urgent';
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ');

  let bgClass = 'bg-gray-100';
  let textClass = 'text-gray-600';
  let borderClass = 'border-gray-200';

  switch (status) {
    case 'confirmed':
      bgClass = 'bg-green-50';
      textClass = 'text-green-700 font-bold';
      borderClass = 'border-green-200';
      break;
    case 'pending':
      bgClass = 'bg-yellow-50';
      textClass = 'text-yellow-700 font-bold';
      borderClass = 'border-yellow-200';
      break;
    case 'rejected':
      bgClass = 'bg-red-50';
      textClass = 'text-red-700 font-bold';
      borderClass = 'border-red-200';
      break;
    case 'waitlisted':
      bgClass = 'bg-blue-50';
      textClass = 'text-blue-700 font-bold';
      borderClass = 'border-blue-200';
      break;
    case 'active':
    case 'urgent':
      bgClass = 'bg-orange-50';
      textClass = 'text-orange-700 font-bold';
      borderClass = 'border-orange-200';
      break;
    case 'completed':
      bgClass = 'bg-green-100';
      textClass = 'text-green-800 font-bold';
      borderClass = 'border-green-300';
      break;
    case 'no_show':
    case 'cancelled':
    default:
      bgClass = 'bg-gray-100';
      textClass = 'text-gray-600 font-semibold';
      borderClass = 'border-gray-300';
      break;
  }

  return (
    <View className={`px-3 py-1 rounded-full border ${bgClass} ${borderClass}`}>
      <Text className={`text-xs ${textClass}`}>{displayLabel}</Text>
    </View>
  );
}
export default StatusBadge;
