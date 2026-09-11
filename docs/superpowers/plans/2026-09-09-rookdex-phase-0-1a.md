# Rookdex Phase 0 + 1a Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployed, installable, offline-capable Astro site at rookdex.app with the launch hub and one guide in English and Norwegian, CI green, and every phase 0 account in place — the foundation the tracker (1b) and pipeline (1c) plans build on.

**Architecture:** Static Astro 7 site, one route tree per language generated from a `[locale]` parameter, React only for the countdown and the install prompt. A hand-written service worker precaches the app shell through a 40-line Astro integration. Cloudflare Workers serves `dist/` as static assets; GitHub Actions uploads a preview version per pull request and deploys `main`.

**Tech Stack:** Astro 7.3 · React 19 · TypeScript 6 · Biome 2.5 · Vitest 4.1 + Testing Library + vitest-axe · Wrangler 4 · Cloudflare Workers static assets · self-hosted Inter (fontsource)

**Spec:** `docs/superpowers/specs/2026-09-09-rookdex-design.md` (stress test: `2026-09-09-rookdex-stress-test.md`)

## Scope of this plan

Spec §12 phases **0 · Setup** and **1a · Foundation**. Later plans: 1b tracker (model, islands, profiles, export/import, stats), 1c pipeline (Worker, allowlist, facts, switches, digest), 1d polish (Playwright smoke, Lighthouse CI, seed content, `launch-rebuild`).

## Deviations from the spec (decided while planning, 2026-09-09)

1. **No `@vite-pwa/astro`.** Its latest release (1.2.0, Nov 2025) declares `astro ^1–^5` as peer and has had no commits since; Astro 7 ships Vite 8. Task 7 hand-writes `sw.js` and a small integration that injects the precache list. Spec §2 "Progress storage"/§6 "service worker via `@vite-pwa/astro`" should be updated to "hand-written service worker, precache list generated at build".
2. **CSP uses hashes, not nonces.** Nonces need server rendering; the site is static. Astro's native CSP emits a `<meta http-equiv>` tag with per-page hashes. `frame-ancestors` is ignored inside `<meta>`, so clickjacking protection is `X-Frame-Options: DENY` in `_headers`. Spec §9 wording to update.
3. **No analytics in 1a.** Cloudflare Web Analytics loads its beacon from `static.cloudflareinsights.com`, which is a third-party origin and breaks the "no third-party requests" rule as written. Decision deferred to 1d with real options (allow that one origin, or nothing).
4. **Content pages carry two tiny vanilla scripts** (service-worker registration and the offline notice), no React. Spec §3 says zero JavaScript on content pages; this is the minimum for "installable from the first visit".
5. **iOS has no `beforeinstallprompt`.** The install dialog only appears on Chromium browsers. An iOS "Add to Home Screen" hint is a 1d item.
6. **CodeQL waits until the repo is public** (Task 9). Private repos need GitHub Advanced Security for CodeQL; Dependabot works from Task 8.
7. **Vitest pinned to 4.1.10**, not 5.0.0 (released this week). 4.1.10 is the combination Varde runs with the same Testing Library stack.

## Global Constraints

- Node `>=22.12.0` (Astro 7 floor). CI uses Node 24. Local machine has 26.
- Astro 7.3.2, static output, `trailingSlash: "always"`, `site: "https://rookdex.app"`.
- Brand: **Rookdex**. Domain, app name, manifest name, repo name contain none of: `gta`, `gta6`, `gtavi`, `rockstar`, `leonida`, `vice`. Page text may name the game.
- No third-party requests from the browser: fonts self-hosted, no CDN scripts, no analytics in this plan.
- CSP without `unsafe-inline`. No cookies.
- Mobile-first CSS: baseline for phones, `@media (min-width: 768px)` tablet, `@media (min-width: 1024px)` desktop. Never `max-width` queries.
- Accessibility: WCAG 2.2 AA; tap targets at least 44 px; visible focus; countdown digits `aria-live="off"`; one polite announcement per day change; `prefers-reduced-motion` respected.
- Every page: `lang`, `hreflang` alternates, the unofficial-project disclaimer and `legal@rookdex.app` in the footer.
- Secrets (Cloudflare token, Neon URL, Discord webhook) exist only as GitHub Actions / Cloudflare secrets or in the password manager. Never in the repo.
- Licence: MIT on code, CC BY-SA 4.0 on guide text.
- Formatting: Biome, tabs, double quotes, semicolons as needed, line width 100 (same as Varde).
- Commit messages: imperative, first person where a subject is needed, no attribution trailers.
- Code freeze 1 Nov 2026. Phase 0 done by 15 Sep; 1a runs 15–28 Sep (exam 23 Sep, that week is light).

## File structure

```
rookdex/
├── .github/
│   ├── dependabot.yml
│   └── workflows/
│       ├── ci.yml                    PR: biome, check, test, build, preview upload
│       └── deploy.yml                main: same gates, then wrangler deploy
├── integrations/
│   ├── precache.mjs                  astro:build:done → writes dist/sw.js with the precache list
│   └── precache.test.ts
├── public/
│   ├── _headers                      security + cache headers (Cloudflare static assets)
│   ├── _redirects                    / → /en/
│   ├── icon.svg                      own rook mark, source for generated icons
│   ├── manifest.webmanifest
│   └── (generated) pwa-*.png, maskable-icon-512x512.png, apple-touch-icon-180x180.png, favicon.ico
├── src/
│   ├── components/
│   │   ├── Footer.astro
│   │   └── LanguageSwitch.astro      zero-JS locale links
│   ├── content/guides/{en,no}/before-you-start.md
│   ├── content.config.ts             guides collection + schema
│   ├── i18n/
│   │   ├── en.ts                     source of truth for the Strings type
│   │   ├── no.ts
│   │   └── index.ts                  locales, isLocale, t, fill
│   ├── islands/
│   │   ├── Countdown.tsx             view
│   │   ├── Countdown.test.tsx
│   │   ├── InstallPrompt.tsx
│   │   ├── InstallPrompt.test.tsx
│   │   └── useCountdown.ts           controller (timer)
│   ├── layouts/Base.astro
│   ├── model/
│   │   ├── launch.ts                 pure launch-time rules
│   │   ├── launch.test.ts
│   │   ├── guides.ts                 pure guide id / fallback rules
│   │   └── guides.test.ts
│   ├── pages/
│   │   ├── 404.astro
│   │   └── [locale]/
│   │       ├── index.astro           hub
│   │       └── guides/[slug].astro
│   ├── scripts/
│   │   ├── offline-notice.ts
│   │   ├── offline-notice.test.ts
│   │   └── register-sw.ts
│   ├── styles/
│   │   ├── tokens.css
│   │   └── global.css
│   ├── sw/sw.js                      service worker source (placeholders filled at build)
│   ├── test/setup.ts
│   └── types/pwa.d.ts
├── astro.config.mjs
├── biome.json
├── LICENSE
├── package.json
├── pwa-assets.config.ts
├── README.md
├── tsconfig.json
├── vitest.config.ts
└── wrangler.jsonc
```

**MVC in this codebase:** `src/model/` is plain TypeScript, no React, no DOM, no timers — it carries the unit tests. Islands are views. Hooks (`useCountdown`) are controllers. Astro components are templates rendered once at build.

---

### Task 0: Phase 0 accounts (Malin, no code, ~45 min)

These are dashboard clicks only I can do. Nothing in later tasks depends on them until Task 8, so they can run in parallel with Tasks 1–7. Secrets go straight into GitHub or the password manager, never through a chat.

- [x] **Cloudflare account ID.** Dashboard → Workers & Pages → right-hand column "Account ID". Add it as a GitHub repository secret `CLOUDFLARE_ACCOUNT_ID` (Settings → Secrets and variables → Actions).
- [ ] **Cloudflare API token.** My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers**. Under Zone Resources pick `rookdex.app` (needed to attach the custom domain). Add as repository secret `CLOUDFLARE_API_TOKEN`.
- [ ] **GitHub environment `production`.** Settings → Environments → New → `production`. Add the same two secrets there (the deploy job reads them from the environment).
- [ ] **Spend notification.** Cloudflare → Notifications → Add → "Billing: usage-based billing" at $10. Workers Paid stays off; Task 8 deploys on the free plan.
- [ ] **rookdex.com → rookdex.app redirect.** In zone `rookdex.com`: DNS → add `AAAA @ 100::` (proxied) and `AAAA www 100::` (proxied) so requests reach Cloudflare. Then Rules → Redirect Rules → Create → "Redirect from WWW/root": all incoming requests, dynamic target `concat("https://rookdex.app", http.request.uri.path)`, status 301, preserve query string. In zone `rookdex.app`: `AAAA www 100::` (proxied) plus a redirect rule for hostname `www.rookdex.app` to `https://rookdex.app${path}`. Do **not** add an apex record on `rookdex.app`; Wrangler creates it when the custom domain attaches in Task 8.
- [ ] **Takedown alias.** Zone `rookdex.app` → Email → Email Routing → enable, accept the MX records, add custom address `legal@rookdex.app` → destination `malinfossum.dev@proton.me` (verify the destination mail). This is the address the footer shows from Task 3.
- [ ] **Neon project.** console.neon.tech → New project: name `rookdex`, region **AWS Europe (Frankfurt) eu-central-1**, Postgres 17. Copy the pooled connection string into the password manager under "rookdex neon". It becomes a GitHub/Cloudflare secret in the 1c plan, not before.
- [ ] **Discord digest webhook.** In my private server: create channel `#rookdex-digest` → channel settings → Integrations → Webhooks → New Webhook → copy URL into the password manager under "rookdex discord webhook". Used in 1c.
- [ ] **GitHub org hygiene.** github.com/organizations/rookdex/settings → Copilot → disable for the org. Nothing else changes until Task 9.
- [ ] **DNSSEC.** Both zones are pending; nothing to do. Check back after 24 h that both show "Active".

---

### Task 1: Repo scaffold — Astro 7, Biome, TypeScript, licence

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `biome.json`, `.gitignore`, `LICENSE`, `README.md`, `src/pages/index.astro` (temporary, replaced in Task 3)

**Interfaces:**
- Produces: npm scripts `dev`, `build`, `check`, `format`, `lint`; Biome config every later task formats against.

**Why this shape:** Astro renders `.astro` files to HTML at build time and ships no JavaScript unless a component asks for it. That is the whole reason it fits a content site with a few interactive islands.

- [ ] **Step 1: Write `package.json`**

