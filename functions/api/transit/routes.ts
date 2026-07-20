import { failure, json } from '../_shared/response';
import { transitQuery } from '../_shared/validation';
import { assetJson, feedKey } from '../_shared/staticData';
import type { PagesContext } from '../_shared/types';

interface Payload { meta: { processedAt: string }; data: { agency: string; category: string | null }[] }
export const onRequestGet = async (context: PagesContext) => { try {
  const query = transitQuery(new URL(context.request.url)), payload = await assetJson<Payload>(context, '/data/transit/routes.json');
  const data = payload.data.filter(item => item.agency === query.agency && item.category === query.category);
  return json(data, { source: 'data.gov.my', dataset: `GTFS Static ${feedKey(query.agency, query.category)}`, status: 'static', fetchedAt: new Date().toISOString(), sourceUpdatedAt: payload.meta.processedAt, ageSeconds: Math.round((Date.now()-Date.parse(payload.meta.processedAt))/1000), isStale: false, recordCount: data.length }, { headers: { 'cache-control': 'public, max-age=3600, s-maxage=86400' } });
} catch (error) { return failure(error instanceof TypeError ? 400 : 503, error instanceof TypeError ? 'INVALID_QUERY' : 'STATIC_DATA_UNAVAILABLE', error instanceof Error ? error.message : 'Static transit data unavailable.', true); } };
