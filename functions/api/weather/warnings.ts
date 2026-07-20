import { approvedFetch, cached } from '../_shared/upstream';
import { failure, json, nowIso } from '../_shared/response';
import { transformWarnings } from '../_shared/weather';
import type { PagesContext } from '../_shared/types';

export const onRequestGet = async (context: PagesContext) => { try {
  return await cached(context.request, 180, 86_400, async () => {
    const { bytes } = await approvedFetch('https://api.data.gov.my/weather/warning', 8_000, 2_000_000, { headers: { accept: 'application/json' } });
    const data = transformWarnings(JSON.parse(new TextDecoder().decode(bytes)));
    const sourceUpdatedAt = data.map(item => item.issuedAt).filter(Boolean).sort().at(-1) || null;
    return json(data, { source: 'MET Malaysia via data.gov.my', dataset: 'Weather warnings', status: data.length ? 'warning' : 'live', fetchedAt: nowIso(), sourceUpdatedAt, ageSeconds: sourceUpdatedAt ? Math.round((Date.now()-Date.parse(sourceUpdatedAt))/1000) : null, isStale: false, recordCount: data.length }, { headers: { 'cache-control': 'public, max-age=60, s-maxage=180' } });
  });
} catch { return failure(502, 'UPSTREAM_UNAVAILABLE', 'Weather warnings are temporarily unavailable.', true); } };
