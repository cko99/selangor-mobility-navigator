import { json } from './_shared/response';
import type { PagesContext } from './_shared/types';

export const onRequestGet = async (context: PagesContext) => json({ service: 'Selangor Mobility Navigator API', environment: context.env.APP_ENV || 'local' }, {
  source: 'application', dataset: 'API health', status: 'live', fetchedAt: new Date().toISOString(), sourceUpdatedAt: null, ageSeconds: 0, isStale: false
}, { headers: { 'cache-control': 'no-store' } });
