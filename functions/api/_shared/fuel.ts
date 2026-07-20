export function transformFuelCsv(csv: string, weeks: number) {
  const lines = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const headers = lines.shift()?.split(',') || [];
  const records = lines.map(line => Object.fromEntries(line.split(',').map((value, index) => [headers[index], value])))
    .filter(row => row.series_type === 'level' && /^\d{4}-\d{2}-\d{2}$/.test(row.date))
    .sort((a, b) => a.date.localeCompare(b.date)).slice(-weeks)
    .map(row => ({ date: row.date, ron95: num(row.ron95), ron97: num(row.ron97), diesel: num(row.diesel), dieselEastMalaysia: num(row.diesel_eastmsia), ron95Budi95: num(row.ron95_budi95), ron95Skps: num(row.ron95_skps), dieselSkds: num(row.diesel_skds), dieselBudi: num(row.diesel_budi) }));
  return { records, latest: records.at(-1) || null, previous: records.at(-2) || null };
}

const num = (value: string) => value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
