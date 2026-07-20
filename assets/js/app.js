import { DEFAULT_LOCATION_ID, VEHICLE_REFRESH_MS } from './config.js';
import { state } from './state.js';
import { loadTransitStatic } from './services/transitStaticService.js';
import { loadVehicles } from './services/transitRealtimeService.js';
import { loadSchedule } from './services/scheduleService.js';
import { loadForecast, loadWarnings } from './services/weatherService.js';
import { loadFuel } from './services/fuelService.js';
import { requestLocation } from './services/locationService.js';
import { haversineMeters, approximateWalkMinutes } from './utils/distance.js';
import { createGoogleMapsUrl, createWazeUrl } from './utils/navigationLinks.js';
import { escapeHtml } from './utils/escape.js';
import { mountMap, renderNetwork, updateVehicleMarkers, clearVehicles } from './map.js';
import { badge, sourceMeta, toast, unavailableCard } from './ui.js';

const sourceRows = new Map();
let warnings = [];

function prepareApprovedUi() {
  document.documentElement.lang = 'ms';
  const chip = document.getElementById('userChip'); if (chip) chip.innerHTML = '<div class="avatar">L</div><div style="font-size:12px;line-height:1.2"><div style="font-weight:600">Local mode</div><div style="color:var(--muted);font-size:10px">Tiada profil disimpan</div></div>';
  const welcome = document.querySelector('#view-dashboard .grid > div:first-child');
  if (welcome) welcome.querySelector('div[style*="padding:20px"]')?.replaceChildren(makeWelcome());
  const dashboardChildren = document.querySelector('#view-dashboard .grid')?.children;
  if (dashboardChildren?.[1]) { dashboardChildren[1].id = 'weatherCard'; dashboardChildren[1].innerHTML = '<div class="data-empty">Memuatkan ramalan rasmi…</div>'; }
  if (dashboardChildren?.[3]) dashboardChildren[3].innerHTML = `<div class="grid grid-cols-2 gap-3 h-full"><div class="stat-mini"><div class="lbl">Vehicles</div><div class="val" id="dashLiveCount">—</div><div id="vehicleFreshness" class="source-meta">Loading</div></div><div class="stat-mini">${unavailableCard('On-time rate','Trip Updates tidak tersedia')}</div><div class="stat-mini">${unavailableCard('Average wait','Tiada metrik realtime rasmi')}</div><div class="stat-mini">${unavailableCard('Network load','Tiada sumber rasmi')}</div></div>`;
  document.querySelector('#view-dashboard .card-title span')?.replaceChildren(document.createTextNode('Official Data Overview'));
  const arrivalCard = document.getElementById('dashArrivals')?.closest('.card');
  if (arrivalCard) { arrivalCard.querySelector('.card-title span').textContent = 'Scheduled Departures'; arrivalCard.querySelector('.pill').outerHTML = badge('scheduled'); }
  for (const button of document.querySelectorAll('.basemap-btn[data-basemap="sat"],.basemap-btn[data-basemap="hybrid"]')) { button.disabled = true; button.title = 'Provider not configured'; button.style.opacity = '.42'; }
  const fareContent = document.querySelector('#view-fares .grid > div:first-child'); if (fareContent) fareContent.innerHTML = `<div class="card-head"><div class="card-title"><i data-lucide="calculator"></i>Fare Calculator</div>${badge('unavailable')}</div>${unavailableCard('Official fare unavailable','Formula anggaran V1 telah dinyahaktif sehingga sumber tambang rasmi disahkan.')}`;
  const fuelHost = document.querySelector('#view-fares .grid > div:nth-child(2)'); if (fuelHost) fuelHost.innerHTML = `<div class="card" id="fuelCard"><div class="card-head"><div class="card-title"><i data-lucide="fuel"></i>Peninsular Malaysia Fuel Prices</div>${badge('static')}</div><div class="data-empty">Memuatkan data mingguan…</div></div>`;
  const account = document.querySelector('#view-account .grid'); if (account) account.innerHTML = `<div class="col-span-12 card">${unavailableCard('Account data disabled','Profil, baki, sejarah perjalanan dan statistik V1 ialah Demo dan tidak disimpan dalam Phase 2.')}</div>`;
  const reports = document.getElementById('prevReports'); if (reports) reports.innerHTML = unavailableCard('No saved reports','Borang maklum balas ini belum disambungkan kepada backend penghantaran.');
  for (const card of document.querySelectorAll('#view-settings .card, #view-help .card')) {
    const title = card.querySelector('.card-title')?.textContent || '';
    if (title.includes('Notification Subscriptions')) card.innerHTML = `<div class="card-head"><div class="card-title">Notification Subscriptions</div>${badge('unavailable')}</div>${unavailableCard('Subscriptions unavailable','No notification backend is configured.')}`;
    if (title.includes('Saved Locations')) card.innerHTML = `<div class="card-head"><div class="card-title">Saved Locations</div>${badge('unavailable')}</div>${unavailableCard('Saved locations disabled','Phase 2 does not persist user location data.')}`;
    if (title.includes('Emergency Hotlines')) card.innerHTML = `<div class="card-head"><div class="card-title">Emergency Hotlines</div>${badge('unavailable')}</div>${unavailableCard('Contact list not verified','Use official operator and emergency-service channels; V1 numbers are not shown.')}`;
  }
  addStatusPanel();
  window.lucide?.createIcons();
}

