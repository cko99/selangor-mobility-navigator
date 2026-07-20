export function vehicleFreshness(timestamp, nowSeconds = Date.now() / 1000) {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return { status: 'offline', ageSeconds: null, isStale: true };
  const ageSeconds = Math.max(0, Math.round(nowSeconds - seconds));
  if (ageSeconds <= 90) return { status: 'live', ageSeconds, isStale: false };
  if (ageSeconds <= 180) return { status: 'delayed', ageSeconds, isStale: false };
  return { status: 'stale', ageSeconds, isStale: true };
}

export function statusLabel(status) {
  return ({ live: 'Live', delayed: 'Delayed data', stale: 'Stale', scheduled: 'Scheduled', static: 'Static', forecast: 'Forecast', warning: 'Warning', offline: 'Offline', demo: 'Demo fallback', unavailable: 'Unavailable' })[status] || status;
}
