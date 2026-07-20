import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { unzipSync, strFromU8 } from 'fflate';
import { parse } from 'csv-parse/sync';

export const FEEDS = [
  { key: 'ktmb', agency: 'ktmb', category: null, url: 'https://api.data.gov.my/gtfs-static/ktmb', file: 'gtfs-ktmb.zip' },
  { key: 'rail', agency: 'prasarana', category: 'rapid-rail-kl', url: 'https://api.data.gov.my/gtfs-static/prasarana?category=rapid-rail-kl', file: 'gtfs-rail.zip' },
  { key: 'bus', agency: 'prasarana', category: 'rapid-bus-kl', url: 'https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-kl', file: 'gtfs-bus.zip' },
  { key: 'feeder', agency: 'prasarana', category: 'rapid-bus-mrtfeeder', url: 'https://api.data.gov.my/gtfs-static/prasarana?category=rapid-bus-mrtfeeder', file: 'gtfs-feeder.zip' }
];

const required = ['agency.txt', 'stops.txt', 'routes.txt', 'trips.txt', 'stop_times.txt', 'calendar.txt'];
const id = (feed, value) => `${feed}:${value}`;
const number = value => value === '' || value == null ? null : Number(value);

export function safeUnzip(buffer) {
  const files = unzipSync(new Uint8Array(buffer));
  let total = 0;
  for (const [name, bytes] of Object.entries(files)) {
    const normal = name.replaceAll('\\', '/');
    if (normal.startsWith('/') || normal.split('/').includes('..')) throw new Error(`Unsafe ZIP path: ${name}`);
    total += bytes.length;
    if (total > 120_000_000) throw new Error('Uncompressed GTFS exceeds 120 MB limit');
  }
  return files;
}

function rows(files, name, optional = false) {
  const entry = Object.entries(files).find(([path]) => path.split('/').at(-1).toLowerCase() === name);
  if (!entry) {
    if (optional) return [];
    throw new Error(`Missing required GTFS file: ${name}`);
  }
  return parse(strFromU8(entry[1]), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: true });
}

function routeMode(feed, route) {
  if (feed === 'ktmb') return 'ktm';
  if (feed === 'bus' || feed === 'feeder') return 'bus';
  const text = `${route.route_short_name || ''} ${route.route_long_name || ''}`.toLowerCase();
  if (text.includes('brt')) return 'brt';
  if (text.includes('mrt')) return 'mrt';
  return 'lrt';
}

function simplify(points, limit = 650) {
  if (points.length <= limit) return points;
  const step = Math.ceil(points.length / limit);
  const selected = points.filter((_, index) => index % step === 0);
  if (selected.at(-1) !== points.at(-1)) selected.push(points.at(-1));
  return selected;
}