function makeWelcome() {
  const fragment = document.createDocumentFragment(), wrapper = document.createElement('div');
  wrapper.innerHTML = `<div style="font-size:11px;color:var(--muted);letter-spacing:.15em;text-transform:uppercase">Phase 2 · Official public data</div><h2 style="font-size:22px;font-weight:600;margin:4px 0 14px">Selangor Mobility Navigator</h2><p style="color:var(--muted);font-size:13px;margin:0 0 16px;max-width:620px">GTFS Static, verified vehicle positions, MET Malaysia forecasts and Ministry of Finance fuel prices with visible freshness.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn-primary" onclick="switchView('planner')">Plan a Trip</button><button class="btn-ghost" onclick="switchView('nearest')">Find Nearest Station</button><button class="btn-ghost" onclick="switchView('livemap')">Open Live Map</button></div>`;
  while (wrapper.firstChild) fragment.append(wrapper.firstChild); return fragment;
}

function addStatusPanel() {
  const grid = document.querySelector('#view-settings .grid'); if (!grid) return;
  const card = document.createElement('div'); card.className = 'col-span-12 card fade-in';
  card.innerHTML = `<div class="card-head"><div class="card-title"><i data-lucide="database"></i>Data Sources / System Status</div><button class="ghost-btn" onclick="refreshAll()">Retry</button></div><div style="padding:10px;overflow:auto"><table class="status-table"><thead><tr><th>Source</th><th>Status</th><th>Last success</th><th>Records / cache</th><th>Error</th></tr></thead><tbody id="sourceStatusBody"></tbody></table></div>`;
  grid.prepend(card);
}

function recordSource(name, meta, error = null) { sourceRows.set(name, { name, meta, error }); state.sourceStatus.set(name, meta); renderSourceStatus(); }
function renderSourceStatus() {
  const body = document.getElementById('sourceStatusBody'); if (!body) return;
  const required = ['KTMB Static','Prasarana Rail Static','Rapid KL Bus Static','MRT Feeder Static','KTMB Realtime','Rapid KL Bus Realtime','MRT Feeder Realtime','Weather Forecast','Weather Warning','Fuel Prices'];
  body.innerHTML = required.map(name => { const row = sourceRows.get(name); return `<tr><td>${escapeHtml(name)}</td><td>${row ? badge(row.error ? 'offline' : row.meta.status) : badge('offline')}</td><td>${escapeHtml(row?.meta?.sourceUpdatedAt || row?.meta?.fetchedAt || '—')}</td><td>${escapeHtml(row?.meta?.recordCount ?? '—')} / ${escapeHtml(row?.meta?.cacheStatus || 'HTTP cache')}</td><td>${escapeHtml(row?.error || '—')}</td></tr>`; }).join('');
}

