import React from 'react';
import { View, Text, TouchableOpacity, Share, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function ReferralScreen() {
  const { user } = useAuth();
  const referralCode = 'MOB' + (user?.id || 'USER00').slice(0, 6).toUpperCase();
  const referralLink = `https://mobilize.in/invite/${referralCode}`;

  const handleCopy = () => {
    Alert.alert('Copied! 📋', `Referral code ${referralCode} copied to clipboard`);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join Mobilize and earn money by attending events near you! Use my referral code: ${referralCode}\n\n${referralLink}`,
        title: 'Join Mobilize',
      });
    } catch {
      // User cancelled sharing
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]">
      {/* Header */}
      <View className="bg-[#1A1A2E] pt-14 pb-10 px-6 rounded-b-3xl items-center">
        <Text style={{ fontSize: 56, marginBottom: 8 }}>🎁</Text>
        <Text className="text-white text-2xl font-black text-center">Refer & Earn</Text>
        <Text className="text-gray-400 text-sm text-center mt-2 max-w-[260px]">
          Invite friends and earn ₹50 bonus when they complete their first event
        </Text>
      </View>

      <View className="px-6 -mt-6">
        {/* Referral Code Card */}
        <View className="bg-white rounded-2xl border-2 border-dashed border-[#FF6B35] p-6 items-center">
          <Text className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Your Referral Code
          </Text>
          <Text className="text-3xl font-black text-[#1A1A2E] tracking-widest mb-4">
            {referralCode}
          </Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={handleCopy}
              className="flex-row items-center bg-gray-100 px-4 py-2.5 rounded-xl gap-1.5"
              activeOpacity={0.7}
            >
              <Ionicons name="copy-outline" size={16} color="#64748B" />
              <Text className="text-sm font-bold text-gray-600">Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleShare}
              className="flex-row items-center bg-[#FF6B35] px-5 py-2.5 rounded-xl gap-1.5"
              activeOpacity={0.8}
            >
              <Ionicons name="share-outline" size={16} color="#FFF" />
              <Text className="text-sm font-bold text-white">Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 bg-white rounded-xl p-4 items-center border border-gray-100">
            <Text className="text-2xl font-black text-[#1A1A2E]">0</Text>
            <Text className="text-xs text-gray-500 font-medium mt-1">Friends Joined</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 items-center border border-gray-100">
            <Text className="text-2xl font-black text-[#22C55E]">₹0</Text>
            <Text className="text-xs text-gray-500 font-medium mt-1">Rewards Earned</Text>
          </View>
        </View>

        {/* How It Works */}
        <View className="mt-6">
          <Text className="text-sm font-black text-[#1A1A2E] mb-3">How It Works</Text>
          {[
            { step: '1', emoji: '📤', title: 'Share your code', desc: 'Send your referral code to friends' },
            { step: '2', emoji: '📲', title: 'They sign up', desc: 'Friend downloads Mobilize and enters your code' },
            { step: '3', emoji: '✅', title: 'They complete an event', desc: 'Friend attends and completes their first event' },
            { step: '4', emoji: '💰', title: 'You earn ₹50', desc: 'Bonus is credited to your UPI automatically' },
          ].map(item => (
            <View key={item.step} className="flex-row items-start gap-3 mb-4">
              <View
                style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>{item.emoji}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-[#1A1A2E]">{item.title}</Text>
                <Text className="text-xs text-gray-500 mt-0.5">{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
