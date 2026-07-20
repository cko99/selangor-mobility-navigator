import { staticJson } from './apiClient.js';

export async function loadTransitStatic() {
  const [stations, routes, shapes, manifest] = await Promise.all([
    staticJson('/data/transit/stations.json'), staticJson('/data/transit/routes.json'),
    staticJson('/data/transit/route-shapes.geojson'), staticJson('/data/transit/manifest.json')
  ]);
  return { stations: stations.data, routes: routes.data, shapes, manifest };
}
