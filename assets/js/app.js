import { state } from './state.js';
import { loadTransitStatic } from './services/transitStaticService.js';
import { loadVehicles } from './services/transitRealtimeService.js';
import { loadSchedule } from './services/scheduleService.js';
import { loadForecast } from './services/weatherService.js';
import { loadFuel } from './services/fuelService.js';
import { requestLocation } from './services/locationService.js';
import { haversineMeters } from './utils/distance.js';
import { createGoogleMapsUrl, createWazeUrl } from './utils/navigationLinks.js';
import { escapeHtml } from './utils/escape.js';
import { appViewForPath } from './utils/routing.js';
import { mountMap, renderNetwork } from './map.js';
import { badge, sourceMeta, toast, unavailableCard, comingSoon } from './ui.js';

const sourceRows = new Map();
let staticProcessedAt = null;

const plannedModules = {
  alerts: {
    title: 'Service Alerts',
    explanation: 'Official transit service alerts are not currently integrated. Weather-warning integration and transit data availability are planned.',
    features: ['Verified operator service alerts', 'Weather-warning context', 'Source and freshness information'],
    phase: 'Data integration phase'
  },
  fares: {
    title: 'Prototype Fare Estimator',
    explanation: 'Fare values are not shown because an official calculation source has not been validated. Fare values in future prototype versions will be estimates only and must not be used for travel or payment decisions.',
    features: ['Source-backed fare rules', 'Clear estimate limitations', 'Links to operator information'],
    phase: 'Experimental features phase'
  },
  parkride: {
    title: 'Park & Ride Locations',
    explanation: 'Live parking occupancy is not available in this prototype. Locations will be published only after their source and coverage have been verified.',
    features: ['Verified facility locations', 'Operator source links', 'No fabricated occupancy counts'],
    phase: 'Public-data roadmap'
  },
  account: {
    title: 'Account',
    explanation: 'Account features are planned for a future release. This public prototype runs as a Guest session and stores no profile, payment or travel-history data.',
    features: ['Saved stations', 'Journey preferences', 'Notification settings', 'Travel history'],
    phase: 'Authentication phase'
  }
};

function preparePrototypeUi() {
  document.documentElement.lang = 'en';
  for (const host of document.querySelectorAll('[data-coming-soon]')) {
    const config = plannedModules[host.dataset.comingSoon];
    if (config) host.innerHTML = comingSoon(config);
  }
  renderProjectStatus();
}

function renderProjectStatus() {
  const rows = [
    ['Transit stations', 'Prototype data / Integration in progress', 'data.gov.my GTFS Static', 'Coverage and station semantics remain under validation.'],
    ['Transit routes', 'Prototype data / Integration in progress', 'data.gov.my GTFS Static', 'Route geometry and relationships are not a journey recommendation.'],
    ['Vehicle positions', 'Source-backed layer not displayed', 'data.gov.my GTFS Realtime', 'No demo simulation; feed coverage is limited and not system-wide.'],
    ['Timetable', 'Prototype schedule', 'GTFS Static derived schedule', 'Scheduled data only; no realtime countdown or platform assurance.'],
    ['Weather', 'Integration in progress', 'MET Malaysia via data.gov.my', 'Forecast data, not a live observation or AQI.'],
    ['Fuel prices', 'Integration in progress', 'Ministry of Finance via data.gov.my', 'Peninsular weekly values, not station-level Selangor prices.'],
    ['Service alerts', 'Not integrated', 'No operator alert feed', 'No incident or delay claims are displayed.'],
    ['Fare calculation', 'Prototype estimate planned', 'Source not yet validated', 'Not for travel, fare or payment decisions.'],
    ['Park & Ride occupancy', 'Not available', 'No verified source', 'No availability counts or status claims are displayed.'],
    ['Authentication', 'Demo only', 'Guest browser session', 'No profile, payment, saved journey or history storage.']
  ];
  const body = document.getElementById('projectStatusBody');
  if (body) body.innerHTML = rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
}

function recordSource(name, meta = {}, error = null) {
  sourceRows.set(name, { meta, error });
  renderRuntimeStatus();
}

function runtimeStatus(meta, error) {
  if (error) return '<span class="pill unavailable">Unavailable</span>';
  if (meta.status === 'static' || meta.status === 'scheduled') return badge(meta.status);
  if (meta.status === 'forecast') return badge('forecast');
  return '<span class="pill static">Source response</span>';
}

