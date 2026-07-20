import { approvedFetch, cached } from '../_shared/upstream';
import { failure, json, nowIso } from '../_shared/response';
import { locationQuery } from '../_shared/validation';
import { transformForecast } from '../_shared/weather';
import type { PagesContext } from '../_shared/types';

export const onRequestGet = async (context: PagesContext) => { try {
  const location = locationQuery(new URL(context.request.url));
  return await cached(context.request, 10_800, 86_400, async () => {
    const upstream = `https://api.data.gov.my/weather/forecast?contains=${location}%40location__location_id`;
    const { bytes } = await approvedFetch(upstream, 8_000, 2_000_000, { headers: { accept: 'application/json' } });
    const rows: unknown[] = JSON.parse(new TextDecoder().decode(bytes));
    const data = transformForecast(rows, location), dates = data.map(item => item.date).filter(Boolean).sort();
    return json(data, { source: 'MET Malaysia via data.gov.my', dataset: `7-day forecast ${location}`, status: 'forecast', fetchedAt: nowIso(), sourceUpdatedAt: null, ageSeconds: null, isStale: false, recordCount: data.length, forecastStartDate: dates.at(0) || null, forecastEndDate: dates.at(-1) || null }, { headers: { 'cache-control': 'public, max-age=1800, s-maxage=10800' } });
  });
} catch (error) { return failure(error instanceof TypeError ? 400 : 502, error instanceof TypeError ? 'INVALID_QUERY' : 'UPSTREAM_UNAVAILABLE', error instanceof TypeError ? error.message : 'Weather forecast is temporarily unavailable.', true); } };
