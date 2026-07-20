interface Calendar { serviceId: string; weekdays: number[]; startDate: string; endDate: string }
interface CalendarDate { serviceId: string; date: string; exceptionType: number }
interface Trip { id: string; routeId: string; serviceId: string; headsign: string | null; directionId: number | null }
interface Frequency { tripId: string; startTime: string; endTime: string; headwaySecs: number }
interface Index { trips: Trip[]; stopTimes: [string,string,string,string,number][]; calendars: Calendar[]; calendarDates: CalendarDate[]; frequencies: Frequency[] }

export function activeServices(index: Pick<Index, 'calendars'|'calendarDates'>, date: string) {
  const compact = date.replaceAll('-', '');
  const day = new Date(`${date}T12:00:00+08:00`).getDay();
  const mondayIndex = (day + 6) % 7;
  const active = new Set(index.calendars.filter(calendar => calendar.startDate <= compact && compact <= calendar.endDate && calendar.weekdays[mondayIndex] === 1).map(calendar => calendar.serviceId));
  for (const exception of index.calendarDates.filter(item => item.date === compact)) {
    if (exception.exceptionType === 1) active.add(exception.serviceId);
    if (exception.exceptionType === 2) active.delete(exception.serviceId);
  }
  return active;
}

export function departuresForStation(index: Index, stationId: string, date: string, limit = 40) {
  const active = activeServices(index, date);
  const trips = new Map(index.trips.filter(trip => active.has(trip.serviceId)).map(trip => [trip.id, trip]));
  const frequencies = new Map(index.frequencies.map(item => [item.tripId, item]));
  const rows = index.stopTimes.filter(row => row[1] === stationId && trips.has(row[0]));
  const firstByTrip = new Map<string, number>();
  for (const row of index.stopTimes) if (trips.has(row[0])) {
    const value = gtfsSeconds(row[3]);
    if (value !== null && (!firstByTrip.has(row[0]) || value < firstByTrip.get(row[0])!)) firstByTrip.set(row[0], value);
  }
  const output: { tripId: string; routeId: string; headsign: string | null; directionId: number | null; departureTime: string; serviceDate: string; status: string }[] = [];
  for (const row of rows) {
    const trip = trips.get(row[0])!, base = gtfsSeconds(row[3]);
    if (base === null) continue;
    const frequency = frequencies.get(trip.id);
    if (!frequency) output.push(make(trip, row[3], date));
    else {
      const offset = base - (firstByTrip.get(trip.id) || base), start = gtfsSeconds(frequency.startTime), end = gtfsSeconds(frequency.endTime);
      if (start === null || end === null || frequency.headwaySecs <= 0) continue;
      for (let seconds = start + offset; seconds < end + offset; seconds += frequency.headwaySecs) output.push(make(trip, formatSeconds(seconds), date));
    }
  }
  return output.sort((a, b) => (gtfsSeconds(a.departureTime) || 0) - (gtfsSeconds(b.departureTime) || 0)).slice(0, limit);
}

function make(trip: Trip, departureTime: string, serviceDate: string) { return { tripId: trip.id, routeId: trip.routeId, headsign: trip.headsign, directionId: trip.directionId, departureTime, serviceDate, status: 'scheduled' }; }
export function gtfsSeconds(value: string) { const match = /^(\d{1,2}):(\d{2}):(\d{2})$/.exec(value || ''); if (!match) return null; const [,h,m,s] = match.map(Number); return m < 60 && s < 60 ? h * 3600 + m * 60 + s : null; }
const formatSeconds = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2,'0')}:${String(Math.floor(seconds % 3600 / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
export function scheduleBucket(stationId: string) { return [...stationId].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 32; }