```json
{
	"name": "rookdex",
	"private": true,
	"version": "0.1.0",
	"type": "module",
	"engines": {
		"node": ">=22.12.0"
	},
	"scripts": {
		"dev": "astro dev",
		"build": "astro build",
		"check": "astro check",
		"format": "biome format --write .",
		"lint": "biome lint ."
	},
	"dependencies": {
		"astro": "7.3.2"
	},
	"devDependencies": {
		"@astrojs/check": "0.9.10",
		"@biomejs/biome": "2.5.12",
		"typescript": "6.0.3"
	}
}
```

TypeScript is pinned to 6.x because `@astrojs/check` 0.9.10 declares `typescript ^5 || ^6` as its peer; 7.x fails `npm ci`.

- [ ] **Step 2: Write `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from "astro/config"

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	site: "https://rookdex.app",
	output: "static",
	trailingSlash: "always",
})
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
	"extends": "astro/tsconfigs/strict",
	"compilerOptions": {
		"noUnusedLocals": true,
		"noUnusedParameters": true,
		"verbatimModuleSyntax": true
	},
	"include": [".astro/types.d.ts", "**/*"],
	"exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: Write `biome.json`**

```json
{
	"$schema": "https://biomejs.dev/schemas/2.5.12/schema.json",
	"vcs": {
		"enabled": true,
		"clientKind": "git",
		"useIgnoreFile": true
	},
	"files": {
		"ignoreUnknown": true,
		"includes": ["**", "!dist", "!node_modules", "!.astro", "!.wrangler"]
	},
	"formatter": {
		"enabled": true,
		"indentStyle": "tab",
		"lineWidth": 100
	},
	"linter": {
		"enabled": true,
		"domains": {
			"react": "recommended"
		},
		"rules": {
			"preset": "recommended"
		}
	},
	"javascript": {
		"formatter": {
			"quoteStyle": "double",
			"semicolons": "asNeeded",
			"trailingCommas": "es5"
		}
	},
	"css": {
		"formatter": {
			"enabled": true
		}
	},
	"assist": {
		"enabled": true,
		"actions": {
			"source": {
				"organizeImports": "on"
			}
		}
	}
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
dist/
.astro/
.wrangler/
.env
.env.*
.dev.vars
*.log
```

- [ ] **Step 6: Write `LICENSE`** (MIT, verbatim text, `Copyright (c) 2026 Malin Fossum`)

```
MIT License

Copyright (c) 2026 Malin Fossum

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 7: Write `README.md`**

```markdown
# Rookdex

A companion site for GTA VI: track what you find, see what is confirmed, in English and Norwegian. Installable, works offline, no account needed.

Rookdex is an unofficial fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.

## Stack

Astro 7 with React islands · TypeScript · Biome · Vitest · Cloudflare Workers (static assets)

## Run it

```bash
npm install
npm run dev
```

`npm run build` writes the site to `dist/`. `npm run check` type-checks the Astro and TypeScript files.

## Licence

Code is MIT (see `LICENSE`). Guide text under `src/content/` is CC BY-SA 4.0.

Design spec and plans live in `docs/superpowers/`.
```

- [ ] **Step 8: Write the temporary `src/pages/index.astro`**

```astro
---
// Placeholder so the build has a page. Task 3 replaces it with localised routes.
---

<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Rookdex</title>
	</head>
	<body>
		<h1>Rookdex</h1>
	</body>
</html>
```

- [ ] **Step 9: Install and verify**

Run: `npm install`
Expected: no peer-dependency errors; `package-lock.json` created.

Run: `npm run build`
Expected: `dist/index.html` exists (`ls dist`).

Run: `npx biome ci .`
Expected: exit 0.

Run: `npm run check`
Expected: `0 errors`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json biome.json .gitignore LICENSE README.md src/pages/index.astro
git commit -m "Scaffold the Astro site with Biome and TypeScript"
```

---

### Task 2: Vitest and the launch-time model

**Files:**
- Create: `vitest.config.ts`, `src/model/launch.ts`, `src/model/launch.test.ts`
- Modify: `package.json` (scripts + devDependencies)

**Interfaces:**
- Produces: `LAUNCH_AT: Date`, `PRELOAD_AT: Date`, `type HubPhase = "before" | "after"`, `hubPhase(now: Date, launchAt?: Date): HubPhase`, `countdownParts(now: Date, launchAt?: Date): { days; hours; minutes; seconds }`, `daysToGo(now: Date, launchAt?: Date): number`, `daysSince(now: Date, launchAt?: Date): number`. Task 6 consumes all of them.

**Why this shape:** The countdown's rules live in a file with no React and no `Date.now()` calls, so the tests pass a fixed `now` and never depend on the wall clock.

- [ ] **Step 1: Add Vitest**

Run: `npm install -D vitest@4.1.10`

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 2: Write `vitest.config.ts`**

```ts
/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config"

// getViteConfig hands Vitest the same Vite setup Astro builds with, so imports resolve identically.
export default getViteConfig({
	test: {
		environment: "node",
		include: ["src/**/*.test.{ts,tsx}", "integrations/**/*.test.ts"],
	},
})
```

- [ ] **Step 3: Write the failing test `src/model/launch.test.ts`**

```ts
import { describe, expect, it } from "vitest"
import { LAUNCH_AT, countdownParts, daysSince, daysToGo, hubPhase } from "./launch"

const t = (iso: string) => new Date(iso)

describe("hubPhase", () => {
	it("is before until the launch instant", () => {
		expect(hubPhase(t("2026-11-18T22:59:59Z"))).toBe("before")
	})
	it("is after from 00:00 CET on 19 November", () => {
		expect(LAUNCH_AT.toISOString()).toBe("2026-11-18T23:00:00.000Z")
		expect(hubPhase(t("2026-11-18T23:00:00Z"))).toBe("after")
	})
})

describe("countdownParts", () => {
	it("splits the remaining time into days, hours, minutes, seconds", () => {
		expect(countdownParts(t("2026-11-16T20:58:30Z"))).toEqual({
			days: 2,
			hours: 2,
			minutes: 1,
			seconds: 30,
		})
	})
	it("never goes negative", () => {
		expect(countdownParts(t("2026-12-01T00:00:00Z"))).toEqual({
			days: 0,
			hours: 0,
			minutes: 0,
			seconds: 0,
		})
	})
})

describe("daysToGo", () => {
	it("rounds up so the evening before still says 1 day", () => {
		expect(daysToGo(t("2026-11-18T20:00:00Z"))).toBe(1)
	})
	it("counts whole days", () => {
		expect(daysToGo(t("2026-09-09T23:00:00Z"))).toBe(70)
	})
	it("is 0 after launch", () => {
		expect(daysToGo(t("2026-11-20T00:00:00Z"))).toBe(0)
	})
})

describe("daysSince", () => {
	it("is day 0 on launch night", () => {
		expect(daysSince(t("2026-11-19T10:00:00Z"))).toBe(0)
	})
	it("counts whole days after launch", () => {
		expect(daysSince(t("2026-11-22T00:00:00Z"))).toBe(3)
	})
	it("is 0 before launch", () => {
		expect(daysSince(t("2026-10-01T00:00:00Z"))).toBe(0)
	})
})
```

- [ ] **Step 4: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./launch`.

- [ ] **Step 5: Write `src/model/launch.ts`**

```ts
// Launch timing rules. Pure functions: no DOM, no timers, no Date.now().
// The Countdown island's hook is the only caller.

const DAY_MS = 86_400_000

/** GTA VI release: 19 November 2026, 00:00 CET (UTC+1). */
export const LAUNCH_AT = new Date("2026-11-19T00:00:00+01:00")

/** Preload opens 12 November 2026. */
export const PRELOAD_AT = new Date("2026-11-12T00:00:00+01:00")

export type HubPhase = "before" | "after"

export interface CountdownParts {
	days: number
	hours: number
	minutes: number
	seconds: number
}

export function hubPhase(now: Date, launchAt = LAUNCH_AT): HubPhase {
	return now.getTime() < launchAt.getTime() ? "before" : "after"
}

export function countdownParts(now: Date, launchAt = LAUNCH_AT): CountdownParts {
	const total = Math.max(0, Math.floor((launchAt.getTime() - now.getTime()) / 1000))
	return {
		days: Math.floor(total / 86_400),
		hours: Math.floor((total % 86_400) / 3600),
		minutes: Math.floor((total % 3600) / 60),
		seconds: total % 60,
	}
}

/** Whole days left, rounded up: the evening before still says "1 day". */
export function daysToGo(now: Date, launchAt = LAUNCH_AT): number {
	const ms = launchAt.getTime() - now.getTime()
	return ms <= 0 ? 0 : Math.ceil(ms / DAY_MS)
}

/** Whole days since launch, rounded down: launch night itself is day 0. */
export function daysSince(now: Date, launchAt = LAUNCH_AT): number {
	const ms = now.getTime() - launchAt.getTime()
	return ms < 0 ? 0 : Math.floor(ms / DAY_MS)
}
```

- [ ] **Step 6: Run the tests**

Run: `npm test`
Expected: 10 passed.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts package.json package-lock.json src/model/launch.ts src/model/launch.test.ts
git commit -m "Add Vitest and the launch-time model"
```

---

### Task 3: i18n routing, strings, base layout, footer, 404

**Files:**
- Create: `src/i18n/en.ts`, `src/i18n/no.ts`, `src/i18n/index.ts`, `src/i18n/index.test.ts`, `src/layouts/Base.astro`, `src/components/LanguageSwitch.astro`, `src/components/Footer.astro`, `src/pages/[locale]/index.astro`, `src/pages/404.astro`, `public/_redirects`
- Modify: `astro.config.mjs`
- Delete: `src/pages/index.astro`

**Interfaces:**
- Produces: `locales: readonly ["en", "no"]`, `type Locale`, `defaultLocale`, `isLocale(v): v is Locale`, `t(locale): Strings`, `fill(template, vars): string`, `type Strings`; `Base.astro` props `{ locale: Locale; title: string; description: string; path: string }` where `path` is the route without the locale prefix (`""` for the hub, `"guides/before-you-start"` for a guide).

**Why this shape:** One `[locale]/` page file generates `/en/…` and `/no/…` at build time. Adding a language is a strings file, a content folder and one entry in `locales` — no page duplication. `no.ts` is typed as `Strings` (derived from `en.ts`), so a missing or extra key is a type error caught by `npm run check`; no runtime key test is needed.

- [ ] **Step 1: Configure Astro i18n in `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from "astro/config"

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
	site: "https://rookdex.app",
	output: "static",
	trailingSlash: "always",
	i18n: {
		defaultLocale: "en",
		locales: ["en", "no"],
		routing: {
			prefixDefaultLocale: true,
			redirectToDefaultLocale: true,
		},
	},
})
```

- [ ] **Step 2: Write `src/i18n/en.ts`**

```ts
// English is the source of truth: every other language file is typed as `Strings`,
// so a missing or extra key fails `npm run check`.
export const en = {
	siteName: "Rookdex",
	tagline: "A launch-night companion for GTA VI. Track what you find, see what is confirmed.",
	skipToContent: "Skip to content",
	languageSwitch: "Language",
	languageNames: { en: "English", no: "Norsk" },
	hub: {
		countdownHeading: "Launch countdown",
		daysToGo: "{n} days to go",
		oneDayToGo: "1 day to go",
		days: "days",
		hours: "hours",
		minutes: "minutes",
		seconds: "seconds",
		preload: "Preload opens 12 November.",
		buyHeading: "Buying in Norway",
		buyBody:
			"Digital editions unlock at midnight CET on 19 November on PlayStation 5 and Xbox Series X|S. The standard digital edition is 949 kr. There is no PC version at launch.",
		beforeYouStart: "Read this before you start",
		launched: "It is out.",
		daySince: "Day {n} since launch",
		statsSoon: "Your progress and stats land here in the next release.",
	},
	guides: {
		heading: "Guides",
		inEnglish: "This guide is only in English so far.",
		updated: "Updated {date}",
		sources: "Sources",
	},
	footer: {
		disclaimer:
			"Rookdex is an unofficial fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive. All trademarks belong to their owners.",
		contact: "Takedown or legal contact:",
		licence: "Code under MIT, guide text under CC BY-SA 4.0.",
		source: "Source on GitHub",
	},
	notFound: {
		title: "Page not found",
		body: "That address does not exist. Pick a language to start over.",
	},
	install: {
		title: "Install Rookdex",
		body: "Add it to your home screen so it opens like an app and works offline.",
		accept: "Install",
		dismiss: "Not now",
	},
	offline: {
		notice: "Offline, showing saved data",
	},
}