function renderRuntimeStatus() {
  const body = document.getElementById('statusBody');
  if (!body) return;
  const names = ['Transit Static', 'Vehicle feed', 'Weather forecast', 'Fuel prices', 'Schedules'];
  body.innerHTML = names.map(name => {
    const row = sourceRows.get(name);
    const updated = row?.meta?.sourceUpdatedAt || row?.meta?.fetchedAt || 'Not supplied';
    const limitation = row?.error || row?.meta?.limitation || (row ? 'See feature-level limitations above.' : 'Not requested yet.');
    return `<tr><td>${escapeHtml(name)}</td><td>${row ? runtimeStatus(row.meta, row.error) : '<span class="pill demo">Pending</span>'}</td><td>${escapeHtml(updated)}</td><td>${escapeHtml(limitation)}</td></tr>`;
  }).join('');
}

async function initializeStatic() {
  try {
    const data = await loadTransitStatic();
    state.stations = data.stations;
    state.routes = data.routes;
    state.shapes = data.shapes;
    staticProcessedAt = data.manifest.processedAt;
    recordSource('Transit Static', { status: 'static', source: 'data.gov.my GTFS Static', sourceUpdatedAt: staticProcessedAt });
    populateStations();
    renderMiniMap();
  } catch (error) {
    recordSource('Transit Static', { status: 'offline' }, error.message);
    toast('Transit data could not be loaded. Project Status has details.', 'alert-triangle');
  }
}

function populateStations() {
  const options = state.stations.map(station => `<option value="${escapeHtml(station.name)}"></option>`).join('');
  const datalist = document.getElementById('stationOptions');
  if (datalist) datalist.innerHTML = options;
  const from = document.getElementById('planFrom');
  const to = document.getElementById('planTo');
  if (from && state.stations[0]) from.value = state.stations[0].name;
  if (to && state.stations[1]) to.value = state.stations[1].name;
  updateScheduleFilter();
}

function updateScheduleFilter() {
  const mode = document.getElementById('schedMode')?.value || 'ktm';
  const station = document.getElementById('schedStation');
  if (!station) return;
  station.innerHTML = state.stations.filter(item => item.mode === mode).map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
  renderSchedule();
}

async function renderSchedule() {
  const stationId = document.getElementById('schedStation')?.value;
  const host = document.getElementById('schedGridWrap');
  if (!stationId || !host) return;
  const station = state.stations.find(item => item.id === stationId);
  host.innerHTML = '<div class="data-empty">Loading scheduled static data…</div>';
  try {
    const result = await loadSchedule(stationId);
    recordSource('Schedules', { ...result.meta, status: 'scheduled' });
    document.getElementById('schedTitle').textContent = `${station?.name || 'Station'} · Scheduled departures`;
    const rows = result.data.slice(0, 40);
    host.innerHTML = rows.length ? `<div class="schedule-list">${rows.map(row => `<article class="pr-card"><div><strong>${escapeHtml(row.headsign || 'Direction not provided')}</strong><div class="source-meta">Route ${escapeHtml(row.routeId)} · Service date ${escapeHtml(row.serviceDate)}</div></div><div class="schedule-time">${escapeHtml(row.departureTime)}</div>${badge('scheduled')}</article>`).join('')}</div>${sourceMeta({ ...result.meta, status: 'scheduled' })}` : `<div class="data-empty">No scheduled departure is available for this station and service date.</div>${sourceMeta({ ...result.meta, status: 'scheduled' })}`;
  } catch (error) {
    host.innerHTML = unavailableCard('Schedule temporarily unavailable', error.message);
    recordSource('Schedules', { status: 'offline' }, error.message);
  }
}

function renderMiniMap() {
  const host = document.getElementById('miniMap');
  if (!host || !state.stations.length) return;
  mountMap(host, false);
  window.map = state.map;
  renderNetwork();
}

function renderTransitMap() {
  const host = document.querySelector('#view-livemap [data-map-host]');
  mountMap(host);
  window.map = state.map;
  renderNetwork();
}

async function detectLocation() {
  const host = document.getElementById('geoStatus');
  if (host) host.textContent = 'Requesting browser location permission…';
  const result = await requestLocation();
  state.locationState = result.state;
  if (!result.ok) {
    state.userLocation = null;
    if (host) host.textContent = result.message;
    return;
  }
  state.userLocation = { latitude: result.latitude, longitude: result.longitude, accuracy: result.accuracy };
  if (host) host.textContent = `Location received · accuracy ±${Math.round(result.accuracy)} m${result.state === 'low-accuracy' ? ' · Low accuracy; results may be imprecise.' : ''}`;
  searchNearby();
}