export function processFeed(buffer, spec, processedAt = new Date().toISOString()) {
  const files = safeUnzip(buffer);
  for (const name of required) rows(files, name);
  const agencies = rows(files, 'agency.txt');
  const stopsRaw = rows(files, 'stops.txt');
  const routesRaw = rows(files, 'routes.txt');
  const tripsRaw = rows(files, 'trips.txt');
  const stopTimesRaw = rows(files, 'stop_times.txt');
  const shapesRaw = rows(files, 'shapes.txt', true);
  const calendarRaw = rows(files, 'calendar.txt');
  const datesRaw = rows(files, 'calendar_dates.txt', true);
  const transfersRaw = rows(files, 'transfers.txt', true);
  const feedInfo = rows(files, 'feed_info.txt', true);
  const frequenciesRaw = rows(files, 'frequencies.txt', true);

  const routes = routesRaw.map(route => ({
    id: id(spec.key, route.route_id), originalId: route.route_id, agency: spec.agency, category: spec.category,
    shortName: route.route_short_name || route.route_id, longName: route.route_long_name || route.route_short_name || route.route_id,
    mode: routeMode(spec.key, route), color: route.route_color ? `#${route.route_color.replace('#', '')}` : null,
    textColor: route.route_text_color ? `#${route.route_text_color.replace('#', '')}` : null
  }));
  const routeByOriginal = new Map(routes.map(route => [route.originalId, route]));
  const trips = tripsRaw.map(trip => ({
    id: id(spec.key, trip.trip_id), originalId: trip.trip_id, routeId: id(spec.key, trip.route_id),
    serviceId: id(spec.key, trip.service_id), headsign: trip.trip_headsign || null,
    directionId: trip.direction_id === '' ? null : Number(trip.direction_id), shapeId: trip.shape_id ? id(spec.key, trip.shape_id) : null
  }));
  const tripByOriginal = new Map(trips.map(trip => [trip.originalId, trip]));
  const stationRoutes = new Map();
  const stopTimes = [];
  for (const item of stopTimesRaw) {
    const trip = tripByOriginal.get(item.trip_id);
    if (!trip) continue;
    const stopId = id(spec.key, item.stop_id);
    if (!stationRoutes.has(stopId)) stationRoutes.set(stopId, new Set());
    stationRoutes.get(stopId).add(trip.routeId);
    stopTimes.push([trip.id, stopId, item.arrival_time || item.departure_time, item.departure_time || item.arrival_time, Number(item.stop_sequence)]);
  }
  const routeIdsByStop = stationRoutes;
  const stations = stopsRaw.map(stop => {
    const routeIds = [...(routeIdsByStop.get(id(spec.key, stop.stop_id)) || [])];
    const primaryRoute = routeByOriginal.get(tripsRaw.find(trip => routeIds.includes(id(spec.key, trip.route_id)))?.route_id);
    return {
      id: id(spec.key, stop.stop_id), originalId: stop.stop_id, name: stop.stop_name,
      latitude: number(stop.stop_lat), longitude: number(stop.stop_lon), agency: spec.agency, category: spec.category,
      mode: primaryRoute?.mode || (spec.key === 'ktmb' ? 'ktm' : spec.key === 'rail' ? 'lrt' : 'bus'),
      wheelchairBoarding: stop.wheelchair_boarding ? Number(stop.wheelchair_boarding) : (stop.isOKU === '1' || stop.isOKU === 'true' ? 1 : null),
      routeIds
    };
  }).filter(stop => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude));

  const shapePoints = new Map();
  for (const point of shapesRaw) {
    const shapeId = id(spec.key, point.shape_id);
    if (!shapePoints.has(shapeId)) shapePoints.set(shapeId, []);
    shapePoints.get(shapeId).push({ seq: Number(point.shape_pt_sequence), coordinates: [Number(point.shape_pt_lon), Number(point.shape_pt_lat)] });
  }
  const selectedShape = new Map();
  for (const trip of trips) {
    const key = `${trip.routeId}:${trip.directionId ?? 'x'}`;
    if (trip.shapeId && !selectedShape.has(key)) selectedShape.set(key, trip);
  }
  const features = [];
  for (const trip of selectedShape.values()) {
    const route = routes.find(item => item.id === trip.routeId);
    const points = (shapePoints.get(trip.shapeId) || []).sort((a, b) => a.seq - b.seq).map(point => point.coordinates);
    if (points.length > 1) features.push({ type: 'Feature', properties: { routeId: trip.routeId, mode: route?.mode, directionId: trip.directionId, sourceGeometry: 'gtfs-shapes' }, geometry: { type: 'LineString', coordinates: simplify(points) } });
  }
  if (!shapesRaw.length) {
    const stopCoordinates = new Map(stations.map(stop => [stop.id, [stop.longitude, stop.latitude]]));
    const selectedTrips = new Map();
    for (const trip of trips) { const key = `${trip.routeId}:${trip.directionId ?? 'x'}`; if (!selectedTrips.has(key)) selectedTrips.set(key, trip); }
    for (const trip of selectedTrips.values()) {
      const route = routes.find(item => item.id === trip.routeId);
      const coordinates = stopTimes.filter(row => row[0] === trip.id).sort((a,b) => a[4]-b[4]).map(row => stopCoordinates.get(row[1])).filter(Boolean);
      if (coordinates.length > 1) features.push({ type:'Feature', properties:{ routeId:trip.routeId, mode:route?.mode, directionId:trip.directionId, sourceGeometry:'derived-stop-sequence' }, geometry:{ type:'LineString', coordinates } });
    }
  }

  const calendars = calendarRaw.map(service => ({
    serviceId: id(spec.key, service.service_id), weekdays: ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].map(day => Number(service[day])),
    startDate: service.start_date, endDate: service.end_date
  }));
  const calendarDates = datesRaw.map(date => ({ serviceId: id(spec.key, date.service_id), date: date.date, exceptionType: Number(date.exception_type) }));
  const frequencies = frequenciesRaw.map(item => ({ tripId: id(spec.key, item.trip_id), startTime: item.start_time, endTime: item.end_time, headwaySecs: Number(item.headway_secs), exactTimes: Number(item.exact_times || 0) }));
  const transfers = transfersRaw.map(item => ({ fromStopId: id(spec.key, item.from_stop_id), toStopId: id(spec.key, item.to_stop_id), transferType: number(item.transfer_type), minTransferTime: number(item.min_transfer_time) }));
  return {
    meta: { key: spec.key, agency: spec.agency, category: spec.category, source: spec.url, processedAt, agencyName: agencies[0]?.agency_name || null, feedInfo: feedInfo[0] || null },
    stations, routes, trips, stopTimes, calendars, calendarDates, frequencies, transfers, features,
    stationRoutes: Object.fromEntries([...stationRoutes].map(([stopId, ids]) => [stopId, [...ids]]))
  };
}