export type Strings = typeof en
```

- [ ] **Step 3: Write `src/i18n/no.ts`**

```ts
import type { Strings } from "./en"

export const no: Strings = {
	siteName: "Rookdex",
	tagline:
		"En følgesvenn for lanseringskvelden til GTA VI. Hold oversikt over det du finner, og se hva som er bekreftet.",
	skipToContent: "Hopp til innhold",
	languageSwitch: "Språk",
	languageNames: { en: "English", no: "Norsk" },
	hub: {
		countdownHeading: "Nedtelling til lansering",
		daysToGo: "{n} dager igjen",
		oneDayToGo: "1 dag igjen",
		days: "dager",
		hours: "timer",
		minutes: "minutter",
		seconds: "sekunder",
		preload: "Forhåndsnedlasting åpner 12. november.",
		buyHeading: "Kjøp i Norge",
		buyBody:
			"Digitale utgaver låses opp ved midnatt norsk tid 19. november på PlayStation 5 og Xbox Series X|S. Standard digital utgave koster 949 kr. Det kommer ingen PC-versjon ved lansering.",
		beforeYouStart: "Les dette før du begynner",
		launched: "Det er ute.",
		daySince: "Dag {n} etter lansering",
		statsSoon: "Fremgangen og statistikken din kommer hit i neste utgave.",
	},
	guides: {
		heading: "Guider",
		inEnglish: "Denne guiden finnes foreløpig bare på engelsk.",
		updated: "Oppdatert {date}",
		sources: "Kilder",
	},
	footer: {
		disclaimer:
			"Rookdex er et uoffisielt fanprosjekt. Det er ikke tilknyttet eller godkjent av Rockstar Games eller Take-Two Interactive. Alle varemerker tilhører sine eiere.",
		contact: "Kontakt for fjerning eller juridiske henvendelser:",
		licence: "Kode under MIT, guidetekst under CC BY-SA 4.0.",
		source: "Kildekode på GitHub",
	},
	notFound: {
		title: "Siden finnes ikke",
		body: "Denne adressen finnes ikke. Velg et språk for å begynne på nytt.",
	},
	install: {
		title: "Installer Rookdex",
		body: "Legg den på hjemskjermen, så åpner den som en app og virker uten nett.",
		accept: "Installer",
		dismiss: "Ikke nå",
	},
	offline: {
		notice: "Frakoblet, viser lagrede data",
	},
}
```

- [ ] **Step 4: Write the failing test `src/i18n/index.test.ts`**

```ts
import { describe, expect, it } from "vitest"
import { fill, isLocale, locales, t } from "./index"

describe("locales", () => {
	it("lists en and no, en first", () => {
		expect([...locales]).toEqual(["en", "no"])
	})
	it("isLocale guards unknown prefixes", () => {
		expect(isLocale("no")).toBe(true)
		expect(isLocale("xx")).toBe(false)
		expect(isLocale(undefined)).toBe(false)
	})
})

describe("t", () => {
	it("returns the strings for a locale", () => {
		expect(t("no").hub.countdownHeading).toBe("Nedtelling til lansering")
	})
})

describe("fill", () => {
	it("replaces placeholders", () => {
		expect(fill("{n} days to go", { n: 70 })).toBe("70 days to go")
	})
	it("leaves unknown placeholders visible so they get noticed", () => {
		expect(fill("Day {n}", {})).toBe("Day {n}")
	})
})
```

- [ ] **Step 5: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./index`.

- [ ] **Step 6: Write `src/i18n/index.ts`**

```ts
import { en, type Strings } from "./en"
import { no } from "./no"

export type { Strings }

export const locales = ["en", "no"] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = "en"

const strings: Record<Locale, Strings> = { en, no }

export function isLocale(value: string | undefined): value is Locale {
	return locales.includes(value as Locale)
}

export function t(locale: Locale): Strings {
	return strings[locale]
}

/** Fills `{name}` placeholders. Unknown names stay visible on purpose. */
export function fill(template: string, vars: Record<string, string | number>): string {
	return template.replace(/\{(\w+)\}/g, (match, key: string) =>
		key in vars ? String(vars[key]) : match
	)
}
```

- [ ] **Step 7: Run the tests**

Run: `npm test`
Expected: 15 passed (10 from Task 2 + 5).

- [ ] **Step 8: Write `src/components/LanguageSwitch.astro`**

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { type Locale, locales, t } from "../i18n"

interface Props {
	locale: Locale
	path: string
}

const { locale, path } = Astro.props
const s = t(locale)
---

<nav class="lang" aria-label={s.languageSwitch}>
	<ul>
		{
			locales.map((l) => (
				<li>
					<a
						href={getRelativeLocaleUrl(l, path)}
						hreflang={l}
						lang={l}
						aria-current={l === locale ? "page" : undefined}
					>
						{s.languageNames[l]}
					</a>
				</li>
			))
		}
	</ul>
</nav>
```

- [ ] **Step 9: Write `src/components/Footer.astro`**

```astro
---
import { type Locale, t } from "../i18n"

interface Props {
	locale: Locale
}

const { locale } = Astro.props
const s = t(locale)
---

<footer class="site-footer">
	<p>{s.footer.disclaimer}</p>
	<p>
		{s.footer.contact}
		<a href="mailto:legal@rookdex.app">legal@rookdex.app</a>
	</p>
	<p>
		{s.footer.licence}
		<a href="https://github.com/rookdex/rookdex">{s.footer.source}</a>
	</p>
</footer>
```

- [ ] **Step 10: Write `src/layouts/Base.astro`**

```astro
---
import { getAbsoluteLocaleUrl, getRelativeLocaleUrl } from "astro:i18n"
import Footer from "../components/Footer.astro"
import LanguageSwitch from "../components/LanguageSwitch.astro"
import { type Locale, defaultLocale, locales, t } from "../i18n"

interface Props {
	locale: Locale
	title: string
	description: string
	/** Route without the locale prefix: "" for the hub, "guides/before-you-start" for a guide. */
	path: string
}

const { locale, title, description, path } = Astro.props
const s = t(locale)
---

<!doctype html>
<html lang={locale}>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>{title} · {s.siteName}</title>
		<meta name="description" content={description} />
		<meta name="color-scheme" content="dark" />
		<meta name="theme-color" content="#000000" />
		<link rel="canonical" href={getAbsoluteLocaleUrl(locale, path)} />
		{locales.map((l) => <link rel="alternate" hreflang={l} href={getAbsoluteLocaleUrl(l, path)} />)}
		<link rel="alternate" hreflang="x-default" href={getAbsoluteLocaleUrl(defaultLocale, path)} />
	</head>
	<body>
		<a class="skip" href="#main">{s.skipToContent}</a>
		<header class="site-header">
			<a class="brand" href={getRelativeLocaleUrl(locale, "")}>{s.siteName}</a>
			<LanguageSwitch locale={locale} path={path} />
		</header>
		<main id="main" class="wrap">
			<slot />
		</main>
		<Footer locale={locale} />
	</body>
</html>
```

- [ ] **Step 11: Write `src/pages/[locale]/index.astro`** (hub shell; Task 6 adds the countdown)

```astro
---
import { type Locale, isLocale, locales, t } from "../../i18n"
import Base from "../../layouts/Base.astro"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale } }))
}

const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const s = t(locale as Locale)
---

<Base locale={locale} title={s.siteName} description={s.tagline} path="">
	<h1>{s.siteName}</h1>
	<p class="tagline">{s.tagline}</p>
</Base>
```

- [ ] **Step 12: Write `src/pages/404.astro`**

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { locales, t } from "../i18n"
import Base from "../layouts/Base.astro"

// The 404 is English (there is no locale in an unknown URL) and links every language home.
const s = t("en")
---

<Base locale="en" title={s.notFound.title} description={s.notFound.body} path="">
	<h1>{s.notFound.title}</h1>
	<p>{s.notFound.body}</p>
	<ul>
		{
			locales.map((l) => (
				<li>
					<a href={getRelativeLocaleUrl(l, "")} hreflang={l} lang={l}>
						{s.languageNames[l]}
					</a>
				</li>
			))
		}
	</ul>
</Base>
```

- [ ] **Step 13: Write `public/_redirects`** (Cloudflare static assets honour this file; it makes `/` reach `/en/` without a Worker script)

```
/ /en/ 302
```

- [ ] **Step 14: Delete the placeholder and build**

Run: `git rm src/pages/index.astro`

Run: `npm run build`
Expected: `dist/en/index.html`, `dist/no/index.html`, `dist/404.html` exist. `dist/no/index.html` contains `lang="no"` and `hreflang="en"`.

Run: `npm run check && npx biome ci .`
Expected: 0 errors, exit 0.

- [ ] **Step 15: Commit**

