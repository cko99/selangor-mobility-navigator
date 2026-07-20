import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { processFeed, safeUnzip } from '../scripts/build-transit-data.mjs';

const csv = {
  'agency.txt':'agency_id,agency_name,agency_url,agency_timezone\na,Agency,https://example.test,Asia/Kuala_Lumpur\n',
  'stops.txt':'stop_id,stop_name,stop_lat,stop_lon\ns1,Station,3.1,101.6\n',
  'routes.txt':'agency_id,route_id,route_type,route_short_name,route_long_name\na,r1,2,KTM,Test\n',
  'trips.txt':'route_id,service_id,trip_id,direction_id\nr1,w,t1,0\n',
  'stop_times.txt':'trip_id,arrival_time,departure_time,stop_id,stop_sequence\nt1,25:00:00,25:00:00,s1,1\n',
  'calendar.txt':'service_id,monday,tuesday,wednesday,thursday,friday,saturday,sunday,start_date,end_date\nw,1,1,1,1,1,0,0,20260101,20261231\n'
};

describe('GTFS ZIP and CSV processing', () => {
  it('parses required CSV files and preserves IDs', () => { const bytes=zipSync(Object.fromEntries(Object.entries(csv).map(([name,value])=>[name,strToU8(value)]))); const result=processFeed(bytes,{key:'ktmb',agency:'ktmb',category:null,url:'https://api.data.gov.my/test'}); expect(result.stations[0]).toMatchObject({id:'ktmb:s1',originalId:'s1'}); expect(result.stopTimes[0][3]).toBe('25:00:00'); });
  it('rejects ZIP traversal', () => { const bytes=zipSync({'../evil.txt':strToU8('x')}); expect(()=>safeUnzip(bytes)).toThrow('Unsafe ZIP path'); });
});
