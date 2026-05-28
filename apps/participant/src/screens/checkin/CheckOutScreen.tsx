import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import api from '../../lib/api';

type CheckOutScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export function CheckOutScreen({ navigation, route }: CheckOutScreenProps) {
  const { campaign_id } = (route.params || {}) as any;

  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<any>(null);
  const [checkin, setCheckin] = useState<any>(null);
  
  // Live Timer states
  const [hoursAttended, setHoursAttended] = useState<number>(0);
  const [timerText, setTimerText] = useState<string>('00:00:00');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any | null>(null);

  // 1. Fetch checkin status and campaign on mount
  useEffect(() => {
    fetchSessionDetails();
  }, [campaign_id]);

  // 2. Start live ticking timer
  useEffect(() => {
    if (!checkin) return;

    const interval = setInterval(() => {
      const start = new Date(checkin.checkin_time).getTime();
      const now = new Date().getTime();
      const diffMs = now - start;

      // Hours count
      const hrs = diffMs / (1000 * 60 * 60);
      setHoursAttended(Math.max(0.01, hrs));

      // Human-readable HH:MM:SS
      const diffSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;
      
      const formatNum = (n: number) => n.toString().padStart(2, '0');
      setTimerText(`${formatNum(hours)}:${formatNum(mins)}:${formatNum(secs)}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [checkin]);

  const fetchSessionDetails = async () => {
    try {
      const campData = await api.get(`/campaigns/${campaign_id}`);
      setCampaign(campData);

      const statusData = await api.get(`/checkin/status/${campaign_id}`);
      if (statusData && statusData.checkin) {
        setCheckin(statusData.checkin);
      } else {
        Alert.alert('Session Not Found', 'No active check-in session matches this event.');
        navigation.goBack();
      }
    } catch (err) {
      console.error('Error fetching checkout details:', err);
      Alert.alert('Error', 'Failed to retrieve checkin session details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    // 1. Get GPS coordinates for checkout location logs
    let location;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      }
    } catch (e) {
      // Ignore location get error, default to campaign center
    }

    const checkoutLat = location?.coords?.latitude || campaign?.location?.coordinates[1] || 12.9716;
    const checkoutLng = location?.coords?.longitude || campaign?.location?.coordinates[0] || 77.5946;

    // Calculate payout variables for confirmation dialog
    const targetDuration = Number(campaign?.duration_hrs || 1);
    const fullPayout = Number(campaign?.payout || 0);
    const minHours = targetDuration * 0.8;
    
    let basePayout = 0;
    if (hoursAttended >= minHours) {
      basePayout = fullPayout;
    } else {
      basePayout = (hoursAttended / targetDuration) * fullPayout;
    }

    // Bonuses
    let bonusPayout = 0;
    if (campaign?.has_punctuality_bonus) {
      // Approximate checkin on time
      const parts = campaign.start_time.split(':');
      const eventStart = new Date(campaign.event_date || campaign.date);
      eventStart.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10) || 0, 0, 0);
      const cutoff = new Date(eventStart.getTime() + 15 * 60 * 1000);
      if (new Date(checkin.checkin_time) <= cutoff) {
        bonusPayout += Number(campaign.punctuality_bonus_amount || 0);
      }
    }

    if (campaign?.has_duration_bonus && hoursAttended >= targetDuration) {
      bonusPayout += Number(campaign.duration_bonus_amount || 0);
    }

    const estimatedPayout = Math.max(0, Math.round((basePayout + bonusPayout) * 100) / 100);

    Alert.alert(
      'Checkout Confirmation',
      `Are you sure you want to end participation? You have attended ${hoursAttended.toFixed(2)} hrs.\nEstimated payout: ₹${estimatedPayout}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Checkout',
          style: 'destructive',
          onPress: async () => {
            setIsCheckingOut(true);
            try {
              const response = await api.post('/checkin/checkout', {
                campaign_id,
                lat: checkoutLat,
                lng: checkoutLng,
              });
              setCheckoutResult(response);
            } catch (err: any) {
              Alert.alert('Checkout Failed', err.message || 'Checkout failed.');
            } finally {
              setIsCheckingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (checkoutResult) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center p-6">
        <Text className="text-8xl mb-6">💰</Text>
        <Text className="text-2xl font-black text-green-600 mb-2">Checked Out Successfully!</Text>
        <Text className="text-gray-500 text-center mb-8 px-6">
          Hours attended: {checkoutResult.hours_attended?.toFixed(2) || '0.00'} hrs{'\n'}
          Base payout + bonuses: ₹{checkoutResult.payout_amount || 0}{'\n'}
          Escrow payment is pending campaigner release.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.replace('MyEvents')}
          className="w-full bg-[#1A1A2E] py-4 rounded-xl items-center"
        >
          <Text className="text-white font-bold">Close</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const durationHrs = Number(campaign?.duration_hrs || 1);
  const minHrs = durationHrs * 0.8;
  const progressRatio = Math.min(1.0, hoursAttended / durationHrs);

  // Live Payout previews
  let displayPayoutText = 'Calculated proportionally';
  let payoutPreviewAmount = 0;
  if (hoursAttended >= minHrs) {
    payoutPreviewAmount = Number(campaign?.payout || 0);
    displayPayoutText = 'Full base payment achieved!';
  } else {
    payoutPreviewAmount = Math.round(((hoursAttended / durationHrs) * Number(campaign?.payout || 0)) * 100) / 100;
    displayPayoutText = 'Proportional base payment';
  }

  // Bonuses preview
  let punctualityBonus = 0;
  let durationBonus = 0;
  if (campaign?.has_punctuality_bonus) {
    punctualityBonus = Number(campaign.punctuality_bonus_amount || 0);
  }
  if (campaign?.has_duration_bonus && hoursAttended >= durationHrs) {
    durationBonus = Number(campaign.duration_bonus_amount || 0);
  }

  const totalPreviewAmount = payoutPreviewAmount + punctualityBonus + durationBonus;

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-[#F1F5F9] bg-white">
        <Text className="text-base font-bold text-[#1A1A2E]" numberOfLines={1}>
          ⏱️ Active Session
        </Text>
        <Text className="text-xs text-gray-400">
          Checked in at: {new Date(checkin?.checkin_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>

      <View className="flex-1 p-6 justify-between">
        {/* TIMER DISPLAY */}
        <View className="items-center mt-6">
          <Text className="text-sm font-bold text-gray-400 uppercase tracking-widest">Attended Duration</Text>
          <Text className="text-5xl font-black text-[#1A1A2E] mt-3 mb-6 font-mono tracking-tight">
            {timerText}
          </Text>

          {/* Progress Bar Container */}
          <View className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden mb-2">
            <View
              className="bg-[#22C55E] h-full rounded-full"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </View>

          <View className="flex-row justify-between w-full text-xs font-bold text-gray-500 mb-6">
            <Text>Start</Text>
            <Text>{minHrs.toFixed(1)} hrs needed (80%)</Text>
            <Text>{durationHrs} hrs total</Text>
          </View>
        </View>

        {/* PAYOUT PREVIEW */}
        <View className="bg-[#F8FAFC] border border-[#F1F5F9] p-5 rounded-2xl space-y-3.5">
          <Text className="text-xs font-black text-[#1A1A2E] uppercase tracking-wider">Live Earnings Summary</Text>
          
          <View className="flex-row justify-between text-xs">
            <Text className="text-gray-500 font-semibold">Attendance Pay ({hoursAttended.toFixed(2)} hrs)</Text>
            <Text className="font-extrabold text-[#1A1A2E]">₹{payoutPreviewAmount.toFixed(0)}</Text>
          </View>

          {campaign?.has_punctuality_bonus && (
            <div className="flex justify-between text-xs" style={{ display: 'flex', flexDirection: 'row' }}>
              <Text className="text-gray-500 font-semibold">Punctuality Bonus</Text>
              <Text className="font-extrabold text-orange-600">+₹{punctualityBonus}</Text>
            </div>
          )}

          {campaign?.has_duration_bonus && (
            <div className="flex justify-between text-xs" style={{ display: 'flex', flexDirection: 'row' }}>
              <Text className="text-gray-500 font-semibold">Full Duration Bonus</Text>
              <Text className="font-extrabold text-blue-600">+₹{durationBonus}</Text>
            </div>
          )}

          <View className="border-t border-[#F1F5F9] pt-3 flex-row justify-between items-baseline">
            <Text className="text-xs font-black text-[#1A1A2E] uppercase">Total Payout Estimation</Text>
            <Text className="text-2xl font-black text-green-600">₹{totalPreviewAmount.toFixed(0)}</Text>
          </View>
        </View>

        {/* CHECKOUT BUTTON */}
        <View>
          <TouchableOpacity
            onPress={handleCheckout}
            disabled={isCheckingOut}
            className="w-full bg-[#FF6B35] py-4 rounded-xl items-center justify-center shadow-lg shadow-orange-500/20"
          >
            {isCheckingOut ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">End Participation & Checkout</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default CheckOutScreen;