```bash
git add -A src/i18n src/layouts src/components src/pages public/_redirects astro.config.mjs
git commit -m "Add English and Norwegian routing with a base layout, footer and 404"
```

---

### Task 4: Design tokens, global CSS, self-hosted font

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`
- Modify: `src/layouts/Base.astro` (imports), `package.json`

**Interfaces:**
- Produces: CSS custom properties `--bg`, `--bg-raised`, `--border`, `--text`, `--text-muted`, `--accent`, `--accent-text`, `--font-sans`, `--space-1..6`, `--radius`; utility classes `.wrap`, `.visually-hidden`, `.skip`; layout classes `.site-header`, `.lang`, `.site-footer`, `.tagline`. Tasks 6 and 7 style against these names.

**Why this shape:** Dark-first, true black content on OLED with a 5 % lift on chrome, one warm accent, hierarchy by brightness. The accent is a placeholder until the brand palette is decided — one variable to change. Fonts are imported from the `@fontsource-variable/inter` package so Vite copies the woff2 into `dist/_astro/` and the browser only ever talks to rookdex.app.

- [ ] **Step 1: Install the font**

Run: `npm install @fontsource-variable/inter@5.3.0`

- [ ] **Step 2: Write `src/styles/tokens.css`**

```css
:root {
	color-scheme: dark;

	/* Surfaces: true black content, lifted chrome. */
	--bg: #000000;
	--bg-raised: #0d0d0d;
	--border: #262626;

	/* Text hierarchy by brightness, not hue. */
	--text: #f2f2f2;
	--text-muted: #a3a3a3;

	/* One accent. Placeholder until the brand palette lands. */
	--accent: #f0a742;
	--accent-text: #1a1200;

	--font-sans: "Inter Variable", system-ui, sans-serif;

	--space-1: 0.25rem;
	--space-2: 0.5rem;
	--space-3: 1rem;
	--space-4: 1.5rem;
	--space-5: 2rem;
	--space-6: 3rem;

	--radius: 0.5rem;
	--measure: 65ch;
	--tap: 44px;
}
```

- [ ] **Step 3: Write `src/styles/global.css`** (mobile-first; tablet and desktop only widen)

```css
@import "./tokens.css";

*,
*::before,
*::after {
	box-sizing: border-box;
}

html {
	background: var(--bg);
	color: var(--text);
	font-family: var(--font-sans);
	line-height: 1.5;
	-webkit-text-size-adjust: 100%;
}

body {
	margin: 0;
	min-height: 100dvh;
	display: flex;
	flex-direction: column;
}

img,
svg {
	max-width: 100%;
	height: auto;
}

a {
	color: var(--accent);
}

:focus-visible {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}

h1,
h2,
h3 {
	line-height: 1.2;
	margin: 0 0 var(--space-3);
}

p {
	max-width: var(--measure);
	margin: 0 0 var(--space-3);
}

/* Layout */

.wrap {
	width: 100%;
	max-width: 72rem;
	margin-inline: auto;
	padding: var(--space-4) var(--space-3);
	flex: 1;
}

.site-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-3);
	padding: var(--space-2) var(--space-3);
	background: var(--bg-raised);
	border-bottom: 1px solid var(--border);
}

.brand {
	font-weight: 700;
	text-decoration: none;
	color: var(--text);
	min-height: var(--tap);
	display: inline-flex;
	align-items: center;
}

.lang ul {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	gap: var(--space-2);
}

.lang a {
	display: inline-flex;
	align-items: center;
	min-height: var(--tap);
	padding-inline: var(--space-2);
	color: var(--text-muted);
	text-decoration: none;
}

.lang a[aria-current="page"] {
	color: var(--text);
	text-decoration: underline;
	text-underline-offset: 0.3em;
}

.tagline {
	color: var(--text-muted);
	font-size: 1.125rem;
}

.site-footer {
	padding: var(--space-4) var(--space-3);
	border-top: 1px solid var(--border);
	background: var(--bg-raised);
	color: var(--text-muted);
	font-size: 0.875rem;
}

.site-footer p {
	max-width: none;
}

/* Utilities */

.skip {
	position: absolute;
	left: var(--space-3);
	top: -100%;
	padding: var(--space-2) var(--space-3);
	background: var(--accent);
	color: var(--accent-text);
	border-radius: var(--radius);
	z-index: 10;
}

.skip:focus {
	top: var(--space-3);
}

.visually-hidden {
	position: absolute;
	width: 1px;
	height: 1px;
	overflow: hidden;
	clip: rect(0 0 0 0);
	clip-path: inset(50%);
	white-space: nowrap;
}

@media (min-width: 768px) {
	.wrap {
		padding: var(--space-5) var(--space-4);
	}

	.site-header,
	.site-footer {
		padding-inline: var(--space-4);
	}
}

@media (min-width: 1024px) {
	.wrap {
		padding: var(--space-6) var(--space-5);
	}
}
```

- [ ] **Step 4: Import both in `src/layouts/Base.astro`** (add to the frontmatter, after the other imports)

```astro
import "@fontsource-variable/inter"
import "../styles/global.css"
```

- [ ] **Step 5: Build and verify the font is served from our own origin**

Run: `npm run build`
Expected: `ls dist/_astro | grep -i inter` lists at least one `.woff2` file.

Run (Git Bash): `grep -rl "fonts.googleapis\|fonts.gstatic" dist || echo "no third-party font requests"`
Expected: `no third-party font requests`.

Run: `npx biome ci .`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/layouts/Base.astro package.json package-lock.json
git commit -m "Add dark-first tokens, mobile-first global styles and a self-hosted font"
```

---

### Task 5: Guides content collection with English fallback

**Files:**
- Create: `src/content.config.ts`, `src/content/guides/en/before-you-start.md`, `src/content/guides/no/before-you-start.md`, `src/model/guides.ts`, `src/model/guides.test.ts`, `src/pages/[locale]/guides/[slug].astro`
- Modify: `src/pages/[locale]/index.astro` (link to the guide)

**Interfaces:**
- Produces: `splitGuideId(id: string): { locale: string; slug: string }`, `guideSlugs(entries: { id: string }[]): string[]`, `resolveGuide<T extends { id: string }>(entries: T[], locale: string, slug: string, fallback?: string): { entry: T; fellBack: boolean } | undefined`. Guide frontmatter schema `{ title: string; summary: string; updated: Date; sources: string[] }`.

**Why this shape:** Astro content collections validate Markdown frontmatter with a schema at build time, so a guide with a missing `updated` date fails the build instead of shipping. The fallback rule is a pure function so the "in English" label case is unit-tested without rendering.

- [ ] **Step 1: Write `src/content.config.ts`**

```ts
import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { z } from "astro/zod"

// Entry ids follow the file path: "en/before-you-start", "no/before-you-start".
const guides = defineCollection({
	loader: glob({ base: "./src/content/guides", pattern: "**/*.md" }),
	schema: z.object({
		title: z.string(),
		summary: z.string(),
		updated: z.coerce.date(),
		sources: z.array(z.string().url()).default([]),
	}),
})

export const collections = { guides }
```

- [ ] **Step 2: Write the failing test `src/model/guides.test.ts`**

```ts
import { describe, expect, it } from "vitest"
import { guideSlugs, resolveGuide, splitGuideId } from "./guides"

const entries = [
	{ id: "en/before-you-start" },
	{ id: "no/before-you-start" },
	{ id: "en/regions" },
]

describe("splitGuideId", () => {
	it("splits locale and slug", () => {
		expect(splitGuideId("no/before-you-start")).toEqual({ locale: "no", slug: "before-you-start" })
	})
})

describe("guideSlugs", () => {
	it("lists every slug once, across languages", () => {
		expect(guideSlugs(entries)).toEqual(["before-you-start", "regions"])
	})
})

describe("resolveGuide", () => {
	it("returns the entry in the requested language", () => {
		expect(resolveGuide(entries, "no", "before-you-start")).toEqual({
			entry: { id: "no/before-you-start" },
			fellBack: false,
		})
	})
	it("falls back to English and says so", () => {
		expect(resolveGuide(entries, "no", "regions")).toEqual({
			entry: { id: "en/regions" },
			fellBack: true,
		})
	})
	it("is undefined when no language has the guide", () => {
		expect(resolveGuide(entries, "en", "missing")).toBeUndefined()
	})
})
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./guides`.

- [ ] **Step 4: Write `src/model/guides.ts`**

```ts
// Guide lookup rules. Works on ids only, so it is testable without Astro.

export function splitGuideId(id: string): { locale: string; slug: string } {
	const [locale, ...rest] = id.split("/")
	return { locale, slug: rest.join("/") }
}

export function guideSlugs(entries: { id: string }[]): string[] {
	return [...new Set(entries.map((e) => splitGuideId(e.id).slug))]
}

/** The guide in `locale`, or the `fallback` language's copy flagged with `fellBack`. */
export function resolveGuide<T extends { id: string }>(
	entries: T[],
	locale: string,
	slug: string,
	fallback = "en"
): { entry: T; fellBack: boolean } | undefined {
	const own = entries.find((e) => e.id === `${locale}/${slug}`)
	if (own) return { entry: own, fellBack: false }
	const fb = entries.find((e) => e.id === `${fallback}/${slug}`)
	return fb ? { entry: fb, fellBack: true } : undefined
}
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: 20 passed.

- [ ] **Step 6: Write the English guide `src/content/guides/en/before-you-start.md`**

```markdown
---
title: Before you start
summary: What to sort out before launch night so you can play at midnight.
updated: 2026-09-09
sources:
  - https://www.rockstargames.com/newswire
---

## The date

The game releases on **19 November 2026** on PlayStation 5 and Xbox Series X|S. Digital editions unlock at midnight CET. There is no PC version at launch, and it is single-player at launch.

## Preload

Preload opens on **12 November**. Start it the day it opens: the download is large, and launch-night servers are slow.

## Buying in Norway

The standard digital edition is 949 kr on the PlayStation Store and the Xbox Store. Physical copies come from the usual Norwegian retailers; check that they ship for release day.

## What Rookdex does on launch night

The home page turns into your dashboard at midnight. Install the site on your phone before then (the install prompt appears on your first visit) so it works even when the wifi is busy.
```

- [ ] **Step 7: Write the Norwegian guide `src/content/guides/no/before-you-start.md`**

```markdown
---
title: Før du begynner
summary: Det du bør ordne før lanseringskvelden, så du kan spille ved midnatt.
updated: 2026-09-09
sources:
  - https://www.rockstargames.com/newswire
---

## Datoen

Spillet slippes **19. november 2026** på PlayStation 5 og Xbox Series X|S. Digitale utgaver låses opp ved midnatt norsk tid. Det kommer ingen PC-versjon ved lansering, og spillet er enspiller ved lansering.

