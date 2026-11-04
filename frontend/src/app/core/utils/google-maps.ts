export interface GoogleMapsCoordinates {
  latitude: number;
  longitude: number;
}

/** Extract coordinates from the Google Maps URL formats used by the app. */
export function extractGoogleMapsCoordinates(rawUrl: string): GoogleMapsCoordinates | null {
  let text = String(rawUrl || '').trim();
  if (!text) return null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const match = text.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/) ||
      text.match(/[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?)(?:,|%2[cC]|%20)+(-?\d+(?:\.\d+)?)/) ||
      text.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    if (match) {
      const latitude = Number(match[1]);
      const longitude = Number(match[2]);
      if (Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 && (latitude !== 0 || longitude !== 0)) {
        return { latitude, longitude };
      }
    }

    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) break;
      text = decoded;
    } catch {
      break;
    }
  }

  return null;
}
