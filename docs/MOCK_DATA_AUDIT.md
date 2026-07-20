# Audit Data Prototaip

Tarikh audit: 2026-07-21 (Asia/Kuala_Lumpur)

Fail asal `REFERENCE DRAFT.html` telah dibaca sepenuhnya. Salinan tidak disentuh disimpan di `archive/REFERENCE-DRAFT-V1.html`; kedua-dua fail mempunyai SHA-256 `45A8BBF3F1E96065768BF99CFFAD4B3B7B35382B12805CAFFB28DF050F824094` ketika sandaran dibuat.

## Lokasi data simulasi / tidak disahkan

| Lokasi asal | Ciri | Isu |
|---|---|---|
| 595–599, 613–615, 1035–1064, 1295–1300 | Profil dan sejarah pengguna | Identiti, baki, pas, statistik dan perjalanan rekaan. |
| 628–649 | Cuaca | Suhu, kelembapan, angin dan AQI statik; bukan respons MET Malaysia. |
| 654–667, 2203–2213 | Statistik rangkaian | Bilangan kenderaan, kadar tepat masa, masa menunggu dan beban rangkaian palsu serta berubah secara rawak. |
| 681–686, 2080–2102 | Ketibaan | Empat ketibaan dummy dilabel Live/On Time. |
| 703–705 | Live Map | Bilangan 142 hardcoded. |
| 715–722, 1167–1187 | Basemap | Satelit/hibrid aktif tanpa audit penggunaan; atribusi Leaflet disembunyikan pada baris 217. |
| 794–800, 1261–1284, 1671–1757 | Trip Planner | Graf, masa dan tambang tempatan rekaan; bukan perancang perjalanan rasmi. |
| 840–855, 1774–1819 | Jadual | Masa dijana setiap 5/15 minit dan bukan GTFS. |
| 869–888, 1240–1248, 1824–1864 | Amaran | Tujuh kelewatan, kerosakan dan cuaca rekaan dipersembahkan sebagai aktif. |
| 899–909, 1877–1903 | Tambang | Formula berasaskan jarak rekaan; bukan tambang rasmi. |
| 915–938 | Pas/konsesi | Maklumat statik tidak disertai sumber atau masa kemas kini. |
| 951–956, 1250–1259, 1908–1953 | Park & Ride | Kapasiti, kekosongan dan kadar tidak disahkan; kekosongan dipaparkan seperti semasa. |
| 1202–1231 | Stesen | 30 stesen dan atribut akses/parkir hardcoded; terdapat ejaan `Pasir Seni`. |
| 1233–1238 | Geometri laluan | Empat set koordinat manual, bukan `shapes.txt`. |
| 1482–1571, 2028–2038 | Kenderaan | Kenderaan dicipta dan digerakkan menggunakan `Math.random()`; semua mod termasuk rel MRT/LRT kelihatan live. |
| 1584–1607 | Geolokasi | Penolakan, ralat dan tamat masa diganti secara senyap dengan lokasi simulasi PJ. |
| 2003–2022 | Maklum balas | Laporan terdahulu dan status pemprosesan rekaan. |

Baris merujuk kepada sandaran V1 dan digunakan sebagai rekod audit, bukan sebagai nombor baris kontrak untuk fail baharu.
