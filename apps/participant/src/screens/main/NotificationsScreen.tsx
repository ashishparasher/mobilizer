import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../lib/api';

type NotificationsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

type NotificationRecord = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  data: any;
  type: 'confirmed' | 'pending' | 'waitlisted' | 'payout' | 'reminder' | 'rejected' | string;
  read: boolean;
  created_at: string;
};

export function NotificationsScreen({ navigation }: NotificationsScreenProps) {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await api.get('/notifications');
      setNotifications(data || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  const handlePressNotification = (notification: NotificationRecord) => {
    // Determine target screen and parameters from payload data
    const payload = notification.data || {};
    const campaignId = payload.campaignId || payload.campaign_id;
    
    switch (notification.type) {
      case 'confirmed':
        if (campaignId) {
          navigation.navigate('CampaignDetailScreen', { campaign_id: campaignId });
        } else {
          navigation.navigate('MyEvents');
        }
        break;
      case 'pending':
      case 'waitlisted':
      case 'rejected':
      case 'reminder':
        if (campaignId) {
          navigation.navigate('CampaignDetailScreen', { campaign_id: campaignId });
        }
        break;
      default:
        // No specific screen, do nothing or default to home
        break;
    }
  };

  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'confirmed':
        return { icon: '✅', colorBg: 'bg-green-50', textColor: 'text-green-700' };
      case 'pending':
        return { icon: '📋', colorBg: 'bg-yellow-50', textColor: 'text-yellow-700' };
      case 'waitlisted':
        return { icon: '⏳', colorBg: 'bg-blue-50', textColor: 'text-blue-700' };
      case 'payout':
        return { icon: '💰', colorBg: 'bg-emerald-50', textColor: 'text-emerald-700' };
      case 'reminder':
        return { icon: '🔔', colorBg: 'bg-orange-50', textColor: 'text-orange-700' };
      case 'rejected':
        return { icon: '❌', colorBg: 'bg-red-50', textColor: 'text-red-700' };
      default:
        return { icon: '💬', colorBg: 'bg-gray-50', textColor: 'text-gray-700' };
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* HEADER */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-[#F1F5F9] bg-white">
        <Text className="text-xl font-black text-[#1A1A2E]">Notifications</Text>
        {notifications.some(n => !n.read) && (
          <TouchableOpacity onPress={handleMarkAllRead} className="px-3 py-1.5 rounded-full bg-[#FF6B35]/10">
            <Text className="text-xs font-bold text-[#FF6B35]">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF6B35']} />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          renderItem={({ item }) => {
            const config = getNotificationConfig(item.type);
            return (
              <TouchableOpacity
                onPress={() => handlePressNotification(item)}
                className={`flex-row p-4 border-b border-[#F8FAFC] items-start ${
                  item.read ? 'bg-white' : 'bg-[#FF6B35]/5'
                }`}
              >
                {/* Icon Container */}
                <View className={`w-10 h-10 ${config.colorBg} rounded-full justify-center items-center mr-4`}>
                  <Text className="text-lg">{config.icon}</Text>
                </View>

                {/* Content */}
                <View className="flex-1 mr-2">
                  <View className="flex-row items-center justify-between">
                    <Text className={`text-sm font-bold ${item.read ? 'text-[#1A1A2E]' : 'text-black'}`}>
                      {item.title}
                    </Text>
                    {!item.read && (
                      <View className="w-2.5 h-2.5 rounded-full bg-[#FF6B35] ml-2" />
                    )}
                  </View>
                  <Text className="text-xs text-gray-500 mt-1 leading-5">
                    {item.body}
                  </Text>
                  <Text className="text-[10px] text-gray-400 mt-2">
                    {new Date(item.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20 px-8">
              <Text className="text-6xl mb-4">🔔</Text>
              <Text className="text-lg font-bold text-[#1A1A2E]">All caught up!</Text>
              <Text className="text-sm text-gray-400 text-center mt-2 px-8">
                You don't have any notifications right now. Any active reminders or campaign status updates will show up here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

export default NotificationsScreen;