## Forhåndsnedlasting

Forhåndsnedlasting åpner **12. november**. Start den samme dag: nedlastingen er stor, og serverne er trege på lanseringskvelden.

## Kjøp i Norge

Standard digital utgave koster 949 kr i PlayStation Store og Xbox Store. Fysiske utgaver får du hos de vanlige norske butikkene; sjekk at de leverer til lanseringsdagen.

## Hva Rookdex gjør på lanseringskvelden

Forsiden blir dashbordet ditt ved midnatt. Installer siden på telefonen før det (installasjonsforslaget dukker opp ved første besøk), så virker den selv når wifi-en er full.
```

- [ ] **Step 8: Write `src/pages/[locale]/guides/[slug].astro`**

```astro
---
import { getCollection, render } from "astro:content"
import { type Locale, defaultLocale, fill, isLocale, locales, t } from "../../../i18n"
import Base from "../../../layouts/Base.astro"
import { guideSlugs, resolveGuide } from "../../../model/guides"

export async function getStaticPaths() {
	const entries = await getCollection("guides")
	// Every slug exists in every language; missing translations render the English copy.
	return locales.flatMap((locale) =>
		guideSlugs(entries).map((slug) => ({ params: { locale, slug } }))
	)
}

const { locale, slug } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const s = t(locale as Locale)

const entries = await getCollection("guides")
const resolved = resolveGuide(entries, locale, slug, defaultLocale)
if (!resolved) throw new Error(`No guide for slug: ${slug}`)
const { entry, fellBack } = resolved
const { Content } = await render(entry)

const dateLocale = locale === "no" ? "nb-NO" : "en-GB"
const updated = entry.data.updated.toLocaleDateString(dateLocale, { dateStyle: "long" })
---

<Base locale={locale} title={entry.data.title} description={entry.data.summary} path={`guides/${slug}`}>
	<article class="guide" lang={fellBack ? defaultLocale : undefined}>
		{fellBack && <p class="notice" lang={locale}>{s.guides.inEnglish}</p>}
		<h1>{entry.data.title}</h1>
		<p class="tagline">{entry.data.summary}</p>
		<p class="meta">{fill(s.guides.updated, { date: updated })}</p>
		<Content />
		{
			entry.data.sources.length > 0 && (
				<section aria-labelledby="sources">
					<h2 id="sources">{s.guides.sources}</h2>
					<ul>
						{entry.data.sources.map((url) => (
							<li>
								<a href={url} rel="noopener">
									{url}
								</a>
							</li>
						))}
					</ul>
				</section>
			)
		}
	</article>
</Base>

<style>
	.notice {
		padding: var(--space-2) var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
	}

	.meta {
		color: var(--text-muted);
		font-size: 0.875rem;
	}
</style>
```

- [ ] **Step 9: Link the guide from the hub** — in `src/pages/[locale]/index.astro`, add `import { getRelativeLocaleUrl } from "astro:i18n"` to the frontmatter and this after the tagline:

```astro
	<p>
		<a href={getRelativeLocaleUrl(locale, "guides/before-you-start")}>{s.hub.beforeYouStart}</a>
	</p>
```

- [ ] **Step 10: Build and verify**

Run: `npm run build`
Expected: `dist/en/guides/before-you-start/index.html` and `dist/no/guides/before-you-start/index.html` exist. The Norwegian file contains `Før du begynner` and no `inEnglish` notice.

Temporarily rename `src/content/guides/no/before-you-start.md` to `x.md`, run `npm run build` again, and confirm `dist/no/guides/before-you-start/index.html` now contains `Denne guiden finnes foreløpig bare på engelsk` and `lang="en"` on the article. Rename back.

Run: `npm run check && npx biome ci .`
Expected: 0 errors, exit 0.

- [ ] **Step 11: Commit**

```bash
git add src/content.config.ts src/content src/model/guides.ts src/model/guides.test.ts "src/pages/[locale]"
git commit -m "Add the guides collection with English fallback and the first guide"
```

---

### Task 6: Hub with the Countdown island (React)

**Files:**
- Create: `src/islands/useCountdown.ts`, `src/islands/Countdown.tsx`, `src/islands/Countdown.test.tsx`, `src/test/setup.ts`
- Modify: `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `package.json`, `src/pages/[locale]/index.astro`, `src/styles/global.css`

**Interfaces:**
- Consumes: `hubPhase`, `countdownParts`, `daysToGo`, `daysSince` from `src/model/launch.ts`; `t`, `fill`, `Locale` from `src/i18n`.
- Produces: `useCountdown(initialNow: Date): CountdownState` where `CountdownState = { phase: HubPhase; parts: CountdownParts; daysToGo: number; daysSince: number }`; `<Countdown locale initialNow guideHref />` with `initialNow: string` (ISO). Task 7 reuses the test setup file.

**Why this shape:** The island is server-rendered at build time with `initialNow` = build time, so the HTML already shows the countdown before any JavaScript runs and the first client render matches it exactly (no hydration mismatch). The hook then re-computes from the device clock, which is what makes the page flip at midnight without a rebuild. The digits are `aria-live="off"`; the visible "70 days to go" line is the polite region and only changes once a day.

- [ ] **Step 1: Install React and the test tools**

Run: `npm install @astrojs/react@6.0.5 react@19.2.8 react-dom@19.2.8`
Run: `npm install -D @types/react@19.2.18 @types/react-dom@19.2.7 @testing-library/react@16.3.3 @testing-library/jest-dom@7.0.1 jsdom@30.0.1 vitest-axe@0.1.0`

- [ ] **Step 2: Register the integration and JSX**

`astro.config.mjs` — add `import react from "@astrojs/react"` and `integrations: [react()]` inside `defineConfig`.

`tsconfig.json` — add to `compilerOptions`: `"jsx": "react-jsx", "jsxImportSource": "react"`.

`vitest.config.ts` — add `setupFiles: ["src/test/setup.ts"]` inside `test`.

- [ ] **Step 3: Write `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest"
import { expect, vi } from "vitest"
import * as axeMatchers from "vitest-axe/matchers"

expect.extend(axeMatchers)

// jsdom has no matchMedia and no <dialog> methods; stub the parts the islands call.
if (typeof window !== "undefined") {
	window.matchMedia ??= vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(() => false),
	}))

	HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
		this.setAttribute("open", "")
	}
	HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
		this.removeAttribute("open")
		this.dispatchEvent(new Event("close"))
	}
}
```

- [ ] **Step 4: Write the failing test `src/islands/Countdown.test.tsx`**

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { Countdown } from "./Countdown"

const before = "2026-09-10T10:00:00Z" // 70 days to go
const after = "2026-11-22T10:00:00Z" // day 3

beforeEach(() => {
	vi.useFakeTimers()
})
afterEach(() => {
	vi.useRealTimers()
})

describe("Countdown before launch", () => {
	it("renders the digits with announcements off and the days line polite", () => {
		vi.setSystemTime(new Date(before))
		render(<Countdown locale="en" initialNow={before} guideHref="/en/guides/before-you-start/" />)
		expect(screen.getByRole("heading", { name: "Launch countdown" })).toBeInTheDocument()
		const digits = screen.getByTestId("countdown-digits")
		expect(digits).toHaveAttribute("aria-live", "off")
		expect(screen.getByText("70 days to go")).toHaveAttribute("aria-live", "polite")
		expect(screen.getByRole("link", { name: "Read this before you start" })).toHaveAttribute(
			"href",
			"/en/guides/before-you-start/"
		)
	})

	it("says 1 day the evening before", () => {
		const eve = "2026-11-18T20:00:00Z"
		vi.setSystemTime(new Date(eve))
		render(<Countdown locale="en" initialNow={eve} guideHref="#" />)
		expect(screen.getByText("1 day to go")).toBeInTheDocument()
	})

	it("uses Norwegian strings", () => {
		vi.setSystemTime(new Date(before))
		render(<Countdown locale="no" initialNow={before} guideHref="#" />)
		expect(screen.getByText("70 dager igjen")).toBeInTheDocument()
	})

	it("has no axe violations", async () => {
		vi.setSystemTime(new Date(before))
		const { container } = render(<Countdown locale="en" initialNow={before} guideHref="#" />)
		expect(await axe(container)).toHaveNoViolations()
	})
})

describe("Countdown after launch", () => {
	it("flips to the launched state from the device clock", () => {
		vi.setSystemTime(new Date(after))
		// initialNow is the build time (before launch); the device clock decides.
		render(<Countdown locale="en" initialNow={before} guideHref="#" />)
		expect(screen.getByText("It is out.")).toBeInTheDocument()
		expect(screen.getByText("Day 3 since launch")).toBeInTheDocument()
		expect(screen.queryByTestId("countdown-digits")).not.toBeInTheDocument()
	})
})
```

- [ ] **Step 5: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./Countdown`.

- [ ] **Step 6: Write the controller `src/islands/useCountdown.ts`**

```ts
import { useEffect, useState } from "react"
import {
	type CountdownParts,
	type HubPhase,
	countdownParts,
	daysSince,
	daysToGo,
	hubPhase,
} from "../model/launch"

export interface CountdownState {
	phase: HubPhase
	parts: CountdownParts
	daysToGo: number
	daysSince: number
}

function compute(now: Date): CountdownState {
	return {
		phase: hubPhase(now),
		parts: countdownParts(now),
		daysToGo: daysToGo(now),
		daysSince: daysSince(now),
	}
}

/**
 * Ticks every second, or once a minute under prefers-reduced-motion.
 * `initialNow` is the build-time clock so the server HTML and the first client render match;
 * the effect then switches to the device clock, which is what flips the page at midnight.
 */
export function useCountdown(initialNow: Date): CountdownState {
	const [state, setState] = useState(() => compute(initialNow))

	useEffect(() => {
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
		const tick = () => setState(compute(new Date()))
		tick()
		const id = window.setInterval(tick, reduced ? 60_000 : 1_000)
		return () => window.clearInterval(id)
	}, [])

	return state
}
```

- [ ] **Step 7: Write the view `src/islands/Countdown.tsx`**

