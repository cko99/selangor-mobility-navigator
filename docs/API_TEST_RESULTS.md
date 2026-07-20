# Keputusan Ujian Endpoint

Tarikh: 2026-07-21, rangkaian Kuala Lumpur. Ujian menggunakan `curl` dan decode Node.js sebenar. Saiz ialah bytes respons dimuat turun selepas redirect.

| Endpoint ringkas | HTTP | Content-Type | Bytes | Tidak kosong / struktur sampel | Header / nota |
|---|---:|---|---:|---|---|
| GTFS Static KTMB | 200 | `binary/octet-stream` | 33,638 | ZIP: 191 stops, 9 routes, 304 trips, 3,383 stop_times | Last-Modified 20 Jul 2026 16:01:09 GMT; tiada shapes |
| Static rail | 200 | `application/zip` | 79,763 | 187 stops, 8 routes, 48 trips, 7,280 shape points | Last-Modified 20 Jul 2026 03:28:46 GMT |
| Static Rapid KL bus | 200 | `application/zip` | 1,681,131 | 4,056 stops, 137 routes, 2,112 trips, 69,710 shape points | Last-Modified 20 Jul 2026 03:28:47 GMT |
| Static MRT feeder | 200 | `application/zip` | 2,014,039 | 2,112 stops, 91 routes, 6,277 trips, 35,030 shape points | Last-Modified 20 Jul 2026 03:28:46 GMT |
| Realtime KTMB | 200 | `application/octet-stream` | 69 | 1 VehiclePosition; trip 27 matched static; route_id kosong | Header feed epoch `1784564493`; umur ~96s ketika analisis susulan |
| Realtime Rapid KL bus | 200 | `application/octet-stream` | 451 | 4 VehiclePosition; 4/4 trip dan route matched | Header epoch `1784564456`; umur ~133s ketika analisis |
| Realtime MRT feeder | 200 | `application/octet-stream` | 731 | 9 VehiclePosition; 8/9 trip matched; route IDs tidak matched ID angka | `route_id` seperti T154 ialah short name |
| Weather forecast `limit=5` | 200 | `application/json` | 1,738 | Array; location/date/morning/afternoon/night/summary/min/max | `Cache-Control: private`; CORS `*` apabila Origin dihantar |
| Weather forecast penuh | 200 | `application/json` | 751,348 | 2,520 rekod, 360 location ID, 7 hari | Digunakan mengesahkan ID lokasi |
| Weather warning | 200 | `application/json` | 3,676 | 5 rekod ketika ujian; sekurang-kurangnya satu medan `valid_to` null | Transform mesti tahan null dan menapis tempoh |
| Fuel Data Catalogue `limit=5` | 200 | `application/json` | 1,015 | Array bermula rekod 2017 tanpa sort; medan schema semasa hadir | Had 4/min; CORS `*` |
| Fuel CSV | 200 | `binary/octet-stream` | 52,963 | CSV lengkap; latest level 2026-07-16 | Last-Modified 15 Jul 2026 15:50:28 GMT; tiada ACAO pada HEAD |

## Sampel semasa yang disahkan

- Fuel level terkini 2026-07-16: RON95 3.42, RON97 4.00, diesel Semenanjung 4.07, BUDI95 1.99, SKPS 2.05, diesel East Malaysia 2.15, diesel SKDS 2.10. Nilai ini direkod sebagai hasil ujian sahaja; aplikasi akan membaca dataset dan tidak hardcode angka.
- Julat ramalan lokasi sasaran yang diterima: 2026-07-20 hingga 2026-07-26.
- Semua endpoint `api.data.gov.my` yang diuji dengan header Origin memulangkan `Access-Control-Allow-Origin: *`; BFF tetap digunakan untuk normalisasi, cache, timeout dan kawalan ralat.

## Padanan static/realtime ketika ujian upstream awal

| Feed | Entity | Trip matched | Route matched | Kaedah/isu |
|---|---:|---:|---:|---|
| KTMB | 1 | 1 | 0 | route_id tiada dalam realtime |
| Rapid KL bus | 4 | 4 | 4 | padanan terus |
| MRT feeder | 9 | 8 | 0 ID terus | Padankan realtime route_id kepada static route_short_name, kemudian peroleh ID internal |

Keputusan ialah snapshot, bukan jaminan availability berterusan. Badge Live hanya ditentukan daripada timestamp setiap respons runtime.

## Ujian Pages Functions lokal (Wrangler)

Pada 2026-07-21 sekitar 01:33 Asia/Kuala_Lumpur, `npm run test:api` menguji 20 route terhadap Wrangler Pages local dan semuanya mengikut status dijangka:

- Health 200.
- Stations/routes KTMB, rail, Rapid KL bus dan MRT feeder 200 dengan bilangan 191/9, 187/8, 4,056/137 dan 2,112/91.
- Schedule contoh `ktmb:50500` 200 dengan 33 scheduled departures.
- Vehicle Positions: KTMB 0, Rapid KL bus 0, MRT feeder 1 dalam snapshot akhir. Semua respons 200 dan timestamp header feed masih segar; `0` bermaksud tiada entiti aktif yang sah dalam respons itu, bukan kenderaan rekaan atau kegagalan endpoint.
- `rapid-rail-kl` realtime sengaja 422 `REALTIME_NOT_AVAILABLE`.
- Forecast 7 rekod, warning 5 rekod snapshot, fuel 12 minggu: 200.
- Agency, location dan weeks tidak sah: 400 `INVALID_QUERY`.

Ujian Wrangler juga menemui bahawa GTFS-RT upstream menolak header `Accept: application/octet-stream` dengan HTTP 406. Function kini menggunakan `Accept: */*`, kemudian mengesahkan/menyahkod Protobuf; ketiga-tiga feed berjaya selepas pembetulan.
