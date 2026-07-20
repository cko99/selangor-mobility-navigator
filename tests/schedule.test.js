import { describe, expect, it } from 'vitest';
import { parseGtfsTime, gtfsDateTime } from '../assets/js/utils/dateTime.js';
import { activeServices, departuresForStation } from '../functions/api/_shared/schedule.ts';

const index = {
  calendars:[{serviceId:'f:weekday',weekdays:[1,1,1,1,1,0,0],startDate:'20260701',endDate:'20260731'}], calendarDates:[{serviceId:'f:weekday',date:'20260721',exceptionType:2},{serviceId:'f:special',date:'20260721',exceptionType:1}],
  trips:[{id:'f:t1',routeId:'f:r1',serviceId:'f:special',headsign:'Kajang',directionId:0}], stopTimes:[['f:t1','f:s1','25:10:00','25:10:00',1]], frequencies:[]
};

describe('GTFS schedule', () => {
  it('parses time after 24:00', () => expect(parseGtfsTime('25:10:00')).toBe(90600));
  it('rolls after-midnight GTFS time to next day', () => expect(gtfsDateTime('2026-07-21','25:10:00').getDate()).toBe(22));
  it('applies calendar_dates exceptions', () => expect([...activeServices(index,'2026-07-21')]).toEqual(['f:special']));
  it('returns scheduled departures', () => expect(departuresForStation(index,'f:s1','2026-07-21')[0].status).toBe('scheduled'));
});
