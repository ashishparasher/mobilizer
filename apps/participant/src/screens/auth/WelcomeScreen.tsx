import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';

type WelcomeScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>;
};

export function WelcomeScreen({ navigation }: WelcomeScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-8">
        {/* Top orange gradient/subtle backdrop header */}
        <View className="items-center mt-8 mb-6">
          <View className="w-24 h-24 bg-orange-100 rounded-full items-center justify-center mb-4">
            <Text className="text-6xl">⚡</Text>
          </View>
          <Text className="text-4xl font-extrabold text-[#1A1A2E] tracking-tight">
            Mobilize
          </Text>
          <Text className="text-base text-gray-500 font-semibold text-center mt-2 px-4">
            Discover opportunities. Show up. Get paid.
          </Text>
        </View>

        {/* Core Value Props List */}
        <View className="flex-1 justify-center space-y-6 my-4">
          <View className="flex-row items-center p-3 bg-[#F8FAFC] rounded-2xl">
            <View className="w-12 h-12 bg-orange-50 rounded-xl items-center justify-center mr-4">
              <Text className="text-2xl">📍</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-[#1A1A2E]">Find events near you</Text>
              <Text className="text-sm text-gray-500 mt-0.5">Explore map-based mobilization tasks around your city.</Text>
            </View>
          </View>

          <View className="flex-row items-center p-3 bg-[#F8FAFC] rounded-2xl">
            <View className="w-12 h-12 bg-green-50 rounded-xl items-center justify-center mr-4">
              <Text className="text-2xl">₹</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-[#1A1A2E]">Get paid instantly via UPI</Text>
              <Text className="text-sm text-gray-500 mt-0.5">Verified check-in hours trigger automated payouts.</Text>
            </View>
          </View>

          <View className="flex-row items-center p-3 bg-[#F8FAFC] rounded-2xl">
            <View className="w-12 h-12 bg-blue-50 rounded-xl items-center justify-center mr-4">
              <Text className="text-2xl">⭐</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-[#1A1A2E]">Build your reputation</Text>
              <Text className="text-sm text-gray-500 mt-0.5">Earn high reliability scores to auto-qualify for premium campaigns.</Text>
            </View>
          </View>
        </View>

        {/* Navigation Action Buttons */}
        <View className="mt-auto pt-6">
          <TouchableOpacity
            onPress={() => navigation.navigate('Phone')}
            className="w-full bg-[#FF6B35] py-4 rounded-2xl items-center shadow-lg shadow-orange-500/30"
            activeOpacity={0.85}
          >
            <Text className="text-white text-lg font-bold">Get Started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Phone')}
            className="w-full py-4 items-center mt-2"
          >
            <Text className="text-gray-500 text-sm">
              Already have an account? <Text className="text-[#FF6B35] font-bold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
export default WelcomeScreen;
