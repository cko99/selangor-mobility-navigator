export function parseGtfsTime(value) {
  const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(value || '');
  if (!match) return null;
  const [, hours, minutes, seconds] = match.map(Number);
  if (minutes > 59 || seconds > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

export function gtfsDateTime(serviceDate, gtfsTime) {
  const seconds = parseGtfsTime(gtfsTime);
  if (seconds === null || !/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) return null;
  const [year, month, day] = serviceDate.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, seconds);
}

export const toIso = value => value ? new Date(value).toISOString() : null;

export function relativeAge(iso, now = Date.now()) {
  if (!iso) return 'masa tidak diketahui';
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds} saat lalu`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minit lalu`;
  return `${Math.floor(seconds / 3600)} jam lalu`;
}
