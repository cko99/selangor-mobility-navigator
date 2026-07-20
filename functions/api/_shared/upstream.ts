const approvedHosts = new Set(['api.data.gov.my', 'storage.data.gov.my']);

export async function approvedFetch(url: string, timeoutMs: number, maximumBytes: number, init: RequestInit = {}) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || !approvedHosts.has(parsed.hostname)) throw new Error('Unapproved upstream');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(parsed, { ...init, signal: controller.signal, headers: { accept: '*/*', ...(init.headers || {}) } });
    if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared > maximumBytes) throw new Error('Upstream response exceeds size limit');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > maximumBytes) throw new Error('Upstream response exceeds size limit');
    return { response, bytes };
  } finally { clearTimeout(timer); }
}

export async function cached(request: Request, edgeSeconds: number, staleSeconds: number, producer: () => Promise<Response>) {
  const cache = (caches as unknown as { default: Cache }).default;
  const freshKey = new Request(request.url, { method: 'GET' });
  const staleUrl = new URL(request.url); staleUrl.searchParams.set('__stale_cache', '1');
  const staleKey = new Request(staleUrl.toString(), { method: 'GET' });
  const hit = await cache.match(freshKey);
  if (hit) return tagCacheResponse(hit, 'hit');
  try {
    const response = await producer();
    if (response.ok) {
      const fresh = withCaching(response.clone(), edgeSeconds);
      const stale = withCaching(response.clone(), staleSeconds);
      await Promise.all([cache.put(freshKey, fresh), cache.put(staleKey, stale)]);
    }
    return tagCacheResponse(response, 'miss');
  } catch (error) {
    const stale = await cache.match(staleKey);
    if (stale) return tagCacheResponse(stale, 'stale');
    throw error;
  }
}

function withCaching(response: Response, seconds: number) {
  const headers = new Headers(response.headers); headers.set('cache-control', `public, max-age=${Math.min(seconds, 60)}, s-maxage=${seconds}`);
  return new Response(response.body, { status: response.status, headers });
}

async function tagCacheResponse(response: Response, value: string) {
  const headers = new Headers(response.headers); headers.set('x-smn-cache', value);
  const payload = await response.json<Record<string, unknown>>().catch(() => null);
  if (payload && payload.meta && typeof payload.meta === 'object') {
    const meta = payload.meta as Record<string, unknown>; meta.cacheStatus = value;
    if (value === 'stale') { meta.status = 'stale'; meta.isStale = true; }
    return new Response(JSON.stringify(payload), { status: response.status, headers });
  }
  return new Response(response.body, { status: response.status, headers });
}
