import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Reusable empty state component for list screens.
 */
export default function EmptyState({ icon, title, subtitle, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View className="flex-1 justify-center items-center py-16 px-6">
      <View
        style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#FFF7ED',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 36 }}>{icon}</Text>
      </View>
      <Text className="text-lg font-black text-[#1A1A2E] text-center mb-1">{title}</Text>
      {subtitle && (
        <Text className="text-sm text-gray-500 text-center max-w-[260px] mb-6">{subtitle}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          className="bg-[#FF6B35] px-6 py-3 rounded-xl"
          activeOpacity={0.8}
        >
          <Text className="text-white font-bold text-sm">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