```tsx
import { type Locale, fill, t } from "../i18n"
import { useCountdown } from "./useCountdown"

interface Props {
	locale: Locale
	/** ISO timestamp from build time; see useCountdown. */
	initialNow: string
	guideHref: string
}

export function Countdown({ locale, initialNow, guideHref }: Props) {
	const s = t(locale).hub
	const state = useCountdown(new Date(initialNow))

	if (state.phase === "after") {
		return (
			<section className="hub-state" aria-labelledby="launched-heading">
				<h2 id="launched-heading">{s.launched}</h2>
				<p className="days" aria-live="polite">
					{fill(s.daySince, { n: state.daysSince })}
				</p>
				<p>{s.statsSoon}</p>
			</section>
		)
	}

	const daysLine = state.daysToGo === 1 ? s.oneDayToGo : fill(s.daysToGo, { n: state.daysToGo })
	const units: [number, string][] = [
		[state.parts.days, s.days],
		[state.parts.hours, s.hours],
		[state.parts.minutes, s.minutes],
		[state.parts.seconds, s.seconds],
	]

	return (
		<section className="hub-state" aria-labelledby="countdown-heading">
			<h2 id="countdown-heading">{s.countdownHeading}</h2>
			<p className="days" aria-live="polite">
				{daysLine}
			</p>
			<div className="countdown" aria-live="off" data-testid="countdown-digits">
				{units.map(([value, label]) => (
					<div className="unit" key={label}>
						<span className="value">{String(value).padStart(2, "0")}</span>
						<span className="label">{label}</span>
					</div>
				))}
			</div>
			<p>{s.preload}</p>
			<h3>{s.buyHeading}</h3>
			<p>{s.buyBody}</p>
			<p>
				<a href={guideHref}>{s.beforeYouStart}</a>
			</p>
		</section>
	)
}
```

- [ ] **Step 8: Run the tests**

Run: `npm test`
Expected: 25 passed.

- [ ] **Step 9: Mount the island on the hub** — replace `src/pages/[locale]/index.astro` with:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { type Locale, isLocale, locales, t } from "../../i18n"
import { Countdown } from "../../islands/Countdown"
import Base from "../../layouts/Base.astro"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale } }))
}

const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const s = t(locale as Locale)
---

<Base locale={locale} title={s.siteName} description={s.tagline} path="">
	<div class="hub">
		<header class="hub-intro">
			<h1>{s.siteName}</h1>
			<p class="tagline">{s.tagline}</p>
		</header>
		<Countdown
			client:load
			locale={locale}
			initialNow={new Date().toISOString()}
			guideHref={getRelativeLocaleUrl(locale, "guides/before-you-start")}
		/>
	</div>
</Base>
```

- [ ] **Step 10: Add hub styles to `src/styles/global.css`** (before the `@media` blocks; then extend both blocks)

```css
/* Hub */

.hub {
	display: grid;
	gap: var(--space-4);
}

.hub-state {
	padding: var(--space-4);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-raised);
}

.days {
	font-size: 1.25rem;
	font-weight: 600;
}

.countdown {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: var(--space-2);
	margin-bottom: var(--space-3);
	font-variant-numeric: tabular-nums;
}

.unit {
	display: grid;
	text-align: center;
}

.unit .value {
	font-size: 2rem;
	font-weight: 700;
	color: var(--accent);
}

.unit .label {
	font-size: 0.75rem;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}
```

Inside `@media (min-width: 768px)` add:

```css
	.unit .value {
		font-size: 3rem;
	}
```

Inside `@media (min-width: 1024px)` add:

```css
	.hub {
		grid-template-columns: 1fr 1fr;
		align-items: start;
	}
```

- [ ] **Step 11: Build and verify**

Run: `npm run build`
Expected: `dist/en/index.html` contains `aria-live="off"` and `Launch countdown`; `dist/_astro/` contains a `Countdown` chunk; the guide page (`dist/en/guides/before-you-start/index.html`) contains no `<script` tag.

Run: `npm run check && npx biome ci .`
Expected: 0 errors, exit 0.

Run: `npm run dev` and open http://localhost:4321/en/ in the Browser pane. Expected: digits tick once per second; the "days to go" line does not change while watching. Stop the dev server.

- [ ] **Step 12: Commit**

```bash
git add astro.config.mjs tsconfig.json vitest.config.ts package.json package-lock.json src/test src/islands "src/pages/[locale]/index.astro" src/styles/global.css
git commit -m "Add the hub countdown island that flips at launch from the device clock"
```

---

### Task 7: PWA — manifest, icons, service worker, install prompt, offline notice

**Files:**
- Create: `public/icon.svg`, `public/manifest.webmanifest`, `pwa-assets.config.ts`, `src/sw/sw.js`, `integrations/precache.mjs`, `integrations/precache.test.ts`, `src/scripts/register-sw.ts`, `src/scripts/offline-notice.ts`, `src/scripts/offline-notice.test.ts`, `src/types/pwa.d.ts`, `src/islands/InstallPrompt.tsx`, `src/islands/InstallPrompt.test.tsx`
- Modify: `astro.config.mjs`, `package.json`, `src/layouts/Base.astro`, `src/pages/[locale]/index.astro`, `src/styles/global.css`, `.gitignore` (no change needed; generated icons are committed)

**Interfaces:**
- Consumes: `t`, `Locale` from `src/i18n`; test setup from Task 6.
- Produces: `precacheUrls(files: string[]): string[]` (posix paths in, URLs out); `wireOfflineNotice(el: HTMLElement, win: Window, text: string): () => void`; `<InstallPrompt locale />`; `dist/sw.js` generated at build with `VERSION` and `PRECACHE` filled.

**Why this shape:** A service worker is a script the browser runs between the page and the network. Ours precaches the whole built site (it is small), serves hashed assets from cache first, and tries the network first for pages so a deploy shows up on the next load. The precache list has to be generated after Astro writes `dist/`, which is what the `astro:build:done` hook is for.

- [ ] **Step 1: Install the icon generator**

Run: `npm install -D @vite-pwa/assets-generator@1.0.2`

Add to `package.json` scripts: `"icons": "pwa-assets-generator"`.

- [ ] **Step 2: Write the rook mark `public/icon.svg`** (own drawing, no third-party art)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
	<rect width="512" height="512" rx="96" fill="#000000"/>
	<path fill="#f0a742" d="M160 120h48v40h32v-40h32v40h32v-40h48v88l-28 24v120l28 24v40H160v-40l28-24V232l-28-24z"/>
</svg>
```

- [ ] **Step 3: Write `pwa-assets.config.ts`**

```ts
import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config"

// Generates pwa-64/192/512, maskable-icon-512, apple-touch-icon-180 and favicon.ico
// from the rook mark. Black backgrounds so the maskable padding matches the app.
export default defineConfig({
	preset: {
		...minimal2023Preset,
		maskable: {
			sizes: [512],
			padding: 0.3,
			resizeOptions: { background: "#000000" },
		},
		apple: {
			sizes: [180],
			padding: 0.3,
			resizeOptions: { background: "#000000" },
		},
	},
	images: ["public/icon.svg"],
})
```

Run: `npm run icons`
Expected: `public/` now holds `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. Open `public/maskable-icon-512x512.png` with the Read tool and confirm the rook sits inside a black square with margin.

- [ ] **Step 4: Write `public/manifest.webmanifest`**

```json
{
	"id": "/",
	"name": "Rookdex",
	"short_name": "Rookdex",
	"description": "Launch-night companion: track what you find, see what is confirmed.",
	"start_url": "/en/",
	"scope": "/",
	"display": "standalone",
	"background_color": "#000000",
	"theme_color": "#000000",
	"lang": "en",
	"icons": [
		{ "src": "/pwa-64x64.png", "sizes": "64x64", "type": "image/png" },
		{ "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png" },
		{ "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png" },
		{
			"src": "/maskable-icon-512x512.png",
			"sizes": "512x512",
			"type": "image/png",
			"purpose": "maskable"
		}
	]
}
```

- [ ] **Step 5: Write the failing test `integrations/precache.test.ts`**

```ts
import { describe, expect, it } from "vitest"
import { precacheUrls } from "./precache.mjs"

describe("precacheUrls", () => {
	it("maps built files to URLs and skips the files the worker must not cache", () => {
		const files = [
			"404.html",
			"_astro/Countdown.abc123.js",
			"_headers",
			"_redirects",
			"en/guides/before-you-start/index.html",
			"en/index.html",
			"index.html",
			"manifest.webmanifest",
			"pwa-192x192.png",
			"sw.js",
		]
		expect(precacheUrls(files)).toEqual([
			"/",
			"/_astro/Countdown.abc123.js",
			"/en/",
			"/en/guides/before-you-start/",
			"/manifest.webmanifest",
			"/pwa-192x192.png",
		])
	})
})
```

- [ ] **Step 6: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./precache.mjs`.

- [ ] **Step 7: Write `integrations/precache.mjs`**

```js
// Astro integration. After the static build it lists every file in dist/, writes the list
// and a content hash into the service worker, and saves it as dist/sw.js.
import { createHash } from "node:crypto"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const SKIP = new Set(["404.html", "sw.js", "_headers", "_redirects"])

/** Posix-relative file paths from dist/ → URLs the worker precaches. */
export function precacheUrls(files) {
	return files
		.filter((file) => !SKIP.has(file))
		.map((file) => {
			if (file === "index.html") return "/"
			if (file.endsWith("/index.html")) return `/${file.slice(0, -"index.html".length)}`
			return `/${file}`
		})
		.sort()
}

async function listFiles(root) {
	const entries = await readdir(root, { recursive: true, withFileTypes: true })
	return entries
		.filter((entry) => entry.isFile())
		.map((entry) => relative(root, join(entry.parentPath, entry.name)).split(sep).join("/"))
}

export default function precache() {
	return {
		name: "rookdex-precache",
		hooks: {
			"astro:build:done": async ({ dir, logger }) => {
				const root = fileURLToPath(dir)
				const files = await listFiles(root)
				const urls = precacheUrls(files)

				const hash = createHash("sha256")
				for (const file of files.filter((f) => !SKIP.has(f))) {
					hash.update(file)
					hash.update(await readFile(join(root, file)))
				}
				const version = hash.digest("hex").slice(0, 12)

				const template = await readFile(new URL("../src/sw/sw.js", import.meta.url), "utf8")
				const worker = template
					.replace('"__VERSION__"', JSON.stringify(version))
					.replace('"__PRECACHE__"', JSON.stringify(urls))
				await writeFile(join(root, "sw.js"), worker)
				logger.info(`sw.js written: ${urls.length} URLs, version ${version}`)
			},
		},
	}
}
```

- [ ] **Step 8: Run the tests**

Run: `npm test`
Expected: 26 passed.

- [ ] **Step 9: Write the service worker source `src/sw/sw.js`**

