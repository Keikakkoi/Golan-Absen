import { extractGoogleMapsCoordinates } from './google-maps';

describe('extractGoogleMapsCoordinates', () => {
  it('reads coordinates from a full Google Maps URL', () => {
    expect(extractGoogleMapsCoordinates('https://www.google.com/maps/@-6.200000,106.800000,17z')).toEqual({ latitude: -6.2, longitude: 106.8 });
  });

  it('reads encoded query coordinates', () => {
    expect(extractGoogleMapsCoordinates('https://www.google.com/maps?q=-6.21%2C106.81')).toEqual({ latitude: -6.21, longitude: 106.81 });
  });

  it('leaves short links for the backend resolver', () => {
    expect(extractGoogleMapsCoordinates('https://maps.app.goo.gl/KoKqevaBVnBPCipSA')).toBeNull();
  });
});
