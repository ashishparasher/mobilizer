/**
 * Calculates the geodetic distance in meters between two points on the Earth's surface
 * using the Haversine formula.
 */
export function getDistanceInMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const diffLat = ((lat2 - lat1) * Math.PI) / 180;
  const diffLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(diffLat / 2) * Math.sin(diffLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(diffLng / 2) *
      Math.sin(diffLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates coordinate offsets with Gaussian noise for location privacy.
 */
export function addGaussianNoise(
  lat: number,
  lng: number,
  radiusMeters: number = 500
): { lat: number; lng: number } {
  const u1 = Math.random() || 0.0001; // Avoid log(0)
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);

  // Approximate conversions for meters to latitude/longitude degrees
  const latOffset = (z0 * radiusMeters) / 111320;
  const lngOffset = (z1 * radiusMeters) / (111320 * Math.cos((lat * Math.PI) / 180));

  return {
    lat: lat + latOffset,
    lng: lng + lngOffset,
  };
}
