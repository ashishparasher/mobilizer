import { supabaseAdmin } from '../lib/supabase';

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: 'default';
}

/**
 * Sends a list of push notifications using Expo Push API
 */
export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: any
) {
  const validTokens = tokens.filter((t) => t && t.startsWith('ExponentPushToken'));
  if (validTokens.length === 0) return [];

  const messages: PushMessage[] = validTokens.map((token) => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  const results: any[] = [];

  // Expo requires batching messages in sizes of max 100
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });

      const resultJson: any = await response.json();
      if (resultJson?.data) {
        results.push(...resultJson.data);

        // Check for tickets errors e.g. DeviceNotRegistered
        for (let j = 0; j < resultJson.data.length; j++) {
          const ticket = resultJson.data[j];
          if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            const invalidToken = batch[j].to;
            // Remove invalid token from database
            await supabaseAdmin
              .from('participant_profiles')
              .update({ expo_push_token: null })
              .eq('expo_push_token', invalidToken);
            console.log(`[Notification Service]: Cleaned up stale Expo token: ${invalidToken}`);
          }
        }
      }
    } catch (err) {
      console.error('[Notification Service] Error sending push batch:', err);
    }
  }

  return results;
}

/**
 * Sends a push notification to a single participant and saves a notification row
 */
export async function sendToParticipant(
  userId: string,
  title: string,
  body: string,
  data?: any,
  type = 'general'
) {
  try {
    // 1. Fetch token from profile
    const { data: profile } = await supabaseAdmin
      .from('participant_profiles')
      .select('expo_push_token')
      .eq('user_id', userId)
      .single();

    // 2. Insert notification row into database
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      data: data || {},
    });

    // 3. Send push if token exists
    if (profile?.expo_push_token) {
      await sendPushNotification([profile.expo_push_token], title, body, data);
    }
  } catch (err) {
    console.error(`[Notification Service] Failed to notify user ${userId}:`, err);
  }
}

/**
 * Sends a detailed campaign confirmation push notification
 */
export async function sendCampaignConfirmation(applicationId: string) {
  try {
    const { data: app, error } = await supabaseAdmin
      .from('applications')
      .select(`
        id,
        user_id,
        campaign_id,
        campaign:campaigns (
          title,
          event_date,
          start_time,
          location_name,
          payout
        )
      `)
      .eq('id', applicationId)
      .single();

    if (error || !app || !app.campaign) return;

    const campaign = app.campaign as any;
    const dateStr = new Date(campaign.event_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    const formattedTime = campaign.start_time?.substring(0, 5);

    const title = `✅ Confirmed: ${campaign.title}`;
    const body = `${dateStr} at ${formattedTime} • ${campaign.location_name} • ₹${campaign.payout}`;

    await sendToParticipant(
      app.user_id,
      title,
      body,
      { type: 'confirmed', applicationId, campaignId: app.campaign_id },
      'confirmed'
    );
  } catch (err) {
    console.error(`[Notification Service] Failed to send campaign confirmation:`, err);
  }
}

/**
 * Notifies nearby discoverable participants of a new campaign
 */
export async function notifyNearbyParticipants(campaign: any) {
  try {
    const radiusMeters = (campaign.visibility_radius || 10) * 1000;
    
    // We parse coordinates if campaign location is GEOGRAPHY (POINT, 4326)
    // First, let's fetch campaigners coordinates or project coordinates
    const { data: campaignCoords } = await supabaseAdmin
      .from('campaigns')
      .select('location')
      .eq('id', campaign.id)
      .single();
      
    if (!campaignCoords?.location) return;

    // Fetch discoverable online participants matching category + payout within radius
    const { data: profiles, error } = await supabaseAdmin
      .from('participant_profiles')
      .select('user_id, min_compensation, category_preferences, blocked_categories, location')
      .eq('is_online', true)
      .eq('is_discoverable', true);

    if (error || !profiles || profiles.length === 0) return;

    // Haversine distance helper
    const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    const campaignLat = campaign.lat || 19.0760;
    const campaignLng = campaign.lng || 72.8777;
    const radiusKm = campaign.visibility_radius || 10;

    const matchingProfiles = profiles.filter((profile: any) => {
      // 1. Minimum compensation check
      if (campaign.payout < (profile.min_compensation || 0)) return false;

      // 2. Blocked category check
      if (profile.blocked_categories?.includes(campaign.category)) return false;

      // 3. Category preferences check (if specified)
      if (profile.category_preferences?.length > 0 && !profile.category_preferences.includes(campaign.category)) {
        return false;
      }

      // 4. Distance check
      if (profile.location) {
        // location is string formatted e.g. "POINT(72.8777 19.0760)"
        const match = typeof profile.location === 'string' 
          ? profile.location.match(/POINT\(([-\d.]+) ([\d.]+)\)/)
          : null;
        if (match) {
          const lon = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          const distance = getDistance(campaignLat, campaignLng, lat, lon);
          return distance <= radiusKm;
        }
      }
      return false;
    });

    if (matchingProfiles.length === 0) return;

    const currentHour = new Date().toISOString();
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

    for (const profile of matchingProfiles) {
      // Rate limit check: max 3 notifications per participant per hour
      const { count } = await supabaseAdmin
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile.user_id)
        .eq('type', 'nearby_broadcast')
        .gte('created_at', oneHourAgo);

      if (count !== null && count >= 3) {
        continue; // Skip due to rate limit
      }

      const title = `🔔 New opportunity near you: ${campaign.category.replace('_', ' ')}`;
      const body = `₹${campaign.payout} • Spots available: ${campaign.slots_total}`;

      await sendToParticipant(
        profile.user_id,
        title,
        body,
        { type: 'nearby_broadcast', campaignId: campaign.id },
        'nearby_broadcast'
      );
    }
  } catch (err) {
    console.error('[Notification Service] Error notifying nearby users:', err);
  }
}
