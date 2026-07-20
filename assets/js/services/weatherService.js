import { apiGet } from './apiClient.js';
export const loadForecast = location => apiGet('/weather/forecast', { location }, { key: 'weather' });
export const loadWarnings = () => apiGet('/weather/warnings', {}, { key: 'warnings' });
