import cron from 'node-cron';
import { supabaseAdmin } from '../lib/supabase';

/**
 * Helper to get user profile details and calculate completeness percentage (0-1)
 */
async function getProfileCompleteness(userId: string): Promise<number> {
  try {
    const { data: profile } = await supabaseAdmin
      .from('participant_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (!profile || !user) return 0.2; // default fallback

    let score = 0;

    if (user.name) score += 15;
    if (user.age) score += 10;
    if (user.gender) score += 5;
    if (user.city) score += 10;
    if (user.avatar_url) score += 10;

    if (profile.languages && profile.languages.length >= 1) score += 10;
    if (profile.category_preferences && profile.category_preferences.length >= 3) score += 15;
    if (profile.min_compensation !== undefined && profile.min_compensation !== null) score += 5;
    if (profile.education) score += 5;
    if (profile.profession) score += 5;
    if (profile.interests && profile.interests.length >= 3) score += 10;

    return score / 100;
  } catch {
    return 0.5;
  }
}

/**
 * Calculates attendance statistics
 */
async function getAttendanceStats(userId: string) {
  try {
    const { data: apps } = await supabaseAdmin
      .from('applications')
      .select('status')
      .eq('user_id', userId);

    const confirmed = (apps || []).filter(a => ['confirmed', 'no_show', 'attended'].includes(a.status)).length;
    const attended = (apps || []).filter(a => a.status === 'attended' || a.status === 'confirmed').length; // confirmed check-in implies attendance in basic flows
    
    return { confirmed, attended };
  } catch {
    return { confirmed: 0, attended: 0 };
  }
}

/**
 * Calculates checkin punctuality statistics
 */
async function getPunctualityStats(userId: string) {
  try {
    const { data: checkins } = await supabaseAdmin
      .from('checkins')
      .select('*, campaign:campaigns(start_time, event_date, date)')
      .eq('user_id', userId);

    if (!checkins || checkins.length === 0) {
      return { onTime: 0, total: 0 };
    }

    let onTimeCount = 0;

    for (const chk of checkins) {
      const campaign = chk.campaign as any;
      if (!campaign || !campaign.start_time) continue;

      const [hoursStr, minutesStr] = campaign.start_time.split(':');
      const start = new Date(campaign.event_date || campaign.date);
      start.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10) || 0, 0, 0);

      const checkinTime = new Date(chk.checkin_time);
      const cutoff = new Date(start.getTime() + 15 * 60 * 1000); // 15 min late cutoff

      if (checkinTime <= cutoff) {
        onTimeCount++;
      }
    }

    return { onTime: onTimeCount, total: checkins.length };
  } catch {
    return { onTime: 0, total: 0 };
  }
}

/**
 * Calculates campaigner reviews statistics
 */
async function getAverageRating(userId: string) {
  try {
    const { data: reviews } = await supabaseAdmin
      .from('participant_reviews')
      .select('rating')
      .eq('participant_id', userId);

    if (!reviews || reviews.length === 0) {
      return { avgRating: 3, ratingCount: 0 };
    }

    const total = reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
    return { avgRating: total / reviews.length, ratingCount: reviews.length };
  } catch {
    return { avgRating: 3, ratingCount: 0 };
  }
}

/**
 * Calculates broadcast response rates
 */
async function getResponseRate(userId: string) {
  try {
    const { data: notifications } = await supabaseAdmin
      .from('notifications')
      .select('read')
      .eq('user_id', userId);

    if (!notifications || notifications.length === 0) {
      return { responded: 0, notified: 0 };
    }

    const readCount = notifications.filter(n => n.read).length;
    return { responded: readCount, notified: notifications.length };
  } catch {
    return { responded: 0, notified: 0 };
  }
}

/**
 * Computes and updates user reliability metrics
 */
export async function calculateReliabilityScore(userId: string): Promise<number> {
  // 1. Attendance Score (40 pts)
  const { confirmed, attended } = await getAttendanceStats(userId);
  const attendanceRate = confirmed > 0 ? attended / confirmed : 1.0; // default 100% if brand new
  const attendanceScore = attendanceRate * 40;

  // 2. Punctuality Score (20 pts)
  const { onTime, total } = await getPunctualityStats(userId);
  const punctualityRate = total > 0 ? onTime / total : 0.7; // default
  const punctualityScore = punctualityRate * 20;

  // 3. Average Rating (25 pts)
  const { avgRating, ratingCount } = await getAverageRating(userId);
  const weightedRating = ratingCount > 0
    ? (avgRating * Math.min(ratingCount, 10) + 3 * Math.max(0, 10 - ratingCount)) / 10
    : 3;
  const ratingScore = (weightedRating / 5) * 25;

  // 4. Profile Completeness (5 pts)
  const profileScore = (await getProfileCompleteness(userId)) * 5;

  // 5. Response Rate (10 pts)
  const { responded, notified } = await getResponseRate(userId);
  const responseRate = notified > 0 ? responded / notified : 0.5;
  const responseScore = responseRate * 10;

  const totalScore = Math.round(
    attendanceScore + punctualityScore + ratingScore + profileScore + responseScore
  );

  const finalScore = Math.max(0, Math.min(100, totalScore));

  // Sync back to DB (both tables to guarantee consistency)
  await supabaseAdmin
    .from('participant_profiles')
    .update({ reliability_score: finalScore })
    .eq('user_id', userId);

  await supabaseAdmin
    .from('users')
    .update({ reliability_score: finalScore })
    .eq('id', userId);

  return finalScore;
}

/**
 * Node-cron running every 6 hours
 */
cron.schedule('0 */6 * * *', async () => {
  console.log('[Reliability Job]: Running reliability scoring job...');
  try {
    // Get all participants
    const { data: participants } = await supabaseAdmin
      .from('participant_profiles')
      .select('user_id');

    if (participants && participants.length > 0) {
      console.log(`[Reliability Job]: Re-scoring ${participants.length} profiles...`);
      for (const p of participants) {
        await calculateReliabilityScore(p.user_id);
      }
      console.log('[Reliability Job]: Completed re-scoring runs.');
    }
  } catch (err) {
    console.error('[Reliability Job Error]:', err);
  }
});
