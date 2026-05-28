import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Share, Linking, Alert, Platform, Modal } from 'react-native';
import * as Calendar from 'expo-calendar';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MapViewComponent from '../../components/common/MapViewComponent';
import api from '../../lib/api';
import { Campaign, Application } from '@mobilize/shared';
import StatusBadge from '../../components/common/StatusBadge';
import ProgressBar from '../../components/common/ProgressBar';

type CampaignDetailScreenProps = {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<any>;
};

export function CampaignDetailScreen({ navigation, route }: CampaignDetailScreenProps) {
  const { campaign_id } = (route.params || {}) as any;

  const [campaign, setCampaign] = useState<any | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [modalVisible, setModalVisible] = useState<'none' | 'confirmed' | 'pending' | 'waitlisted'>('none');

  useEffect(() => {
    fetchCampaignDetails();
  }, [campaign_id]);

  const fetchCampaignDetails = async () => {
    setLoading(true);
    try {
      // 1. Fetch Campaign Details
      const campaignData = await api.get(`/campaigns/${campaign_id}`);
      setCampaign(campaignData);

      // 2. Fetch User Application status if any
      const myApps = await api.get('/applications/my');
      const userApp = (myApps || []).find((app: Application) => app.campaign_id === campaign_id);
      if (userApp) {
        setApplication(userApp);
      }

      // 3. Fetch online status
      const userProfile = await api.get('/user/profile');
      if (userProfile && userProfile.profile) {
        setIsOnline(userProfile.profile.is_online || false);
      }
    } catch (err: any) {
      console.error('Error fetching campaign details:', err);
      Alert.alert('Error', 'Failed to retrieve campaign details');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!campaign) return;
    try {
      await Share.share({
        message: `Check out this mobilization opportunity: "${campaign.title}" paying ₹${campaign.payout}. Apply on Mobilize!`,
      });
    } catch (err) {
      console.error('Error sharing campaign:', err);
    }
  };

  const handleApply = async () => {
    if (!campaign) return;
    if (!isOnline) {
      Alert.alert(
        'Offline Status',
        'Please go ONLINE on the Home Screen to discover and apply for campaigns.'
      );
      return;
    }
    setIsApplying(true);

    try {
      const response = await api.post('/applications/apply', { campaign_id: campaign.id });
      setApplication(response);
      setModalVisible(response.status);
      // Reload details to sync slots count
      await fetchCampaignDetails();
    } catch (err: any) {
      Alert.alert('Application Failed', err.message || 'An error occurred while submitting your application.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleGetDirections = () => {
    if (!campaign || !campaign.location || !campaign.location.coordinates) return;
    const lng = campaign.location.coordinates[0];
    const lat = campaign.location.coordinates[1];
    
    const url = Platform.select({
      ios: `maps:0,0?q=${campaign.location_name}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${campaign.location_name})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });

    Linking.openURL(url).catch(err => {
      console.error('Failed to open maps:', err);
    });
  };

  const handleAddToCalendar = async () => {
    if (!campaign) return;

    try {
      // Request calendar permissions
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Calendar access is required to add this event. Please enable it in your device settings.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get default calendar
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      let calendarId: string | undefined;

      if (Platform.OS === 'ios') {
        const defaultCal = calendars.find(c => c.allowsModifications && c.source.type === 'local');
        calendarId = defaultCal?.id || calendars[0]?.id;
      } else {
        const primaryCal = calendars.find(c => c.isPrimary && c.allowsModifications);
        calendarId = primaryCal?.id || calendars.find(c => c.allowsModifications)?.id;
      }

      if (!calendarId) {
        Alert.alert('No Calendar', 'Could not find a writable calendar on this device.');
        return;
      }

      const eventDate = new Date(campaign.event_date || campaign.date);
      const endDate = new Date(eventDate.getTime() + (campaign.duration_hrs || 2) * 60 * 60 * 1000);

      await Calendar.createEventAsync(calendarId, {
        title: `[Mobilize] ${campaign.title}`,
        startDate: eventDate,
        endDate: endDate,
        timeZone: 'Asia/Kolkata',
        location: campaign.location_address || campaign.location_name,
        notes: `Payout: ₹${campaign.payout} cash\nOrganizer: ${campaign.campaigner?.org_name || 'Mobilize Event'}\n\nManage your bookings on the Mobilize app.`,
        alarms: [
          { relativeOffset: -60 }, // 1 hour before
          { relativeOffset: -1440 }, // 1 day before
        ],
      });

      Alert.alert(
        '✅ Added to Calendar',
        `"${campaign.title}" has been added to your calendar with reminders set for 1 day and 1 hour before the event.`,
        [{ text: 'Great!' }]
      );
    } catch (err: any) {
      console.error('Calendar error:', err);
      Alert.alert('Calendar Error', err.message || 'Failed to add the event to your calendar. Please try again.');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (!campaign) {
    return (
      <View className="flex-1 bg-white justify-center items-center p-6">
        <Text className="text-lg font-bold text-gray-700">Campaign details could not be found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 bg-[#FF6B35] px-6 py-2 rounded-xl">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Parse location coordinates
  const campaignLng = campaign.location?.coordinates ? campaign.location.coordinates[0] : 77.5946;
  const campaignLat = campaign.location?.coordinates ? campaign.location.coordinates[1] : 12.9716;

  const categoryDisplay = campaign.category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const campaigner = campaign.campaigner || {};

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER NAVIGATION */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-[#F1F5F9] bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 rounded-full bg-[#F8FAFC]">
          <Text className="text-lg font-bold text-[#1A1A2E]">←</Text>
        </TouchableOpacity>
        <Text className="text-base font-bold text-[#1A1A2E]">Event Details</Text>
        <TouchableOpacity onPress={handleShare} className="p-2 rounded-full bg-[#F8FAFC]">
          <Text className="text-lg font-bold text-[#1A1A2E]">🔗</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-6 py-4">
        {/* HERO SECTION */}
        <View className="mb-4">
          <View className="flex-row items-center space-x-2 mb-2">
            <StatusBadge status="active" label={categoryDisplay} />
            {campaign.is_urgent && <StatusBadge status="urgent" label="URGENT" />}
          </View>
          <Text className="text-2xl font-extrabold text-[#1A1A2E] leading-8 mb-4">
            {campaign.title}
          </Text>
        </View>

        {/* ORGANIZER CARD */}
        <View className="flex-row items-center p-4 bg-[#F8FAFC] rounded-3xl mb-6">
          <View className="w-12 h-12 bg-gray-200 rounded-full items-center justify-center mr-4">
            <Text className="text-lg font-bold text-gray-600">
              {campaigner.org_name?.charAt(0).toUpperCase() || 'O'}
            </Text>
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-base font-bold text-[#1A1A2E] mr-1.5">{campaigner.org_name}</Text>
              {campaigner.verified && <Text className="text-xs text-blue-500 font-black">✓</Text>}
            </View>
            <View className="flex-row items-center mt-1">
              <Text className="text-xs text-yellow-500 mr-0.5">★</Text>
              <Text className="text-xs text-gray-500 font-semibold">{campaigner.rating} rating</Text>
            </View>
          </View>
        </View>

        {/* INFO GRID (2x2) */}
        <View className="flex-row flex-wrap justify-between gap-y-4 mb-6">
          <View className="w-[47%] p-4 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9]">
            <Text className="text-lg mb-1">📅</Text>
            <Text className="text-xs text-gray-400 font-bold uppercase">Date & Time</Text>
            <Text className="text-sm font-bold text-[#1A1A2E] mt-1" numberOfLines={2}>
              {new Date(campaign.event_date || campaign.date).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View className="w-[47%] p-4 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9]">
            <Text className="text-lg mb-1">⏱️</Text>
            <Text className="text-xs text-gray-400 font-bold uppercase">Duration</Text>
            <Text className="text-sm font-bold text-[#1A1A2E] mt-1">
              {campaign.duration_hrs} hours
            </Text>
          </View>

          <View className="w-[47%] p-4 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9]">
            <Text className="text-lg mb-1">📍</Text>
            <Text className="text-xs text-gray-400 font-bold uppercase">Location</Text>
            <Text className="text-sm font-bold text-[#1A1A2E] mt-1" numberOfLines={2}>
              {campaign.location_name}
            </Text>
          </View>

          <View className="w-[47%] p-4 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9]">
            <Text className="text-lg mb-1">💰</Text>
            <Text className="text-xs text-gray-400 font-bold uppercase">Payout</Text>
            <Text className="text-sm font-bold text-[#22C55E] mt-1">
              ₹{campaign.payout} cash
            </Text>
          </View>
        </View>

        {/* SLOTS CAPACITY */}
        <View className="p-5 bg-[#F8FAFC] rounded-3xl border border-[#F1F5F9] mb-6">
          <View className="mb-2">
            <ProgressBar current={campaign.slots_filled || 0} total={campaign.slots_total} showLabel />
          </View>
          {campaign.slots_waitlist > 0 && (
            <Text className="text-xs text-gray-500 font-bold mt-1">
              ⚠️ {campaign.slots_waitlist} users currently on waitlist
            </Text>
          )}
        </View>

        {/* DESCRIPTION */}
        <View className="mb-6">
          <Text className="text-base font-bold text-[#1A1A2E] mb-2">About Event</Text>
          <Text 
            className="text-sm text-gray-600 leading-6"
            numberOfLines={descriptionExpanded ? undefined : 4}
          >
            {campaign.description}
          </Text>
          {campaign.description.length > 150 && (
            <TouchableOpacity onPress={() => setDescriptionExpanded(!descriptionExpanded)} className="mt-2">
              <Text className="text-[#FF6B35] font-bold text-sm">
                {descriptionExpanded ? 'Show Less' : 'Read Full Description'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* REQUIREMENTS */}
        <View className="mb-6 border-t border-[#F1F5F9] pt-6">
          <Text className="text-base font-bold text-[#1A1A2E] mb-3">Event Requirements</Text>
          <View className="space-y-3 bg-[#F8FAFC] p-5 rounded-3xl border border-[#F1F5F9]">
            <Text className="text-sm text-gray-600">
              • Age: <Text className="font-bold text-[#1A1A2E]">{campaign.requirements?.min_age || 16} - {campaign.requirements?.max_age || 80} years</Text>
            </Text>
            <Text className="text-sm text-gray-600">
              • Gender Match: <Text className="font-bold text-[#1A1A2E]">{campaign.requirements?.gender === 'any' ? 'Any' : campaign.requirements?.gender}</Text>
            </Text>
            <Text className="text-sm text-gray-600">
              • Languages: <Text className="font-bold text-[#1A1A2E]">{campaign.requirements?.languages?.join(', ') || 'Any'}</Text>
            </Text>
            <Text className="text-sm text-gray-600">
              • Min Reputation Score: <Text className="font-bold text-[#1A1A2E]">{campaign.requirements?.min_reliability_score || '70'}%</Text>
            </Text>
            {campaign.dress_code && (
              <Text className="text-sm text-gray-600">
                • Dress Code: <Text className="font-bold text-[#1A1A2E]">{campaign.dress_code}</Text>
              </Text>
            )}
          </View>
        </View>

        {/* LOCATION MAP */}
        <View className="mb-12 border-t border-[#F1F5F9] pt-6">
          <Text className="text-base font-bold text-[#1A1A2E] mb-2">Venue Location</Text>
          <Text className="text-sm text-gray-500 mb-4">{campaign.location_address}</Text>

          {/* React Native MapView */}
          <View className="h-48 w-full rounded-3xl overflow-hidden border border-[#E2E8F0] mb-4">
            <MapViewComponent
              latitude={campaignLat}
              longitude={campaignLng}
              className="w-full h-full"
            />
          </View>

          <TouchableOpacity
            onPress={handleGetDirections}
            className="w-full bg-[#1A1A2E] py-4 rounded-2xl items-center"
          >
            <Text className="text-white font-bold">Get Directions in Maps</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* STICKY BOTTOM BAR */}
      <View className="px-6 py-4 border-t border-[#E2E8F0] bg-white flex-row items-center justify-between shadow-2xl">
        <View className="flex-1 mr-4">
          <Text className="text-xs text-gray-400 font-bold uppercase">Payout</Text>
          <Text className="text-2xl font-black text-[#22C55E]">₹{campaign.payout}</Text>
        </View>

        <View className="flex-2 flex-grow">
          {application ? (
            <View className="items-end">
              <StatusBadge status={application.status} />
              {application.status === 'confirmed' && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('MyEvents')}
                  className="mt-2 bg-[#FF6B35] px-4 py-2 rounded-xl"
                >
                  <Text className="text-white text-xs font-bold">Go to Check In ✓</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleApply}
              disabled={isApplying}
              className={`py-4 rounded-2xl items-center justify-center ${
                isApplying ? 'bg-orange-300' : 'bg-[#FF6B35] shadow-lg shadow-orange-500/25'
              }`}
              activeOpacity={0.85}
            >
              <Text className="text-white text-base font-bold">
                {isApplying ? 'Applying...' : campaign.slots_filled >= campaign.slots_total ? 'Join Waitlist' : 'Apply Now'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {/* STATUS OVERLAY MODALS */}
      <Modal
        visible={modalVisible !== 'none'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible('none')}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-6">
          <View className="w-full bg-white rounded-3xl p-6 shadow-2xl items-center">
            {modalVisible === 'confirmed' && (
              <>
                <View className="w-20 h-20 bg-green-100 rounded-full justify-center items-center mb-4">
                  <Text className="text-4xl">🎉</Text>
                </View>
                <Text className="text-2xl font-black text-[#22C55E] mb-2 text-center">
                  You're Confirmed!
                </Text>
                <Text className="text-gray-500 text-center mb-6">
                  Your profile meets all requirements. You are officially confirmed for the campaign!
                </Text>

                {/* Event Details Card */}
                <View className="w-full bg-[#F8FAFC] border border-[#F1F5F9] rounded-2xl p-4 mb-6">
                  <Text className="font-bold text-[#1A1A2E] text-base mb-2">
                    {campaign.title}
                  </Text>
                  <View className="space-y-1.5">
                    <Text className="text-xs text-gray-500">
                      📅 <Text className="font-semibold text-gray-700">
                        {new Date(campaign.event_date || campaign.date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </Text>
                    <Text className="text-xs text-gray-500">
                      📍 <Text className="font-semibold text-gray-700">{campaign.location_name}</Text>
                    </Text>
                    <Text className="text-xs text-gray-500">
                      💰 <Text className="font-semibold text-green-600">₹{campaign.payout} cash payout</Text>
                    </Text>
                    <Text className="text-xs text-gray-500">
                      💼 <Text className="font-semibold text-gray-700">Bring: {campaign.dress_code || 'Smart casual clothes'}</Text>
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <TouchableOpacity
                  onPress={handleAddToCalendar}
                  className="w-full bg-[#1A1A2E] py-4 rounded-xl items-center mb-3"
                >
                  <Text className="text-white font-bold">📅 Add to Calendar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleGetDirections}
                  className="w-full bg-white border border-gray-300 py-4 rounded-xl items-center mb-4"
                >
                  <Text className="text-gray-700 font-bold">Get Directions</Text>
                </TouchableOpacity>
              </>
            )}

            {modalVisible === 'pending' && (
              <>
                <View className="w-20 h-20 bg-yellow-100 rounded-full justify-center items-center mb-4">
                  <Text className="text-4xl">📋</Text>
                </View>
                <Text className="text-2xl font-black text-yellow-600 mb-2 text-center">
                  Application Submitted
                </Text>
                <Text className="text-gray-500 text-center mb-6">
                  The campaigner organizer will review your profile shortly. Keep your notifications turned on for real-time updates!
                </Text>
              </>
            )}

            {modalVisible === 'waitlisted' && (
              <>
                <View className="w-20 h-20 bg-blue-100 rounded-full justify-center items-center mb-4">
                  <Text className="text-4xl">⏳</Text>
                </View>
                <Text className="text-2xl font-black text-blue-600 mb-2 text-center">
                  You're on the Waitlist
                </Text>
                <Text className="text-gray-500 text-center mb-6">
                  All active spots are currently filled. You are placed on the queue waitlist. If an active slot opens up, you will be auto-promoted!
                </Text>
              </>
            )}

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setModalVisible('none')}
              className="w-full bg-[#FF6B35] py-4 rounded-xl items-center"
            >
              <Text className="text-white font-bold">Got it, thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
export default CampaignDetailScreen;
