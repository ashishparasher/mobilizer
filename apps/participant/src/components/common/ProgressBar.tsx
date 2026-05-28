import React from 'react';
import { View, Text } from 'react-native';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabel?: boolean;
}

export function ProgressBar({ current, total, showLabel = false }: ProgressBarProps) {
  const percentage = total > 0 ? Math.min(100, Math.max(0, (current / total) * 100)) : 0;

  // Determine bar color based on occupancy percentage
  let barColorClass = 'bg-[#22C55E]'; // Green
  if (percentage >= 60 && percentage <= 85) {
    barColorClass = 'bg-orange-500'; // Orange
  } else if (percentage > 85) {
    barColorClass = 'bg-red-500'; // Red
  }

  return (
    <View className="w-full">
      {showLabel && (
        <View className="flex-row justify-between items-center mb-1">
          <Text className="text-xs font-semibold text-gray-500">Slots Filled</Text>
          <Text className="text-xs font-bold text-[#1A1A2E]">
            {current}/{total} ({Math.round(percentage)}%)
          </Text>
        </View>
      )}
      <View className="h-2 w-full bg-[#E2E8F0] rounded-full overflow-hidden">
        <View 
          className={`h-full rounded-full ${barColorClass}`} 
          style={{ width: `${percentage}%` }}
        />
      </View>
    </View>
  );
}
export default ProgressBar;
