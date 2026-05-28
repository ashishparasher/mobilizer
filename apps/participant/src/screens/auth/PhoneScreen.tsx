import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { supabase } from '../../lib/supabase';

type PhoneScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Phone'>;
};

export function PhoneScreen({ navigation }: PhoneScreenProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSendOtp = async () => {
    setErrorMsg(null);
    if (!phoneNumber || phoneNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit phone number');
      return;
    }

    setIsLoading(true);
    const fullPhone = `+91${phoneNumber}`;

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) {
        setErrorMsg(error.message || 'Failed to send verification code. Please try again.');
      } else {
        navigation.navigate('OTP', { phone: fullPhone });
      }
    } catch (err: any) {
      console.error('Phone OTP error:', err);
      setErrorMsg('An unexpected error occurred. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="px-6 py-8">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center rounded-full bg-[#F8FAFC] mb-8"
          >
            <Text className="text-xl font-bold text-[#1A1A2E]">←</Text>
          </TouchableOpacity>

          <View className="mb-8">
            <Text className="text-3xl font-extrabold text-[#1A1A2E] tracking-tight">
              Enter your phone
            </Text>
            <Text className="text-base text-gray-500 mt-2">
              We will send you a 6-digit verification code to register your device.
            </Text>
          </View>

          <View className="flex-1 justify-start">
            {/* Input Container */}
            <Text className="text-sm font-semibold text-[#1A1A2E] mb-2">Phone Number</Text>
            <View className="flex-row items-center border border-[#E2E8F0] rounded-2xl px-4 py-3 bg-[#F8FAFC]">
              <Text className="text-base font-bold text-[#1A1A2E] mr-3">+91 (IN)</Text>
              <View className="h-6 w-[1px] bg-[#E2E8F0] mr-3" />
              <TextInput
                className="flex-1 text-base text-[#1A1A2E] p-0"
                placeholder="98765 43210"
                keyboardType="numeric"
                maxLength={10}
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text.replace(/[^0-9]/g, ''));
                  setErrorMsg(null);
                }}
                editable={!isLoading}
                autoFocus
              />
            </View>

            {errorMsg && (
              <Text className="text-sm text-red-500 mt-2 font-medium">⚠️ {errorMsg}</Text>
            )}
          </View>

          <View className="mt-auto pt-6">
            <TouchableOpacity
              onPress={handleSendOtp}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl items-center shadow-lg ${
                isLoading ? 'bg-orange-300' : 'bg-[#FF6B35] shadow-orange-500/30'
              }`}
              activeOpacity={0.85}
            >
              <Text className="text-white text-lg font-bold">
                {isLoading ? 'Sending...' : 'Send OTP'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export default PhoneScreen;
