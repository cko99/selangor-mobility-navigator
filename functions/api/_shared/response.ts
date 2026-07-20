import type { ApiMeta } from './types';

const baseHeaders = { 'content-type': 'application/json; charset=utf-8', 'x-content-type-options': 'nosniff' };

export function json(data: unknown, meta: ApiMeta, init: ResponseInit = {}) {
  return new Response(JSON.stringify({ ok: true, data, meta }), { ...init, headers: { ...baseHeaders, ...(init.headers || {}) } });
}

export function failure(status: number, code: string, message: string, fallbackAvailable = false) {
  return new Response(JSON.stringify({ ok: false, error: { code, message }, meta: { fallbackAvailable } }), { status, headers: baseHeaders });
}

export const nowIso = () => new Date().toISOString();

export function safeDateIso(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = new Date(typeof value === 'number' && value < 10_000_000_000 ? value * 1000 : String(value));
  return Number.isNaN(date.valueOf()) ? null : date.toISOString();
}