async function initializeStatic() {
  try {
    const data = await loadTransitStatic(); state.stations = data.stations; state.routes = data.routes; state.shapes = data.shapes;
    for (const feed of data.manifest.feeds) recordSource(({ ktmb:'KTMB Static', rail:'Prasarana Rail Static', bus:'Rapid KL Bus Static', feeder:'MRT Feeder Static' })[feed.key], { source: feed.source, dataset: feed.key, status: 'static', fetchedAt: data.manifest.processedAt, sourceUpdatedAt: feed.processedAt, recordCount: feed.counts.stations, isStale: false });
    populateStationControls(); renderMiniMap(); renderParkRideUnavailable();
  } catch (error) { ['KTMB Static','Prasarana Rail Static','Rapid KL Bus Static','MRT Feeder Static'].forEach(name => recordSource(name, { status:'offline' }, error.message)); toast('Data GTFS Static tidak dapat dimuatkan', 'alert-triangle'); }
}

function populateStationControls() {
  const scheduleStation = document.getElementById('schedStation'); if (scheduleStation) scheduleStation.innerHTML = optionsForStations(state.stations.filter(station => station.mode === 'ktm'));
  const feedback = document.getElementById('fbStation'); if (feedback) feedback.innerHTML = `<option value="">-- Select --</option>${optionsForStations(state.stations)}`;
  const listId = 'stationOptions'; let list = document.getElementById(listId); if (!list) { list = document.createElement('datalist'); list.id = listId; document.body.append(list); }
  list.innerHTML = state.stations.map(station => `<option value="${escapeHtml(station.name)}"></option>`).join('');
  for (const id of ['planFrom','planTo']) document.getElementById(id)?.setAttribute('list', listId);
  const from = document.getElementById('planFrom'), to = document.getElementById('planTo'); if (from && state.stations[0]) from.value = state.stations[0].name; if (to && state.stations[1]) to.value = state.stations[1].name;
  updateScheduleFilter();
}

const optionsForStations = stations => stations.map(station => `<option value="${escapeHtml(station.id)}">${escapeHtml(station.name)} · ${escapeHtml(station.mode.toUpperCase())}</option>`).join('');

function updateScheduleFilter() {
  const mode = document.getElementById('schedMode')?.value || 'ktm', station = document.getElementById('schedStation'); if (!station) return;
  const routes = state.routes.filter(route => route.mode === mode), line = document.getElementById('schedLine');
  if (line) line.innerHTML = routes.map(route => `<option value="${escapeHtml(route.id)}">${escapeHtml(route.shortName)} · ${escapeHtml(route.longName)}</option>`).join('');
  station.innerHTML = optionsForStations(state.stations.filter(item => item.mode === mode)); renderSchedule();
}

async function renderSchedule() {
  const stationId = document.getElementById('schedStation')?.value; if (!stationId) return;
  const station = state.stations.find(item => item.id === stationId), host = document.getElementById('schedGridWrap');
  if (host) host.innerHTML = '<div class="data-empty">Memuatkan scheduled departures…</div>';
  try {
    const result = await loadSchedule(stationId); recordSource('Schedules', result.meta);
    if (document.getElementById('schedTitle')) document.getElementById('schedTitle').textContent = `${station?.name || ''} · Scheduled departure`;
    renderScheduleRows(host, result.data, result.meta);
  } catch (error) { if (host) host.innerHTML = unavailableCard('Schedule unavailable', error.message); recordSource('Schedules', { status:'offline' }, error.message); }
}

function renderScheduleRows(host, rows, meta) {
  if (!host) return; const search = document.getElementById('schedSearch')?.value.toLowerCase() || '';
  const filtered = rows.filter(row => `${row.departureTime} ${row.headsign || ''}`.toLowerCase().includes(search)).slice(0, 40);
  host.innerHTML = filtered.length ? `<div style="display:flex;flex-direction:column;gap:7px">${filtered.map(row => `<div class="pr-card"><div style="display:flex;justify-content:space-between;gap:10px"><div><strong>${escapeHtml(row.headsign || 'Direction not provided')}</strong><div class="source-meta">Route ${escapeHtml(row.routeId)} · Service date ${escapeHtml(row.serviceDate)}</div></div><div class="mono">${escapeHtml(row.departureTime)}</div></div>${badge('scheduled')}</div>`).join('')}</div>${sourceMeta(meta)}` : `<div class="data-empty">Tiada scheduled departure bagi tarikh ini.</div>${sourceMeta(meta)}`;
}

