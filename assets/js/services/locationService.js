export function requestLocation(options = {}) {
  return new Promise(resolve => {
    if (!navigator.geolocation) return resolve({ ok: false, state: 'unavailable', message: 'Geolocation tidak disokong.' });
    navigator.geolocation.getCurrentPosition(position => resolve({ ok: true, state: position.coords.accuracy > 1000 ? 'low-accuracy' : 'granted', latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }), error => {
      const state = error.code === error.PERMISSION_DENIED ? 'denied' : error.code === error.TIMEOUT ? 'timeout' : 'unavailable';
      resolve({ ok: false, state, message: ({ denied: 'Kebenaran lokasi ditolak.', timeout: 'Pengesanan lokasi tamat masa.', unavailable: 'Lokasi tidak tersedia.' })[state] });
    }, { enableHighAccuracy: true, timeout: options.timeout || 8000, maximumAge: 30_000 });
  });
}
