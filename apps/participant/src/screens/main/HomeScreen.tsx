import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ScrollView, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../store/authStore';
import { useLocation } from '../../hooks/useLocation';
import { useCampaigns } from '../../hooks/useCampaigns';
import CampaignCard from '../../components/campaign/CampaignCard';
import api from '../../lib/api';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

const CATEGORIES_FILTERS = [
  'All', 'Wedding', 'Brand', 'Political', 'NGO', 
  'Influencer', 'Survey', 'Entertainment', 'Startup', 'Emergency'
];
const DISTANCES = [5, 10, 25, 50];
const PAYOUTS = [
  { label: 'All', value: null },
  { label: '₹200+', value: 200 },
  { label: '₹500+', value: 500 },
  { label: '₹1000+', value: 1000 },
];

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { user, participantProfile, updateProfile } = useAuth();
  const { getCurrentLocation, updateLocationOnServer } = useLocation();

  // Location Coordinate State
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);

  // Hook to fetch feed
  const {
    campaigns,
    loading,
    refresh,
    loadMore,
    applyFilters,
    filters,
  } = useCampaigns(lat, lng);

  const [isOnline, setIsOnline] = useState(participantProfile?.is_online || false);
  const [isSyncingStatus, setIsSyncingStatus] = useState(false);
  const [savedCampaigns, setSavedCampaigns] = useState<string[]>([]);

  // Initialize status state
  useEffect(() => {
    if (participantProfile) {
      setIsOnline(participantProfile.is_online);
    }
  }, [participantProfile]);

  // Request location updates if online
  useEffect(() => {
    if (isOnline) {
      triggerLocationSync();
    }
  }, [isOnline]);

  const triggerLocationSync = async () => {
    const coords = await getCurrentLocation();
    if (coords) {
      setLat(coords.lat);
      setLng(coords.lng);
      await updateLocationOnServer(coords.lat, coords.lng);
    }
  };

  const handleToggleOnline = async () => {
    setIsSyncingStatus(true);
    const targetStatus = !isOnline;

    try {
      // Sync toggle state with backend
      const result = await api.patch('/user/online-status', { is_online: targetStatus });
      setIsOnline(targetStatus);
      await updateProfile({ is_online: targetStatus });

      if (targetStatus) {
        // Going online -> Sync GPS coordinates
        await triggerLocationSync();
      } else {
        // Going offline -> clear coordinates to hide from feed queries
        setLat(undefined);
        setLng(undefined);
      }
    } catch (err) {
      console.error('Failed to toggle online status:', err);
    } finally {
      setIsSyncingStatus(false);
    }
  };

  const handleSaveCampaign = (id: string) => {
    if (savedCampaigns.includes(id)) {
      setSavedCampaigns(prev => prev.filter(cId => cId !== id));
    } else {
      setSavedCampaigns(prev => [...prev, id]);
    }
  };

  // Render Category filter chips
  const renderCategoryChips = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2 flex-row">
        {CATEGORIES_FILTERS.map(cat => {
          const isSelected = filters.category === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => applyFilters(cat, filters.distance, filters.payout)}
              className={`px-4 py-2 rounded-full border mr-2 ${
                isSelected ? 'bg-[#FF6B35] border-[#FF6B35]' : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  // Render distance filter options
  const renderDistanceChips = () => {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-3 flex-row border-b border-[#F1F5F9]">
        {DISTANCES.map(dist => {
          const isSelected = filters.distance === dist;
          return (
            <TouchableOpacity
              key={dist}
              onPress={() => applyFilters(filters.category, dist, filters.payout)}
              className={`px-3 py-1.5 rounded-full border mr-2 ${
                isSelected ? 'bg-[#FF6B35] border-[#FF6B35]' : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <Text className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                &lt; {dist} km
              </Text>
            </TouchableOpacity>
          );
        })}
        {PAYOUTS.map(payoutOption => {
          const isSelected = filters.payout === payoutOption.value;
          return (
            <TouchableOpacity
              key={payoutOption.label}
              onPress={() => applyFilters(filters.category, filters.distance, payoutOption.value)}
              className={`px-3 py-1.5 rounded-full border mr-2 ${
                isSelected ? 'bg-[#FF6B35] border-[#FF6B35]' : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <Text className={`text-[10px] font-bold ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                {payoutOption.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      
      {/* Header bar */}
      <View className="px-6 py-4 bg-white border-b border-[#E2E8F0] flex-row justify-between items-center">
        <Text className="text-2xl font-black text-[#1A1A2E] tracking-tight">Mobilize</Text>
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => navigation.navigate('Notifications')}
            className="w-10 h-10 bg-[#F1F5F9] rounded-full items-center justify-center border border-[#E2E8F0] mr-2"
          >
            <Text className="text-base">🔔</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            className="w-10 h-10 bg-[#FF6B35] rounded-full items-center justify-center border border-[#E2E8F0]"
          >
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} className="w-full h-full rounded-full" />
            ) : (
              <Text className="text-white font-extrabold">{user?.name?.charAt(0).toUpperCase() || 'P'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        onRefresh={refresh}
        refreshing={loading && campaigns.length === 0}
        ListHeaderComponent={
          <View className="mb-4">
            {/* ONLINE TOGGLE CARD */}
            <View 
              className={`p-5 rounded-3xl mb-6 flex-row items-center justify-between shadow-sm ${
                isOnline ? 'bg-[#22C55E]' : 'bg-gray-400'
              }`}
            >
              <View className="flex-1 mr-4">
                <Text className="text-lg font-black text-white">
                  You are {isOnline ? 'ONLINE' : 'OFFLINE'}
                </Text>
                <Text className="text-xs text-white/90 mt-1">
                  {isOnline 
                    ? 'You are discoverable to campaigner organizers' 
                    : 'Go online to discover nearby paid campaigns'
                  }
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleToggleOnline}
                disabled={isSyncingStatus}
                className="w-16 h-8 bg-white rounded-full p-1 justify-center"
              >
                <View 
                  className={`w-6 h-6 rounded-full ${isOnline ? 'bg-[#22C55E] self-end' : 'bg-gray-400 self-start'}`}
                  style={{ opacity: isSyncingStatus ? 0.5 : 1 }}
                />
              </TouchableOpacity>
            </View>

            {/* FILTERS PANEL */}
            <Text className="text-sm font-bold text-[#1A1A2E] mb-1">Discover Opportunities</Text>
            {renderCategoryChips()}
            {renderDistanceChips()}
          </View>
        }
        renderItem={({ item }) => (
          <CampaignCard
            campaign={item}
            onPress={() => navigation.navigate('CampaignDetailScreen', { campaign_id: item.id })}
            onApply={() => navigation.navigate('CampaignDetailScreen', { campaign_id: item.id })}
            onSave={() => handleSaveCampaign(item.id)}
            isSaved={savedCampaigns.includes(item.id)}
          />
        )}
        ListEmptyComponent={
          loading ? (
            // SKELETON LOADERS
            <View className="space-y-4 pt-4">
              {[1, 2, 3].map(i => (
                <View key={i} className="bg-white rounded-3xl p-5 border border-[#F1F5F9] h-52 justify-between">
                  <View className="flex-row justify-between items-center">
                    <View className="h-6 w-24 bg-gray-200 rounded-full" />
                    <View className="h-6 w-16 bg-gray-200 rounded-full" />
                  </View>
                  <View className="h-6 w-full bg-gray-200 rounded-md" />
                  <View className="h-10 w-full bg-gray-200 rounded-md" />
                  <View className="flex-row space-x-3">
                    <View className="h-12 flex-1 bg-gray-200 rounded-2xl" />
                    <View className="h-12 flex-2 bg-gray-200 rounded-2xl" />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            // EMPTY STATE
            <View className="items-center justify-center py-16 px-4">
              <Text className="text-6xl mb-4">🔍</Text>
              <Text className="text-xl font-bold text-[#1A1A2E] text-center">No opportunities nearby</Text>
              <Text className="text-sm text-gray-500 text-center mt-2 px-8">
                {isOnline 
                  ? 'Go online, increase your distance scope, or expand category preferences to discover new tasks.' 
                  : 'Toggle your status to ONLINE above to activate location scanning.'
                }
              </Text>
              <TouchableOpacity
                onPress={refresh}
                className="mt-6 bg-[#FF6B35] px-6 py-3 rounded-2xl shadow-md"
              >
                <Text className="text-white font-bold">Refresh Feed</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
export default HomeScreen;