```js
// Service worker. The two placeholders are filled by integrations/precache.mjs at build.
const VERSION = "__VERSION__"
const PRECACHE = "__PRECACHE__"
const CACHE = `rookdex-${VERSION}`

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches
			.open(CACHE)
			.then((cache) => cache.addAll(PRECACHE))
			.then(() => self.skipWaiting())
	)
})

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
			.then(() => self.clients.claim())
	)
})

self.addEventListener("fetch", (event) => {
	const { request } = event
	if (request.method !== "GET") return
	const url = new URL(request.url)
	if (url.origin !== self.location.origin) return

	// Hashed build assets never change under the same name.
	if (url.pathname.startsWith("/_astro/")) {
		event.respondWith(cacheFirst(request))
		return
	}
	// Pages: network first so a deploy shows on the next load; cache when offline.
	if (request.mode === "navigate") {
		event.respondWith(networkFirst(request, url))
		return
	}
	event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
	const cached = await caches.match(request)
	if (cached) return cached
	const response = await fetch(request)
	if (response.ok) {
		const cache = await caches.open(CACHE)
		cache.put(request, response.clone())
	}
	return response
}

async function networkFirst(request, url) {
	try {
		const response = await fetch(request)
		if (response.ok) {
			const cache = await caches.open(CACHE)
			cache.put(request, response.clone())
		}
		return response
	} catch {
		const cached = await caches.match(request)
		if (cached) return cached
		// Unknown page while offline: fall back to the home page of the same language.
		const localeHome = `/${url.pathname.split("/")[1] || "en"}/`
		return (await caches.match(localeHome)) ?? (await caches.match("/en/")) ?? Response.error()
	}
}
```

- [ ] **Step 10: Write `src/scripts/register-sw.ts`**

```ts
// Registers the service worker once the page has loaded, so it never competes with first paint.
if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker.register("/sw.js").catch(() => {
			// No service worker is a degraded mode, not an error the visitor can act on.
		})
	})
}
```

- [ ] **Step 11: Write the failing test `src/scripts/offline-notice.test.ts`**

```ts
// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { wireOfflineNotice } from "./offline-notice"

describe("wireOfflineNotice", () => {
	it("announces once when the connection drops and clears when it returns", () => {
		const el = document.createElement("p")
		wireOfflineNotice(el, window, "Offline, showing saved data")
		expect(el.textContent).toBe("")
		window.dispatchEvent(new Event("offline"))
		expect(el.textContent).toBe("Offline, showing saved data")
		expect(el.hidden).toBe(false)
		window.dispatchEvent(new Event("offline"))
		expect(el.textContent).toBe("Offline, showing saved data")
		window.dispatchEvent(new Event("online"))
		expect(el.textContent).toBe("")
		expect(el.hidden).toBe(true)
	})
})
```

- [ ] **Step 12: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./offline-notice`.

- [ ] **Step 13: Write `src/scripts/offline-notice.ts`**

```ts
/**
 * Fills a polite live region once when the connection drops and empties it when it returns.
 * Setting the same text twice would not re-announce, so the second "offline" is a no-op anyway.
 */
export function wireOfflineNotice(el: HTMLElement, win: Window, text: string): () => void {
	const show = () => {
		el.textContent = text
		el.hidden = false
	}
	const hide = () => {
		el.textContent = ""
		el.hidden = true
	}
	hide()
	win.addEventListener("offline", show)
	win.addEventListener("online", hide)
	return () => {
		win.removeEventListener("offline", show)
		win.removeEventListener("online", hide)
	}
}
```

- [ ] **Step 14: Run the tests**

Run: `npm test`
Expected: 27 passed.

- [ ] **Step 15: Write `src/types/pwa.d.ts`**

```ts
// Chromium-only event; not in lib.dom. Declared here so the island type-checks.
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface WindowEventMap {
	beforeinstallprompt: BeforeInstallPromptEvent
}
```

- [ ] **Step 16: Write the failing test `src/islands/InstallPrompt.test.tsx`**

```tsx
// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"
import { InstallPrompt, SEEN_KEY } from "./InstallPrompt"

function fireInstallPrompt() {
	const event = new Event("beforeinstallprompt", { cancelable: true }) as BeforeInstallPromptEvent
	Object.assign(event, { prompt: vi.fn().mockResolvedValue(undefined) })
	act(() => {
		window.dispatchEvent(event)
	})
	return event
}

afterEach(() => {
	localStorage.clear()
})

describe("InstallPrompt", () => {
	it("opens once, is dismissible, remembers the dismissal and returns focus", async () => {
		const trigger = document.createElement("button")
		document.body.append(trigger)
		trigger.focus()

		render(<InstallPrompt locale="en" />)
		const dialog = screen.getByRole("dialog", { hidden: true })
		expect(dialog).not.toHaveAttribute("open")

		const event = fireInstallPrompt()
		expect(event.defaultPrevented).toBe(true)
		expect(dialog).toHaveAttribute("open")
		expect(await axe(dialog)).toHaveNoViolations()

		act(() => {
			screen.getByRole("button", { name: "Not now" }).click()
		})
		expect(dialog).not.toHaveAttribute("open")
		expect(localStorage.getItem(SEEN_KEY)).toBe("1")
		expect(document.activeElement).toBe(trigger)

		fireInstallPrompt()
		expect(dialog).not.toHaveAttribute("open")
		trigger.remove()
	})

	it("calls prompt() on install", () => {
		render(<InstallPrompt locale="no" />)
		const event = fireInstallPrompt()
		act(() => {
			screen.getByRole("button", { name: "Installer" }).click()
		})
		expect(event.prompt).toHaveBeenCalledOnce()
	})
})
```

- [ ] **Step 17: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./InstallPrompt`.

- [ ] **Step 18: Write `src/islands/InstallPrompt.tsx`**

```tsx
import { useEffect, useRef, useState } from "react"
import { type Locale, t } from "../i18n"

export const SEEN_KEY = "rookdex.install-prompt-seen"

function readSeen(): boolean {
	try {
		return localStorage.getItem(SEEN_KEY) === "1"
	} catch {
		return false
	}
}

function writeSeen(): void {
	try {
		localStorage.setItem(SEEN_KEY, "1")
	} catch {
		// Private mode or blocked storage: the prompt simply shows again next visit.
	}
}

interface Props {
	locale: Locale
}

/** Native <dialog> shown once when the browser offers installation. Escape closes it. */
export function InstallPrompt({ locale }: Props) {
	const s = t(locale).install
	const dialogRef = useRef<HTMLDialogElement>(null)
	const returnFocus = useRef<HTMLElement | null>(null)
	const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

	useEffect(() => {
		const onPrompt = (event: BeforeInstallPromptEvent) => {
			if (readSeen()) return
			event.preventDefault()
			setDeferred(event)
		}
		window.addEventListener("beforeinstallprompt", onPrompt)
		return () => window.removeEventListener("beforeinstallprompt", onPrompt)
	}, [])

	useEffect(() => {
		const dialog = dialogRef.current
		if (deferred && dialog && !dialog.open) {
			returnFocus.current = document.activeElement as HTMLElement | null
			dialog.showModal()
		}
	}, [deferred])

	function dismiss() {
		writeSeen()
		setDeferred(null)
		dialogRef.current?.close()
	}

	async function install() {
		await deferred?.prompt()
		dismiss()
	}

	function onClose() {
		// Fires for the buttons and for Escape alike.
		writeSeen()
		setDeferred(null)
		returnFocus.current?.focus()
	}

	return (
		<dialog ref={dialogRef} className="install" aria-labelledby="install-title" onClose={onClose}>
			<h2 id="install-title">{s.title}</h2>
			<p>{s.body}</p>
			<div className="actions">
				<button type="button" className="primary" onClick={install}>
					{s.accept}
				</button>
				<button type="button" onClick={dismiss}>
					{s.dismiss}
				</button>
			</div>
		</dialog>
	)
}
```

- [ ] **Step 19: Run the tests**

Run: `npm test`
Expected: 29 passed.

- [ ] **Step 20: Wire everything into the layout and the hub**

`astro.config.mjs` — add `import precache from "./integrations/precache.mjs"` and change to `integrations: [react(), precache()]`.

`src/layouts/Base.astro` — in `<head>`, after the `theme-color` meta:

```astro
		<link rel="manifest" href="/manifest.webmanifest" />
		<link rel="icon" href="/favicon.ico" sizes="48x48" />
		<link rel="icon" href="/icon.svg" type="image/svg+xml" />
		<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
```

In `<body>`, directly after `<main …>…</main>`:

```astro
		<p id="offline-notice" class="offline" role="status" aria-live="polite" hidden></p>
		<script>
			import { wireOfflineNotice } from "../scripts/offline-notice"
			import "../scripts/register-sw"

			const el = document.getElementById("offline-notice")
			if (el) wireOfflineNotice(el, window, el.dataset.text ?? "")
		</script>
```

and give the notice its text: change the `<p …>` to include `data-text={s.offline.notice}`.

`src/pages/[locale]/index.astro` — add `import { InstallPrompt } from "../../islands/InstallPrompt"` and, after `</div>` closing `.hub`, `<InstallPrompt client:idle locale={locale} />`.

`src/styles/global.css` — add before the `@media` blocks:

```css
/* PWA */

.offline {
	margin: 0;
	padding: var(--space-2) var(--space-3);
	background: var(--bg-raised);
	border-top: 1px solid var(--border);
	color: var(--text-muted);
	text-align: center;
	max-width: none;
}

.install {
	background: var(--bg-raised);
	color: var(--text);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	padding: var(--space-4);
	max-width: 28rem;
	width: calc(100% - var(--space-4));
}

.install::backdrop {
	background: rgb(0 0 0 / 0.7);
}

.actions {
	display: flex;
	gap: var(--space-2);
	flex-wrap: wrap;
}

.actions button {
	min-height: var(--tap);
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius);
	border: 1px solid var(--border);
	background: var(--bg);
	color: var(--text);
	font: inherit;
	cursor: pointer;
}

.actions .primary {
	background: var(--accent);
	color: var(--accent-text);
	border-color: var(--accent);
}
```

- [ ] **Step 21: Build and verify offline behaviour**

Run: `npm run build`
Expected: log line `sw.js written: N URLs, version …`; `dist/sw.js` contains `"/en/"` and `"/no/guides/before-you-start/"` and no `__PRECACHE__`.

Run: `npm run check && npx biome ci .`
Expected: 0 errors, exit 0.

