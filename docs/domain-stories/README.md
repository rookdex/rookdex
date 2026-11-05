# Domain stories

Rookdex told as stories: who does what, with what, in which order. Each `.story` file is the source. Each `.egn` file is generated from it and opens in [Egon.io](https://egon.io/app) through Import.

| Story | Scope |
|-------|-------|
| `rookdex-overview.story` | Every feature, one sentence each |
| `player-tracks-a-find.story` | The core loop: open, tick, save, see stats, export |
| `publish-a-content-change.story` | How a seed or guide edit reaches rookdex.app |

To regenerate after editing a `.story` file:

```bash
node ~/.claude/loadout/skills/domain-story/scripts/story-to-egn.mjs rookdex-overview.story
```

## Overview: where each sentence lives in the code

| # | Sentence | Code |
|---|----------|------|
| 1 | Maintainer updates seed and guides | `src/seed/*.json`, `src/content/guides/{en,nb}/`, schema in `src/model/schema.ts`, sources in `allowlist.json` |
| 2 | GitHub deploys the static build | `.github/workflows/deploy.yml` (job `deploy`), `wrangler.jsonc` |
| 3 | Player installs the Android app | A Play Store TWA that wraps the live site; `public/.well-known/assetlinks.json` |
| 4 | Browser requests a page | Cloudflare Workers static assets serving `dist/` |
| 5 | Site picks the language | `src/pages/index.astro`, `src/model/root-resolver.ts`, `src/scripts/language-choice.ts` |
| 6 | Service worker precaches the offline copy | `src/sw/sw.js`, `src/scripts/register-sw.ts`, `integrations/precache.mjs` |
| 7 | Hub shows the countdown and checklist | `src/islands/hub/Hub.tsx`, `CountdownView.tsx`, `PrelaunchChecklist.tsx` |
| 8 | Player ticks a find | `src/islands/Tracker.tsx`, `src/islands/tracker/ItemList.tsx` |
| 9 | Tracker saves progress | `src/islands/buildTracker.ts`, `useTracker.ts`, `src/model/progress.ts` (IndexedDB) |
| 10 | Player uses search and filters | `src/islands/tracker/SearchBar.tsx`, `useSearch.ts`, `CategoryNav.tsx`, `src/model/search.ts` |
| 11 | Player switches profile | `src/islands/tracker/ProfileMenu.tsx`, `src/model/profiles.ts` |
| 12 | Player exports the profile file | `src/islands/tracker/ProfileMenu.tsx`, `ImportDialog.tsx` |
| 13 | Player reads facts and rumours | `src/pages/[locale]/news.astro`, `src/islands/hub/NewsTile.tsx`, `src/seed/facts.json`, `rumours.json` |
| 14 | Player reads guides | `src/pages/[locale]/guides/[slug].astro`, `src/model/guides.ts` |
| 15 | Player browses Dex pages | `src/pages/[locale]/dex/`, `src/model/dex.ts` |
| 16 | Player checks item sources | `src/pages/[locale]/tracker/sources.astro`, `src/components/Sources.astro` |
| 17 | GitHub rebuilds the launch build | `.github/workflows/deploy.yml` (cron 18.11 at 23:05 UTC), `src/model/launch.ts`, `build-now.ts` |
| 18 | Hub reads progress | `src/islands/hub/useHubPhase.ts`, `src/model/dashboard.ts` |
| 19 | Hub shows the dashboard | `src/islands/hub/Dashboard.tsx`, `StatStrip.tsx`, `CategoryBars.tsx`, `FindsByDay.tsx`, `WhatsNext.tsx` |
| 20 | Player changes settings | `src/pages/[locale]/settings.astro`, `src/scripts/settings.ts`, `delete-all.ts` |

## Content change: where each sentence lives

| # | Sentence | Code |
|---|----------|------|
| 1 | Maintainer opens a pull request | GitHub, `main` is PR-only |
| 2-3 | Ward checks it and reports | `.github/workflows/ward.yml` (`ward / gate` is the required check) |
| 4-5 | GitHub uploads a preview and posts its link | `.github/workflows/ci.yml` (job `preview`) |
| 6-7 | Merge, then deploy | `.github/workflows/deploy.yml` |
| 8-9 | Service worker fetches the build and shows the update notice | `src/sw/sw.js`, `src/scripts/update-notice.ts` |

## Gaps

- Import has no sentence of its own in the overview. It shares sentence 12 with export.
- The phase 1c pipeline (Worker, Neon, automated facts) is not built yet. News is hand-curated, so the overview shows the as-is state only.
