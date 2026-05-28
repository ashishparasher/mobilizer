import { supabaseAdmin } from '../lib/supabase';
import { getDistanceInMeters } from './haversine';

/**
 * Sends a push notification via Expo Push API
 */
export async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string,
  data: any = {}
): Promise<boolean> {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken')) {
    return false;
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: 'default',
        title,
        body,
        data,
      }),
    });

    const resData: any = await response.json();
    return response.ok && !resData.errors;
  } catch (err) {
    console.error('Error sending push notification:', err);
    return false;
  }
}

/**
 * Sends push notifications to all confirmed participants for a campaign
 */
export async function sendCampaignNotification(
  campaignId: string,
  title: string,
  body: string,
  data: any = {}
): Promise<void> {
  try {
    // 1. Fetch confirmed participant user IDs and their push tokens
    const { data: participants, error } = await supabaseAdmin
      .from('applications')
      .select('user_id, participant_profiles(expo_push_token)')
      .eq('campaign_id', campaignId)
      .eq('status', 'confirmed');

    if (error || !participants) {
      console.error('Error fetching campaign participants for notification:', error);
      return;
    }

    // Extract push tokens
    const tokens = participants
      .map((p: any) => p.participant_profiles?.expo_push_token)
      .filter((token: string) => token && token.startsWith('ExponentPushToken'));

    if (tokens.length === 0) return;

    // Send notifications in batches
    const messages = tokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    // Save notification in database for each user
    const notificationsToInsert = participants.map((p: any) => ({
      user_id: p.user_id,
      title,
      body,
      type: 'campaign',
      data,
    }));

    await supabaseAdmin.from('notifications').insert(notificationsToInsert);
  } catch (err) {
    console.error('Error sending campaign notification:', err);
  }
}

/**
 * Notifies all online participants within radius of the campaign location
 */
export async function notifyNearbyParticipants(campaign: any): Promise<void> {
  try {
    // 1. Extract coordinates from campaign location
    // Campaign location is geometry/geography POINT: e.g. ST_AsText or raw lat/lng if we stored or query it.
    // If campaign.location is standard Supabase GeoJSON: coordinates are [lng, lat]
    let campaignLat: number;
    let campaignLng: number;

    if (campaign.location && campaign.location.coordinates) {
      campaignLng = campaign.location.coordinates[0];
      campaignLat = campaign.location.coordinates[1];
    } else if (typeof campaign.lat === 'number' && typeof campaign.lng === 'number') {
      campaignLat = campaign.lat;
      campaignLng = campaign.lng;
    } else {
      console.warn('Unable to parse campaign coordinates for nearby notifications.');
      return;
    }

    // 2. Fetch online discoverable participants
    const { data: profiles, error } = await supabaseAdmin
      .from('participant_profiles')
      .select('user_id, location, expo_push_token, blocked_categories, category_preferences')
      .eq('is_online', true)
      .eq('is_discoverable', true)
      .not('expo_push_token', 'is', null);

    if (error || !profiles) {
      console.error('Error fetching online profiles for nearby notifications:', error);
      return;
    }

    const matchedTokens: string[] = [];
    const notificationsToInsert: any[] = [];

    for (const profile of profiles) {
      // Filter out if category is blocked by user
      const blocked = profile.blocked_categories || [];
      if (blocked.includes(campaign.category)) continue;

      // Ensure profile location is defined
      if (!profile.location || !profile.location.coordinates) continue;
      const profileLng = profile.location.coordinates[0];
      const profileLat = profile.location.coordinates[1];

      // Calculate distance in meters
      const distance = getDistanceInMeters(
        campaignLat,
        campaignLng,
        profileLat,
        profileLng
      );

      const radiusMeters = (campaign.visibility_radius || 10) * 1000;

      if (distance <= radiusMeters) {
        matchedTokens.push(profile.expo_push_token);
        notificationsToInsert.push({
          user_id: profile.user_id,
          title: `New Opportunity: ${campaign.title}`,
          body: `A new event paying ₹${campaign.payout} is available nearby!`,
          type: 'new_campaign',
          data: { campaign_id: campaign.id },
        });
      }
    }

    if (matchedTokens.length === 0) return;

    // Send push notifications
    const messages = matchedTokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title: `New Opportunity: ${campaign.title}`,
      body: `A new event paying ₹${campaign.payout} is available nearby!`,
      data: { campaign_id: campaign.id },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    // Save notifications in database
    await supabaseAdmin.from('notifications').insert(notificationsToInsert);
  } catch (err) {
    console.error('Error in notifyNearbyParticipants:', err);
  }
}
