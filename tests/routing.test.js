import { describe, expect, it } from 'vitest';
import { appViewForPath } from '../assets/js/utils/routing.js';

describe('Cloudflare direct-route view selection', () => {
  it.each([
    ['/app', 'dashboard'],
    ['/app/', 'dashboard'],
    ['/app/nearest', 'nearest'],
    ['/app/nearest/', 'nearest'],
    ['/status', 'status'],
    ['/status/', 'status']
  ])('maps %s to %s', (pathname, view) => {
    expect(appViewForPath(pathname)).toBe(view);
  });
});
