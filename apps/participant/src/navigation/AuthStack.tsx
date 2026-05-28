import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import PhoneScreen from '../screens/auth/PhoneScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Phone: undefined;
  OTP: { phone: string };
  Register: { phone: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Phone" component={PhoneScreen} />
      <Stack.Screen name="OTP" component={OTPScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
export default AuthStack;
