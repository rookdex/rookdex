// Row counts the dashboard and its skeleton share, so both reserve the same height (spec §4).
// Its own module, so the hub can size the skeleton without loading the dashboard.
// Not src/model/limits.ts, which holds the data size limits.
export const NEXT_LIMIT = 3
export const RECENT_LIMIT = 5
export const LATEST_LIMIT = 3
// The desktop news tile shows 5 below 1200 px and all 7 from there (CSS).
export const NEWS_LIMIT = 7
export const FINDS_DAYS = 7
