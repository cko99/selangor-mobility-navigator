import { approvedFetch, cached } from '../_shared/upstream';
import { failure, json, nowIso } from '../_shared/response';
import { weeksQuery } from '../_shared/validation';
import { transformFuelCsv } from '../_shared/fuel';
import type { PagesContext } from '../_shared/types';

export const onRequestGet = async (context: PagesContext) => { try {
  const weeks = weeksQuery(new URL(context.request.url));
  return await cached(context.request, 43_200, 604_800, async () => {
    const { bytes } = await approvedFetch('https://storage.data.gov.my/commodities/fuelprice.csv', 10_000, 2_000_000, { headers: { accept: 'text/csv,*/*' } });
    const data = transformFuelCsv(new TextDecoder().decode(bytes), weeks), sourceUpdatedAt = data.latest ? `${data.latest.date}T00:00:00+08:00` : null;
    return json(data, { source: 'Ministry of Finance via data.gov.my', dataset: 'Malaysia weekly fuel prices', status: 'static', fetchedAt: nowIso(), sourceUpdatedAt, ageSeconds: sourceUpdatedAt ? Math.round((Date.now()-Date.parse(sourceUpdatedAt))/1000) : null, isStale: false, recordCount: data.records.length, licence: 'CC BY 4.0' }, { headers: { 'cache-control': 'public, max-age=21600, s-maxage=43200' } });
  });
} catch (error) { return failure(error instanceof TypeError ? 400 : 502, error instanceof TypeError ? 'INVALID_QUERY' : 'UPSTREAM_UNAVAILABLE', error instanceof TypeError ? error.message : 'Fuel prices are temporarily unavailable.', true); } };
