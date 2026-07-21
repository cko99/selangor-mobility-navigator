export function appViewForPath(pathname) {
  const normalized = `/${String(pathname || '').split('?')[0].split('#')[0].split('/').filter(Boolean).join('/')}`;
  if (normalized === '/app/nearest') return 'nearest';
  if (normalized === '/status') return 'status';
  return 'dashboard';
}
