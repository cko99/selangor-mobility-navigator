import { describe, expect, it } from 'vitest';
import GtfsRealtimeBindings from 'gtfs-realtime-bindings';
import { decodeVehicles, matchVehicles } from '../functions/api/_shared/realtime.ts';

function feed(entities, timestamp=1000) { return GtfsRealtimeBindings.transit_realtime.FeedMessage.encode({ header:{gtfsRealtimeVersion:'2.0',timestamp}, entity:entities }).finish(); }

describe('GTFS Realtime', () => {
  it('decodes a fresh valid vehicle', () => { const bytes=feed([{id:'1',vehicle:{trip:{tripId:'t1',routeId:'T1'},vehicle:{id:'v1'},position:{latitude:3.1,longitude:101.6},timestamp:995}}]); const result=decodeVehicles(bytes,{agency:'ktmb',category:null},1000); expect(result.vehicles[0]).toMatchObject({id:'v1',status:'live',ageSeconds:5}); });
  it('rejects invalid coordinates', () => { const bytes=feed([{id:'1',vehicle:{position:{latitude:0,longitude:0},timestamp:995}},{id:'2',vehicle:{position:{latitude:91,longitude:1},timestamp:995}}]); const result=decodeVehicles(bytes,{agency:'ktmb',category:null},1000); expect(result.vehicles).toHaveLength(0); expect(result.invalidCoordinates).toBe(2); });
  it('marks stale and filters extremely stale', () => { const stale=decodeVehicles(feed([{id:'1',vehicle:{position:{latitude:3,longitude:101},timestamp:700}}]),{agency:'ktmb',category:null},1000); expect(stale.vehicles[0].status).toBe('stale'); const old=decodeVehicles(feed([{id:'1',vehicle:{position:{latitude:3,longitude:101},timestamp:1}}]),{agency:'ktmb',category:null},5000); expect(old.vehicles).toHaveLength(0); });
  it('matches trip IDs and feeder route short names', () => { const [vehicle]=matchVehicles([{tripId:'t1',routeId:'T154',matchedStaticTrip:null}],{trips:{t1:'feeder:t1'},routesById:{},routesByShortName:{T154:'feeder:300'}}); expect(vehicle).toMatchObject({matchedStaticTrip:true,staticTripId:'feeder:t1',staticRouteId:'feeder:300'}); });
});
