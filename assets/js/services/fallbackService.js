export const unavailableMeta = (dataset, source = 'No verified source') => ({ source, dataset, status: 'unavailable', fetchedAt: new Date().toISOString(), sourceUpdatedAt: null, ageSeconds: null, isStale: false });

export function selectFallback({ fresh, cached, stale, localOfficial, demo }) {
  if (fresh) return { value: fresh, status: 'live' };
  if (cached) return { value: cached, status: 'static' };
  if (stale) return { value: stale, status: 'stale' };
  if (localOfficial) return { value: localOfficial, status: 'static' };
  if (demo) return { value: demo, status: 'demo' };
  return { value: null, status: 'unavailable' };
}
