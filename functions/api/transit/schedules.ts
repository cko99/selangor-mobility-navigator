import { failure, json } from '../_shared/response';
import { stationId } from '../_shared/validation';
import { assetJson } from '../_shared/staticData';
import { departuresForStation, scheduleBucket } from '../_shared/schedule';
import type { PagesContext } from '../_shared/types';

interface Index { meta: { processedAt: string }; trips: { id:string;routeId:string;serviceId:string;headsign:string|null;directionId:number|null }[]; stopTimes: [string,string,string,string,number][]; calendars: {serviceId:string;weekdays:number[];startDate:string;endDate:string}[]; calendarDates: {serviceId:string;date:string;exceptionType:number}[]; frequencies: {tripId:string;startTime:string;endTime:string;headwaySecs:number}[] }
export const onRequestGet = async (context: PagesContext) => { try {
  const url = new URL(context.request.url), stop = stationId(url), date = url.searchParams.get('date') || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kuala_Lumpur' }).format(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new TypeError('date must be YYYY-MM-DD');
  const feed = stop.split(':', 1)[0], bucket = scheduleBucket(stop);
  const index = await assetJson<Index>(context, `/data/transit/schedule-buckets/${feed}-${bucket}.json`);
  const data = departuresForStation(index, stop, date);
  return json(data, { source: 'data.gov.my', dataset: 'GTFS Static scheduled departures', status: 'scheduled', fetchedAt: new Date().toISOString(), sourceUpdatedAt: index.meta.processedAt, ageSeconds: Math.round((Date.now()-Date.parse(index.meta.processedAt))/1000), isStale: false, recordCount: data.length }, { headers: { 'cache-control': 'public, max-age=300, s-maxage=3600' } });
} catch (error) { return failure(error instanceof TypeError ? 400 : 503, error instanceof TypeError ? 'INVALID_QUERY' : 'SCHEDULE_DATA_UNAVAILABLE', error instanceof Error ? error.message : 'Schedule data unavailable.', true); } };
