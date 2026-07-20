import { MAP_DEFAULT, MODE_STYLE } from './config.js';
import { state } from './state.js';
import { escapeHtml } from './utils/escape.js';

const osm = { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', options: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } };

export function mountMap(host, interactive = true) {
  if (!host) return null;
  if (state.map && state.map.getContainer().parentNode !== host) {
    host.appendChild(state.map.getContainer());
    if (interactive) { state.map.dragging.enable(); state.map.scrollWheelZoom.enable(); } else { state.map.dragging.disable(); state.map.scrollWheelZoom.disable(); }
    setTimeout(() => state.map.invalidateSize(), 100); return state.map;
  }
  if (!state.map) {
    const container = document.createElement('div');
    container.className = 'leaflet-dynamic-host'; container.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'; host.append(container);
    state.map = window.L.map(container, { zoomControl: false, attributionControl: true, dragging: interactive, scrollWheelZoom: interactive }).setView(MAP_DEFAULT.center, MAP_DEFAULT.zoom);
    state.baseLayer = window.L.tileLayer(osm.url, osm.options).addTo(state.map);
    state.map.on('zoomend', renderStations);
  }
  return state.map;
}

export function renderNetwork() { renderShapes(); renderStations(); }

function renderShapes() {
  state.routeLayers.forEach(layer => layer.remove()); state.routeLayers = [];
  for (const feature of state.shapes?.features || []) {
    const mode = feature.properties.mode || 'bus';
    if (!state.activeModes.has(mode) || (state.currentLayer !== 'all' && state.currentLayer !== mode)) continue;
    const layer = window.L.geoJSON(feature, { style: { color: MODE_STYLE[mode]?.color || '#7a8699', weight: mode === 'bus' ? 2 : 3.5, opacity: mode === 'bus' ? 0.45 : 0.82 } }).addTo(state.map);
    state.routeLayers.push(layer);
  }
}

export function renderStations() {
  if (!state.map) return;
  state.stationLayers.forEach(layer => layer.remove()); state.stationLayers = [];
  const zoom = state.map.getZoom();
  for (const station of state.stations) {
    if (!state.activeModes.has(station.mode) || (state.currentLayer !== 'all' && state.currentLayer !== station.mode)) continue;
    if (station.mode === 'bus' && zoom < 15) continue;
    const color = MODE_STYLE[station.mode]?.color || '#7a8699', icon = window.L.divIcon({ className: '', html: `<div class="station-marker" style="background:${color}"></div>`, iconSize: [14, 14], iconAnchor: [7, 7] });
    const marker = window.L.marker([station.latitude, station.longitude], { icon }).addTo(state.map);
    marker.bindPopup(`<b>${escapeHtml(station.name)}</b><br>${escapeHtml(station.mode.toUpperCase())}<br><span>Static · data.gov.my</span>`);
    state.stationLayers.push(marker);
  }
}

export function updateVehicleMarkers(vehicles) {
  const seen = new Set();
  for (const vehicle of vehicles) {
    const key = `${vehicle.agency}:${vehicle.category || ''}:${vehicle.id}`; seen.add(key);
    const mode = vehicle.agency === 'ktmb' ? 'ktm' : 'bus';
    if (!state.activeModes.has(mode) || (state.currentLayer !== 'all' && state.currentLayer !== mode)) continue;
    let marker = state.vehicles.get(key), color = MODE_STYLE[mode].color;
    if (!marker) {
      const icon = window.L.divIcon({ className: '', html: `<div class="vehicle-marker" style="background:${color}">${mode === 'ktm' ? 'KTM' : 'BUS'}</div>`, iconSize: [24, 24], iconAnchor: [12, 12] });
      marker = window.L.marker([vehicle.latitude, vehicle.longitude], { icon, zIndexOffset: 1000 }).addTo(state.map); state.vehicles.set(key, marker);
    } else marker.setLatLng([vehicle.latitude, vehicle.longitude]);
    marker.bindPopup(`<b>${escapeHtml(vehicle.id)}</b><br>${escapeHtml(vehicle.status)} · ${vehicle.ageSeconds ?? '?'}s<br>data.gov.my`);
  }
  for (const [key, marker] of state.vehicles) if (!seen.has(key)) { marker.remove(); state.vehicles.delete(key); }
}

export function clearVehicles() { for (const marker of state.vehicles.values()) marker.remove(); state.vehicles.clear(); }
