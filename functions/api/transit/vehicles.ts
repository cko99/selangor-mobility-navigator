import { cached, approvedFetch } from '../_shared/upstream';
import { decodeVehicles, matchVehicles } from '../_shared/realtime';
import { failure, json, nowIso } from '../_shared/response';
import { transitQuery } from '../_shared/validation';
import type { PagesContext } from '../_shared/types';
import { assetJson, feedKey } from '../_shared/staticData';

export const onRequestGet = async (context: PagesContext) => {
  try {
    const query = transitQuery(new URL(context.request.url));
    if (query.category === 'rapid-rail-kl') return failure(422, 'REALTIME_NOT_AVAILABLE', 'Stable realtime rail positions are not available.', false);
    return await cached(context.request, 25, 3600, async () => {
      const url = query.agency === 'ktmb' ? 'https://api.data.gov.my/gtfs-realtime/vehicle-position/ktmb' : `https://api.data.gov.my/gtfs-realtime/vehicle-position/prasarana?category=${query.category}`;
      const { bytes } = await approvedFetch(url, 8_000, 5_000_000);
      const decoded = decodeVehicles(bytes, query);
      const staticIndex = await assetJson<{ feeds: Record<string, {trips:Record<string,string>;routesById:Record<string,string>;routesByShortName:Record<string,string>}> }>(context, '/data/transit/realtime-index.json');
      const vehicles = matchVehicles(decoded.vehicles, staticIndex.feeds[feedKey(query.agency, query.category)]);
      const ageSeconds = decoded.sourceUpdatedAt ? Math.max(0, Math.round((Date.now() - Date.parse(decoded.sourceUpdatedAt)) / 1000)) : null;
      const status = ageSeconds === null ? 'offline' : ageSeconds <= 90 ? 'live' : ageSeconds <= 180 ? 'delayed' : 'stale';
      return json(vehicles, { source: 'data.gov.my', dataset: `GTFS Realtime ${query.agency}${query.category ? ` ${query.category}` : ''}`, status, fetchedAt: nowIso(), sourceUpdatedAt: decoded.sourceUpdatedAt, ageSeconds, isStale: status === 'stale', recordCount: vehicles.length, invalidCoordinates: decoded.invalidCoordinates, unmatchedEntities: vehicles.filter(vehicle => !vehicle.matchedStaticTrip).length }, { headers: { 'cache-control': 'public, max-age=15, s-maxage=25' } });
    });
  } catch (error) { console.error('Vehicle feed processing failed', error instanceof Error ? error.message : 'Unknown error'); return failure(error instanceof TypeError ? 400 : 502, error instanceof TypeError ? 'INVALID_QUERY' : 'UPSTREAM_UNAVAILABLE', error instanceof TypeError ? error.message : 'Transit data is temporarily unavailable.', true); }
};