Run: `npx wrangler dev` (needs Task 8's `wrangler.jsonc`; if running Task 7 first, use `npx astro preview`) and open http://localhost:8787/en/ in the Browser pane. In DevTools → Application: Manifest shows Rookdex with four icons and no warnings; Service Workers shows `sw.js` activated. Tick "Offline", reload: the hub still renders. Navigate to the guide while offline: it renders. Untick Offline.

- [ ] **Step 22: Commit**

```bash
git add public pwa-assets.config.ts src/sw integrations src/scripts src/types src/islands/InstallPrompt.tsx src/islands/InstallPrompt.test.tsx astro.config.mjs package.json package-lock.json src/layouts/Base.astro "src/pages/[locale]/index.astro" src/styles/global.css
git commit -m "Make the site installable with a precaching service worker and an install prompt"
```

---

### Task 8: CSP, headers, Cloudflare deploy and CI

**Files:**
- Create: `wrangler.jsonc`, `public/_headers`, `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `.github/dependabot.yml`
- Modify: `astro.config.mjs`, `package.json`, `README.md`

**Interfaces:**
- Consumes: GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` from Task 0.
- Produces: `npm run preview` (Wrangler serving `dist/`), the `web-tests` check name later plans and the branch ruleset rely on, https://rookdex.app.

**Why this shape:** Cloudflare Workers "static assets" serves a folder from the edge with no Worker script; static requests are free and unlimited. The site's own CSP is emitted by Astro as a `<meta>` tag with a hash for every script and style it generates, which is what lets us drop `unsafe-inline`. Headers that a `<meta>` CSP cannot express live in `_headers`.

- [ ] **Step 1: Install Wrangler and add the preview script**

Run: `npm install -D wrangler@4.130.0`

Add to `package.json` scripts: `"preview": "wrangler dev"`.

- [ ] **Step 2: Write `wrangler.jsonc`**

```jsonc
{
	"$schema": "node_modules/wrangler/config-schema.json",
	"name": "rookdex",
	"compatibility_date": "2026-09-09",
	// Static site: no Worker script until the 1c plan adds the API and cron.
	"assets": {
		"directory": "./dist",
		"not_found_handling": "404-page",
		"html_handling": "auto-trailing-slash"
	},
	// Every `wrangler versions upload` gets its own URL; `main` deploys to the custom domain.
	"preview_urls": true,
	"workers_dev": true,
	"routes": [{ "pattern": "rookdex.app", "custom_domain": true }]
}
```

- [ ] **Step 3: Write `public/_headers`**

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Cross-Origin-Opener-Policy: same-origin

/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/sw.js
  Cache-Control: no-cache
```

- [ ] **Step 4: Turn on Astro's CSP in `astro.config.mjs`** (add inside `defineConfig`)

```js
	security: {
		csp: {
			directives: [
				"default-src 'self'",
				"img-src 'self' data:",
				"font-src 'self'",
				"connect-src 'self'",
				"manifest-src 'self'",
				"worker-src 'self'",
				"base-uri 'self'",
				"form-action 'self'",
				"object-src 'none'",
			],
			scriptDirective: { resources: ["'self'"] },
			styleDirective: { resources: ["'self'"] },
		},
	},
```

- [ ] **Step 5: Build and verify locally**

Run: `npm run build`
Expected: `dist/en/index.html` contains `<meta http-equiv="content-security-policy"` with `script-src 'self' 'sha256-` and no `unsafe-inline`.

Run: `npm run preview` in the background, then:

```bash
curl -sI http://localhost:8787/ | head -5
```
Expected: `302` with `location: /en/`.

```bash
curl -sI http://localhost:8787/en/ | grep -iE "x-frame-options|x-content-type"
```
Expected: both headers present.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/xx/
```
Expected: `404`, and `curl -s http://localhost:8787/xx/ | grep -c "Page not found"` prints `1`.

Open http://localhost:8787/en/ in the Browser pane and read the console: no CSP violations. Stop the preview server.

- [ ] **Step 6: Write `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  pull_request:

permissions:
  contents: read

jobs:
  # Job key is the required-check context in the protect-main ruleset — do not rename.
  web-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install
        run: npm ci
      - name: Biome
        run: npx biome ci .
      - name: Type-check
        run: npm run check
      - name: Test
        run: npm test
      - name: Build
        run: npm run build

  preview:
    needs: web-tests
    # Secrets are not exposed to forks or Dependabot; skip the upload there.
    if: github.event.pull_request.head.repo.full_name == github.repository && github.actor != 'dependabot[bot]'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
      - name: Upload preview version
        id: preview
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: versions upload
      - name: Preview URL
        env:
          OUT: ${{ steps.preview.outputs.command-stdout }}
        run: |
          echo "## Preview" >> "$GITHUB_STEP_SUMMARY"
          printf '%s\n' "$OUT" | grep -i "preview" >> "$GITHUB_STEP_SUMMARY" || echo "no preview URL in output" >> "$GITHUB_STEP_SUMMARY"
```

- [ ] **Step 7: Write `.github/workflows/deploy.yml`**

```yaml
name: Deploy

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install
        run: npm ci
      - name: Biome
        run: npx biome ci .
      - name: Type-check
        run: npm run check
      - name: Test
        run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - name: Install
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy
        uses: cloudflare/wrangler-action@v4
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
```

- [ ] **Step 8: Write `.github/dependabot.yml`**

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    groups:
      minor-and-patch:
        update-types: ["minor", "patch"]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 9: Update `README.md`** — replace the "Run it" section with:

```markdown
## Run it

```bash
npm install
npm run dev
```

`npm run build` writes the site to `dist/`; `npm run preview` serves that folder the way Cloudflare does. `npm test` runs the unit tests, `npm run check` type-checks.

## Deploy

Pull requests get a preview URL (CI job summary). Merging to `main` deploys to https://rookdex.app through Cloudflare Workers static assets.
```

- [ ] **Step 10: Commit on a branch and open the pull request** (Malin confirms the push)

```bash
git checkout -b feat/deploy
git add wrangler.jsonc public/_headers .github astro.config.mjs package.json package-lock.json README.md
git commit -m "Add CSP, security headers, Cloudflare deploy and CI"
git push -u origin feat/deploy
gh pr create --title "Add CSP, security headers, Cloudflare deploy and CI" --body "Phase 1a Task 8. Preview URL appears in the CI job summary."
```

Expected: `web-tests` green, `preview` green with a `https://<version>-rookdex.<account>.workers.dev` URL in the summary. Open it in the Browser pane: hub renders in both languages, no console errors.

- [ ] **Step 11: Merge and verify production**

Run: `gh pr merge --squash --delete-branch` (Malin's call, after she has looked at the preview).

Expected: the Deploy workflow finishes green; https://rookdex.app/ redirects to `/en/`; https://rookdex.app/no/ renders; https://rookdex.com/ redirects to rookdex.app (Task 0 rule); on the phone, Chrome shows the install dialog on first visit and the installed app opens offline in airplane mode.

Run: `git checkout main && git pull`

---

### Task 9: Go public — transfer to the org, protect main, CodeQL (Malin, ~30 min)

Everything here is a GitHub settings click. The code is already MIT-licensed and free of secrets (Tasks 1 and 8), so nothing needs to change in the tree first.

- [ ] **Transfer.** github.com/malinfossum/rookdex → Settings → Danger Zone → Transfer → new owner `rookdex`. GitHub redirects the old URL, but update the remote anyway:

```bash
git remote set-url origin https://github.com/rookdex/rookdex.git
```

- [ ] **Check the secrets survived the transfer.** Settings → Secrets and variables → Actions: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` present at repository level and in the `production` environment. Re-add if not.
- [ ] **Make it public.** Settings → Danger Zone → Change visibility → Public.
- [ ] **Security.** Settings → Code security: enable Dependabot alerts and security updates; enable CodeQL **default setup** (free now that the repo is public).
- [ ] **Protect main.** Settings → Rules → Rulesets → New branch ruleset `protect-main`: target `main`; require a pull request before merging; require status checks to pass with `web-tests`; block force pushes. Include administrators.
- [ ] **Re-run Deploy once** (Actions → Deploy → Run workflow) and confirm rookdex.app still deploys from the new owner.
- [ ] **Family test.** Send https://rookdex.app to the family. Ask two things: did the install dialog appear, and does it open in airplane mode.

---

## Self-review against the spec

**Coverage of phase 0 (§12):** brand decision ✓ (done 2026-09-09), GitHub org ✓ (exists; Task 9 transfers), `.app` domain ✓ (registered), Cloudflare and Neon projects → Task 0 + Task 8, repo scaffold → Task 1, CI green → Task 8, Discord webhook → Task 0.

**Coverage of phase 1a (§12):** Astro site → Tasks 1–6; i18n routing → Task 3; hub in EN and NO → Tasks 3 and 6; PWA install and offline → Task 7; deploy to a preview domain → Task 8 (version preview URLs + workers.dev + rookdex.app).

**Spec sections this plan touches, by section:** §3 repo layout (src/content, islands, model, i18n, .github ✓; `src/seed`, `worker/`, `allowlist.json`, `aliases.json` belong to 1b/1c); §4 guides frontmatter (`title, summary, updated, sources[]` ✓), missing-language fallback with a visible label ✓, unsupported prefix → English 404 with every language home ✓; §6 two hub states from the device clock ✓, countdown `aria-live="off"` + daily polite region + reduced motion ✓, install dialog shown once, keyboard-dismissible, focus returned ✓, languages as folders + strings + one flag ✓; §9 CSP without `unsafe-inline` ✓ (hashes, deviation 2), no third-party requests ✓, no cookies ✓, secrets outside the repo ✓, Dependabot ✓, CodeQL → Task 9 (deviation 6); §10 footer disclaimer ✓, takedown alias ✓, no Rockstar media ✓ (own rook SVG), brand words absent from domain/app name ✓; §11 Vitest on `src/model/` ✓, axe on islands ✓; Playwright, Lighthouse CI and `DRY_RUN` are 1c/1d.

**Not in this plan, on purpose:** the `launch-rebuild` scheduled workflow (1d — it needs the deploy pipeline this plan creates, and scheduling it two months early gains nothing), the "Latest" feed on the hub (1c, needs the API), stats tiles (1b), analytics (deviation 3), iOS install hint (deviation 5).

**Type consistency check:** `Locale`, `t`, `fill`, `isLocale`, `locales`, `defaultLocale` (Task 3) are used with those names in Tasks 5–7. `hubPhase`, `countdownParts`, `daysToGo`, `daysSince` (Task 2) match `useCountdown` (Task 6). `precacheUrls` name matches between the test and the integration. `SEEN_KEY` is exported from `InstallPrompt.tsx` and imported by its test. The offline notice reads its text from `data-text` set in `Base.astro` from `s.offline.notice`. Test counts: 10 (Task 2) + 5 (Task 3) + 5 (Task 5) + 5 (Task 6) + 1 + 1 + 2 (Task 7) = 29.

**Estimate:** Tasks 1–8 about 11–12 hours of focused work; Tasks 0 and 9 about 75 minutes of clicking. Fits the 15–28 Sep window with the exam week light.
