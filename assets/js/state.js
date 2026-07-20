export const state = {
  view: 'dashboard', map: null, miniMap: null, baseLayer: null,
  userLocation: null, locationState: 'idle', stations: [], routes: [], shapes: null,
  vehicles: new Map(), routeLayers: [], stationLayers: [], activeModes: new Set(['ktm', 'lrt', 'mrt', 'brt', 'bus']),
  aborters: new Map(), refreshTimer: null, currentLayer: 'all', sourceStatus: new Map()
};
