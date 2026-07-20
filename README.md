# Selangor Mobility Navigator — Phase 2

Aplikasi Web GIS vanilla yang mengekalkan reka bentuk prototaip V1 tetapi menggunakan data awam rasmi melalui Cloudflare Pages Functions.

## Data

- GTFS Static: KTMB, Prasarana rail, Rapid KL bus dan MRT feeder daripada data.gov.my.
- GTFS Realtime: Vehicle Positions KTMB, Rapid KL bus dan MRT feeder sahaja.
- Cuaca: ramalan dan warning MET Malaysia melalui data.gov.my.
- Bahan api: harga mingguan Malaysia daripada Kementerian Kewangan melalui data.gov.my.
- Peta: OpenStreetMap dengan atribusi kelihatan. Satellite/Hybrid disabled sehingga provider dikonfigurasi.

MRT/LRT rail tidak dilabel realtime. Trip Updates, transit Service Alerts, okupansi Park & Ride, AQI dan formula tambang rasmi tidak tersedia dalam Phase 2.

## Jalankan secara lokal

Keperluan: Node.js 22 atau lebih baharu.

```powershell
npm install
npm run sync:gtfs
npm run lint
npm run typecheck
npm run test
npm run build
npm run pages:dev -- --port 8788
```

Buka `http://127.0.0.1:8788`. Gunakan Wrangler (`pages:dev`), bukan Vite sahaja, untuk menguji route `/api/*`.

Untuk ujian endpoint selepas server hidup:

```powershell
npm run test:api
```

`npm run build:data` membina semula JSON daripada ZIP yang sudah ada dalam `.cache/api-research`. `npm run sync:gtfs` memuat turun feed rasmi baharu, mengesahkan ZIP dan membina data.

## Deploy Cloudflare Pages

1. Push repository ke penyedia Git yang disokong Cloudflare.
2. Cipta projek Pages dan pilih repository.
3. Build command: `npm run sync:gtfs && npm run build`.
4. Build output directory: `dist`.
5. Node version: 22+.
6. Functions di bawah `functions/` akan dideploy secara automatik.
7. Jadualkan rebuild harian selepas 04:00 Asia/Kuala_Lumpur supaya GTFS Static disegarkan. Alternatifnya, jalankan `npm run sync:gtfs`, commit output `public/data/transit`, kemudian deploy.
8. Selepas deploy, uji `/api/health` dan jalankan suite endpoint dengan `SMN_API_BASE=https://<domain> npm run test:api`.

Tiada secret diperlukan. Jangan tambah proxy URL arbitrari atau proxy tile OSM.

## Struktur penting

- `index.html` — markup UI yang diwarisi daripada V1.
- `assets/css/app.css` — gaya asal dan status data.
- `assets/js/` — state, map, UI, servis dan utiliti.
- `functions/api/` — Pages Functions ber-allowlist.
- `scripts/` — sync, proses, validasi GTFS dan endpoint smoke test.
- `public/data/transit/` — artifak rasmi hasil preprocess.
- `tests/` — unit/integration transformation tests.
- `docs/` — audit API, matriks, keputusan dan status.
- `archive/REFERENCE-DRAFT-V1.html` — sandaran byte-identik V1.

## Polisi data dan privasi

Lokasi tepat digunakan dalam browser untuk jarak Haversine dan tidak dihantar atau disimpan. Jarak dipaparkan sebagai anggaran garis lurus. Data external sentiasa di-escape sebelum dimasukkan ke markup. Demo location hanya digunakan selepas tindakan pengguna dan dilabel Demo.
