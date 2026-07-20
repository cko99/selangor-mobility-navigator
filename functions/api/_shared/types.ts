export interface Env { ASSETS: Fetcher; APP_ENV?: string }
export interface ApiMeta {
  source: string; dataset: string; status: string; fetchedAt: string;
  sourceUpdatedAt: string | null; ageSeconds: number | null; isStale: boolean;
  cacheStatus?: string; recordCount?: number; [key: string]: unknown;
}
export type PagesContext = EventContext<Env, string, Record<string, unknown>>;
