import { Router, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { getDistanceInMeters } from '../utils/haversine';

const router = Router();

router.use(requireAuth);

/**
 * Fuzzes coordinates by adding random noise within a 500m radius
 */
function fuzzLocation(lat: number, lng: number): { lat: number; lng: number } {
  const radiusInDegrees = 500 / 111320;
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusInDegrees;
  return {
    lat: lat + distance * Math.cos(angle),
    lng: lng + distance * Math.sin(angle),
  };
}

/**
 * GET /api/heatmap
 * Fetch GeoJSON FeatureCollection of fuzzed online participant locations
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  const { lat, lng, radius_km = '10', filters, campaign_id } = req.query;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'Center coordinates (lat, lng) are required' });
  }

  const centerLat = parseFloat(lat as string);
  const centerLng = parseFloat(lng as string);
  const radiusMeters = parseFloat(radius_km as string) * 1000;

  try {
    // 1. Parse filters from JSON query parameter
    let parsedFilters: any = {};
    if (filters) {
      try {
        parsedFilters = JSON.parse(filters as string);
      } catch (e) {
        console.warn('Failed to parse heatmap filters JSON:', e);
      }
    }

    // 2. Query online, discoverable participant profiles
    const { data: profiles, error } = await supabaseAdmin
      .from('participant_profiles')
      .select('*, user:users(*)')
      .eq('is_online', true)
      .eq('is_discoverable', true);

    if (error) {
      console.error('Error querying participant profiles for heatmap:', error);
      return res.status(500).json({ success: false, error: 'Failed to retrieve online participant data' });
    }

    const matchedFeatures: any[] = [];
    let totalCount = profiles?.length || 0;
    let filteredCount = 0;

    for (const profile of profiles || []) {
      if (!profile.location) continue;

      // Extract coords from WKT format POINT(lng lat)
      const matches = profile.location.match(/POINT\(([^ ]+) ([^ ]+)\)/);
      if (!matches) continue;

      const pLng = parseFloat(matches[1]);
      const pLat = parseFloat(matches[2]);

      // Proximity check
      const distance = getDistanceInMeters(centerLat, centerLng, pLat, pLng);
      if (distance > radiusMeters) {
        continue;
      }

      // Filter Check: Min Reliability Score (Check users table or participant profiles)
      const reliabilityScore = Number(profile.user?.reliability_score || profile.reliability_score || 70);
      if (parsedFilters.min_reliability && reliabilityScore < Number(parsedFilters.min_reliability)) {
        continue;
      }

      // Filter Check: Age range
      const age = Number(profile.user?.age || 0);
      if (parsedFilters.min_age && age < Number(parsedFilters.min_age)) {
        continue;
      }
      if (parsedFilters.max_age && age > Number(parsedFilters.max_age)) {
        continue;
      }

      // Filter Check: Gender
      if (parsedFilters.gender && parsedFilters.gender.toLowerCase() !== 'any') {
        if (profile.user?.gender?.toLowerCase() !== parsedFilters.gender.toLowerCase()) {
          continue;
        }
      }

      // Filter Check: Category Preferences
      if (parsedFilters.category_preference) {
        const prefs = profile.category_preferences || [];
        if (!prefs.includes(parsedFilters.category_preference)) {
          continue;
        }
      }

      // Filter Check: Languages
      if (parsedFilters.languages && parsedFilters.languages.length > 0) {
        const langs = profile.languages || [];
        const matchesLang = parsedFilters.languages.some((l: string) => langs.includes(l));
        if (!matchesLang) {
          continue;
        }
      }

      filteredCount++;

      // Fuzz location coordinates for privacy
      const fuzzed = fuzzLocation(pLat, pLng);

      matchedFeatures.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [fuzzed.lng, fuzzed.lat],
        },
        properties: {
          weight: reliabilityScore / 100,
        },
      });
    }

    return res.status(200).json({
      type: 'FeatureCollection',
      features: matchedFeatures,
      meta: {
        total: totalCount,
        filtered: filteredCount,
        radius_km: parseFloat(radius_km as string),
        updated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    console.error('Heatmap generation error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

export default router;