export async function build(cacheDir = resolve('.cache/api-research'), outputDir = resolve('public/data/transit')) {
  await mkdir(outputDir, { recursive: true });
  await mkdir(resolve(outputDir, 'schedule-buckets'), { recursive: true });
  const built = [];
  for (const spec of FEEDS) built.push(processFeed(await readFile(resolve(cacheDir, spec.file)), spec));
  const processedAt = new Date().toISOString();
  const manifest = {
    source: 'data.gov.my official GTFS Static', processedAt,
    feeds: built.map(feed => ({ ...feed.meta, counts: { stations: feed.stations.length, routes: feed.routes.length, trips: feed.trips.length, stopTimes: feed.stopTimes.length, shapes: feed.features.length } }))
  };
  const writeJson = (name, value) => writeFile(resolve(outputDir, name), JSON.stringify(value));
  const scheduleWrites = [];
  for (const feed of built) {
    for (let bucket = 0; bucket < 32; bucket++) {
      const stopTimes = feed.stopTimes.filter(row => scheduleBucket(row[1]) === bucket);
      const tripIds = new Set(stopTimes.map(row => row[0]));
      const trips = feed.trips.filter(trip => tripIds.has(trip.id));
      const serviceIds = new Set(trips.map(trip => trip.serviceId));
      scheduleWrites.push(writeJson(`schedule-buckets/${feed.meta.key}-${bucket}.json`, {
        meta: { ...feed.meta, processedAt }, trips, stopTimes,
        calendars: feed.calendars.filter(item => serviceIds.has(item.serviceId)),
        calendarDates: feed.calendarDates.filter(item => serviceIds.has(item.serviceId)),
        frequencies: feed.frequencies.filter(item => tripIds.has(item.tripId))
      }));
    }
  }
  await Promise.all([
    writeJson('manifest.json', manifest), writeJson('feed-manifest.json', manifest),
    writeJson('stations.json', { meta: manifest, data: built.flatMap(feed => feed.stations) }),
    writeJson('routes.json', { meta: manifest, data: built.flatMap(feed => feed.routes) }),
    writeJson('realtime-index.json', { meta: manifest, feeds: Object.fromEntries(built.map(feed => [feed.meta.key, {
      trips: Object.fromEntries(feed.trips.map(trip => [trip.originalId, trip.id])),
      routesById: Object.fromEntries(feed.routes.map(route => [route.originalId, route.id])),
      routesByShortName: Object.fromEntries(feed.routes.map(route => [route.shortName, route.id]))
    }])) }),
    writeJson('route-shapes.geojson', { type: 'FeatureCollection', meta: manifest, features: built.flatMap(feed => feed.features) }),
    writeJson('station-routes.json', { meta: manifest, data: Object.assign({}, ...built.map(feed => feed.stationRoutes)) }),
    writeJson('schedule-index.json', { meta: manifest, bucketCount: 32, hash: 'sum-char-codes-mod-32', path: 'schedule-buckets/{feed}-{bucket}.json' }),
    ...scheduleWrites
  ]);
  return manifest;
}

export function scheduleBucket(stationId) { return [...stationId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 32; }

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) console.log(JSON.stringify(await build(), null, 2));
