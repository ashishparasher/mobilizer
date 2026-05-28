import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, StyleSheet, Animated } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Camera, CameraView } from 'expo-camera';
import api from '../../lib/api';

type CheckInScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export function CheckInScreen({ navigation, route }: CheckInScreenProps) {
  const { campaign_id } = (route.params || {}) as any;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  
  // Location States
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState<string>('Detecting location...');
  const [distance, setDistance] = useState<number | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  // Fallbacks
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [checkinSuccess, setCheckinSuccess] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cameraRef = useRef<any>(null);

  // 1. Fetch campaign on mount
  useEffect(() => {
    fetchCampaignDetails();
    startPulseAnimation();
  }, [campaign_id]);

  // 2. Track user location on mount
  useEffect(() => {
    let subscription: any;
    
    async function startLocationTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permissions are required to check-in.');
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 5,
        },
        async (loc) => {
          const { latitude, longitude } = loc.coords;
          setCurrentCoords({ lat: latitude, lng: longitude });

          // Get location name
          try {
            const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
            if (geocoded && geocoded.length > 0) {
              const place = geocoded[0];
              setLocationName(`${place.district || place.city || ''}, ${place.subregion || place.name || ''}`);
            }
          } catch (e) {
            // Ignore reverse geocode error
          }
        }
      );
    }

    startLocationTracking();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);

  // 3. Compute distance in real-time
  useEffect(() => {
    if (campaign && currentCoords) {
      const campLng = campaign.location?.coordinates ? campaign.location.coordinates[0] : 77.5946;
      const campLat = campaign.location?.coordinates ? campaign.location.coordinates[1] : 12.9716;
      
      const dist = calculateHaversineDistance(
        currentCoords.lat,
        currentCoords.lng,
        campLat,
        campLng
      );
      setDistance(dist);
    }
  }, [campaign, currentCoords]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const calculateHaversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000; // Earth radius in meters
    const radLat1 = (lat1 * Math.PI) / 180;
    const radLat2 = (lat2 * Math.PI) / 180;
    const diffLat = ((lat2 - lat1) * Math.PI) / 180;
    const diffLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
      Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(diffLng / 2) * Math.sin(diffLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchCampaignDetails = async () => {
    try {
      const data = await api.get(`/campaigns/${campaign_id}`);
      setCampaign(data);
    } catch (err) {
      console.error('Error fetching campaign details for check-in:', err);
      Alert.alert('Error', 'Failed to retrieve campaign setup details.');
    } finally {
      setLoading(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
    return status === 'granted';
  };

  const handleCheckIn = async () => {
    if (!currentCoords) {
      Alert.alert('Detecting Coordinates', 'Please wait for your location to resolve.');
      return;
    }
    setIsCheckingIn(true);
    try {
      const response = await api.post('/checkin', {
        campaign_id,
        lat: currentCoords.lat,
        lng: currentCoords.lng,
        selfie_url: capturedSelfie,
      });

      if (response) {
        setCheckinSuccess(true);
      }
    } catch (err: any) {
      Alert.alert('Check-In Failed', err.message || 'Proximity check failed. Ensure you are at the event.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleQRScan = async ({ data }: { data: string }) => {
    setShowQRScanner(false);
    
    // Check if QR code matches campaign ID
    if (data === campaign_id) {
      setIsCheckingIn(true);
      try {
        // Run check-in bypass using QR code (allows checkin with mock coordinates if needed)
        const response = await api.post('/checkin', {
          campaign_id,
          lat: currentCoords?.lat || campaign.location.coordinates[1],
          lng: currentCoords?.lng || campaign.location.coordinates[0],
          selfie_url: capturedSelfie,
        });

        if (response) {
          setCheckinSuccess(true);
        }
      } catch (err: any) {
        Alert.alert('Check-In Failed', err.message || 'QR validation failed.');
      } finally {
        setIsCheckingIn(false);
      }
    } else {
      Alert.alert('Invalid QR Code', 'This QR code does not match this event venue.');
    }
  };

  const handleTakePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        setCapturedSelfie(photo.uri);
        setShowSelfieCamera(false);
        Alert.alert('Success', 'Selfie captured successfully! Complete check-in to confirm presence.');
      } catch (err) {
        Alert.alert('Capture Failed', 'Failed to take photo.');
      }
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (checkinSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-6">
        <Text className="text-8xl mb-6">🎉</Text>
        <Text className="text-2xl font-black text-green-600 mb-2">Checked In Successfully!</Text>
        <Text className="text-gray-500 text-center mb-8 px-6">
          Check-in time: {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}{'\n'}
          Remember to check out after the event to receive ₹{campaign?.payout || 0} payout.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.replace('MyEvents')}
          className="w-full bg-[#1A1A2E] py-4 rounded-xl items-center"
        >
          <Text className="text-white font-bold">Go to My Events</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (showQRScanner) {
    return (
      <View className="flex-1 bg-black justify-center">
        <CameraView
          className="absolute inset-0"
          onBarcodeScanned={handleQRScan}
        />
        <View className="absolute bottom-10 left-6 right-6">
          <TouchableOpacity
            onPress={() => setShowQRScanner(false)}
            className="bg-[#FF6B35] py-4 rounded-xl items-center"
          >
            <Text className="text-white font-bold">Cancel QR Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showSelfieCamera) {
    return (
      <View className="flex-1 bg-black justify-center">
        <CameraView
          ref={cameraRef}
          className="absolute inset-0"
          facing="front"
        />
        <View className="absolute bottom-10 left-6 right-6 flex-row justify-between">
          <TouchableOpacity
            onPress={() => setShowSelfieCamera(false)}
            className="bg-white/30 border border-white py-4 px-6 rounded-xl"
          >
            <Text className="text-white font-bold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleTakePicture}
            className="bg-[#FF6B35] py-4 px-8 rounded-xl"
          >
            <Text className="text-white font-bold">Snap Selfie</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isWithinRange = distance !== null && distance <= 200;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-[#F1F5F9] bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 rounded-full bg-[#F8FAFC]">
          <Text className="text-lg font-bold text-[#1A1A2E]">←</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-[#1A1A2E]" numberOfLines={1}>
          {campaign.title}
        </Text>
        <TouchableOpacity
          onPress={() => Alert.alert('Contact', `Organizer Contact: ${campaign.campaigner?.org_name || 'Coordinator'}`)}
          className="px-3 py-1.5 rounded-full bg-[#F1F5F9]"
        >
          <Text className="text-xs font-bold text-gray-600">Contact</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 p-6 justify-between">
        {/* TOP STATUS */}
        <View className="items-center">
          <Text className="text-xs text-orange-600 font-extrabold tracking-widest bg-orange-50 px-3 py-1.5 rounded-full">
            📍 ACTION REQUIRED: CHECK IN
          </Text>
          
          <Animated.View
            style={{ transform: [{ scale: pulseAnim }] }}
            className="w-24 h-24 bg-orange-100 rounded-full justify-center items-center my-6"
          >
            <Text className="text-4xl">📍</Text>
          </Animated.View>

          <Text className="text-sm font-bold text-gray-500 mb-1">Your location:</Text>
          <Text className="text-base font-black text-[#1A1A2E] text-center mb-6 px-4">
            {locationName}
          </Text>

          {/* Distance Indicator */}
          {distance !== null ? (
            <View className="items-center">
              <Text className="text-gray-500 font-medium">Distance to venue:</Text>
              <Text className="text-3xl font-black text-[#1A1A2E] mt-1 mb-2">
                {distance.toFixed(0)}m
              </Text>
              <Text className={`text-xs font-bold ${isWithinRange ? 'text-green-600' : 'text-red-500'}`}>
                {isWithinRange
                  ? '✅ You\'re at the venue! Check in now.'
                  : `📍 Move ${(distance - 200).toFixed(0)}m closer to check in (200m required).`}
              </Text>
            </View>
          ) : (
            <Text className="text-xs font-bold text-gray-400">Calculating distance...</Text>
          )}
        </View>

        {/* SELFIE BUTTON FOR URGENT CAMPAIGNS */}
        <View className="space-y-4">
          <TouchableOpacity
            onPress={async () => {
              const allowed = await requestCameraPermission();
              if (allowed) setShowSelfieCamera(true);
            }}
            className="w-full bg-[#F8FAFC] border border-gray-200 py-3.5 rounded-xl flex-row justify-center items-center space-x-2"
          >
            <Text className="text-sm font-bold text-gray-700">
              {capturedSelfie ? '📸 Selfie Captured' : '🤳 Take Selfie Check-In Image (Required)'}
            </Text>
          </TouchableOpacity>

          {/* SUBMIT CHECK-IN */}
          <TouchableOpacity
            onPress={handleCheckIn}
            disabled={!isWithinRange || isCheckingIn}
            className={`w-full py-4 rounded-xl items-center justify-center ${
              isWithinRange && !isCheckingIn
                ? 'bg-[#FF6B35]'
                : 'bg-gray-200'
            }`}
          >
            {isCheckingIn ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className={`font-bold ${isWithinRange ? 'text-white' : 'text-gray-400'}`}>
                {isWithinRange ? 'CHECK IN' : `Move closer to enable check-in`}
              </Text>
            )}
          </TouchableOpacity>

          {/* QR CODE FALLBACK LINK */}
          <TouchableOpacity
            onPress={async () => {
              const allowed = await requestCameraPermission();
              if (allowed) setShowQRScanner(true);
            }}
            className="py-2.5 items-center"
          >
            <Text className="text-xs font-bold text-gray-400 underline">Can't use GPS? Scan Event QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default CheckInScreen;
