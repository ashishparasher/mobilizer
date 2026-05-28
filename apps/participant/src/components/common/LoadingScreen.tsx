import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

/**
 * Full-screen animated loading screen shown during auth state check on launch.
 */
export default function LoadingScreen() {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse animation for the logo ring
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    // Spin animation for the arc
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 1200, easing: Easing.linear, useNativeDriver: true })
    ).start();
  }, [pulseAnim, spinAnim]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View className="flex-1 justify-center items-center bg-[#1A1A2E]">
      {/* Pulsing ring */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            borderWidth: 3,
            borderColor: '#FF6B3540',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FF6B35',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 36, fontWeight: '900' }}>M</Text>
          </View>
        </View>
      </Animated.View>

      {/* Spinning arc */}
      <Animated.View
        style={{
          position: 'absolute',
          top: '50%',
          marginTop: -56,
          width: 112,
          height: 112,
          borderRadius: 56,
          borderWidth: 3,
          borderColor: 'transparent',
          borderTopColor: '#FF6B35',
          transform: [{ rotate: spin }],
        }}
      />

      {/* Brand text */}
      <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 32, letterSpacing: 2 }}>
        MOBILIZE
      </Text>
      <Text style={{ color: '#94A3B8', fontSize: 12, marginTop: 6, letterSpacing: 1 }}>
        Crowd for Every Cause
      </Text>
    </View>
  );
}
