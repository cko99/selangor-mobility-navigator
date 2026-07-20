import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const directory = resolve('public/data/transit');
const manifest = JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8'));
const stations = JSON.parse(await readFile(resolve(directory, 'stations.json'), 'utf8')).data;
const routes = JSON.parse(await readFile(resolve(directory, 'routes.json'), 'utf8')).data;
const shapes = JSON.parse(await readFile(resolve(directory, 'route-shapes.geojson'), 'utf8')).features;
const scheduleManifest = JSON.parse(await readFile(resolve(directory, 'schedule-index.json'), 'utf8'));
const scheduleFiles = [];
for (const feed of ['ktmb','rail','bus','feeder']) for (let bucket = 0; bucket < scheduleManifest.bucketCount; bucket++) scheduleFiles.push(JSON.parse(await readFile(resolve(directory, 'schedule-buckets', `${feed}-${bucket}.json`), 'utf8')));
const schedule = { trips: scheduleFiles.flatMap(file => file.trips), stopTimes: scheduleFiles.flatMap(file => file.stopTimes) };
const errors = [];
if (manifest.feeds.length !== 4) errors.push('Expected four feed manifests');
if (!stations.length || !routes.length || !schedule.stopTimes.length) errors.push('Core output is empty');
for (const station of stations) if (!(station.latitude >= -90 && station.latitude <= 90 && station.longitude >= -180 && station.longitude <= 180)) errors.push(`Invalid station coordinate: ${station.id}`);
const routeIds = new Set(routes.map(route => route.id));
for (const trip of schedule.trips) if (!routeIds.has(trip.routeId)) errors.push(`Orphan trip route: ${trip.id}`);
if (!shapes.some(shape => shape.properties.sourceGeometry === 'gtfs-shapes')) errors.push('No official GTFS shapes produced');
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(JSON.stringify({ ok: true, stations: stations.length, routes: routes.length, shapes: shapes.length, stopTimes: schedule.stopTimes.length }, null, 2));
