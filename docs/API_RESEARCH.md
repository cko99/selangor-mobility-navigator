# Penyelidikan API Rasmi

Tarikh penyelidikan dan ujian: 2026-07-21 (Asia/Kuala_Lumpur). Semua endpoint diuji terus; dokumentasi utama ialah portal Kerajaan Malaysia/operator atau dokumentasi produk rasmi.

## Had umum data.gov.my

- Had rasmi: **4 permintaan seminit bagi setiap API**; lebihan menerima HTTP 429.
- GTFS Static: ZIP; KTMB dikemas kini setiap hari 00:01, Prasarana apabila perlu. Cadangan rasmi ialah sinkron sekali sehari sekitar 04:00.
- GTFS Realtime: Protobuf GTFS-RT, **vehicle positions sahaja**, kemas kini kira-kira 30 saat. Trip Updates dan Service Alerts belum tersedia. `rapid-rail-kl` tiada feed realtime stabil.
- Weather: ramalan umum 7 hari dikemas kini harian; warning dikemas kini apabila perlu. Data oleh MET Malaysia.
- Fuel: data mingguan Kementerian Kewangan, CC BY 4.0. Harga diesel `diesel` ialah Semenanjung Malaysia.

## Sumber transit

| Ciri | Provider / dokumentasi | Endpoint dan parameter | Format / medan digunakan | Kekerapan, cache, had | Lesen / atribusi / CORS | Limitasi disahkan |
|---|---|---|---|---|---|---|
| KTM Static | data.gov.my + KTMB; https://developer.data.gov.my/realtime-api/gtfs-static | `GET /gtfs-static/ktmb` | ZIP/CSV: agency, stops, routes, trips, stop_times, calendar | Harian; preprocess harian; 4/min | Sumber mesti dinyatakan; `Access-Control-Allow-Origin: *` | Feed ujian tiada `shapes.txt`, `calendar_dates.txt`, transfers atau feed_info. Bentuk KTM tidak boleh didakwa sebagai geometri rasmi. |
| Prasarana Rail Static | data.gov.my + Prasarana; dokumentasi sama | `GET /gtfs-static/prasarana?category=rapid-rail-kl` | ZIP/CSV termasuk shapes dan frequencies | Apabila perlu; preprocess harian; 4/min | Sumber dinyatakan; CORS `*` | Jadual banyak menggunakan frequencies; status/akses khusus provider perlu dinormalisasi. |
| Rapid KL Bus Static | data.gov.my + Prasarana | `category=rapid-bus-kl` | ZIP/CSV termasuk 4,056 stops, 137 routes dan shapes | Apabila perlu; preprocess harian; 4/min | Sumber dinyatakan; CORS `*` | Dokumentasi menyatakan kira-kira 2% trip dibuang daripada stop_times kerana isu operasi. |
| MRT Feeder Static | data.gov.my + Prasarana | `category=rapid-bus-mrtfeeder` | ZIP/CSV termasuk 2,112 stops, 91 routes dan shapes | Apabila perlu; preprocess harian; 4/min | Sumber dinyatakan; CORS `*` | `calendar_dates.txt` kosong dalam sampel. Route ID realtime menggunakan nama pendek, bukan ID angka static. |
| KTM vehicles | data.gov.my + KTMB; https://developer.data.gov.my/realtime-api/gtfs-realtime | `GET /gtfs-realtime/vehicle-position/ktmb` | Protobuf: entity.vehicle trip, vehicle, position, timestamp | Sumber 30s; edge 25s/browser 15s; 4/min | Sumber + masa diperlukan; CORS `*` | Sampel hanya 1 entiti; `route_id` kosong tetapi `trip_id` sepadan static. Kedudukan mungkin di luar Selangor. |
| Rapid KL bus vehicles | data.gov.my + Prasarana | `GET .../prasarana?category=rapid-bus-kl` | Protobuf GTFS-RT VehiclePosition | 30s; edge 25s/browser 15s; 4/min | Sumber + masa diperlukan; CORS `*` | GPS luar coverage boleh berlaku (ralat validator E028 rasmi). |
| MRT feeder vehicles | data.gov.my + Prasarana | `category=rapid-bus-mrtfeeder` | Protobuf GTFS-RT VehiclePosition | 30s; edge 25s/browser 15s; 4/min | Sumber + masa diperlukan; CORS `*` | Dalam sampel, 8/9 trip sepadan; `route_id` realtime perlu dipadankan kepada `route_short_name`. |