async function refreshVehicles() {
  if (document.hidden) return;
  const results = await loadVehicles(), all = [];
  for (const result of results) {
    if (result.payload) { all.push(...result.payload.data); recordSource(result.key, result.payload.meta); }
    else recordSource(result.key, { status: 'offline' }, result.error);
  }
  if (state.map) updateVehicleMarkers(all);
  const live = all.filter(item => item.status === 'live').length, count = document.getElementById('liveMapCount');
  if (count) { count.textContent = String(live); count.parentElement.lastChild.textContent = ' verified live'; }
  const dash = document.getElementById('dashLiveCount'); if (dash) dash.textContent = String(live);
  const fresh = document.getElementById('vehicleFreshness'); if (fresh) fresh.textContent = all.length ? `${all.length} positions · ${live} fresh` : 'Feed offline or no active vehicles';
}

async function refreshWeather() {
  const card = document.getElementById('weatherCard');
  try { const result = await loadForecast(DEFAULT_LOCATION_ID), today = result.data.find(row => row.date === localDate()) || result.data[0]; recordSource('Weather Forecast', result.meta); if (card) card.innerHTML = `<div style="padding:18px"><div style="display:flex;justify-content:space-between"> <div><div style="font-size:11px;color:var(--muted)">Shah Alam · ${escapeHtml(today?.date || '')}</div><div style="font-size:22px;font-weight:600;margin-top:4px">${escapeHtml(today?.summary || 'Forecast unavailable')}</div></div>${badge('forecast')}</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:14px"><div class="stat-mini"><div class="lbl">Morning</div><div style="font-size:12px">${escapeHtml(today?.morning || '—')}</div></div><div class="stat-mini"><div class="lbl">Afternoon</div><div style="font-size:12px">${escapeHtml(today?.afternoon || '—')}</div></div><div class="stat-mini"><div class="lbl">Night</div><div style="font-size:12px">${escapeHtml(today?.night || '—')}</div></div></div><div class="source-meta">Minimum ${today?.minTemperature ?? '—'}°C · Maximum ${today?.maxTemperature ?? '—'}°C</div>${sourceMeta(result.meta)}</div>`; }
  catch (error) { if (card) card.innerHTML = unavailableCard('Forecast unavailable', error.message); recordSource('Weather Forecast', { status:'offline' }, error.message); }
  try { const result = await loadWarnings(); warnings = result.data; recordSource('Weather Warning', result.meta); renderAlerts(); }
  catch (error) { warnings = []; recordSource('Weather Warning', { status:'offline' }, error.message); renderAlerts(error.message); }
}

function renderAlerts(error = null) {
  const host = document.getElementById('alertList'), dash = document.getElementById('dashAlerts');
  const html = warnings.length ? warnings.map(item => `<div class="alert-item weather"><div class="alert-icon"><i data-lucide="cloud-rain"></i></div><div><strong>${escapeHtml(item.title)}</strong><div class="source-meta">Valid: ${escapeHtml(item.validFrom || '—')} – ${escapeHtml(item.validTo || 'until withdrawn')}</div><div style="margin-top:6px">${escapeHtml(item.heading || item.text || '')}</div><div class="source-meta">Weather warning may affect surface travel.</div>${badge('warning')}</div></div>`).join('') : `<div class="data-empty">${escapeHtml(error || 'No active official weather warnings. No official transit service-alert API is available.')}</div>`;
  if (host) host.innerHTML = html; if (dash) dash.innerHTML = html;
  const dashPill = document.querySelector('#dashAlerts')?.closest('.card')?.querySelector('.pill'); if (dashPill) { dashPill.textContent = `${warnings.length} active`; dashPill.className = `pill ${warnings.length ? 'warn' : 'live'}`; }
  for (const id of ['alertCount','alertBadge']) { const node = document.getElementById(id); if (node) node.textContent = String(warnings.length); }
  window.lucide?.createIcons();
}

