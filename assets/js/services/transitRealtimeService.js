import { apiGet } from './apiClient.js';

const feeds = [
  { key: 'KTMB Realtime', params: { agency: 'ktmb' } },
  { key: 'Rapid KL Bus Realtime', params: { agency: 'prasarana', category: 'rapid-bus-kl' } },
  { key: 'MRT Feeder Realtime', params: { agency: 'prasarana', category: 'rapid-bus-mrtfeeder' } }
];

export async function loadVehicles() {
  return Promise.all(feeds.map(async feed => {
    try { const payload = await apiGet('/transit/vehicles', feed.params, { key: feed.key }); return { ...feed, payload, error: null }; }
    catch (error) { return { ...feed, payload: null, error: error.message }; }
  }));
}
