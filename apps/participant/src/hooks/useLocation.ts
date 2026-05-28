import * as Location from 'expo-location';
import api from '../lib/api';

export function useLocation() {
  const requestPermission = async (): Promise<boolean> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.error('Error requesting location permissions:', err);
      return false;
    }
  };

  const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        console.warn('Location permission denied.');
        return null;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch (err) {
      console.error('Error getting current location:', err);
      return null;
    }
  };

  const updateLocationOnServer = async (lat: number, lng: number): Promise<boolean> => {
    try {
      await api.patch('/user/location', { lat, lng });
      return true;
    } catch (err) {
      console.error('Failed to sync location coordinates with server:', err);
      return false;
    }
  };

  return {
    requestPermission,
    getCurrentLocation,
    updateLocationOnServer,
  };
}
export default useLocation;
