import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { registerForPushNotificationsAsync, registerNotificationListeners } from '../services/pushNotifications';

// Import Real Screen Components
import HomeScreen from '../screens/main/HomeScreen';
import CampaignDetailScreen from '../screens/main/CampaignDetailScreen';
import MyEventsScreen from '../screens/main/MyEventsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import CheckInScreen from '../screens/checkin/CheckInScreen';
import CheckOutScreen from '../screens/checkin/CheckOutScreen';
import EarningsScreen from '../screens/wallet/EarningsScreen';
import RatingScreen from '../screens/main/RatingScreen';
import ReferralScreen from '../screens/main/ReferralScreen';
import OnboardingCompletionScreen from '../screens/main/OnboardingCompletionScreen';

// -----------------------------------------------------------------------------
// Remaining placeholder screens
// -----------------------------------------------------------------------------

function MapScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-[#F8FAFC]">
      <Text className="text-xl font-bold text-[#1A1A2E]">Map Search</Text>
      <Text className="text-sm text-gray-500 mt-2">Explore opportunities around you</Text>
    </View>
  );
}

// -----------------------------------------------------------------------------
// Nested Stack Navigators
// -----------------------------------------------------------------------------

const FeedStack = createNativeStackNavigator();
function FeedStackNavigator() {
  return (
    <FeedStack.Navigator>
      <FeedStack.Screen 
        name="FeedHome" 
        component={HomeScreen} 
        options={{ headerShown: false }} 
      />
      <FeedStack.Screen 
        name="CampaignDetailScreen" 
        component={CampaignDetailScreen} 
        options={{ headerShown: false }} 
      />
      <FeedStack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notifications', headerTitleAlign: 'center' }} 
      />
    </FeedStack.Navigator>
  );
}

const MapStack = createNativeStackNavigator();
function MapStackNavigator() {
  return (
    <MapStack.Navigator>
      <MapStack.Screen 
        name="MapHome" 
        component={MapScreen} 
        options={{ title: 'Nearby Map', headerTitleAlign: 'center' }} 
      />
    </MapStack.Navigator>
  );
}

const MyEventsStack = createNativeStackNavigator();
function MyEventsStackNavigator() {
  return (
    <MyEventsStack.Navigator>
      <MyEventsStack.Screen 
        name="MyEventsHome" 
        component={MyEventsScreen} 
        options={{ headerShown: false }} 
      />
      <MyEventsStack.Screen 
        name="CheckInScreen" 
        component={CheckInScreen} 
        options={{ headerShown: false }} 
      />
      <MyEventsStack.Screen 
        name="CheckOutScreen" 
        component={CheckOutScreen} 
        options={{ headerShown: false }} 
      />
      <MyEventsStack.Screen
        name="RatingScreen"
        component={RatingScreen}
        options={{ headerShown: false }}
      />
    </MyEventsStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator();
function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen 
        name="ProfileHome" 
        component={ProfileScreen} 
        options={{ headerShown: false }} 
      />
      <ProfileStack.Screen 
        name="Earnings" 
        component={EarningsScreen} 
        options={{ headerShown: false }} 
      />
      <ProfileStack.Screen
        name="ReferralScreen"
        component={ReferralScreen}
        options={{ title: 'Refer & Earn', headerTitleAlign: 'center' }}
      />
    </ProfileStack.Navigator>
  );
}

// -----------------------------------------------------------------------------
// Bottom Tab Navigator
// -----------------------------------------------------------------------------

const Tab = createBottomTabNavigator();

export function AppStack() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    // 1. Initialize Expo Push Token
    registerForPushNotificationsAsync();

    // 2. Listen to push notification interactions
    const unsubscribe = registerNotificationListeners(
      (notification) => {
        console.log('Notification received in foreground:', notification);
      },
      (response) => {
        console.log('User clicked notification:', response);
        const data = response.notification.request.content.data || {};
        const campaignId = data.campaignId || data.campaign_id;
        const type = data.type;

        if (campaignId) {
          navigation.navigate('Feed', {
            screen: 'CampaignDetailScreen',
            params: { campaign_id: campaignId },
          });
        } else if (type === 'confirmed') {
          navigation.navigate('MyEvents');
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35', // Saffron orange
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'compass-outline';

          if (route.name === 'Feed') {
            iconName = 'compass-outline';
          } else if (route.name === 'Map') {
            iconName = 'map-outline';
          } else if (route.name === 'MyEvents') {
            iconName = 'calendar-outline';
          } else if (route.name === 'Profile') {
            iconName = 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Feed" component={FeedStackNavigator} options={{ tabBarLabel: 'Discover' }} />
      <Tab.Screen name="Map" component={MapStackNavigator} options={{ tabBarLabel: 'Map' }} />
      <Tab.Screen name="MyEvents" component={MyEventsStackNavigator} options={{ tabBarLabel: 'Events' }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}
export default AppStack;