async function refreshFuel() {
  const host = document.querySelector('#fuelCard > div:last-child');
  try { const result = await loadFuel(12), latest = result.data.latest, previous = result.data.previous; recordSource('Fuel Prices', result.meta); const delta = (key) => latest?.[key] != null && previous?.[key] != null ? latest[key] - previous[key] : null;
    if (host) host.outerHTML = `<div style="padding:18px"><div style="font-size:11px;color:var(--muted)">Effective ${escapeHtml(latest?.date || '—')} · RM/litre</div><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px">${fuelStat('RON95',latest?.ron95,delta('ron95'))}${fuelStat('RON97',latest?.ron97,delta('ron97'))}${fuelStat('Diesel (Peninsular)',latest?.diesel,delta('diesel'))}</div>${fuelTrend(result.data.records)}<div style="margin-top:8px;font-size:11px;color:var(--muted)">12-week RON95 trend · ${result.data.records.length} verified records. Not station-level Selangor pricing.</div>${sourceMeta(result.meta)}</div>`;
  } catch (error) { if (host) host.innerHTML = unavailableCard('Fuel prices unavailable', error.message); recordSource('Fuel Prices', { status:'offline' }, error.message); }
}

const fuelStat = (label, value, delta) => `<div class="stat-mini"><div class="lbl">${escapeHtml(label)}</div><div class="val">${value == null ? '—' : Number(value).toFixed(2)}</div><div class="source-meta">${delta == null ? 'Change unavailable' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} vs previous week`}</div></div>`;
function fuelTrend(records) { const values=records.map(item=>item.ron95).filter(Number.isFinite); if(!values.length)return ''; const min=Math.min(...values),max=Math.max(...values),range=max-min||1; return `<div aria-label="12-week RON95 trend" style="height:56px;display:flex;align-items:flex-end;gap:4px;margin-top:14px">${values.map((value,index)=>`<div title="Week ${index+1}: RM ${value.toFixed(2)}" style="flex:1;height:${20+((value-min)/range)*36}px;background:linear-gradient(180deg,var(--accent),rgba(255,122,26,.25));border-radius:3px 3px 0 0"></div>`).join('')}</div>`; }

function renderMiniMap() { const host = document.getElementById('miniMap'); if (!host || !state.stations.length) return; mountMap(host, false); window.map = state.map; renderNetwork(); }
function renderLiveMap() { const host = document.querySelector('#view-livemap [data-map-host]'); mountMap(host); window.map = state.map; renderNetwork(); refreshVehicles(); }

async function detectLocation() {
  const host = document.getElementById('geoStatus'); if (host) host.textContent = 'Mengesan lokasi…'; const result = await requestLocation(); state.locationState = result.state;
  if (!result.ok) { state.userLocation = null; if (host) host.innerHTML = `${escapeHtml(result.message)} <button class="ghost-btn" onclick="useDemoLocation()">Use explicit Demo location</button>`; return; }
  state.userLocation = { latitude: result.latitude, longitude: result.longitude, accuracy: result.accuracy }; if (host) host.textContent = `Location granted · accuracy ±${Math.round(result.accuracy)}m${result.state === 'low-accuracy' ? ' · Low accuracy' : ''}`; searchNearby();
}

function useDemoLocation() { state.userLocation = { latitude: 3.107, longitude: 101.607, demo: true }; state.locationState = 'demo'; const host = document.getElementById('geoStatus'); if (host) host.innerHTML = `Petaling Jaya demo location ${badge('demo')}`; searchNearby(); }
async function searchNearby() {
  if (!state.userLocation) return toast('Detect location or choose Demo location first', 'alert-triangle');
  const radius = Math.min(3000, Math.max(500, Number(document.getElementById('bufferRadius')?.value) || 1500));
  const nearest = state.stations.map(station => ({ ...station, distance: haversineMeters(state.userLocation.latitude, state.userLocation.longitude, station.latitude, station.longitude) })).filter(station => station.distance <= radius).sort((a,b) => a.distance-b.distance).slice(0,10);
  const nextDepartures = new Map(); await Promise.all(nearest.slice(0,3).map(async station => { try { nextDepartures.set(station.id, (await loadSchedule(station.id)).data[0] || null); } catch { nextDepartures.set(station.id, null); } }));
  const host = document.getElementById('nearestList'); if (host) host.innerHTML = nearest.length ? nearest.map((station,index) => { const next = nextDepartures.get(station.id); const access = station.wheelchairBoarding === 1 ? 'Wheelchair boarding indicated' : station.wheelchairBoarding === 2 ? 'Not wheelchair accessible in GTFS' : 'Accessibility not provided'; return `<div class="pr-card"><div style="display:flex;justify-content:space-between"><div><strong>${index+1}. ${escapeHtml(station.name)}</strong><div class="source-meta">${escapeHtml(station.mode.toUpperCase())} · Approximate distance · ${approximateWalkMinutes(station.distance)} min straight-line estimate<br>${escapeHtml(access)} · Next scheduled: ${escapeHtml(next?.departureTime || 'Unavailable')}</div></div><strong>${station.distance < 1000 ? Math.round(station.distance)+'m' : (station.distance/1000).toFixed(1)+'km'}</strong></div><div class="external-actions"><a class="ghost-btn" target="_blank" rel="noopener noreferrer" href="${createGoogleMapsUrl({latitude:station.latitude,longitude:station.longitude},state.userLocation)}">Google Maps walking</a><a class="ghost-btn" target="_blank" rel="noopener noreferrer" href="${createWazeUrl({latitude:station.latitude,longitude:station.longitude})}">Waze</a></div>${sourceMeta({source:'data.gov.my GTFS Static',status:'static',fetchedAt:new Date().toISOString()})}</div>`; }).join('') : '<div class="data-empty">Tiada stesen dalam radius dipilih.</div>';
  const mapHost = document.querySelector('#view-nearest [data-map-host]'); mountMap(mapHost); window.map = state.map; renderNetwork(); if (nearest.length) state.map.fitBounds(nearest.map(item => [item.latitude,item.longitude]), { padding:[40,40],maxZoom:15 });
}

async function planTrip() {
  const find = value => state.stations.find(station => station.name.toLowerCase() === value.toLowerCase()) || state.stations.find(station => station.name.toLowerCase().includes(value.toLowerCase()));
  const from = find(document.getElementById('planFrom')?.value || ''), to = find(document.getElementById('planTo')?.value || ''); if (!from || !to) return toast('Pilih stesen GTFS yang sah', 'alert-triangle');
  const common = from.routeIds.filter(id => to.routeIds.includes(id)), route = state.routes.find(item => common.includes(item.id)), host = document.getElementById('routeResultBody'), box = document.getElementById('routeResult'); if (box) box.style.display='block';
  let departures = []; try { departures = (await loadSchedule(from.id)).data.slice(0,3); } catch { /* endpoint status shown elsewhere */ }
  if (host) host.innerHTML = common.length ? `<div>${badge('scheduled')} ${badge('static')} ${badge('demo').replace('Demo fallback','Experimental')}</div><h3 style="margin:12px 0">Direct GTFS relationship found</h3><div class="pr-card"><strong>${escapeHtml(from.name)} → ${escapeHtml(to.name)}</strong><div class="source-meta">Route ${escapeHtml(route?.shortName || common[0])} · Prototype route, not an official multimodal journey planner.</div></div><div style="margin-top:10px"><strong>Scheduled departures from origin</strong>${departures.map(item => `<div class="source-meta">${escapeHtml(item.departureTime)} · ${escapeHtml(item.headsign || 'Direction unavailable')}</div>`).join('') || '<div class="source-meta">Unavailable</div>'}</div><div class="external-actions"><a class="btn-primary" target="_blank" rel="noopener noreferrer" href="${createGoogleMapsUrl({latitude:to.latitude,longitude:to.longitude},state.userLocation)}">Complete navigation in Google Maps</a><a class="btn-ghost" target="_blank" rel="noopener noreferrer" href="${createWazeUrl({latitude:to.latitude,longitude:to.longitude})}">Waze</a></div>` : unavailableCard('No reliable direct route','Simple transfers remain Phase 3. Use Google Maps for complete navigation.');
}

function renderParkRideUnavailable() { const list = document.getElementById('prList'); if (list) list.innerHTML = unavailableCard('Park & Ride occupancy unavailable','No verified realtime occupancy source was found. V1 availability and prices have been removed from production.'); const pill = document.querySelector('#view-parkride .pill'); if (pill) pill.outerHTML = badge('unavailable'); }

function switchView(viewName) {
  state.view = viewName; document.querySelectorAll('.view').forEach(view => view.classList.remove('active')); document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  document.getElementById(`view-${viewName}`)?.classList.add('active'); document.querySelector(`.nav-item[data-view="${viewName}"]`)?.classList.add('active'); closeSidebar();
  setTimeout(() => { const host = document.querySelector(`#view-${viewName} [data-map-host]`); if (host) { mountMap(host); window.map=state.map; renderNetwork(); } if (viewName === 'livemap') renderLiveMap(); if (viewName === 'nearest' && state.userLocation) searchNearby(); }, 50);
}

