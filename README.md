# Selangor Mobility Navigator

**Status:** Public Prototype v0.2.1
**Live site:** <https://selangor-mobility-navigator.pages.dev/>

## Overview

Selangor Mobility Navigator is a responsive Web GIS portfolio prototype for understanding public-transport locations, nearby stations and scheduled journey information across Selangor and the Klang Valley.

## Problem

Public-transport information is often spread across operator sites, map products and datasets with different coverage and update cycles. This project explores how a single map-led interface can make the geography, nearby options and data limitations easier to understand without pretending to be an official journey service.

## Current Working Features

- OpenStreetMap transit map with visible attribution.
- Static GTFS-derived station, route and shape visualisation.
- Mode and route-layer filtering.
- Explicit browser-geolocation flow with permission, timeout, unavailable and low-accuracy handling.
- Nearest-station search from 500 m to 3 km using approximate straight-line distance.
- Coordinate-gated Google Maps and Waze actions.
- Direct static-route relationship prototype with a Google Maps fallback.
- Prototype timetable derived from scheduled static data.
- Visible Project & Data Status interface.
- Responsive sidebar and stacked mobile layouts.

## Prototype Modules

- Trip Planner: direct static relationship demonstration only; no multimodal routing.
- Timetable: scheduled static data; no realtime arrival or platform guarantee.
- Vehicle feed: source status is checked, but positions are not displayed by default and no simulation is used.
- Weather and fuel: integration status only in v0.2.1 public navigation.
- Service Alerts, Fare Estimator, Park & Ride and Account: professional Coming Soon states.

## Data Status

| Feature | Status | Data type | Limitation |
| --- | --- | --- | --- |
| Transit stations | Prototype / integration in progress | GTFS Static | Coverage and station semantics remain under validation. |
| Transit routes | Prototype / integration in progress | GTFS Static | Not an official journey recommendation. |
| Vehicle positions | Not displayed by default | GTFS Realtime endpoint | Limited feed coverage; no system-wide claim and no demo simulation. |
| Timetable | Prototype schedule | GTFS Static derived | Scheduled only; not realtime. |
| Weather | Integration in progress | MET Malaysia forecast | Not a live observation or AQI. |
| Fuel prices | Integration in progress | Weekly public dataset | Peninsular values, not station-level Selangor prices. |
| Service alerts | Not integrated | None | No operator incident feed. |
| Fare calculation | Coming Soon | Source not validated | Not for travel, fare or payment decisions. |
| Park & Ride occupancy | Not available | None | No fabricated occupancy values. |
| Authentication | Demo only | Guest browser session | No profile, payment or history storage. |

## Technology Stack

- HTML, CSS and modern JavaScript modules
- Leaflet 1.9.4
- OpenStreetMap tiles
- Vite
- TypeScript for Cloudflare Pages Functions
- Vitest and ESLint
- Cloudflare Pages and Pages Functions
- GTFS Static processing scripts and GTFS Realtime bindings

## Public Data Roadmap

Planned validation and integration work includes:

- GTFS Static;
- verified stations;
- verified routes;
- scheduled departures;
- GTFS Realtime;
- official weather;
- official fuel prices.

The roadmap is conditional on source licensing, coverage, semantics and reliable update behaviour. No source will be presented as official or current until the implementation supports that claim.

## Local Development

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Validation:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

To exercise the production-style Pages Functions locally after building:

```bash
npm run build
npm run pages:dev
```

## Deployment

The repository is connected to Cloudflare Pages. A push to a release branch creates a preview build when the Pages project is configured for branch previews; a push to `main` triggers the production build. The configured build output is `dist` and the public URL remains <https://selangor-mobility-navigator.pages.dev/>.

Deployment success is verified separately from a local build. A passing local build alone does not prove that Cloudflare deployment succeeded.

## Disclaimer

Selangor Mobility Navigator is an independent portfolio project. It is not affiliated with KTMB, Prasarana, Rapid KL, MRT Corp or any government agency.

Some modules currently use prototype, static or demonstration data while verified public-data integration is in progress. Do not use prototype routes, schedules or future fare estimates as official travel or payment guidance.

## Creator

Luqman Abd Latif
Geomatics and GIS