async function searchNearby() {
  if (!state.userLocation) return toast('Use My Location before searching.', 'map-pin');
  const radiusInput = document.getElementById('bufferRadius');
  const radius = Math.min(3000, Math.max(500, Number(radiusInput?.value) || 1500));
  if (radiusInput) radiusInput.value = String(radius);
  const nearest = state.stations.map(station => ({ ...station, distance: haversineMeters(state.userLocation.latitude, state.userLocation.longitude, station.latitude, station.longitude) })).filter(station => station.distance <= radius).sort((a, b) => a.distance - b.distance).slice(0, 10);
  const host = document.getElementById('nearestList');
  if (host) host.innerHTML = nearest.length ? nearest.map((station, index) => `<article class="pr-card"><div class="station-result"><div><strong>${index + 1}. ${escapeHtml(station.name)}</strong><div class="source-meta">${escapeHtml(station.mode.toUpperCase())} · Approximate straight-line distance</div></div><strong>${station.distance < 1000 ? `${Math.round(station.distance)} m` : `${(station.distance / 1000).toFixed(1)} km`}</strong></div><div class="external-actions"><a class="ghost-btn" target="_blank" rel="noopener noreferrer" href="${createGoogleMapsUrl({ latitude: station.latitude, longitude: station.longitude }, state.userLocation)}">Google Maps</a><a class="ghost-btn" target="_blank" rel="noopener noreferrer" href="${createWazeUrl({ latitude: station.latitude, longitude: station.longitude })}">Waze</a></div>${sourceMeta({ source: 'data.gov.my GTFS Static', status: 'static', sourceUpdatedAt: staticProcessedAt })}</article>`).join('') : '<div class="data-empty">No station is available within the selected radius. Try a wider radius up to 3 km.</div>';
  const mapHost = document.querySelector('#view-nearest [data-map-host]');
  mountMap(mapHost);
  window.map = state.map;
  renderNetwork();
  if (nearest.length) state.map.fitBounds(nearest.map(item => [item.latitude, item.longitude]), { padding: [40, 40], maxZoom: 15 });
}

async function planTrip() {
  const findStation = value => state.stations.find(station => station.name.toLowerCase() === value.toLowerCase());
  const from = findStation(document.getElementById('planFrom')?.value.trim() || '');
  const to = findStation(document.getElementById('planTo')?.value.trim() || '');
  if (!from || !to || from.id === to.id) return toast('Choose two different stations from the station list.', 'alert-triangle');
  const common = from.routeIds.filter(id => to.routeIds.includes(id));
  const route = state.routes.find(item => common.includes(item.id));
  const box = document.getElementById('routeResult');
  const title = document.getElementById('routeResultTitle');
  const host = document.getElementById('routeResultBody');
  box.hidden = false;
  if (!common.length) {
    title.innerHTML = '<i data-lucide="route-off"></i>No prototype route';
    host.innerHTML = `<div class="data-empty"><strong>No prototype route is available for this selection.</strong><p>Try selecting a supported station pair or open Google Maps for complete directions.</p><a class="btn-primary" target="_blank" rel="noopener noreferrer" href="${createGoogleMapsUrl({ latitude: to.latitude, longitude: to.longitude }, { latitude: from.latitude, longitude: from.longitude })}">Open Google Maps</a></div>`;
  } else {
    title.innerHTML = '<i data-lucide="navigation"></i>Prototype route';
    host.innerHTML = `${badge('demo')} ${badge('static')}<h3>${escapeHtml(from.name)} → ${escapeHtml(to.name)}</h3><article class="pr-card"><strong>Direct static route relationship</strong><div class="source-meta">Route ${escapeHtml(route?.shortName || common[0])}</div></article><p>This route is for interface demonstration and is not an official journey recommendation. Fare, delay and platform accuracy are not provided.</p><a class="btn-primary" target="_blank" rel="noopener noreferrer" href="${createGoogleMapsUrl({ latitude: to.latitude, longitude: to.longitude }, { latitude: from.latitude, longitude: from.longitude })}">Complete directions in Google Maps</a>`;
  }
  window.lucide?.createIcons();
}

