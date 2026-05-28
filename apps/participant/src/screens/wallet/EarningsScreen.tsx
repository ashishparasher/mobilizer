import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import api from '../../lib/api';

type EarningsScreenProps = {
  navigation: NativeStackNavigationProp<any>;
};

type PayoutRecord = {
  id: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'disputed' | string;
  created_at: string;
  released_at?: string;
  campaign?: {
    title: string;
    event_date: string;
  };
};

export function EarningsScreen({ navigation }: EarningsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [upiId, setUpiId] = useState<string>('');
  
  // Modal State
  const [upiModalVisible, setUpiModalVisible] = useState(false);
  const [inputUpi, setInputUpi] = useState('');
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  // Statistics
  const [earnedMonth, setEarnedMonth] = useState(0);
  const [earnedAllTime, setEarnedAllTime] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      // 1. Fetch user profile containing UPI settings
      const profileData = await api.get('/user/profile');
      if (profileData && profileData.profile) {
        setUpiId(profileData.profile.upi_id || '');
        setInputUpi(profileData.profile.upi_id || '');
      }

      // 2. Fetch payouts list
      const payoutsData = await api.get('/payouts/my');
      const list: PayoutRecord[] = payoutsData || [];
      setPayouts(list);

      // Compute statistics
      let monthSum = 0;
      let allTimeSum = 0;
      let pendingSum = 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      list.forEach(p => {
        const amt = Number(p.amount || 0);
        if (p.status === 'completed') {
          allTimeSum += amt;
          
          const pDate = new Date(p.released_at || p.created_at);
          if (pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
            monthSum += amt;
          }
        } else if (['pending', 'processing'].includes(p.status)) {
          pendingSum += amt;
        }
      });

      setEarnedMonth(monthSum);
      setEarnedAllTime(allTimeSum);
      setPendingBalance(pendingSum);
    } catch (err) {
      console.error('Error fetching earnings data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEarningsData();
  };

  const handleSaveUpi = async () => {
    if (!inputUpi || !inputUpi.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Please enter a valid UPI ID (e.g. name@paytm).');
      return;
    }

    setIsSavingUpi(true);
    try {
      await api.post('/payouts/set-upi', { upi_id: inputUpi });
      setUpiId(inputUpi);
      setUpiModalVisible(false);
      Alert.alert('Success', 'UPI ID linked successfully. Payments will be sent here.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save UPI ID');
    } finally {
      setIsSavingUpi(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { text: 'Paid', colorText: 'text-green-600', colorBg: 'bg-green-50' };
      case 'processing':
        return { text: 'Sending...', colorText: 'text-blue-600', colorBg: 'bg-blue-50' };
      case 'disputed':
        return { text: 'Under review', colorText: 'text-red-600', colorBg: 'bg-red-50' };
      case 'pending':
      default:
        return { text: 'Processing', colorText: 'text-yellow-600', colorBg: 'bg-yellow-50' };
    }
  };

  const renderPayoutItem = ({ item }: { item: PayoutRecord }) => {
    const config = getStatusConfig(item.status);
    const dateLabel = new Date(item.created_at).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    return (
      <View className="flex-row p-4 border-b border-[#F8FAFC] justify-between items-center bg-white">
        <View className="flex-1 mr-4">
          <Text className="text-sm font-bold text-[#1A1A2E]" numberOfLines={1}>
            {item.campaign?.title || 'Mobilize Opportunity'}
          </Text>
          <Text className="text-[10px] text-gray-400 font-semibold mt-0.5">
            {dateLabel} • {item.status === 'completed' ? 'Disbursed' : 'Awaiting Release'}
          </Text>
        </View>
        <View className="items-end">
          <Text className={`text-sm font-black ${item.status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
            ₹{item.amount}
          </Text>
          <View className={`px-2 py-0.5 rounded-full mt-1.5 ${config.colorBg}`}>
            <Text className={`text-[9px] font-bold ${config.colorText}`}>{config.text}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      {/* HEADER */}
      <View className="px-6 py-4 flex-row items-center border-b border-[#F1F5F9] bg-white">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 rounded-full bg-[#F8FAFC] mr-4">
          <Text className="text-lg font-bold text-[#1A1A2E]">←</Text>
        </TouchableOpacity>
        <Text className="text-lg font-black text-[#1A1A2E]">My Earnings</Text>
      </View>

      <FlatList
        data={payouts}
        keyExtractor={item => item.id}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <View className="p-6 space-y-6">
            {/* GRADIENT EARNINGS CARD */}
            <View className="bg-gradient-to-br from-[#22C55E] to-[#15803D] rounded-3xl p-6 shadow-lg shadow-green-500/10 text-white">
              <Text className="text-xs text-white/80 font-bold uppercase tracking-wider">Available Balance</Text>
              <Text className="text-4xl font-black text-white mt-1 mb-6">₹{upiId ? earnedAllTime.toLocaleString('en-IN') : '0'}</Text>
              
              <View className="flex-row justify-between items-center border-t border-white/10 pt-4">
                <View className="flex-1 mr-4">
                  <Text className="text-[10px] text-white/70 font-semibold uppercase">Linked UPI Wallet</Text>
                  <Text className="text-xs font-bold text-white mt-0.5" numberOfLines={1}>
                    {upiId ? upiId : 'None linked'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setUpiModalVisible(true)}
                  className="bg-white px-4 py-2.5 rounded-xl"
                >
                  <Text className="text-green-700 font-bold text-xs">
                    {upiId ? 'Update UPI' : 'Link UPI ID'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* MONTH STATISTICS GRID */}
            <View className="flex-row gap-4">
              <View className="flex-1 bg-white border border-[#F1F5F9] p-4 rounded-2xl">
                <Text className="text-[10px] text-gray-400 font-bold uppercase">This Month</Text>
                <Text className="text-lg font-black text-[#1A1A2E] mt-1">₹{earnedMonth}</Text>
              </View>
              <View className="flex-1 bg-white border border-[#F1F5F9] p-4 rounded-2xl">
                <Text className="text-[10px] text-gray-400 font-bold uppercase">Pending Release</Text>
                <Text className="text-lg font-black text-orange-600 mt-1">₹{pendingBalance}</Text>
              </View>
            </View>

            <Text className="text-sm font-black text-[#1A1A2E] pt-2">Transaction History</Text>
          </View>
        }
        renderItem={renderPayoutItem}
        ListEmptyComponent={
          <View className="items-center justify-center py-16 px-8">
            <Text className="text-5xl mb-4">💵</Text>
            <Text className="text-base font-bold text-[#1A1A2E]">No payouts logged yet</Text>
            <Text className="text-xs text-gray-400 text-center mt-2 px-8">
              Complete checking in/out on confirmed campaigns to start earning.
            </Text>
          </View>
        }
      />

      {/* UPI CONFIG MODAL */}
      <Modal
        visible={upiModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setUpiModalVisible(false)}
      >
        <View className="flex-1 bg-black/60 justify-center items-center p-6">
          <View className="w-full bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <Text className="text-lg font-black text-[#1A1A2E]">Link UPI Wallet</Text>
            <Text className="text-xs text-gray-500">
              Enter your UPI Address. Released event payouts will transfer directly to this address.
            </Text>

            <TextInput
              value={inputUpi}
              onChangeText={setInputUpi}
              placeholder="e.g. name@paytm, user@ybl"
              autoCapitalize="none"
              autoCorrect={false}
              className="border border-[#E2E8F0] focus:border-[#FF6B35] rounded-xl px-4 py-3 text-sm font-mono"
            />

            <View className="flex-row gap-3 pt-2">
              <TouchableOpacity
                onPress={() => setUpiModalVisible(false)}
                className="flex-1 border border-gray-300 py-3.5 rounded-xl items-center"
              >
                <Text className="text-gray-700 font-bold text-xs">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveUpi}
                disabled={isSavingUpi}
                className="flex-1 bg-[#FF6B35] py-3.5 rounded-xl items-center justify-center"
              >
                {isSavingUpi ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-xs">Verify & Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default EarningsScreen;
