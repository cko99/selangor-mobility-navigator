# Status Integrasi

Tarikh status: 2026-07-21

| Komponen | Status | Catatan |
|---|---|---|
| Audit semua fail | Selesai | Dua fail asal; TXT kosong; HTML dibaca penuh. |
| Sandaran V1 | Selesai | Hash sumber dan sandaran sepadan. |
| Ujian endpoint rasmi | Selesai | 4 static, 3 realtime, weather, warning, fuel API/CSV. |
| Dokumen penyelidikan | Selesai | Empat dokumen wajib + audit mock. |
| Preprocess GTFS | Selesai | 6,546 stesen, 245 laluan, 293 geometri dan 268,037 stop-time; jadual dibucket maksimum ~2.2 MB/fail. |
| Cloudflare Pages Functions | Selesai | Health, static transit, schedules, vehicles, weather dan fuel; 20/20 route smoke tests lulus. |
| Frontend data-driven | Selesai | Tiada random vehicle production; static/realtime/weather/fuel dan source status aktif. |
| QA lint/typecheck/test/build/Wrangler | Selesai | Lint/typecheck/build lulus; 20/20 unit tests; Wrangler compiled; desktop/tablet/mobile tiada overflow. |

## Ciri sengaja tidak didakwa tersedia

- Realtime MRT/LRT/BRT rail.
- GTFS-RT Trip Updates dan Service Alerts.
- Park & Ride occupancy realtime.
- Tambang rasmi yang boleh dikira.
- AQI live.
- Perancang perjalanan multimodal rasmi.
- Satellite/hybrid tanpa provider yang diluluskan.

## Keputusan akhir

- `npm run lint`: PASS
- `npm run typecheck`: PASS
- `npm run test`: PASS — 5 fail, 20 ujian
- `npm run build`: PASS — JS gzip 10.40 kB, CSS gzip 4.85 kB, HTML gzip 8.45 kB
- `npm run validate:gtfs`: PASS
- `npm run test:api`: PASS — 20 route termasuk validation 400/422
- `npm audit --omit=dev`: 0 vulnerability
- Wrangler Pages local: compiled dan semua route intended diuji.
- Browser QA: 1440×900 desktop, 800×1024 tablet, 390×844 mobile; tiada horizontal overflow, mobile drawer berfungsi, map penuh, atribusi OSM kelihatan, console bersih.
