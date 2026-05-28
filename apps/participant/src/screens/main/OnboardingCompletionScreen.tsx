import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../store/authStore';

export default function OnboardingCompletionScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animations
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  }, [scaleAnim, fadeAnim]);

  return (
    <View className="flex-1 justify-center items-center bg-[#1A1A2E] px-6">
      {/* Confetti placeholder circles */}
      {[...Array(8)].map((_, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 12 + i * 4,
            height: 12 + i * 4,
            borderRadius: 20,
            backgroundColor: ['#FF6B35', '#22C55E', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'][i],
            opacity: 0.3,
            top: `${15 + (i * 10)}%`,
            left: `${10 + ((i * 17) % 80)}%`,
            transform: [{ scale: scaleAnim }],
          }}
        />
      ))}

      {/* Main content */}
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        <Text style={{ fontSize: 80, marginBottom: 16 }}>🎉</Text>
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
        <Text className="text-3xl font-black text-white text-center mb-2">You're all set!</Text>
        <Text className="text-base text-gray-400 text-center mb-1">
          Welcome to Mobilize{user?.name ? `, ${user.name}` : ''}
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-10 max-w-[260px]">
          Start exploring campaigns near you and earn money by attending events.
        </Text>

        <TouchableOpacity
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Feed' }] })}
          className="bg-[#FF6B35] px-8 py-4 rounded-2xl"
          activeOpacity={0.8}
        >
          <Text className="text-white font-black text-base">🚀 Start Exploring</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}
