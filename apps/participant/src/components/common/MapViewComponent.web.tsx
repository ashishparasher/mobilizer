import React from 'react';
import { View, Text } from 'react-native';
import type { MapViewComponentProps } from './MapViewComponent';

export default function MapViewComponent({ latitude, longitude, className }: MapViewComponentProps) {
  return (
    <View className={`bg-gray-200 justify-center items-center rounded-xl border border-gray-300 ${className || 'h-48'}`}>
      <Text className="text-gray-500 font-semibold text-center">
        Map view not supported on Web.
        {'\n'}Lat: {latitude}, Lng: {longitude}
      </Text>
    </View>
  );
}