function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); document.getElementById('sidebarBackdrop')?.classList.toggle('show'); }
function closeSidebar() { document.getElementById('sidebar')?.classList.remove('open'); document.getElementById('sidebarBackdrop')?.classList.remove('show'); }
function swapPlanner() { const a=document.getElementById('planFrom'),b=document.getElementById('planTo'); if(a&&b)[a.value,b.value]=[b.value,a.value]; }
function resetMapView() { state.map?.setView([3.09,101.66],11); }
function locateStation(id) { const station=state.stations.find(item=>item.id===id); if(station&&state.map)state.map.flyTo([station.latitude,station.longitude],16); }
function filterAlerts() { renderAlerts(); }
function setDay() { renderSchedule(); }
function renderParkRideMap() { renderParkRideUnavailable(); }
function renderPlannerMap() { /* map remains on official static network */ }
function calcFare() { toast('Official fare data unavailable', 'info'); }
function submitFeedback() { toast('Feedback backend is not configured', 'info'); }
function pickFbType(button) { document.querySelectorAll('#fbTypes button').forEach(item=>item.classList.remove('on')); button?.classList.add('on'); }
function toggleSwitch(element) { element?.classList.toggle('on'); }
function setMapTheme(theme) { if(theme!=='dark'&&theme!=='light')toast('Provider not configured','info'); }
function locateUser() { switchView('nearest'); setTimeout(detectLocation,100); }
function refreshAll() { refreshVehicles(); refreshWeather(); refreshFuel(); }
function localDate() { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur'}).format(new Date()); }

Object.assign(window,{ switchView,toggleSidebar,closeSidebar,updateScheduleFilter,renderSchedule,setDay,detectLocation,useDemoLocation,searchNearby,planTrip,swapPlanner,resetMapView,locateStation,filterAlerts,renderParkRideMap,renderPlannerMap,calcFare,submitFeedback,pickFbType,toggleSwitch,setMapTheme,locateUser,refreshAll,toast });

document.querySelectorAll('.nav-item[data-view]').forEach(item=>item.addEventListener('click',()=>switchView(item.dataset.view)));
document.getElementById('hamburgerBtn')?.addEventListener('click',toggleSidebar); document.getElementById('sidebarBackdrop')?.addEventListener('click',closeSidebar);
document.getElementById('alertBtn')?.addEventListener('click',()=>switchView('alerts')); document.getElementById('locateBtn')?.addEventListener('click',locateUser); document.getElementById('userChip')?.addEventListener('click',()=>switchView('account'));
document.querySelectorAll('#layerSwitch button').forEach(button=>button.addEventListener('click',()=>{ state.currentLayer=button.dataset.layer; document.querySelectorAll('#layerSwitch button').forEach(item=>item.classList.toggle('on',item===button)); renderNetwork(); clearVehicles(); refreshVehicles(); }));
document.querySelectorAll('.mode-btn').forEach(button=>button.addEventListener('click',()=>{ const mode=button.dataset.mode; if (state.activeModes.has(mode)) state.activeModes.delete(mode); else state.activeModes.add(mode); button.classList.toggle('active'); renderNetwork(); }));
document.addEventListener('visibilitychange',()=>{ if(!document.hidden)refreshVehicles(); });
document.getElementById('globalSearch')?.addEventListener('keydown', event => { if (event.key !== 'Enter') return; const query = event.currentTarget.value.trim().toLowerCase(); const station = state.stations.find(item => item.name.toLowerCase().includes(query)); if (!station) return toast('No matching official GTFS station', 'search'); switchView('livemap'); setTimeout(() => state.map?.flyTo([station.latitude,station.longitude],16),150); event.currentTarget.value=''; });

prepareApprovedUi(); renderAlerts(); await initializeStatic(); await Promise.all([refreshWeather(),refreshFuel(),refreshVehicles()]);
state.refreshTimer=setInterval(refreshVehicles,VEHICLE_REFRESH_MS); window.lucide?.createIcons();
