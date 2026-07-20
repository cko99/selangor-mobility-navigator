import { apiGet } from './apiClient.js';
export const loadSchedule = (stationId, date) => apiGet('/transit/schedules', { station_id: stationId, date }, { key: 'schedule' });