Pakej penyahkod yang diuji: `gtfs-realtime-bindings@2.1.0` (berasaskan protobufjs). Ia tidak memerlukan API Node untuk proses decode dan dibundle untuk runtime Workers. Keserasian sebenar telah disahkan melalui Wrangler Pages local pada ketiga-tiga feed Vehicle Positions.

## Cuaca

Dokumentasi: https://developer.data.gov.my/realtime-api/weather

| Ciri | Endpoint | Parameter / medan | Cache | Status data |
|---|---|---|---|---|
| Ramalan | `GET https://api.data.gov.my/weather/forecast` | `contains=<value>@location__location_name` atau ID; location, date, morning/afternoon/night/summary forecast, min_temp, max_temp | 3 jam | Forecast, bukan suhu semasa. |
| Warning | `GET https://api.data.gov.my/weather/warning` | warning_issue, valid_from/to, heading/text dan kawasan | 3 minit | Warning; tapis tempoh sah, jangan tukar kepada dakwaan gangguan transit. |

ID lokasi ditemui daripada respons rasmi penuh, bukan diteka: Shah Alam `Tn070`, Petaling Jaya `Tn076`, Klang `Ds054`, Subang Jaya `Tn077`, Kajang `Tn090`, Kuala Lumpur `Ds058`, Putrajaya `Ds062`. Kuala Lumpur dan Putrajaya mempunyai lebih daripada satu siri bagi tarikh sama, maka hasil perlu mengekalkan rekod berbeza dan tidak mengandaikan satu ramalan tunggal.

## Harga bahan api

- API: `GET https://api.data.gov.my/data-catalogue?id=fuelprice`
- Dataset lengkap: `GET https://storage.data.gov.my/commodities/fuelprice.csv`
- Dokumentasi: https://developer.data.gov.my/static-api/data-catalogue dan https://data.gov.my/data-catalogue/fuelprice
- Format: JSON atau CSV. Medan semasa: `series_type,date,ron95,ron97,diesel,diesel_eastmsia,ron95_budi95,ron95_skps,diesel_skds,diesel_budi`.
- Kekerapan mingguan; cache 12 jam. Dataset halaman rasmi dikemas kini 15 Jul 2026 23:59, kemas kini seterusnya 22 Jul 2026 23:59.
- Lesen CC BY 4.0; atribusi Kementerian Kewangan / data.gov.my wajib. API CORS `*`; storage CSV tidak menghantar ACAO pada ujian HEAD, jadi BFF diperlukan.
- Harga bukan harga stesen Selangor. Paparan perlu bertajuk **Malaysia Fuel Prices** atau **Peninsular Malaysia Fuel Prices**.

## Navigasi dan peta

- Google Maps URLs rasmi: `https://www.google.com/maps/dir/?api=1&origin=<lat,lng>&destination=<lat,lng>&travelmode=walking`; dokumentasi https://developers.google.com/maps/documentation/urls/get-started.
- Waze rasmi: `https://www.waze.com/ul?ll=<lat,lng>&navigate=yes&utm_source=selangor_mobility_navigator`; dokumentasi https://developers.google.com/waze/deeplinks. Parameter mesti URL-encoded.
- OSM tile rasmi: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; atribusi `© OpenStreetMap contributors` mesti kelihatan. Jangan proxy, prefetch atau menutup atribusi. Polisi: https://operations.osmfoundation.org/policies/tiles/.
- Satellite/Hybrid V1 akan dinyahaktif dengan “Provider not configured” sehingga provider dan terma khusus projek diluluskan; tiada URL tile Google tidak rasmi akan digunakan.
