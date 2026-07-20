import { safeDateIso } from './response';

export function transformForecast(rows: unknown[], locationId: string) {
  return rows.filter(isObject).filter(row => isObject(row.location) && row.location.location_id === locationId).map(row => ({
    locationId, locationName: isObject(row.location) ? String(row.location.location_name || '') : '', date: String(row.date || ''),
    morning: nullable(row.morning_forecast), afternoon: nullable(row.afternoon_forecast), night: nullable(row.night_forecast),
    summary: nullable(row.summary_forecast), summaryWhen: nullable(row.summary_when), minTemperature: finite(row.min_temp), maxTemperature: finite(row.max_temp)
  }));
}

export function transformWarnings(rows: unknown[], now = Date.now()) {
  return rows.filter(isObject).map((row, index) => {
    const issue = isObject(row.warning_issue) ? row.warning_issue : {};
    return {
      id: String(row.id || `${issue.issued || 'warning'}-${index}`), title: nullable(issue.title_en) || nullable(issue.title_bm) || 'Weather warning',
      heading: nullable(row.heading_en) || nullable(row.heading_bm), text: nullable(row.text_en) || nullable(row.text_bm),
      validFrom: safeDateIso(row.valid_from), validTo: safeDateIso(row.valid_to), issuedAt: safeDateIso(issue.issued)
    };
  }).filter(warning => !/^no (advisory|warning)$/i.test(warning.title)).filter(warning => !warning.validTo || Date.parse(warning.validTo) >= now);
}

function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value); }
const nullable = (value: unknown) => value == null || value === '' ? null : String(value);
const finite = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : null;
