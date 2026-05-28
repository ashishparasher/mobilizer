import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import api from '../../lib/api';
import * as Location from 'expo-location';
import StatusBadge from '../../components/common/StatusBadge';

type MyEventsScreenProps = {
  navigation: any;
};

export function MyEventsScreen({ navigation }: MyEventsScreenProps) {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'applied' | 'past'>('upcoming');
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Banner state
  const [activeBannerEvent, setActiveBannerEvent] = useState<any | null>(null);
  const [bannerDistance, setBannerDistance] = useState<string | null>(null);

  useEffect(() => {
    fetchMyEvents();
  }, []);

  // Monitor location and compute banner distances if event today
  useEffect(() => {
    if (applications.length > 0) {
      checkTodayEvents();
    }
  }, [applications]);

  const fetchMyEvents = async () => {
    setLoading(true);
    try {
      const data = await api.get('/applications/my');
      setApplications(data || []);
    } catch (err) {
      console.error('Failed to load my schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkTodayEvents = async () => {
    // Find confirmed upcoming event today
    const today = new Date().toDateString();
    
    const todayConfirmedApp = applications.find(app => {
      const campaign = app.campaign || {};
      const eventDate = new Date(campaign.event_date || campaign.date).toDateString();
      return app.status === 'confirmed' && eventDate === today;
    });

    if (todayConfirmedApp) {
      setActiveBannerEvent(todayConfirmedApp);
      // Run quick GPS distance calculation
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const camp = todayConfirmedApp.campaign;
          if (camp.location?.coordinates) {
            const dist = calculateHaversine(
              loc.coords.latitude,
              loc.coords.longitude,
              camp.location.coordinates[1],
              camp.location.coordinates[0]
            );
            if (dist >= 1000) {
              setBannerDistance(`${(dist / 1000).toFixed(1)}km`);
            } else {
              setBannerDistance(`${dist.toFixed(0)}m`);
            }
          }
        }
      } catch (e) {
        // Location check fail
      }
    } else {
      setActiveBannerEvent(null);
      setBannerDistance(null);
    }
  };

  const calculateHaversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
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

  const handleCancelApplication = (appId: string) => {
    Alert.alert(
      'Cancel Application',
      'Are you sure you want to withdraw your application from this event?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/applications/${appId}`);
              Alert.alert('Success', 'Application withdrawn successfully');
              fetchMyEvents();
            } catch (err: any) {
              Alert.alert('Failed', err.message || 'Unable to cancel application');
            }
          },
        },
      ]
    );
  };

  const handleNavigateCheckIn = async (campaignId: string) => {
    try {
      const statusData = await api.get(`/checkin/status/${campaignId}`);
      if (statusData && statusData.status === 'checked_in') {
        navigation.navigate('CheckOutScreen', { campaign_id: campaignId });
      } else {
        navigation.navigate('CheckInScreen', { campaign_id: campaignId });
      }
    } catch (e) {
      navigation.navigate('CheckInScreen', { campaign_id: campaignId });
    }
  };

  // Helper: check if event day is today and time is within 2 hours of start time
  const canCheckIn = (dateStr: string, timeStr: string) => {
    try {
      const today = new Date().toDateString();
      const eventDay = new Date(dateStr).toDateString();
      if (today !== eventDay) return false;

      const parts = timeStr.split(' ');
      const [hoursStr, minutesStr] = parts[0].split(':');
      let hours = parseInt(hoursStr, 10) || 0;
      const minutes = parseInt(minutesStr, 10) || 0;

      if (parts[1]) {
        const modifier = parts[1].toLowerCase();
        if (modifier === 'pm' && hours < 12) hours += 12;
        if (modifier === 'am' && hours === 12) hours = 0;
      }

      const eventTime = new Date();
      eventTime.setHours(hours, minutes, 0, 0);

      const now = new Date();
      const diffMs = eventTime.getTime() - now.getTime();
      const diffHrs = diffMs / (1000 * 60 * 60);

      // Opens check-in 2 hours before start and up to 4 hours after
      return diffHrs <= 2 && diffHrs >= -4;
    } catch {
      return false;
    }
  };

  // Filter application sets
  const getFilteredData = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return applications.filter(app => {
      const campaign = app.campaign || {};
      const eventDate = new Date(campaign.event_date || campaign.date);

      if (activeTab === 'upcoming') {
        return app.status === 'confirmed' && eventDate >= today;
      } else if (activeTab === 'applied') {
        return ['pending', 'waitlisted'].includes(app.status);
      } else if (activeTab === 'past') {
        return eventDate < today || app.status === 'no_show' || app.status === 'rejected';
      }
      return false;
    });
  };

  const formatDateLabel = (dateStr: string, timeStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      if (date.toDateString() === today.toDateString()) {
        return `Today at ${timeStr}`;
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow at ${timeStr}`;
      } else {
        return date.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        }) + ` at ${timeStr}`;
      }
    } catch {
      return `${dateStr} ${timeStr}`;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* Page Header */}
      <View className="px-6 py-4 bg-white border-b border-[#E2E8F0] items-center justify-center">
        <Text className="text-xl font-bold text-[#1A1A2E]">My Events</Text>
      </View>

      {/* EVENT DAY URGENT BANNER */}
      {activeBannerEvent && (
        <View className="bg-orange-50 border-b border-orange-100 px-6 py-4 flex-row justify-between items-center">
          <View className="flex-1 mr-3">
            <Text className="text-xs font-black text-orange-600 uppercase tracking-wider">🚨 Event Today</Text>
            <Text className="text-sm font-bold text-[#1A1A2E] mt-1" numberOfLines={1}>
              {activeBannerEvent.campaign?.title}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">
              Starts: {activeBannerEvent.campaign?.start_time} {bannerDistance ? `• ${bannerDistance} away` : ''}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleNavigateCheckIn(activeBannerEvent.campaign_id)}
            className="bg-[#FF6B35] px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-bold text-xs">Get Ready</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tabs segment */}
      <View className="flex-row px-6 py-3 bg-white border-b border-[#E2E8F0]">
        {(['upcoming', 'applied', 'past'] as const).map(tab => {
          const isSelected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className="flex-1 py-2 items-center"
            >
              <Text className={`text-sm font-bold ${isSelected ? 'text-[#FF6B35]' : 'text-gray-400'}`}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              {isSelected && <View className="h-1 w-8 bg-[#FF6B35] rounded-full mt-1.5" />}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={getFilteredData()}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 32 }}
        onRefresh={fetchMyEvents}
        refreshing={loading && applications.length === 0}
        renderItem={({ item }) => {
          const campaign = item.campaign || {};
          const isCheckInEligible = canCheckIn(campaign.event_date || campaign.date, campaign.start_time);
          const payoutRec = item.payout_record;

          return (
            <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm border border-[#F1F5F9] space-y-4">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 mr-2">
                  <Text className="text-base font-bold text-[#1A1A2E] leading-6" numberOfLines={2}>
                    {campaign.title}
                  </Text>
                  <Text className="text-xs text-gray-500 font-semibold mt-1">
                    {formatDateLabel(campaign.event_date || campaign.date, campaign.start_time)}
                  </Text>
                </View>
                <StatusBadge status={item.status} />
              </View>

              <View className="border-t border-[#F8FAFC] pt-3 flex-row justify-between items-center">
                <View>
                  <Text className="text-[10px] text-gray-400 font-bold uppercase">Payout</Text>
                  <Text className="text-lg font-black text-[#22C55E]">₹{campaign.payout}</Text>
                </View>
                <View className="items-end">
                  <Text className="text-[10px] text-gray-400 font-bold uppercase">Venue</Text>
                  <Text className="text-xs text-gray-600 font-bold" numberOfLines={1}>
                    {campaign.location_name}
                  </Text>
                </View>
              </View>

              {/* ACTION TRIGGERS */}
              {activeTab === 'upcoming' && (
                <View className="pt-2">
                  {isCheckInEligible ? (
                    <TouchableOpacity
                      onPress={() => handleNavigateCheckIn(campaign.id)}
                      className="w-full bg-[#22C55E] py-3.5 rounded-2xl items-center shadow-md shadow-green-500/20"
                    >
                      <Text className="text-white font-bold text-sm">✓ Manage Active Check-in</Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="w-full bg-[#F8FAFC] py-3 rounded-2xl items-center border border-[#E2E8F0]">
                      <Text className="text-xs text-gray-400 font-bold">
                        Check-in opens on event day (within 2h of start)
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {activeTab === 'applied' && (
                <View className="pt-2">
                  <TouchableOpacity
                    onPress={() => handleCancelApplication(item.id)}
                    className="w-full border border-red-200 py-3 rounded-2xl items-center justify-center"
                  >
                    <Text className="text-red-500 font-bold text-sm">Withdraw Application</Text>
                  </TouchableOpacity>
                </View>
              )}

              {activeTab === 'past' && (
                <View className="pt-2 border-t border-[#F8FAFC]">
                  {payoutRec ? (
                    <View className="flex-row justify-between items-center px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                      <Text className="text-xs text-gray-500 font-bold">Payout Status</Text>
                      {payoutRec.status === 'released' && (
                        <Text className="text-xs text-green-600 font-black">💰 ₹{payoutRec.amount} paid</Text>
                      )}
                      {payoutRec.status === 'pending' && (
                        <Text className="text-xs text-yellow-600 font-black">⏳ Payment pending</Text>
                      )}
                      {payoutRec.status === 'disputed' && (
                        <View className="flex-row items-center space-x-1" style={{ display: 'flex', flexDirection: 'row' }}>
                          <Text className="text-xs text-red-500 font-black mr-2">❌ Disputed</Text>
                          <TouchableOpacity onPress={() => Alert.alert('Support', 'Contact support at support@mobilize.org')}>
                            <Text className="text-[10px] text-blue-500 font-extrabold underline">Contact</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View className="flex-row justify-between items-center px-4 py-2 rounded-xl bg-[#F8FAFC]">
                      <Text className="text-xs text-gray-500 font-bold">Roster Attendance</Text>
                      <Text className="text-xs text-gray-400 font-black">Finished</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View className="py-20">
              <ActivityIndicator size="large" color="#FF6B35" />
            </View>
          ) : (
            <View className="items-center justify-center py-20 px-6">
              <Text className="text-5xl mb-4">📅</Text>
              <Text className="text-lg font-bold text-[#1A1A2E]">No events found</Text>
              <Text className="text-sm text-gray-400 text-center mt-2 px-8">
                {activeTab === 'upcoming'
                  ? "You have no confirmed upcoming bookings. Browse the discover tab to apply!"
                  : activeTab === 'applied'
                  ? 'No active applications in queue. Apply for some campaigns!'
                  : 'You have not attended any events yet.'
                }
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

export default MyEventsScreen;
