/**
 * Server-side Reverse Geocoding Utility for Discover
 * Converts latitude & longitude coordinates into formatted street address text.
 */

const geocodeCache = new Map<string, { address: string; timestamp: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  const roundedLat = parseFloat(lat.toFixed(5));
  const roundedLng = parseFloat(lng.toFixed(5));
  const cacheKey = `${roundedLat},${roundedLng}`;

  const cached = geocodeCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.address;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${roundedLat}&lon=${roundedLng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "CafeFlow-Discover/1.0 (delivery-routing)",
        "Accept-Language": "en",
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.display_name) {
        const address = data.display_name;
        geocodeCache.set(cacheKey, { address, timestamp: Date.now() });
        return address;
      }
    }
  } catch (err) {
    console.warn(`[Discover Geocode Warning] Failed for (${lat}, ${lng}):`, err);
  }

  const fallback = `Coordinate Location (${roundedLat}, ${roundedLng})`;
  geocodeCache.set(cacheKey, { address: fallback, timestamp: Date.now() });
  return fallback;
}
