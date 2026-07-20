import { describe, expect, it } from 'vitest';
import { transformFuelCsv } from '../functions/api/_shared/fuel.ts';
import { transformForecast, transformWarnings } from '../functions/api/_shared/weather.ts';
import { transitQuery, weeksQuery } from '../functions/api/_shared/validation.ts';
import { escapeHtml } from '../assets/js/utils/escape.js';
import { selectFallback } from '../assets/js/services/fallbackService.js';

describe('transformations and security', () => {
  it('transforms latest fuel records and schema blanks', () => { const csv='series_type,date,ron95,ron97,diesel,diesel_eastmsia\nlevel,2026-07-09,2,3,4,2\nlevel,2026-07-16,2.1,3.1,4.1,2\n'; const result=transformFuelCsv(csv,12); expect(result.latest).toMatchObject({date:'2026-07-16',diesel:4.1}); });
  it('transforms only requested weather location', () => expect(transformForecast([{location:{location_id:'Tn070',location_name:'Shah Alam'},date:'2026-07-21',min_temp:24},{location:{location_id:'Tn076'}}],'Tn070')).toHaveLength(1));
  it('handles null warning validity', () => expect(transformWarnings([{warning_issue:{title_en:'Warning'},valid_to:null}])).toHaveLength(1));
  it('validates allowlisted API parameters', () => { expect(transitQuery(new URL('https://x.test/?agency=prasarana&category=rapid-bus-kl')).category).toBe('rapid-bus-kl'); expect(()=>transitQuery(new URL('https://x.test/?agency=evil&category=x'))).toThrow(); expect(()=>weeksQuery(new URL('https://x.test/?weeks=1000'))).toThrow(); });
  it('escapes untrusted API text', () => expect(escapeHtml('<img src=x onerror=1>')).not.toContain('<img'));
  it('uses explicit fallback order', () => expect(selectFallback({fresh:null,cached:null,stale:'official stale',localOfficial:null,demo:'mock'})).toEqual({value:'official stale',status:'stale'}));
});
