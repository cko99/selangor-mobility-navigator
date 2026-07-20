import { isValidCoordinate } from './distance.js';

function coordinate(value) { return `${Number(value.latitude).toFixed(6)},${Number(value.longitude).toFixed(6)}`; }

export function createGoogleMapsUrl(destination, origin = null) {
  if (!destination || !isValidCoordinate(Number(destination.latitude), Number(destination.longitude))) throw new TypeError('Invalid destination coordinates');
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  if (origin && isValidCoordinate(Number(origin.latitude), Number(origin.longitude))) url.searchParams.set('origin', coordinate(origin));
  url.searchParams.set('destination', coordinate(destination));
  url.searchParams.set('travelmode', 'walking');
  return url.toString();
}

export function createWazeUrl(destination) {
  if (!destination || !isValidCoordinate(Number(destination.latitude), Number(destination.longitude))) throw new TypeError('Invalid destination coordinates');
  const url = new URL('https://www.waze.com/ul');
  url.searchParams.set('ll', coordinate(destination));
  url.searchParams.set('navigate', 'yes');
  url.searchParams.set('utm_source', 'selangor_mobility_navigator');
  return url.toString();
}
