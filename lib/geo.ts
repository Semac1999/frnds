import * as Location from 'expo-location';

export interface DetectedLocation {
  countryCode: string; // ISO 3166-1 alpha-2 (e.g. 'US', 'BE')
  countryName?: string;
  city?: string;
}

/**
 * Asks for location permission, gets the current position, and reverse-geocodes
 * to a country code. Returns null if anything fails (denied, no signal, etc).
 */
export async function detectCountry(): Promise<DetectedLocation | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const places = await Location.reverseGeocodeAsync({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
    });

    const place = places?.[0];
    if (!place || !place.isoCountryCode) return null;

    return {
      countryCode: place.isoCountryCode.toUpperCase(),
      countryName: place.country || undefined,
      city: place.city || place.region || undefined,
    };
  } catch (err) {
    console.warn('detectCountry failed:', err);
    return null;
  }
}
