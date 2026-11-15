// expo-location's geocodeAsync was removed in SDK 49, so address search uses
// OpenStreetMap's free Nominatim API instead – the same provider as the map tiles.
export async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'Accept-Language': 'en' },
    });
    if (!response.ok) return null;
    const results = (await response.json()) as { lat: string; lon: string }[];
    if (results.length === 0) return null;
    return { lat: Number(results[0].lat), lng: Number(results[0].lon) };
  } catch {
    return null;
  }
}
