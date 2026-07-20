import { API_BASE } from '../config.js';
import { state } from '../state.js';

export async function apiGet(path, params = {}, { timeout = 10_000, key = path } = {}) {
  state.aborters.get(key)?.abort();
  const controller = new AbortController(); state.aborters.set(key, controller);
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const url = new URL(`${API_BASE}${path}`, location.origin);
    for (const [name, value] of Object.entries(params)) if (value !== null && value !== undefined) url.searchParams.set(name, String(value));
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json' } });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) throw new Error(payload?.error?.message || `API returned HTTP ${response.status}`);
    return payload;
  } finally { clearTimeout(timer); if (state.aborters.get(key) === controller) state.aborters.delete(key); }
}

export async function staticJson(path) {
  const response = await fetch(path, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Static data HTTP ${response.status}`);
  return response.json();
}
