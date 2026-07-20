# Matriks Sumber Data

| Paparan | Sumber utama | Jenis | Freshness / status UI | Fallback dibenarkan | Status integrasi awal |
|---|---|---|---|---|---|
| KTM stesen/laluan/jadual | GTFS Static KTMB | Static / Scheduled | Feed refresh harian | JSON rasmi hasil sync | Disahkan dan diintegrasi |
| MRT/LRT/BRT stesen/laluan/jadual | GTFS Static `rapid-rail-kl` | Static / Scheduled | Feed refresh harian | JSON rasmi hasil sync | Disahkan |
| Rapid KL bus | GTFS Static `rapid-bus-kl` | Static / Scheduled | Feed refresh harian | JSON rasmi hasil sync | Disahkan |
| MRT feeder | GTFS Static `rapid-bus-mrtfeeder` | Static / Scheduled | Feed refresh harian | JSON rasmi hasil sync | Disahkan |
| KTM vehicles | GTFS-RT KTMB | Live jika timestamp segar; Stale/Offline selainnya | Poll 30s; live <=90s, delayed <=180s | Cache berlabel | Disahkan; bilangan entiti berubah mengikut operasi (0 pada snapshot akhir) |
| Rapid KL bus vehicles | GTFS-RT bus | Live/Stale/Offline | Sama | Cache berlabel | Disahkan; bilangan entiti berubah mengikut operasi (0 pada snapshot akhir) |
| MRT feeder vehicles | GTFS-RT feeder | Live/Stale/Offline | Sama | Cache berlabel | Disahkan; bilangan entiti berubah mengikut operasi (1 pada snapshot akhir) |
| MRT/LRT vehicles | Tiada feed stabil | Scheduled only / Unavailable | Tiada | Tiada simulasi kecuali Developer Demo Mode | Tidak tersedia |
| Trip Updates / transit alerts | Tiada endpoint rasmi semasa | Unavailable | Tiada | Data-health + weather warning sahaja | Tidak tersedia |
| Weather | MET Malaysia melalui data.gov.my | Forecast | Daily; cache 3h | Cache rasmi stale | Disahkan |
| Weather warning | MET Malaysia | Warning | Bila perlu; cache 3m | Cache rasmi stale | Disahkan |
| Fuel | MOF melalui data.gov.my | Weekly | Tarikh kuat kuasa; cache 12h | CSV rasmi/cache | Disahkan |
| Park & Ride occupancy | Tiada sumber disahkan | Unavailable | Tiada | Kad disabled; tiada angka | Tidak tersedia |
| Tambang rasmi | Tiada dataset/API disahkan dalam skop | Unavailable / Demo disabled | Tiada | Pautan operator kemudian | Tidak tersedia |
| AQI | Tiada sumber sah disahkan | Unavailable | Tiada | Tiada nilai | Tidak tersedia |
| Basemap | OpenStreetMap | Static tiles | Atribusi sentiasa kelihatan | Provider boleh dikonfigurasi | Disahkan |

Hierarki fallback untuk semua servis: fresh official → valid cached official → stale cached official dengan warning → local generated official → explicit Demo → Unavailable. Demo tidak pernah menerima badge Live.
