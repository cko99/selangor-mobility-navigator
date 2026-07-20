import { describe, expect, it } from 'vitest';
import { haversineMeters } from '../assets/js/utils/distance.js';
import { createGoogleMapsUrl, createWazeUrl } from '../assets/js/utils/navigationLinks.js';

describe('location and navigation', () => {
  it('calculates nearest-station distance', () => expect(haversineMeters(3.1343,101.6857,3.135,101.686)).toBeLessThan(100));
  it('creates official Google Maps URL with origin', () => { const url = new URL(createGoogleMapsUrl({latitude:3.1,longitude:101.6},{latitude:3.2,longitude:101.7})); expect(url.searchParams.get('api')).toBe('1'); expect(url.searchParams.get('travelmode')).toBe('walking'); expect(url.searchParams.get('origin')).toBe('3.200000,101.700000'); });
  it('creates official Waze URL', () => { const url = new URL(createWazeUrl({latitude:3.1,longitude:101.6})); expect(url.searchParams.get('navigate')).toBe('yes'); expect(url.searchParams.get('utm_source')).toBe('selangor_mobility_navigator'); });
  it('rejects invalid coordinates', () => expect(() => createWazeUrl({latitude:300,longitude:0})).toThrow());
});
