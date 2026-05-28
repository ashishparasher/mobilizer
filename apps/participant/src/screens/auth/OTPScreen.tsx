import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/AuthStack';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../store/authStore';
import api from '../../lib/api';

type OTPScreenProps = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'OTP'>;
  route: RouteProp<AuthStackParamList, 'OTP'>;
};

export function OTPScreen({ navigation, route }: OTPScreenProps) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(30);

  const { setUser, setProfile } = useAuth();
  const inputRef = useRef<TextInput>(null);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: any;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  // Trigger verify on complete 6 digits
  useEffect(() => {
    if (code.length === 6) {
      handleVerifyOtp(code);
    }
  }, [code]);

  const handleVerifyOtp = async (otpToken: string) => {
    setErrorMsg(null);
    setIsLoading(true);

    try {
      // 1. Verify OTP with Supabase
      const { data: { session }, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: otpToken,
        type: 'sms',
      });

      if (verifyError || !session) {
        setErrorMsg(verifyError?.message || 'Incorrect verification code. Please try again.');
        setIsLoading(false);
        return;
      }

      // 2. Query our public.users table to see if user profile is registered
      try {
        const profile = await api.get('/user/profile');
        if (profile && profile.id) {
          // User already exists, populate stores. Context triggers redirect to AppStack
          const { profile: participantProfile, ...userData } = profile;
          await setUser(userData);
          await setProfile(participantProfile);
        } else {
          // Direct to register
          navigation.navigate('Register', { phone });
        }
      } catch (apiErr: any) {
        // Typically a 401/404 means the custom user row is missing -> register user
        navigation.navigate('Register', { phone });
      }
    } catch (err: any) {
      console.error('OTP verification transaction error:', err);
      setErrorMsg('Network error. Failed to verify OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendTimer > 0) return;
    setErrorMsg(null);
    setCode('');
    setResendTimer(30);

    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) {
        setErrorMsg(error.message || 'Failed to resend code');
      }
    } catch (err) {
      setErrorMsg('Failed to resend code. Please try again.');
    }
  };

  // Build OTP boxes view
  const renderOtpBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      const char = code[i] || '';
      const isFocused = code.length === i;
      boxes.push(
        <View
          key={i}
          className={`w-12 h-14 border rounded-2xl items-center justify-center bg-[#F8FAFC] ${
            isFocused ? 'border-[#FF6B35] ring-2 ring-orange-200' : 'border-[#E2E8F0]'
          }`}
        >
          <Text className="text-xl font-bold text-[#1A1A2E]">{char}</Text>
        </View>
      );
    }
    return boxes;
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
              Enter OTP
            </Text>
            <Text className="text-base text-gray-500 mt-2">
              Verification code sent to <Text className="font-bold text-[#1A1A2E]">{phone}</Text>
            </Text>
          </View>

          <View className="items-center my-6">
            {/* Hidden Input field overlaying OTP UI */}
            <TextInput
              ref={inputRef}
              className="absolute w-full h-14 opacity-0 z-10"
              keyboardType="numeric"
              maxLength={6}
              value={code}
              onChangeText={(text) => {
                setCode(text.replace(/[^0-9]/g, ''));
                setErrorMsg(null);
              }}
              editable={!isLoading}
              caretHidden
            />
            {/* Styled Boxes */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              className="flex-row justify-between w-full px-2"
            >
              {renderOtpBoxes()}
            </TouchableOpacity>

            {errorMsg && (
              <Text className="text-sm text-red-500 mt-6 font-medium text-center">
                ⚠️ {errorMsg}
              </Text>
            )}
          </View>

          <View className="items-center mt-4">
            {resendTimer > 0 ? (
              <Text className="text-sm text-gray-400">
                Resend code in <Text className="font-semibold text-gray-600">{resendTimer}s</Text>
              </Text>
            ) : (
              <TouchableOpacity onPress={handleResendCode}>
                <Text className="text-sm text-[#FF6B35] font-bold">Resend code</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="mt-auto pt-6">
            <TouchableOpacity
              onPress={() => handleVerifyOtp(code)}
              disabled={isLoading || code.length < 6}
              className={`w-full py-4 rounded-2xl items-center shadow-lg ${
                isLoading || code.length < 6
                  ? 'bg-orange-300'
                  : 'bg-[#FF6B35] shadow-orange-500/30'
              }`}
              activeOpacity={0.85}
            >
              <Text className="text-white text-lg font-bold">
                {isLoading ? 'Verifying...' : 'Verify & Proceed'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
export default OTPScreen;
