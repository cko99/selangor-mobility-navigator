import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { safeDateIso } from './response';

interface FeedSpec { agency: 'ktmb' | 'prasarana'; category: string | null }

export function decodeVehicles(bytes: Uint8Array, spec: FeedSpec, nowSeconds = Date.now() / 1000) {
  const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(bytes);
  let invalidCoordinates = 0, unmatched = 0;
  const vehicles = [];
  for (const entity of feed.entity) {
    const vehicle = entity.vehicle, position = vehicle?.position;
    const latitude = Number(position?.latitude), longitude = Number(position?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || (latitude === 0 && longitude === 0)) { invalidCoordinates++; continue; }
    const timestampSeconds = Number(vehicle?.timestamp || feed.header.timestamp || 0);
    const ageSeconds = timestampSeconds ? Math.max(0, Math.round(nowSeconds - timestampSeconds)) : null;
    const status = ageSeconds === null ? 'offline' : ageSeconds <= 90 ? 'live' : ageSeconds <= 180 ? 'delayed' : 'stale';
    if (status === 'stale' && ageSeconds !== null && ageSeconds > 3600) continue;
    const tripId = vehicle?.trip?.tripId || null, routeId = vehicle?.trip?.routeId || null;
    if (!tripId) unmatched++;
    vehicles.push({
      id: vehicle?.vehicle?.id || entity.id || `${spec.agency}-${vehicles.length}`,
      agency: spec.agency, category: spec.category, tripId, routeId,
      latitude, longitude, bearing: finiteOrNull(position?.bearing), speed: finiteOrNull(position?.speed),
      timestamp: safeDateIso(timestampSeconds), ageSeconds, status, matchedStaticTrip: null
    });
  }
  const sourceTimestamp = Number(feed.header.timestamp || 0);
  return { vehicles, sourceUpdatedAt: safeDateIso(sourceTimestamp), invalidCoordinates, unmatched };
}

const finiteOrNull = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;

export function matchVehicles<T extends { tripId: string | null; routeId: string | null; matchedStaticTrip: boolean | null }>(vehicles: T[], index: { trips: Record<string,string>; routesById: Record<string,string>; routesByShortName: Record<string,string> }) {
  return vehicles.map(vehicle => {
    const copy: Omit<T, 'matchedStaticTrip'> = { ...vehicle };
    delete (copy as Partial<T>).matchedStaticTrip;
    return { ...copy, matchedStaticTrip: Boolean(vehicle.tripId && index.trips[vehicle.tripId]), staticTripId: vehicle.tripId ? index.trips[vehicle.tripId] || null : null, staticRouteId: vehicle.routeId ? index.routesById[vehicle.routeId] || index.routesByShortName[vehicle.routeId] || null : null };
  });
}
