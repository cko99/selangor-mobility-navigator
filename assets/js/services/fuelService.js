import { apiGet } from './apiClient.js';
export const loadFuel = weeks => apiGet('/fuel/prices', { weeks }, { key: 'fuel' });
