import { readFile } from 'node:fs/promises';

const base = process.env.SMN_API_BASE || 'http://127.0.0.1:8788';
const stations = JSON.parse(await readFile('public/data/transit/stations.json', 'utf8')).data;
const station = stations.find(item => item.agency === 'ktmb').id;
const cases = [
  ['/api/health', 200],
  ['/api/transit/stations?agency=ktmb', 200],
  ['/api/transit/routes?agency=ktmb', 200],
  ['/api/transit/stations?agency=prasarana&category=rapid-rail-kl', 200],
  ['/api/transit/routes?agency=prasarana&category=rapid-rail-kl', 200],
  ['/api/transit/stations?agency=prasarana&category=rapid-bus-kl', 200],
  ['/api/transit/routes?agency=prasarana&category=rapid-bus-kl', 200],
  ['/api/transit/stations?agency=prasarana&category=rapid-bus-mrtfeeder', 200],
  ['/api/transit/routes?agency=prasarana&category=rapid-bus-mrtfeeder', 200],
  [`/api/transit/schedules?station_id=${encodeURIComponent(station)}`, 200],
  ['/api/transit/vehicles?agency=ktmb', 200],
  ['/api/transit/vehicles?agency=prasarana&category=rapid-bus-kl', 200],
  ['/api/transit/vehicles?agency=prasarana&category=rapid-bus-mrtfeeder', 200],
  ['/api/transit/vehicles?agency=prasarana&category=rapid-rail-kl', 422],
  ['/api/weather/forecast?location=Tn070', 200],
  ['/api/weather/warnings', 200],
  ['/api/fuel/prices?weeks=12', 200],
  ['/api/transit/vehicles?agency=evil', 400],
  ['/api/weather/forecast?location=guessed', 400],
  ['/api/fuel/prices?weeks=1000', 400]
];

let failed = 0;
for (const [path, expected] of cases) {
  const response = await fetch(`${base}${path}`), payload = await response.json();
  const count = Array.isArray(payload.data) ? payload.data.length : payload.data ? 'object' : 0;
  console.log(`${response.status}\t${payload.ok}\t${count}\t${payload.meta?.status || payload.error?.code}\t${path}`);
  if (response.status !== expected || payload.ok !== (expected < 400)) failed++;
}
if (failed) { console.error(`${failed} API route checks failed`); process.exitCode = 1; }
else console.log(`All ${cases.length} API route checks passed.`);
