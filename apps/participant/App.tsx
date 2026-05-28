import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/store/authStore';
import { supabase } from './src/lib/supabase';
import { AuthStack } from './src/navigation/AuthStack';
import { AppStack } from './src/navigation/AppStack';
import api from './src/lib/api';

function RootNavigator() {
  const { user, setUser, setProfile, isLoading: storeLoading } = useAuth();
  const [authChecking, setAuthChecking] = useState(true);

  useEffect(() => {
    // Listen for Supabase session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          try {
            // Attempt to fetch public user details from public.users
            const profile = await api.get('/user/profile');
            if (profile && profile.id) {
              const { profile: participantProfile, ...userData } = profile;
              await setUser(userData);
              await setProfile(participantProfile);
            } else {
              // Row doesn't exist, trigger registration flow
              await setUser(null);
              await setProfile(null);
            }
          } catch (err) {
            // Profile does not exist or API request failed (typically 401/404 during register phase)
            await setUser(null);
            await setProfile(null);
          }
        } else {
          // No active Supabase session
          await setUser(null);
          await setProfile(null);
        }
        setAuthChecking(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Show splash/loading spinner while resolving session
  if (storeLoading || authChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1A1A2E', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={{ color: '#FFFFFF', marginTop: 16, fontWeight: 'bold', letterSpacing: 2 }}>
          MOBILIZE
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
