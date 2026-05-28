import React from 'react';
import MapView, { Marker } from 'react-native-maps';

export interface MapViewComponentProps {
  latitude: number;
  longitude: number;
  className?: string;
}

export default function MapViewComponent({ latitude, longitude, className }: MapViewComponentProps) {
  return (
    <MapView
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }}
      className={className}
    >
      <Marker coordinate={{ latitude, longitude }} />
    </MapView>
  );
}