function switchView(viewName) {
  const next = document.getElementById(`view-${viewName}`);
  if (!next) return;
  state.view = viewName;
  document.querySelectorAll('.view').forEach(view => view.classList.toggle('active', view === next));
  document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
  closeSidebar();
  if (viewName === 'dashboard') setTimeout(renderMiniMap, 50);
  if (viewName === 'livemap') setTimeout(renderTransitMap, 50);
  if (viewName === 'nearest' && state.userLocation) setTimeout(searchNearby, 50);
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const open = sidebar?.classList.toggle('open') || false;
  document.getElementById('sidebarBackdrop')?.classList.toggle('show', open);
  document.getElementById('hamburgerBtn')?.setAttribute('aria-expanded', String(open));
}

function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarBackdrop')?.classList.remove('show');
  document.getElementById('hamburgerBtn')?.setAttribute('aria-expanded', 'false');
}

function swapPlanner() {
  const from = document.getElementById('planFrom');
  const to = document.getElementById('planTo');
  if (from && to) [from.value, to.value] = [to.value, from.value];
}

function resetMapView() { state.map?.setView([3.09, 101.66], 11); }
function locateUser() { switchView('nearest'); }

async function refreshAll() {
  await Promise.allSettled([refreshVehicleStatus(), refreshWeatherStatus(), refreshFuelStatus()]);
}

async function refreshVehicleStatus() {
  const results = await loadVehicles();
  const successes = results.filter(result => result.payload);
  if (!successes.length) return recordSource('Vehicle feed', { status: 'offline' }, 'No configured vehicle feed responded.');
  recordSource('Vehicle feed', { ...successes[0].payload.meta, limitation: 'Source-backed positions are not displayed by default; coverage is limited.' });
}

async function refreshWeatherStatus() {
  try { const result = await loadForecast('Tn070'); recordSource('Weather forecast', { ...result.meta, status: 'forecast', limitation: 'Forecast only; not a live observation or AQI.' }); }
  catch (error) { recordSource('Weather forecast', { status: 'offline' }, error.message); }
}

async function refreshFuelStatus() {
  try { const result = await loadFuel(2); recordSource('Fuel prices', { ...result.meta, status: 'static', limitation: 'Peninsular weekly values; not station-level pricing.' }); }
  catch (error) { recordSource('Fuel prices', { status: 'offline' }, error.message); }
}

Object.assign(window, { switchView, updateScheduleFilter, renderSchedule, detectLocation, searchNearby, planTrip, swapPlanner, resetMapView, locateUser, refreshAll, toast });

document.querySelectorAll('.nav-item[data-view]').forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));
document.getElementById('hamburgerBtn')?.addEventListener('click', toggleSidebar);
document.getElementById('sidebarBackdrop')?.addEventListener('click', closeSidebar);
document.getElementById('statusBtn')?.addEventListener('click', () => switchView('status'));
document.getElementById('locateBtn')?.addEventListener('click', locateUser);
document.getElementById('userChip')?.addEventListener('click', () => switchView('account'));
document.querySelectorAll('#layerSwitch button').forEach(button => button.addEventListener('click', () => {
  state.currentLayer = button.dataset.layer;
  document.querySelectorAll('#layerSwitch button').forEach(item => item.classList.toggle('on', item === button));
  renderNetwork();
}));
document.querySelectorAll('.mode-btn').forEach(button => button.addEventListener('click', () => {
  const mode = button.dataset.mode;
  if (state.activeModes.has(mode)) state.activeModes.delete(mode); else state.activeModes.add(mode);
  const active = state.activeModes.has(mode);
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
  renderNetwork();
}));
document.getElementById('globalSearch')?.addEventListener('keydown', event => {
  if (event.key !== 'Enter') return;
  const query = event.currentTarget.value.trim().toLowerCase();
  const station = state.stations.find(item => item.name.toLowerCase().includes(query));
  if (!station) return toast('No matching station was found in the loaded static dataset.', 'search');
  switchView('livemap');
  setTimeout(() => state.map?.flyTo([station.latitude, station.longitude], 16), 150);
  event.currentTarget.value = '';
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeSidebar(); });

preparePrototypeUi();
renderRuntimeStatus();
await initializeStatic();
switchView(appViewForPath(window.location.pathname));
await refreshAll();
window.lucide?.createIcons();
