import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import api from '../lib/api';

// Configure notification behavior for when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and fetch Expo Push Token.
 * Sends the token to the backend to link to the user's participant profile.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    });
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Permission not granted for push notifications!');
      return null;
    }

    // Retrieve Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;

    if (token) {
      console.log('Expo Push Token retrieved:', token);
      // Sync with the backend
      await api.post('/auth/update-push-token', { expo_push_token: token });
    }
  } catch (error) {
    console.error('Failed to register push notification token:', error);
  }

  return token;
}

/**
 * Add listeners to handle notification events (received in foreground, or tapped by user)
 */
export function registerNotificationListeners(
  onNotificationReceived: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
) {
  const notificationSubscription = Notifications.addNotificationReceivedListener(onNotificationReceived);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onNotificationResponse);

  return () => {
    notificationSubscription.remove();
    responseSubscription.remove();
  };
}
