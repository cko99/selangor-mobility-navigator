import type { PagesContext } from './types';

export const feedKey = (agency: string, category: string | null) => agency === 'ktmb' ? 'ktmb' : category === 'rapid-rail-kl' ? 'rail' : category === 'rapid-bus-kl' ? 'bus' : 'feeder';

export async function assetJson<T>(context: PagesContext, path: string): Promise<T> {
  const url = new URL(path, context.request.url);
  const response = await context.env.ASSETS.fetch(new Request(url.toString()));
  if (!response.ok) throw new Error(`Generated data unavailable: ${path}`);
  const length = Number(response.headers.get('content-length') || 0);
  if (length > 30_000_000) throw new Error('Generated data response exceeds limit');
  return response.json<T>();
}
