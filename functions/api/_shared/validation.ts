const categories = new Set(['rapid-rail-kl', 'rapid-bus-kl', 'rapid-bus-mrtfeeder']);

export function transitQuery(url: URL) {
  const agency = url.searchParams.get('agency');
  const category = url.searchParams.get('category');
  if (agency !== 'ktmb' && agency !== 'prasarana') throw new TypeError('agency must be ktmb or prasarana');
  if (agency === 'ktmb' && category) throw new TypeError('KTMB does not accept category');
  if (agency === 'prasarana' && (!category || !categories.has(category))) throw new TypeError('Invalid or missing Prasarana category');
  return { agency, category } as const;
}

export function stationId(url: URL) {
  const value = url.searchParams.get('station_id');
  if (!value || !/^(ktmb|rail|bus|feeder):[A-Za-z0-9_.:-]{1,100}$/.test(value)) throw new TypeError('Invalid or missing station_id');
  return value;
}

export function locationQuery(url: URL) {
  const value = url.searchParams.get('location') || 'Tn070';
  if (!/^(?:St|Rc|Ds|Tn|Dv)\d{3}$/.test(value)) throw new TypeError('location must be an official location_id');
  return value;
}

export function weeksQuery(url: URL) {
  const weeks = Number(url.searchParams.get('weeks') || 12);
  if (!Number.isInteger(weeks) || weeks < 2 || weeks > 52) throw new TypeError('weeks must be an integer from 2 to 52');
  return weeks;
}
