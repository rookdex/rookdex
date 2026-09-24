# Rookdex frontend and navigation implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add app-style navigation (four tabs, back and forward in the installed app, a language dropdown), the new Settings and News pages, the redirect from the old rumours URL, quieter guide sources and a label/value footer.

**Architecture:** Everything renders as plain `.astro` at build. The three pieces that need behaviour (history buttons, language menu, settings page) are processed `<script>` blocks that call a `wire*` function from `src/scripts/`, and each function is unit-tested in jsdom. Rendered markup is tested through Astro's Container API in the node environment and parsed with the `jsdom` package. The one change to the Tracker is a new `closed` error for when another tab deletes the database.

**Tech Stack:** Astro 7.3.2 static (`output: "static"`, `trailingSlash: "always"`, i18n with `en` and `no`), React 19 islands (touched only in Tasks 6 and 9), Vitest 5 (jsdom for DOM logic, node for markup and file tests), `fake-indexeddb` 6, Biome 2, Cloudflare static assets (`public/_redirects`, `public/_headers`).

**Spec:** `docs/superpowers/specs/2026-09-23-rookdex-frontend-design.md` (sections cited as §N). Brand rules it builds on: `docs/superpowers/specs/2026-09-21-rookdex-brand-design.md`.

**Branch:** cut `frontend` from `frontend-spec` (which holds the spec and this plan), so the PR to `main` carries spec, plan and code together.

## Global Constraints

- **No new dependency and no new island** (§13). The only React changes are removing the rumours link (Task 6) and taking two key constants from `seenFlag.ts` (Task 9); the `closed` error (Task 8) lives in the model.
- **Every script is a processed `<script>` in an `.astro` file.** No `is:inline`, no `on*=` attributes, no `javascript:` URLs, no `'unsafe-inline'` (§13). No `style=` attribute in any markup (brand §12).
- **No raw hex** (`#[0-9a-fA-F]{3,8}`) in any `.css`, `.astro` or `.tsx` under `src/` except `src/styles/tokens.css` and the theme-color line in `Base.astro`. **No `:root` outside `tokens.css`, and the token set is fixed** (`src/styles/tokens.test.ts` asserts the exact list). See plan decision 1 for the spec's literal colours.
- **Copy lives in `src/i18n/en.ts` and `src/i18n/no.ts`**, typed by `Strings`, so a key missing from either file fails `npx astro check`. Copy rules from `cb92d88` keep running over every string: no "leak"/"lekk…", no `!`, no `ROOKDEX` in prose. **The soft hyphen U+00AD appears only in `no.nav.settings`** (§11).
- **Mobile-first CSS:** baseline styles target the phone; breakpoints are `@media (min-width: 768px)` and `(min-width: 1024px)`. The one `max-width` query is the wordmark rule in Task 3, which §4 defines as a phone-and-standalone combination.
- **Sizes:** every interactive control at least 44 px tall (`var(--tap)`); tab-bar cells at least 56 px; settings rows at least 48 px. Controls on one row share one height.
- **Test placement:** logic in plain TypeScript modules, DOM wiring in `wire*` functions tested with `// @vitest-environment jsdom`. `.astro` markup tests run in the **node** environment through `src/test/render.ts` (Task 2). Never put a markup test under jsdom: Vitest then compiles `.astro` files for the browser and the container throws `NoMatchingRenderer` (found in a spike while writing this plan). **Never put a test file under `src/pages/`**, because Astro treats `.ts` files there as endpoints.
- **Tooling traps (project memory):** run tests with `npx vitest run <path>` (the harness refuses `npm test`); type-check with `npx astro check`; format only the files you touched with `npx biome check --write <files>` (never `.`, it rewrites the line endings of unrelated CRLF files); CI runs `npx biome ci .`, which lints `.html` under `docs/` too. The Browser pane cannot register the service worker and cannot emulate `display-mode: standalone`.
- **Commits:** imperative subject, no body needed, no `Co-Authored-By` or AI attribution trailer.

## Plan decisions (not spelled out in the spec)

1. **The spec's literal colours become `color-mix()` over existing tokens**, because the hex test and the fixed token set forbid both raw hex and new tokens: `#161616` → `color-mix(in srgb, var(--text) 9%, var(--bg))` (22,22,22), `#3a3a3a` → `color-mix(in srgb, var(--text) 24%, var(--bg))` (58,58,58), shadow `rgba(0,0,0,.6)` → `color-mix(in srgb, var(--bg) 60%, transparent)`.
2. **`--tabbar-h` is declared on `html`, not `:root`**, because the token test forbids `:root` outside `tokens.css`. It is a layout value, not a brand token.
3. **`Store` gains `onClosed(callback)`, a registration method like the existing `onFirstWrite`**, instead of a new `openStore` parameter. Same behaviour as §7.2, and `openStore`'s signature and every call site stay unchanged.
4. **The Settings version line is computed in the page's frontmatter** with `appVersion(pkg.version, process.env.GITHUB_SHA)` instead of a Vite `define`. It gives the same string at build with no global declaration and no config change. Locally it reads `0.1.0 · dev`.
5. **Markup tests parse with `new JSDOM(html)`** in the node environment, and `src/types/jsdom.d.ts` declares the tiny slice of the `jsdom` module they use, because `jsdom` ships no types and `@types/jsdom` would be a new dependency. Proven by a spike: `Base.astro` renders with its absolute canonical URL and script tags.
6. **Guide sources move into `src/components/Sources.astro`** so the markup test renders them without the content layer; **the guide frontmatter schema moves into `src/model/guides.ts`** as `guideSchema`, so the duplicate-outlet rule is testable without `astro:content`.
7. **Norwegian uses "fremgang", not the spec's "fremdrift"**, in the delete-all text, to match the tracker's existing word ("Fremgang", "fremgangen din"). Malin: flip it back in `no.ts` if you meant "fremdrift".
8. **"Danger-styled" means an accent outline** (pink border and pink text on no fill): the brand has one accent and no red token, and the fixed token set rules out adding one. The filled pink `.primary` stays for positive actions.
9. **One `TabIcon.astro` with a `name` prop** holds the four drawings (paths copied from the approved S2 screen) instead of four files.
10. **Settings rows that depend on the browser ship in the server HTML with `hidden`**, with every variant already rendered; the script only toggles `hidden`. No strings pass through JavaScript except the three dialog messages and the storage row's Yes/No, which ride on `data-*` attributes.
11. **The two `localStorage` keys move into `src/islands/seenFlag.ts`** as `INSTALL_SEEN_KEY` and `HINT_SEEN_KEY`; `InstallPrompt.tsx` and `Tracker.tsx` keep exporting `SEEN_KEY` and `HINT_KEY` from them. The delete script then imports the keys without pulling React into its bundle.
12. **`deleteAllData` resolves `"deleted" | "failed" | "unsupported"`.** The module reports a missing `indexedDB` separately (§14), and the dialog shows the same "Nothing was deleted" message for both failure kinds (§7.2 steps 2 and 7).
13. **The success message sits in a visible `<p role="status">`** (polite by definition), empty from the start and outside the dialog, so sighted users see it too.

## File map

| File | Task | Responsibility |
|---|---|---|
| `src/i18n/en.ts`, `src/i18n/no.ts`, `src/i18n/copy.test.ts` | 1, 4, 6, 7 | All new copy; soft-hyphen rule |
| `src/model/tabs.ts` (+ test) | 2 | Tab ids, their paths, `currentTab()` |
| `src/components/TabIcon.astro`, `src/components/TabBar.astro` | 2 | The Main nav |
| `src/test/render.ts`, `src/types/jsdom.d.ts` | 2 | Container render helper for markup tests |
| `src/layouts/Base.astro` (+ `Base.test.ts`) | 2, 3 | Viewport, tab prop, header order |
| `src/scripts/history-buttons.ts` (+ test), `src/components/HistoryButtons.astro` | 3 | Back and forward in standalone |
| `src/scripts/language-menu.ts` (+ test), `src/components/LanguageSwitch.astro` (+ test) | 4 | Language dropdown |
| `src/model/outlet.ts` (+ test), `src/model/guides.ts`, `src/content.config.ts`, `src/components/Sources.astro` (+ test) | 5 | Outlet names, duplicate rule, sources line |
| `src/pages/[locale]/news.astro`, `public/_redirects`, `src/test/redirects.test.ts`, `src/test/news-page.test.ts` | 6 | News page and the 301 |
| `src/components/Footer.astro` (+ test) | 7 | Label/value footer |
| `src/model/store.ts`, `src/model/tracker.ts` (+ tests) | 8 | `closed` state |
| `src/scripts/delete-all.ts` (+ test), `src/islands/seenFlag.ts` | 9 | Delete everything on this device |
| `src/scripts/settings.ts` (+ test), `src/model/version.ts` (+ test) | 10, 11 | Storage row, install row, delete dialog, version |
| `src/pages/[locale]/settings.astro`, `src/test/settings-page.test.ts` | 11 | Settings page |
| `src/styles/global.css` | 2–7 | Shared chrome styles |

---

### Task 1: Copy for navigation, News, Settings, the footer pairs and the closed error

Additive only: no key is removed here, so every current consumer keeps compiling. Removals happen in the tasks that remove their consumers (4, 6, 7).

**Files:**
- Modify: `src/i18n/en.ts`, `src/i18n/no.ts`
- Test: `src/i18n/copy.test.ts`

**Interfaces:**
- Produces: `s.nav.{label, home, tracker, news, settings, back, forward}`; `s.news.{title, description}`; `s.settings.*` (keys listed below); `s.footer.{legalLabel, codeLicenceLabel, codeLicence, guideLicenceLabel, guideLicence, sourceLabel}`; `s.tracker.errors.closed`. The `nav` keys `home`, `tracker`, `news`, `settings` equal the `Tab` ids in Task 2, so `s.nav[id]` type-checks.

- [ ] **Step 1: Write the failing test**

Append to `src/i18n/copy.test.ts`:

```ts
describe("soft hyphens (spec §5, §11)", () => {
	it("appear only in the Norwegian Settings tab label", () => {
		const withShy = all.filter(([, text]) => text.includes("­")).map(([path]) => path)
		expect(withShy).toEqual(["no.nav.settings"])
	})

	it("leave the page title whole", () => {
		expect(no.settings.title).toBe("Innstillinger")
		expect(no.nav.settings.replace("­", "")).toBe(no.settings.title)
	})
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/i18n/copy.test.ts`
Expected: FAIL. The first test finds no soft hyphen (`[]` instead of `["no.nav.settings"]`); the second throws `TypeError: Cannot read properties of undefined (reading 'title')`, because Vitest does not type-check.

- [ ] **Step 3: Add the English copy**

In `src/i18n/en.ts`, after `skipToContent`:

```ts
	nav: {
		label: "Main",
		home: "Home",
		tracker: "Tracker",
		news: "News",
		settings: "Settings",
		back: "Back",
		forward: "Forward",
	},
```

In `footer`, after `source`:

```ts
		legalLabel: "Takedown and legal",
		codeLicenceLabel: "Code licence",
		codeLicence: "MIT",
		guideLicenceLabel: "Guide licence",
		guideLicence: "CC BY-SA 4.0",
		sourceLabel: "Source code",
```

In `tracker.errors`, after `name`:

```ts
			closed: "Your data changed in another tab. Reload to continue.",
```

After the `rumours` group (last in the object):

```ts
	news: {
		title: "News",
		description: "News about GTA VI, including what the press reports that Rockstar has not confirmed.",
	},
	settings: {
		title: "Settings",
		description: "Language, the data Rookdex keeps on this device, and app details.",
		language: "Language",
		data: "Your data",
		app: "App",
		stored: "Stored",
		storedValue: "In this browser only",
		persisted: "Protected from clearing",
		yes: "Yes",
		no: "No",
		transfer: "Export or import",
		transferLink: "Profile menu in Tracker",
		dangerBody:
			"Removes every profile and all progress on this device. It can't be undone. Export first if you want a copy.",
		deleteAll: "Delete all data on this device",
		dialogTitle: "Delete all data on this device?",
		cancel: "Cancel",
		confirm: "Delete everything",
		done: "All data on this device is deleted.",
		blocked: "Close other Rookdex tabs to finish.",
		failed: "Something went wrong. Nothing was deleted.",
		install: "Install",
		installButton: "Install Rookdex",
		installed: "Installed",
		iosHowTo: "Share, then Add to Home Screen",
		version: "Version",
		source: "Source code",
		sourceLink: "GitHub",
	},
```

- [ ] **Step 4: Add the Norwegian copy**

In `src/i18n/no.ts`, after `skipToContent`:

```ts
	nav: {
		label: "Hoved",
		home: "Hjem",
		tracker: "Oversikt",
		news: "Nyheter",
		// U+00AD: at 130 % text the bottom bar wraps the label here instead of clipping it (spec §5).
		settings: "Inn­stillinger",
		back: "Tilbake",
		forward: "Fremover",
	},
```

In `footer`, after `source`:

```ts
		legalLabel: "Fjerning og juridisk",
		codeLicenceLabel: "Kodelisens",
		codeLicence: "MIT",
		guideLicenceLabel: "Guidelisens",
		guideLicence: "CC BY-SA 4.0",
		sourceLabel: "Kildekode",
```

In `tracker.errors`, after `name`:

```ts
			closed: "Dataene dine ble endret i en annen fane. Last inn siden på nytt for å fortsette.",
```

After the `rumours` group:

```ts
	news: {
		title: "Nyheter",
		description: "Nyheter om GTA VI, blant annet det pressen melder som Rockstar ikke har bekreftet.",
	},
	settings: {
		title: "Innstillinger",
		description: "Språk, dataene Rookdex lagrer på denne enheten, og appdetaljer.",
		language: "Språk",
		data: "Dine data",
		app: "App",
		stored: "Lagret",
		storedValue: "Bare i denne nettleseren",
		persisted: "Beskyttet mot sletting",
		yes: "Ja",
		no: "Nei",
		transfer: "Eksport eller import",
		transferLink: "Profilmenyen i Oversikt",
		dangerBody:
			"Fjerner alle profiler og all fremgang på denne enheten. Det kan ikke angres. Eksporter først hvis du vil ha en kopi.",
		deleteAll: "Slett alle data på denne enheten",
		dialogTitle: "Slette alle data på denne enheten?",
		cancel: "Avbryt",
		confirm: "Slett alt",
		done: "Alle data på denne enheten er slettet.",
		blocked: "Lukk andre Rookdex-faner for å fullføre.",
		failed: "Noe gikk galt. Ingenting ble slettet.",
		install: "Installer",
		installButton: "Installer Rookdex",
		installed: "Installert",
		iosHowTo: "Del, deretter Legg til på Hjem-skjerm",
		version: "Versjon",
		source: "Kildekode",
		sourceLink: "GitHub",
	},
```

- [ ] **Step 5: Run the tests and the type check**

Run: `npx vitest run src/i18n` then `npx astro check`
Expected: PASS, and 0 errors (the `Strings` type proves both files hold the same keys).

- [ ] **Step 6: Commit**

```bash
npx biome check --write src/i18n/en.ts src/i18n/no.ts src/i18n/copy.test.ts
git add src/i18n
git commit -m "Add the copy for tabs, News, Settings and the footer pairs"
```

---

### Task 2: The tab bar, the `[hidden]` rule and the markup test harness

**Files:**
- Create: `src/model/tabs.ts`, `src/model/tabs.test.ts`, `src/components/TabIcon.astro`, `src/components/TabBar.astro`, `src/test/render.ts`, `src/types/jsdom.d.ts`, `src/layouts/Base.test.ts`
- Modify: `src/layouts/Base.astro`, `src/pages/404.astro`, `src/styles/global.css`

**Interfaces:**
- Consumes: `s.nav.*` (Task 1).
- Produces: `TABS: readonly ["home", "tracker", "news", "settings"]`, `type Tab`, `TAB_PATHS: Record<Tab, string>`, `currentTab(path: string, tab?: Tab | null): Tab | null` from `src/model/tabs.ts`; `renderDoc(component, options?): Promise<Document>` from `src/test/render.ts`; `Base.astro` prop `tab?: Tab | null`; the global `[hidden] { display: none !important }` rule that Tasks 3, 10 and 11 rely on.

- [ ] **Step 1: Write the failing unit test**

`src/model/tabs.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { currentTab } from "./tabs"

describe("currentTab (spec §5)", () => {
	it.each([
		["", "home"],
		["tracker", "tracker"],
		["news", "news"],
		["settings", "settings"],
		["guides/before-you-start", null],
	])("maps %j to %j", (path, tab) => {
		expect(currentTab(path)).toBe(tab)
	})

	it("marks no tab when tab is null, whatever the path", () => {
		expect(currentTab("", null)).toBeNull()
	})

	it("lets an explicit tab override the path", () => {
		expect(currentTab("guides/before-you-start", "news")).toBe("news")
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/model/tabs.test.ts`
Expected: FAIL, `Failed to resolve import "./tabs"`.

- [ ] **Step 3: Write `src/model/tabs.ts`**

```ts
// The four tabs (spec §5). The current one is worked out at build from the page's path, so the
// tab bar needs no JavaScript.

export const TABS = ["home", "tracker", "news", "settings"] as const
export type Tab = (typeof TABS)[number]

/** Route of each tab without the locale prefix, the same shape `Base.astro`'s `path` prop has. */
export const TAB_PATHS: Record<Tab, string> = {
	home: "",
	tracker: "tracker",
	news: "news",
	settings: "settings",
}

/** The tab the page belongs to, from the first path segment. Guides belong to none. */
export function currentTab(path: string, tab?: Tab | null): Tab | null {
	if (tab !== undefined) return tab
	const first = path.split("/")[0]
	return TABS.find((id) => TAB_PATHS[id] === first) ?? null
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/model/tabs.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Add the markup test harness**

`src/types/jsdom.d.ts`:

```ts
// jsdom ships no types, and @types/jsdom would be a new dependency. The markup tests use only this.
declare module "jsdom" {
	export class JSDOM {
		constructor(html?: string)
		readonly window: Window & typeof globalThis
	}
}
```

`src/test/render.ts`:

```ts
// Renders an .astro component through Astro's Container API and parses the HTML. Call it from
// node-environment tests only: under jsdom, Vitest compiles .astro files for the browser and the
// container finds no renderer.
import { experimental_AstroContainer as AstroContainer } from "astro/container"
import { JSDOM } from "jsdom"

type RenderArgs = Parameters<AstroContainer["renderToString"]>

let container: AstroContainer | undefined

export async function renderDoc(
	component: RenderArgs[0],
	options?: RenderArgs[1]
): Promise<Document> {
	container ??= await AstroContainer.create()
	return new JSDOM(await container.renderToString(component, options)).window.document
}
```

- [ ] **Step 6: Write the failing markup test**

`src/layouts/Base.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import type { Locale } from "../i18n"
import type { Tab } from "../model/tabs"
import { renderDoc } from "../test/render"
import Base from "./Base.astro"

function page(path: string, extra: { locale?: Locale; tab?: Tab | null } = {}) {
	return renderDoc(Base, {
		props: { locale: "en", title: "T", description: "D", path, ...extra },
		slots: { default: "<p>content</p>" },
	})
}

describe("main navigation (spec §5, §12)", () => {
	it("puts one Main nav between the header and main", async () => {
		const doc = await page("")
		expect(doc.querySelectorAll('nav[aria-label="Main"]')).toHaveLength(1)
		const order = [...doc.querySelectorAll("body > header, body > nav, body > main, body > footer")]
		expect(order.map((el) => el.tagName)).toEqual(["HEADER", "NAV", "MAIN", "FOOTER"])
	})

	it.each([
		["", "Home"],
		["tracker", "Tracker"],
		["news", "News"],
		["settings", "Settings"],
	])("marks the tab for path %j as %s", async (path, label) => {
		const doc = await page(path)
		const current = doc.querySelectorAll('nav[aria-label="Main"] [aria-current="page"]')
		expect(current).toHaveLength(1)
		expect(current[0].textContent?.trim()).toBe(label)
	})

	it("marks no tab on a guide, or when the page passes tab={null}", async () => {
		for (const doc of [await page("guides/before-you-start"), await page("", { tab: null })]) {
			expect(doc.querySelector('nav[aria-label="Main"] [aria-current]')).toBeNull()
		}
	})

	it("links every tab in the page's language", async () => {
		const doc = await page("", { locale: "no" })
		const links = [...doc.querySelectorAll('nav[aria-label="Hoved"] a')]
		expect(links.map((a) => a.getAttribute("href"))).toEqual([
			"/no/",
			"/no/tracker/",
			"/no/news/",
			"/no/settings/",
		])
		expect(links[3].textContent?.trim()).toBe("Inn­stillinger")
	})

	it("hides every tab icon from assistive tech", async () => {
		const doc = await page("")
		const icons = [...doc.querySelectorAll('nav[aria-label="Main"] svg')]
		expect(icons).toHaveLength(4)
		for (const icon of icons) expect(icon.getAttribute("aria-hidden")).toBe("true")
	})

	it("lets the page reach under the phone's safe area", async () => {
		const doc = await page("")
		expect(doc.querySelector('meta[name="viewport"]')?.getAttribute("content")).toBe(
			"width=device-width, initial-scale=1, viewport-fit=cover"
		)
	})
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `npx vitest run src/layouts/Base.test.ts`
Expected: FAIL. The first test finds 0 `nav[aria-label="Main"]` elements.

- [ ] **Step 8: Write `src/components/TabIcon.astro`**

Paths copied from the approved S2 screen (`.superpowers/brainstorm/7186-1790186160/content/s2-tabs-v2.html`).

```astro
---
import type { Tab } from "../model/tabs"

interface Props {
	name: Tab
}

// Four hand-drawn icons on a 24 px grid, 2 px stroke (spec §5). Decorative: the label names the tab.
const { name } = Astro.props
---

<svg
	class="tab-icon"
	viewBox="0 0 24 24"
	width="24"
	height="24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{
		name === "home" && (
			<>
				<path d="M3 10.5 12 3l9 7.5" />
				<path d="M5.5 9v11h5v-6h3v6h5V9" />
			</>
		)
	}
	{
		name === "tracker" && (
			<>
				<rect x="3.5" y="3.5" width="17" height="17" rx="4" />
				<path d="M8 12.5l3 3 5-6" />
			</>
		)
	}
	{
		name === "news" && (
			<>
				<path d="M4 5h12v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z" />
				<path d="M16 9h4v9a2 2 0 0 1-4 0" />
				<path d="M8 9h4M8 13h4M8 16h2" />
			</>
		)
	}
	{
		name === "settings" && (
			<>
				<path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
				<circle cx="15" cy="7" r="2" />
				<circle cx="9" cy="17" r="2" />
			</>
		)
	}
</svg>
```

- [ ] **Step 9: Write `src/components/TabBar.astro`**

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { type Locale, t } from "../i18n"
import { TAB_PATHS, TABS, type Tab } from "../model/tabs"
import TabIcon from "./TabIcon.astro"

interface Props {
	locale: Locale
	/** The tab to mark with aria-current; null marks none. */
	current: Tab | null
}

// Bottom bar on phones, a text row under the header from 768 px (spec §5). Zero JavaScript.
const { locale, current } = Astro.props
const s = t(locale)
---

<nav class="tabbar" aria-label={s.nav.label}>
	<ul>
		{
			TABS.map((id) => (
				<li>
					<a
						href={getRelativeLocaleUrl(locale, TAB_PATHS[id])}
						aria-current={id === current ? "page" : undefined}
					>
						<TabIcon name={id} />
						<span>{s.nav[id]}</span>
					</a>
				</li>
			))
		}
	</ul>
</nav>
```

- [ ] **Step 10: Wire it into `Base.astro` and the 404**

In `src/layouts/Base.astro`:

1. Add the imports, keeping the existing order style:
   ```ts
   import TabBar from "../components/TabBar.astro"
   ```
   after the `Mark` import, and
   ```ts
   import { currentTab, type Tab } from "../model/tabs"
   ```
   after the `../i18n` import.
2. Extend `Props` and the destructuring:
   ```ts
   	/** Route without the locale prefix: "" for the hub, "guides/before-you-start" for a guide. */
   	path: string
   	/** Overrides the tab `path` implies; `null` marks none (the 404 passes "" but is not Home). */
   	tab?: Tab | null
   }

   const { locale, title, description, path, tab } = Astro.props
   ```
3. Change the viewport meta to:
   ```html
   <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
   ```
4. Directly after `</header>` and before `<main id="main" class="wrap">`:
   ```astro
   <TabBar locale={locale} current={currentTab(path, tab)} />
   ```

In `src/pages/404.astro`, change the `Base` line to:

```astro
<Base locale="en" title={s.notFound.title} description={s.notFound.body} path="" tab={null}>
```

- [ ] **Step 11: Run the markup test to verify it passes**

Run: `npx vitest run src/layouts/Base.test.ts src/model/tabs.test.ts`
Expected: PASS.

- [ ] **Step 12: Add the CSS**

In `src/styles/global.css`:

1. Extend the `html` rule (after `-webkit-text-size-adjust: 100%;`):
   ```css
   	/* The phone tab bar's measured two-line height (spec §5), in rem so it follows the text size. */
   	--tabbar-h: 4.25rem;
   	/* Keeps a focused control from scrolling in behind the fixed bar (WCAG 2.4.11). */
   	scroll-padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
   ```
2. Extend the `body` rule:
   ```css
   	padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom));
   ```
3. After the `img, svg` rule:
   ```css
   /* A class that sets display beats the UA's [hidden]; this keeps hidden meaning hidden (spec §4). */
   [hidden] {
   	display: none !important;
   }
   ```
4. After the `.site-footer p` rule, a new section:
   ```css
   /* Navigation */

   .tabbar {
   	position: fixed;
   	inset-inline: 0;
   	bottom: 0;
   	z-index: 5;
   	padding-bottom: env(safe-area-inset-bottom);
   	background: var(--bg-raised);
   	border-top: 1px solid var(--border);
   }

   .tabbar ul {
   	display: grid;
   	grid-template-columns: repeat(4, 1fr);
   	margin: 0;
   	padding: 0;
   	list-style: none;
   }

   .tabbar li {
   	display: flex;
   	min-width: 0;
   }

   /* No white-space: nowrap here: it would also suppress the soft hyphen in "Inn-stillinger". */
   .tabbar a {
   	position: relative;
   	flex: 1;
   	display: flex;
   	flex-direction: column;
   	align-items: center;
   	justify-content: center;
   	gap: var(--space-1);
   	min-height: 56px;
   	padding: var(--space-1) 2px;
   	color: var(--text-muted);
   	font-size: 0.75rem;
   	font-weight: 500;
   	line-height: 1;
   	text-align: center;
   	text-decoration: none;
   }

   .tabbar .tab-icon {
   	width: 24px;
   	height: 24px;
   	flex: none;
   }

   .tabbar a[aria-current="page"] {
   	color: var(--text);
   }

   .tabbar a[aria-current="page"] .tab-icon {
   	color: var(--accent);
   }

   .tabbar a[aria-current="page"]::before {
   	content: "";
   	position: absolute;
   	top: -1px;
   	left: 50%;
   	width: 32px;
   	height: 2px;
   	margin-left: -16px;
   	border-radius: 0 0 2px 2px;
   	background: var(--accent);
   }
   ```
5. Inside the existing `@media (min-width: 768px)` block, append:
   ```css
   	html {
   		scroll-padding-bottom: 0;
   	}

   	body {
   		padding-bottom: 0;
   	}

   	/* The tab row carries the chrome's bottom edge on desktop. */
   	.site-header {
   		border-bottom: 0;
   	}

   	/* The row's first label starts on the brand's left edge: header padding minus link padding. */
   	.tabbar {
   		position: static;
   		padding: 0 calc(var(--space-4) - 12px);
   		border-top: 0;
   		border-bottom: 1px solid var(--border);
   	}

   	.tabbar ul {
   		display: flex;
   		gap: var(--space-1);
   	}

   	.tabbar .tab-icon {
   		display: none;
   	}

   	.tabbar a {
   		flex-direction: row;
   		min-height: var(--tap);
   		padding: 0 12px;
   		font-size: 0.875rem;
   		line-height: 1.5;
   	}

   	.tabbar a[aria-current="page"]::before {
   		content: none;
   	}

   	.tabbar a[aria-current="page"]::after {
   		content: "";
   		position: absolute;
   		left: 12px;
   		right: 12px;
   		bottom: -1px;
   		height: 2px;
   		background: var(--accent);
   	}
   ```

- [ ] **Step 13: Run the whole suite and the type check**

Run: `npx vitest run` then `npx astro check`
Expected: PASS and 0 errors. The token test still passes: no hex, and `--tabbar-h` is on `html`, not `:root`.

- [ ] **Step 14: Commit**

```bash
npx biome check --write src/model/tabs.ts src/model/tabs.test.ts src/components/TabIcon.astro src/components/TabBar.astro src/test/render.ts src/types/jsdom.d.ts src/layouts/Base.astro src/layouts/Base.test.ts src/pages/404.astro src/styles/global.css
git add src
git commit -m "Add the four-tab navigation bar"
```

---

### Task 3: Back and forward in the installed app

**Files:**
- Create: `src/scripts/history-buttons.ts`, `src/scripts/history-buttons.test.ts`, `src/components/HistoryButtons.astro`
- Modify: `src/layouts/Base.astro`, `src/layouts/Base.test.ts`, `src/styles/global.css`

**Interfaces:**
- Consumes: `s.nav.back`, `s.nav.forward` (Task 1); the `[hidden]` rule (Task 2).
- Produces: `interface HistoryWindow`, `wireHistoryButtons(group: HTMLElement, win: HistoryWindow): void`. Markup hooks: `[data-history]` (group), `[data-history-back]`, `[data-history-forward]`.

- [ ] **Step 1: Write the failing test**

`src/scripts/history-buttons.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { type HistoryWindow, wireHistoryButtons } from "./history-buttons"

interface Options {
	standalone?: boolean
	iosStandalone?: boolean
	navigation?: { canGoBack: boolean; canGoForward: boolean }
}

function setup(options: Options = {}) {
	document.body.innerHTML = `
		<div data-history hidden>
			<button type="button" data-history-back>Back</button>
			<button type="button" data-history-forward>Forward</button>
		</div>`
	const group = document.querySelector("[data-history]") as HTMLElement
	const onPageshow: (() => void)[] = []
	const win: HistoryWindow = {
		matchMedia: (query) => ({
			matches: options.standalone === true && query === "(display-mode: standalone)",
		}),
		navigator: options.iosStandalone === undefined ? {} : { standalone: options.iosStandalone },
		navigation: options.navigation,
		history: { back: vi.fn(), forward: vi.fn() },
		addEventListener: (_type, listener) => {
			onPageshow.push(listener)
		},
	}
	wireHistoryButtons(group, win)
	const [back, forward] = [...group.querySelectorAll("button")]
	const pageshow = () => {
		for (const listener of onPageshow) listener()
	}
	return { group, back, forward, win, pageshow }
}

describe("wireHistoryButtons (spec §4)", () => {
	it("stays hidden in a browser tab", () => {
		expect(setup().group.hidden).toBe(true)
		expect(setup({ iosStandalone: false }).group.hidden).toBe(true)
	})

	it("shows in the installed app and in iOS home-screen mode", () => {
		expect(setup({ standalone: true }).group.hidden).toBe(false)
		expect(setup({ iosStandalone: true }).group.hidden).toBe(false)
	})

	it("disables back and forward from canGoBack and canGoForward", () => {
		const { back, forward } = setup({
			standalone: true,
			navigation: { canGoBack: false, canGoForward: true },
		})
		expect(back.disabled).toBe(true)
		expect(forward.disabled).toBe(false)
	})

	it("reads the state again on pageshow, for pages restored from the back/forward cache", () => {
		const navigation = { canGoBack: true, canGoForward: false }
		const { forward, pageshow } = setup({ standalone: true, navigation })
		expect(forward.disabled).toBe(true)
		navigation.canGoForward = true
		pageshow()
		expect(forward.disabled).toBe(false)
	})

	it("keeps both enabled without the Navigation API and calls history", () => {
		const { back, forward, win } = setup({ standalone: true })
		expect(back.disabled).toBe(false)
		expect(forward.disabled).toBe(false)
		back.click()
		forward.click()
		expect(win.history.back).toHaveBeenCalledOnce()
		expect(win.history.forward).toHaveBeenCalledOnce()
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/scripts/history-buttons.test.ts`
Expected: FAIL, `Failed to resolve import "./history-buttons"`.

- [ ] **Step 3: Write `src/scripts/history-buttons.ts`**

```ts
/** The slice of `window` the history buttons read. `window` satisfies it; the tests pass a fake. */
export interface HistoryWindow {
	matchMedia(query: string): { matches: boolean }
	navigator: { standalone?: boolean }
	navigation?: { canGoBack: boolean; canGoForward: boolean }
	history: { back(): void; forward(): void }
	addEventListener(type: "pageshow", listener: () => void): void
}

/**
 * Reveals back and forward in the installed app only; a browser tab has its own (spec §4). The
 * state comes from the Navigation API where it exists, and without it both stay enabled. It is
 * read again on `pageshow`, because a page restored from the back/forward cache keeps the state it
 * had when it was left. Nothing is stored.
 */
export function wireHistoryButtons(group: HTMLElement, win: HistoryWindow): void {
	const back = group.querySelector<HTMLButtonElement>("[data-history-back]")
	const forward = group.querySelector<HTMLButtonElement>("[data-history-forward]")
	if (!back || !forward) return
	const standalone =
		win.matchMedia("(display-mode: standalone)").matches || win.navigator.standalone === true
	if (!standalone) return

	group.hidden = false
	const update = () => {
		const nav = win.navigation
		back.disabled = nav ? !nav.canGoBack : false
		forward.disabled = nav ? !nav.canGoForward : false
	}
	update()
	win.addEventListener("pageshow", update)
	back.addEventListener("click", () => win.history.back())
	forward.addEventListener("click", () => win.history.forward())
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/scripts/history-buttons.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Write `src/components/HistoryButtons.astro`**

```astro
---
import { type Locale, t } from "../i18n"

interface Props {
	locale: Locale
}

const s = t(Astro.props.locale)
---

<div class="history" data-history hidden>
	<button type="button" data-history-back aria-label={s.nav.back}>
		<svg
			viewBox="0 0 24 24"
			width="24"
			height="24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M15 5l-7 7 7 7"></path>
		</svg>
	</button>
	<button type="button" data-history-forward aria-label={s.nav.forward}>
		<svg
			viewBox="0 0 24 24"
			width="24"
			height="24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M9 5l7 7-7 7"></path>
		</svg>
	</button>
</div>

<script>
	import { wireHistoryButtons } from "../scripts/history-buttons"

	const group = document.querySelector<HTMLElement>("[data-history]")
	if (group) wireHistoryButtons(group, window)
</script>
```

If `npx astro check` rejects `window` as a `HistoryWindow`, the mismatch is in one member; narrow that member's type in the interface to match `lib.dom` rather than casting `window`.

- [ ] **Step 6: Put the buttons in the header, with a failing markup test first**

Append inside the `describe` in `src/layouts/Base.test.ts`:

```ts
	it("ships the history buttons hidden and labelled, before the brand (spec §4)", async () => {
		const doc = await page("", { locale: "no" })
		const group = doc.querySelector("header [data-history]")
		const brand = doc.querySelector("header .brand")
		expect(group?.hasAttribute("hidden")).toBe(true)
		const labels = [...(group?.querySelectorAll("button") ?? [])].map((b) =>
			b.getAttribute("aria-label")
		)
		expect(labels).toEqual(["Tilbake", "Fremover"])
		// 4 = Node.DOCUMENT_POSITION_FOLLOWING: the brand comes after the group.
		expect(brand && group ? group.compareDocumentPosition(brand) & 4 : 0).toBe(4)
	})
```

Run: `npx vitest run src/layouts/Base.test.ts`
Expected: FAIL, `group` is null.

Then in `src/layouts/Base.astro` import it after `Footer`:

```ts
import HistoryButtons from "../components/HistoryButtons.astro"
```

and make it the header's first child:

```astro
		<header class="site-header">
			<HistoryButtons locale={locale} />
			<a class="brand" href={getRelativeLocaleUrl(locale, "")} aria-label="Rookdex">
```

Run: `npx vitest run src/layouts/Base.test.ts`
Expected: PASS.

- [ ] **Step 7: Add the CSS**

In `src/styles/global.css`, change `.site-header`'s `justify-content: space-between;` to `justify-content: flex-start;`, then add after the `.wordmark` rule:

```css
/* Back, forward, mark, wordmark, flexible space, language (spec §4). */
.site-header .lang {
	margin-inline-start: auto;
}

.history {
	display: flex;
}

.history button {
	display: inline-grid;
	place-items: center;
	width: var(--tap);
	height: var(--tap);
	padding: 0;
	border: 0;
	border-radius: var(--radius);
	background: transparent;
	color: var(--text);
	cursor: pointer;
}

.history button:hover:not(:disabled) {
	background: color-mix(in srgb, var(--text) 9%, var(--bg));
}

/* Dimmed but kept in place, so the mark never shifts when history runs out. */
.history button:disabled {
	opacity: 0.45;
	color: var(--text-muted);
	cursor: default;
}

.history svg {
	width: 24px;
	height: 24px;
}

/*
 * The one max-width query: the wordmark hides only when phone width and the installed app's history
 * buttons coincide (spec §4, measured). Visually hidden, not removed, so the brand keeps its name.
 */
@media (max-width: 767px) and (display-mode: standalone) {
	.site-header .wordmark {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
}
```

- [ ] **Step 8: Run the whole suite and the type check**

Run: `npx vitest run` then `npx astro check`
Expected: PASS and 0 errors.

- [ ] **Step 9: Commit**

```bash
npx biome check --write src/scripts/history-buttons.ts src/scripts/history-buttons.test.ts src/components/HistoryButtons.astro src/layouts/Base.astro src/layouts/Base.test.ts src/styles/global.css
git add src
git commit -m "Add back and forward buttons to the installed app's header"
```

---

### Task 4: The language dropdown

**Files:**
- Create: `src/scripts/language-menu.ts`, `src/scripts/language-menu.test.ts`, `src/components/LanguageSwitch.test.ts`
- Modify: `src/components/LanguageSwitch.astro` (rewrite), `src/i18n/en.ts`, `src/i18n/no.ts`, `src/styles/global.css`

**Interfaces:**
- Consumes: `renderDoc` (Task 2); the `.visually-hidden` utility (`global.css`).
- Produces: `wireLanguageMenu(details: HTMLDetailsElement, doc: Document): () => void` (returns a cleanup). Copy: `languageSwitch` changes from a string to `{ label: string; current: string }`.

- [ ] **Step 1: Write the failing behaviour test**

`src/scripts/language-menu.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { wireLanguageMenu } from "./language-menu"

let cleanup: (() => void) | undefined
afterEach(() => cleanup?.())

function setup() {
	document.body.innerHTML = `
		<button type="button" id="outside">Outside</button>
		<nav>
			<details data-language-menu>
				<summary>EN</summary>
				<ul>
					<li><a href="/en/" aria-current="page">English</a></li>
					<li><a href="/no/">Norsk</a></li>
				</ul>
			</details>
		</nav>`
	const details = document.querySelector("details") as HTMLDetailsElement
	cleanup = wireLanguageMenu(details, document)
	const summary = details.querySelector("summary") as HTMLElement
	const [english, norsk] = [...details.querySelectorAll("a")]
	const outside = document.getElementById("outside") as HTMLButtonElement
	return { details, summary, english, norsk, outside }
}

function open(details: HTMLDetailsElement) {
	details.open = true
	details.dispatchEvent(new Event("toggle"))
}

function press(target: Element, key: string) {
	target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))
}

describe("wireLanguageMenu (spec §6)", () => {
	it("moves focus to the current language when it opens", () => {
		const { details, english } = setup()
		open(details)
		expect(document.activeElement).toBe(english)
	})

	it("closes on Escape and returns focus to the button", () => {
		const { details, summary, english } = setup()
		open(details)
		press(english, "Escape")
		expect(details.open).toBe(false)
		expect(document.activeElement).toBe(summary)
	})

	it("moves between links with the arrow keys, wrapping at the ends", () => {
		const { details, english, norsk } = setup()
		open(details)
		press(english, "ArrowDown")
		expect(document.activeElement).toBe(norsk)
		press(norsk, "ArrowDown")
		expect(document.activeElement).toBe(english)
		press(english, "ArrowUp")
		expect(document.activeElement).toBe(norsk)
	})

	it("closes on a tap outside, not on one inside", () => {
		const { details, outside } = setup()
		open(details)
		// A click on the panel itself (not the summary, which toggles natively, nor a link, which navigates).
		details.querySelector("ul")?.dispatchEvent(new MouseEvent("click", { bubbles: true }))
		expect(details.open).toBe(true)
		outside.click()
		expect(details.open).toBe(false)
	})

	it("closes when focus leaves the menu, not when it moves inside", () => {
		const { details, english, norsk, outside } = setup()
		open(details)
		english.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: norsk }))
		expect(details.open).toBe(true)
		norsk.dispatchEvent(new FocusEvent("focusout", { bubbles: true, relatedTarget: outside }))
		expect(details.open).toBe(false)
	})

	it("ignores keys while closed", () => {
		const { details, summary } = setup()
		summary.focus()
		press(summary, "ArrowDown")
		expect(document.activeElement).toBe(summary)
		expect(details.open).toBe(false)
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/scripts/language-menu.test.ts`
Expected: FAIL, `Failed to resolve import "./language-menu"`.

- [ ] **Step 3: Write `src/scripts/language-menu.ts`**

```ts
/**
 * Keyboard and pointer polish for the language <details> (spec §6). Without it the disclosure
 * still opens and closes; with it, Escape, a tap outside and focus leaving all close the panel,
 * the arrow keys move between links, and opening focuses the current language.
 */
export function wireLanguageMenu(details: HTMLDetailsElement, doc: Document): () => void {
	const summary = details.querySelector("summary")
	const links = () => [...details.querySelectorAll<HTMLAnchorElement>("ul a")]

	const close = (refocus: boolean) => {
		if (!details.open) return
		details.open = false
		if (refocus) summary?.focus()
	}

	const onToggle = () => {
		if (!details.open) return
		const current = details.querySelector<HTMLAnchorElement>('ul a[aria-current="page"]')
		const target = current ?? links()[0]
		target?.focus()
	}

	const onKeydown = (event: KeyboardEvent) => {
		if (!details.open) return
		if (event.key === "Escape") {
			event.preventDefault()
			close(true)
			return
		}
		if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
		event.preventDefault()
		const list = links()
		const step = event.key === "ArrowDown" ? 1 : -1
		const at = list.indexOf(doc.activeElement as HTMLAnchorElement)
		const next = at === -1 ? (step === 1 ? 0 : list.length - 1) : (at + step + list.length) % list.length
		list[next]?.focus()
	}

	const onDocumentClick = (event: MouseEvent) => {
		if (!details.contains(event.target as Node)) close(false)
	}

	// A null relatedTarget (the window lost focus) is left to the outside-click handler.
	const onFocusout = (event: FocusEvent) => {
		const to = event.relatedTarget as Node | null
		if (to && !details.contains(to)) close(false)
	}

	details.addEventListener("toggle", onToggle)
	details.addEventListener("keydown", onKeydown)
	details.addEventListener("focusout", onFocusout)
	doc.addEventListener("click", onDocumentClick)
	return () => {
		details.removeEventListener("toggle", onToggle)
		details.removeEventListener("keydown", onKeydown)
		details.removeEventListener("focusout", onFocusout)
		doc.removeEventListener("click", onDocumentClick)
	}
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/scripts/language-menu.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Change the copy**

`src/i18n/en.ts`: replace `languageSwitch: "Language",` with

```ts
	languageSwitch: { label: "Language", current: "Language: English" },
```

`src/i18n/no.ts`: replace `languageSwitch: "Språk",` with

```ts
	languageSwitch: { label: "Språk", current: "Språk: norsk" },
```

- [ ] **Step 6: Write the failing markup test**

`src/components/LanguageSwitch.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import LanguageSwitch from "./LanguageSwitch.astro"

describe("language picker markup (spec §6)", () => {
	it("is a labelled nav holding a details disclosure, with no menu roles", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "no", path: "tracker" } })
		expect(doc.querySelector('nav[aria-label="Språk"] > details > summary')).not.toBeNull()
		expect(doc.querySelector('[role="menu"], [role="menuitem"]')).toBeNull()
	})

	it("names the button with the visible code and the full language", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "en", path: "" } })
		const name = doc.querySelector("summary")?.textContent?.replace(/\s+/g, " ").trim()
		expect(name).toBe("EN Language: English")
	})

	it("links the same page in each language and marks the current one", async () => {
		const doc = await renderDoc(LanguageSwitch, { props: { locale: "no", path: "tracker" } })
		const links = [...doc.querySelectorAll("details a")].map((a) => [
			a.getAttribute("href"),
			a.getAttribute("hreflang"),
			a.getAttribute("lang"),
		])
		expect(links).toEqual([
			["/en/tracker/", "en", "en"],
			["/no/tracker/", "no", "no"],
		])
		const current = doc.querySelectorAll('details a[aria-current="page"]')
		expect(current).toHaveLength(1)
		expect(current[0].textContent?.trim()).toBe("Norsk")
	})
})
```

Run: `npx vitest run src/components/LanguageSwitch.test.ts`
Expected: FAIL, no `details` in the rendered nav.

- [ ] **Step 7: Rewrite `src/components/LanguageSwitch.astro`**

Globe, chevron and check paths come from the approved S3 screen.

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { type Locale, locales, t } from "../i18n"

interface Props {
	locale: Locale
	path: string
}

// A disclosure of plain links, not an ARIA menu (spec §6). The URL is the language; nothing is stored.
const { locale, path } = Astro.props
const s = t(locale)
---

<nav class="lang" aria-label={s.languageSwitch.label}>
	<details data-language-menu>
		<summary>
			<svg
				class="lang-globe"
				viewBox="0 0 24 24"
				width="18"
				height="18"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="9"></circle>
				<path d="M3 12h18"></path>
				<path d="M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z"></path>
			</svg>
			<span>{locale.toUpperCase()}</span>
			<span class="visually-hidden">{s.languageSwitch.current}</span>
			<svg
				class="lang-chevron"
				viewBox="0 0 24 24"
				width="16"
				height="16"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M6 9l6 6 6-6"></path>
			</svg>
		</summary>
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
							<span>{s.languageNames[l]}</span>
							{l === locale && (
								<svg
									class="lang-check"
									viewBox="0 0 24 24"
									width="16"
									height="16"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path d="M5 12.5l4.5 4.5L19 7.5" />
								</svg>
							)}
						</a>
					</li>
				))
			}
		</ul>
	</details>
</nav>

<script>
	import { wireLanguageMenu } from "../scripts/language-menu"

	const details = document.querySelector<HTMLDetailsElement>("[data-language-menu]")
	if (details) wireLanguageMenu(details, document)
</script>
```

- [ ] **Step 8: Run the markup test to verify it passes**

Run: `npx vitest run src/components/LanguageSwitch.test.ts src/layouts/Base.test.ts`
Expected: PASS. If the name test reads `ENLanguage: English`, Astro dropped the whitespace between the two spans, and a screen reader would run the words together too: put `{" "}` between the `<span>` elements and run it again.

- [ ] **Step 9: Replace the `.lang` CSS**

In `src/styles/global.css`, delete the three rules `.lang ul`, `.lang a` and `.lang a[aria-current="page"]`, and put this in their place:

```css
.lang details {
	position: relative;
}

.lang summary {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	min-height: var(--tap);
	padding: 0 8px 0 10px;
	border: 1px solid var(--border);
	border-radius: var(--radius);
	color: var(--text);
	font-size: 0.875rem;
	font-weight: 500;
	line-height: 1;
	list-style: none;
	cursor: pointer;
}

.lang summary::-webkit-details-marker {
	display: none;
}

.lang details[open] > summary {
	border-color: color-mix(in srgb, var(--text) 24%, var(--bg));
	background: color-mix(in srgb, var(--text) 9%, var(--bg));
}

.lang-globe,
.lang-chevron {
	flex: none;
	color: var(--text-muted);
}

.lang ul {
	position: absolute;
	top: calc(100% + var(--space-1));
	right: 0;
	z-index: 20;
	min-width: 176px;
	margin: 0;
	padding: var(--space-1);
	list-style: none;
	background: var(--bg-raised);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	box-shadow: 0 8px 24px color-mix(in srgb, var(--bg) 60%, transparent);
}

.lang a {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-2);
	min-height: var(--tap);
	padding: 0 12px;
	border-radius: 6px;
	color: var(--text);
	font-size: 0.875rem;
	text-decoration: none;
}

.lang a:hover,
.lang a[aria-current="page"] {
	background: color-mix(in srgb, var(--text) 9%, var(--bg));
}

.lang-check {
	flex: none;
	color: var(--accent);
}
```

- [ ] **Step 10: Run the whole suite and the type check**

Run: `npx vitest run` then `npx astro check`
Expected: PASS and 0 errors (the check proves no other file still reads `languageSwitch` as a string).

- [ ] **Step 11: Commit**

```bash
npx biome check --write src/scripts/language-menu.ts src/scripts/language-menu.test.ts src/components/LanguageSwitch.astro src/components/LanguageSwitch.test.ts src/i18n/en.ts src/i18n/no.ts src/styles/global.css
git add src
git commit -m "Turn the language switch into a dropdown"
```

---

### Task 5: Outlet names, the duplicate-outlet rule and the quiet sources line

**Files:**
- Create: `src/model/outlet.ts`, `src/model/outlet.test.ts`, `src/components/Sources.astro`, `src/components/Sources.test.ts`
- Modify: `src/model/seed.ts`, `src/model/seed.test.ts`, `src/model/guides.ts`, `src/model/guides.test.ts`, `src/content.config.ts`, `src/pages/[locale]/guides/[slug].astro`

**Interfaces:**
- Consumes: `renderDoc` (Task 2).
- Produces: `normalizeHost(host: string): string`, `outletOf(url: string): string`, `duplicateOutlet(urls: string[]): string | undefined` from `src/model/outlet.ts` (Task 6's News page imports `outletOf` from here); `guideSchema` from `src/model/guides.ts`; `<Sources urls={string[]} label={string} />`.

- [ ] **Step 1: Write the failing outlet test**

Cut the whole `describe("outletOf", …)` block out of `src/model/seed.test.ts` (it starts at line 176) and remove `outletOf,` from that file's import list. Create `src/model/outlet.test.ts` with that block pasted in unchanged, under this header, followed by the new tests:

```ts
import { describe, expect, it } from "vitest"
import { duplicateOutlet, outletOf } from "./outlet"

// (the describe("outletOf", …) block moved from seed.test.ts goes here, unchanged)

describe("duplicateOutlet (spec §9)", () => {
	it("is undefined when every source is from a different outlet", () => {
		expect(
			duplicateOutlet(["https://www.rockstargames.com/VI", "https://www.ign.com/articles/x"])
		).toBeUndefined()
	})

	it("names the first outlet cited twice, ignoring www. and case", () => {
		expect(
			duplicateOutlet(["https://www.IGN.com/articles/a", "https://ign.com/articles/b"])
		).toBe("ign.com")
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/model/outlet.test.ts`
Expected: FAIL, `Failed to resolve import "./outlet"`.

- [ ] **Step 3: Write `src/model/outlet.ts` and point `seed.ts` at it**

```ts
// Outlet names for source links. Its own module so the content config can use it without loading
// the allowlist that seed.ts parses at import.

export function normalizeHost(host: string): string {
	return host.toLowerCase().replace(/^www\./, "")
}

/** Host without `www.`: the name a source link shows. */
export function outletOf(urlString: string): string {
	return normalizeHost(new URL(urlString).hostname)
}

/** The first outlet cited twice in `urls`, or undefined when every outlet appears once. */
export function duplicateOutlet(urls: string[]): string | undefined {
	const seen = new Set<string>()
	for (const url of urls) {
		const outlet = outletOf(url)
		if (seen.has(outlet)) return outlet
		seen.add(outlet)
	}
	return undefined
}
```

In `src/model/seed.ts`, delete the local `normalizeHost` function and the `outletOf` function with its doc comment, and add after the `allowlistJson` import:

```ts
import { normalizeHost } from "./outlet"
```

- [ ] **Step 4: Run the model tests to verify they pass**

Run: `npx vitest run src/model`
Expected: PASS, with `seed.test.ts` still green without its `outletOf` block.

- [ ] **Step 5: Write the failing schema test**

Append to `src/model/guides.test.ts` (add `guideSchema` to its existing `./guides` import):

```ts
describe("guideSchema (spec §9)", () => {
	const guide = { title: "T", summary: "S", updated: "2026-09-23" }

	it("accepts one page per outlet", () => {
		const result = guideSchema.safeParse({
			...guide,
			sources: ["https://www.rockstargames.com/VI", "https://www.ign.com/articles/x"],
		})
		expect(result.success).toBe(true)
	})

	it("defaults to no sources", () => {
		expect(guideSchema.parse(guide).sources).toEqual([])
	})

	it("fails a guide that cites one outlet twice, naming the outlet", () => {
		const result = guideSchema.safeParse({
			...guide,
			sources: ["https://www.ign.com/articles/a", "https://ign.com/articles/b"],
		})
		expect(result.success).toBe(false)
		expect(result.error?.issues[0]?.message).toContain("ign.com")
	})
})
```

Run: `npx vitest run src/model/guides.test.ts`
Expected: FAIL, `guideSchema` is undefined.

- [ ] **Step 6: Move the schema into `guides.ts` and use it in the content config**

At the top of `src/model/guides.ts`, below the file comment:

```ts
import { z } from "astro/zod"
import { duplicateOutlet } from "./outlet"

/**
 * Guide frontmatter. One page per outlet: two links showing the same domain to different pages fail
 * WCAG 2.4.4, and one best page per outlet is the better citation anyway (spec §9). Astro names the
 * guide when the build fails.
 */
export const guideSchema = z.object({
	title: z.string(),
	summary: z.string(),
	updated: z.coerce.date(),
	sources: z
		.array(z.string().url())
		.default([])
		.superRefine((urls, ctx) => {
			const outlet = duplicateOutlet(urls)
			if (outlet) {
				ctx.addIssue({
					code: "custom",
					message: `two sources from ${outlet}; cite one page per outlet`,
				})
			}
		}),
})
```

Replace `src/content.config.ts` with:

```ts
import { defineCollection } from "astro:content"
import { glob } from "astro/loaders"
import { guideSchema } from "./model/guides"

// Entry ids follow the file path: "en/before-you-start", "no/before-you-start".
const guides = defineCollection({
	loader: glob({ base: "./src/content/guides", pattern: "**/*.md" }),
	schema: guideSchema,
})

export const collections = { guides }
```

Run: `npx vitest run src/model/guides.test.ts`
Expected: PASS.

- [ ] **Step 7: Write the failing sources markup test**

`src/components/Sources.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import Sources from "./Sources.astro"

describe("guide sources (spec §9)", () => {
	it("is a section labelled by its h2, each link showing its outlet", async () => {
		const doc = await renderDoc(Sources, {
			props: {
				urls: ["https://www.rockstargames.com/VI", "https://www.ign.com/articles/x"],
				label: "Kilder",
			},
		})
		const section = doc.querySelector("section")
		const heading = doc.getElementById(section?.getAttribute("aria-labelledby") ?? "")
		expect(heading?.tagName).toBe("H2")
		expect(heading?.textContent).toBe("Kilder")
		const links = [...doc.querySelectorAll("section a")].map((a) => [
			a.textContent?.trim(),
			a.getAttribute("href"),
			a.getAttribute("rel"),
		])
		expect(links).toEqual([
			["rockstargames.com", "https://www.rockstargames.com/VI", "noopener"],
			["ign.com", "https://www.ign.com/articles/x", "noopener"],
		])
	})

	it("renders nothing for a guide without sources", async () => {
		const doc = await renderDoc(Sources, { props: { urls: [], label: "Sources" } })
		expect(doc.querySelector("section")).toBeNull()
	})
})
```

Run: `npx vitest run src/components/Sources.test.ts`
Expected: FAIL, `Failed to resolve import "./Sources.astro"`.

- [ ] **Step 8: Write `src/components/Sources.astro`**

```astro
---
import { outletOf } from "../model/outlet"

interface Props {
	urls: string[]
	label: string
}

// A quiet line under the guide: the label and the outlet links flow like one sentence (spec §9).
// The <h2> stays a real heading, because the section is labelled by it; only its look shrinks.
const { urls, label } = Astro.props
---

{
	urls.length > 0 && (
		<section class="sources" aria-labelledby="sources">
			<h2 id="sources">{label}</h2>
			<ul>
				{urls.map((url) => (
					<li>
						<a href={url} rel="noopener">
							{outletOf(url)}
						</a>
					</li>
				))}
			</ul>
		</section>
	)
}

<style>
	/* 44 px lines give every link its tap height without padding. */
	.sources {
		margin-top: var(--space-4);
		font-size: 0.75rem;
		line-height: 44px;
	}

	.sources h2 {
		display: inline;
		margin: 0 var(--space-2) 0 0;
		font-family: var(--font-sans);
		font-size: 0.75rem;
		font-weight: 500;
		line-height: inherit;
		color: var(--text-muted);
	}

	.sources ul,
	.sources li {
		display: inline;
		margin: 0;
		padding: 0;
	}

	.sources li + li::before {
		content: "·";
		margin-inline: var(--space-2);
		color: var(--text-muted);
	}

	.sources a {
		white-space: nowrap;
		text-decoration-color: color-mix(in srgb, var(--link) 40%, transparent);
	}

	.sources a:hover,
	.sources a:focus-visible {
		text-decoration-color: var(--link);
	}
</style>
```

- [ ] **Step 9: Use it in the guide page**

In `src/pages/[locale]/guides/[slug].astro`, add `import Sources from "../../../components/Sources.astro"` to the imports, and replace the whole `{ entry.data.sources.length > 0 && ( <section …> … </section> ) }` expression with:

```astro
		<Sources urls={entry.data.sources} label={s.guides.sources} />
```

- [ ] **Step 10: Run the whole suite, the type check and a build**

Run: `npx vitest run`, then `npx astro check`, then `npm run build`
Expected: PASS, 0 errors, and a green build (today's guide cites one outlet, so the new rule passes).

- [ ] **Step 11: Commit**

```bash
npx biome check --write src/model/outlet.ts src/model/outlet.test.ts src/model/seed.ts src/model/seed.test.ts src/model/guides.ts src/model/guides.test.ts src/content.config.ts src/components/Sources.astro src/components/Sources.test.ts "src/pages/[locale]/guides/[slug].astro"
git add src
git commit -m "Show guide sources as one quiet line and reject duplicate outlets"
```

---

### Task 6: The News page, the 301 and the end of the rumours page

**Files:**
- Create: `src/pages/[locale]/news.astro`, `src/test/redirects.test.ts`, `src/test/news-page.test.ts`
- Delete: `src/pages/[locale]/tracker/rumours.astro`
- Modify: `public/_redirects`, `src/pages/[locale]/tracker/index.astro`, `src/islands/Tracker.tsx`, `src/islands/tracker/CategoryNav.tsx`, `src/islands/Tracker.test.tsx`, `src/islands/Tracker.import.test.tsx`, `src/islands/Tracker.profiles.test.tsx`, `src/i18n/en.ts`, `src/i18n/no.ts`, `src/styles/global.css`

**Interfaces:**
- Consumes: `s.news.*` (Task 1), `outletOf` from `src/model/outlet.ts` (Task 5), `renderDoc` (Task 2).
- Produces: route `/{locale}/news/`. Removes the `Tracker` island's `rumoursHref` prop and `CategoryNav`'s `rumoursHref` / `rumoursLabel` props.

- [ ] **Step 1: Write the failing redirect test**

`src/test/redirects.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const lines = readFileSync(new URL("../../public/_redirects", import.meta.url), "utf8")
	.split(/\r?\n/)
	.map((line) => line.trim())
	.filter(Boolean)

describe("_redirects (spec §3)", () => {
	it("moves the old rumours pages to News with a 301, above the root redirect", () => {
		const root = lines.indexOf("/ /en/ 302")
		expect(root).toBeGreaterThanOrEqual(0)
		for (const locale of ["en", "no"]) {
			const line = lines.indexOf(`/${locale}/tracker/rumours/ /${locale}/news/ 301`)
			expect(line, locale).toBeGreaterThanOrEqual(0)
			expect(line, locale).toBeLessThan(root)
		}
	})
})
```

Run: `npx vitest run src/test/redirects.test.ts`
Expected: FAIL, the `en` line is not found.

- [ ] **Step 2: Add the redirects**

Replace `public/_redirects` with:

```
/en/tracker/rumours/ /en/news/ 301
/no/tracker/rumours/ /no/news/ 301
/ /en/ 302
```

Run: `npx vitest run src/test/redirects.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing News page test**

`src/test/news-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { rumours } from "../model/seed"
import News from "../pages/[locale]/news.astro"
import { renderDoc } from "./render"

describe("News page (spec §8)", () => {
	it("is the News tab, with Rumours as its first section", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector("h1")?.textContent).toBe("News")
		expect(doc.querySelector("main h2")?.textContent).toBe("Rumours")
		expect(
			doc.querySelector('nav[aria-label="Main"] [aria-current="page"]')?.textContent?.trim()
		).toBe("News")
	})

	it("lists each rumour under an h3, or the empty state", async () => {
		const doc = await renderDoc(News, { params: { locale: "no" } })
		const names = [...doc.querySelectorAll(".rumour-list h3")].map((h) => h.textContent)
		if (rumours.length === 0) expect(doc.querySelector("main")?.textContent).toContain("Ingen rykter")
		else expect(names).toEqual(rumours.map((r) => r.name))
	})

	it("drops the old link back to the tracker", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		expect(doc.querySelector('main a[href="/en/tracker/"]')).toBeNull()
	})
})
```

Run: `npx vitest run src/test/news-page.test.ts`
Expected: FAIL, the import of `news.astro` does not resolve.

- [ ] **Step 4: Write `src/pages/[locale]/news.astro` and delete the rumours page**

```astro
---
import { fill, isLocale, type Locale, locales, t } from "../../i18n"
import Base from "../../layouts/Base.astro"
import { outletOf } from "../../model/outlet"
import { rumours } from "../../model/seed"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale } }))
}

// The News tab (spec §8). Rumours are its first section; phase 1c adds the facts feed above them.
const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const s = t(locale as Locale)
---

<Base locale={locale} title={s.news.title} description={s.news.description} path="news">
	<article class="news">
		<h1>{s.news.title}</h1>
		<p class="tagline">{s.rumours.intro}</p>
		<section aria-labelledby="rumours">
			<h2 id="rumours">{s.rumours.title}</h2>
			{
				rumours.length === 0 ? (
					<p>{s.rumours.empty}</p>
				) : (
					<ul class="rumour-list">
						{rumours.map((rumour) => {
							const press =
								rumour.sources.find((source) => source.tier === "press") ?? rumour.sources[0]
							return (
								<li>
									<h3>{rumour.name}</h3>
									<p class="summary">{rumour.summary}</p>
									<p class="meta">
										<a href={press.url} rel="noopener noreferrer">
											{fill(s.rumours.reportedBy, { outlet: outletOf(press.url) })}
										</a>
									</p>
								</li>
							)
						})}
					</ul>
				)
			}
		</section>
	</article>
</Base>
```

```bash
git rm "src/pages/[locale]/tracker/rumours.astro"
```

Run: `npx vitest run src/test/news-page.test.ts`
Expected: PASS.

- [ ] **Step 5: Remove the rumours link from the Tracker, test first**

In `src/islands/Tracker.test.tsx`, replace the `it("links to Rumours", …)` test with:

```ts
	it("has no Rumours link now that News is a tab", async () => {
		await ready()
		expect(screen.queryByRole("link", { name: "Rumours" })).toBeNull()
	})
```

Run: `npx vitest run src/islands/Tracker.test.tsx`
Expected: FAIL, the link is still rendered.

Then:

1. In `Tracker.test.tsx`, `Tracker.import.test.tsx` and `Tracker.profiles.test.tsx`, remove ` rumoursHref="/en/tracker/rumours/"` from every `<Tracker … />`.
2. In `src/islands/Tracker.tsx`: remove `rumoursHref: string` from `Props`, change the signature to `export function Tracker({ locale }: Props) {`, and delete the two `CategoryNav` props `rumoursHref={rumoursHref}` and `rumoursLabel={s.tracker.rumours}`.
3. In `src/islands/tracker/CategoryNav.tsx`: remove `rumoursHref` and `rumoursLabel` from `Props` and from the destructuring, and delete the `<a className="rumours-link" …>…</a>` element.
4. In `src/pages/[locale]/tracker/index.astro`: delete the `getRelativeLocaleUrl` import and render the island as `<Tracker client:only="react" locale={locale} />`.

Run: `npx vitest run src/islands`
Expected: PASS.

- [ ] **Step 6: Remove the dead copy and CSS**

- `en.ts` and `no.ts`: delete `tracker.rumours`, `rumours.description` and `rumours.backToTracker`.
- `global.css`: delete the `.rumours-link` rule. Replace the `.rumour-list li` and `.rumour-list h2` rules with:

```css
.rumour-list li {
	padding: 0.75rem 0;
	border-bottom: 1px solid var(--border);
}

.rumour-list h3 {
	margin-bottom: var(--space-1);
	font-size: 1.0625rem;
	font-weight: 700;
}

.rumour-list .summary {
	margin-bottom: 0;
	color: var(--text-muted);
	font-size: 0.875rem;
}
```

- [ ] **Step 7: Run the whole suite, the type check and a build**

Run: `npx vitest run`, then `npx astro check`, then `npm run build`, then `ls dist/en/news/index.html dist/no/news/index.html && test ! -e dist/en/tracker/rumours && echo "old page gone"`
Expected: PASS, 0 errors (the check proves nothing still reads the removed keys), both News files listed, and `old page gone`.

- [ ] **Step 8: Commit**

```bash
npx biome check --write "src/pages/[locale]/news.astro" "src/pages/[locale]/tracker/index.astro" src/test/redirects.test.ts src/test/news-page.test.ts src/islands/Tracker.tsx src/islands/tracker/CategoryNav.tsx src/islands/Tracker.test.tsx src/islands/Tracker.import.test.tsx src/islands/Tracker.profiles.test.tsx src/i18n/en.ts src/i18n/no.ts src/styles/global.css
git add -A src public/_redirects
git commit -m "Move rumours to the News tab and redirect the old URL"
```

---

### Task 7: The label/value footer

**Files:**
- Create: `src/components/Footer.test.ts`
- Modify: `src/components/Footer.astro`, `src/i18n/en.ts`, `src/i18n/no.ts`, `src/styles/global.css`

**Interfaces:**
- Consumes: `s.footer.{legalLabel, codeLicenceLabel, codeLicence, guideLicenceLabel, guideLicence, sourceLabel}` (Task 1), `renderDoc` (Task 2).
- Produces: `s.footer.source` now reads "GitHub"; `s.footer.contact` and `s.footer.licence` are gone.

- [ ] **Step 1: Write the failing test**

`src/components/Footer.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { t } from "../i18n"
import { renderDoc } from "../test/render"
import Footer from "./Footer.astro"

describe.each(["en", "no"] as const)("footer in %s (spec §10)", (locale) => {
	it("has the disclaimer as its one sentence, then four label/value pairs", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		expect(doc.querySelectorAll("footer > p")).toHaveLength(1)
		expect(doc.querySelector("footer > p")?.textContent).toBe(t(locale).footer.disclaimer)
		const pairs = [...doc.querySelectorAll("footer > dl > div")]
		expect(pairs).toHaveLength(4)
		for (const pair of pairs) {
			expect(pair.querySelectorAll(":scope > dt")).toHaveLength(1)
			expect(pair.querySelectorAll(":scope > dd")).toHaveLength(1)
		}
	})
})

describe("footer values (spec §10)", () => {
	it("labels the pairs in Norwegian and links the legal address and the code", async () => {
		const doc = await renderDoc(Footer, { props: { locale: "no" } })
		expect([...doc.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual([
			"Fjerning og juridisk",
			"Kodelisens",
			"Guidelisens",
			"Kildekode",
		])
		expect([...doc.querySelectorAll("dd")].map((dd) => dd.textContent?.trim())).toEqual([
			"legal@rookdex.app",
			"MIT",
			"CC BY-SA 4.0",
			"GitHub",
		])
		expect([...doc.querySelectorAll("dd a")].map((a) => a.getAttribute("href"))).toEqual([
			"mailto:legal@rookdex.app",
			"https://github.com/rookdex/rookdex",
		])
	})
})
```

Run: `npx vitest run src/components/Footer.test.ts`
Expected: FAIL, 0 pairs.

- [ ] **Step 2: Rewrite `src/components/Footer.astro`**

```astro
---
import { type Locale, t } from "../i18n"

interface Props {
	locale: Locale
}

// The disclaimer is the only sentence; the rest are label/value pairs in an even grid (spec §10).
const { locale } = Astro.props
const s = t(locale)
---

<footer class="site-footer">
	<p>{s.footer.disclaimer}</p>
	<dl class="footer-pairs">
		<div>
			<dt>{s.footer.legalLabel}</dt>
			<dd><a href="mailto:legal@rookdex.app">legal@rookdex.app</a></dd>
		</div>
		<div>
			<dt>{s.footer.codeLicenceLabel}</dt>
			<dd>{s.footer.codeLicence}</dd>
		</div>
		<div>
			<dt>{s.footer.guideLicenceLabel}</dt>
			<dd>{s.footer.guideLicence}</dd>
		</div>
		<div>
			<dt>{s.footer.sourceLabel}</dt>
			<dd><a href="https://github.com/rookdex/rookdex">{s.footer.source}</a></dd>
		</div>
	</dl>
</footer>
```

- [ ] **Step 3: Change the copy**

In both `en.ts` and `no.ts`: delete `footer.contact` and `footer.licence`, and set `source: "GitHub",`.

- [ ] **Step 4: Add the CSS**

In `src/styles/global.css`, after the `.site-footer p` rule:

```css
/* A hairline under the disclaimer, then pairs: 2 × 2 on a phone, four across from about 720 px. */
.footer-pairs {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
	gap: var(--space-3) var(--space-4);
	margin: 0;
	padding-top: var(--space-3);
	border-top: 1px solid var(--border);
}

.footer-pairs dt {
	color: var(--text-muted);
	font-size: 0.75rem;
	font-weight: 500;
}

/* Flex and a fixed minimum put link and text values on one baseline (measured 0.9 px off without). */
.footer-pairs dd {
	display: flex;
	align-items: center;
	min-height: 20px;
	margin: 0;
	color: var(--text);
	font-size: 0.8125rem;
}

/* 44 px tap area; the negative margins keep it from stretching the row. */
.footer-pairs a {
	display: inline-flex;
	align-items: center;
	min-height: var(--tap);
	margin-block: -12px;
}
```

- [ ] **Step 5: Run the whole suite and the type check**

Run: `npx vitest run` then `npx astro check`
Expected: PASS, and 0 errors (no file reads `footer.contact` or `footer.licence` any more).

- [ ] **Step 6: Commit**

```bash
npx biome check --write src/components/Footer.astro src/components/Footer.test.ts src/i18n/en.ts src/i18n/no.ts src/styles/global.css
git add src
git commit -m "Lay the footer out as label and value pairs"
```

---

### Task 8: The Tracker's `closed` state when another tab deletes the data

**Files:**
- Modify: `src/model/store.ts`, `src/model/store.test.ts`, `src/model/tracker.ts`, `src/model/tracker.test.ts`

**Interfaces:**
- Consumes: `s.tracker.errors.closed` (Task 1).
- Produces: `Store.onClosed(callback: () => void): void`; `TrackerError` gains `"closed"`.

- [ ] **Step 1: Write the failing store test**

Append inside `describe("openStore", …)` in `src/model/store.test.ts`:

```ts
	it("calls onClosed after another connection deletes the database (spec §7.2)", async () => {
		const factory = new IDBFactory()
		const store = await openStore(factory)
		const onClosed = vi.fn()
		store.onClosed(onClosed)
		await new Promise((resolve) => {
			factory.deleteDatabase(DB_NAME).onsuccess = resolve
		})
		expect(onClosed).toHaveBeenCalledOnce()
	})
```

Run: `npx vitest run src/model/store.test.ts`
Expected: FAIL, `store.onClosed is not a function`.

- [ ] **Step 2: Add `onClosed` to the store**

In `src/model/store.ts`, add to the `Store` interface after `onFirstWrite`:

```ts
	/** Called after the connection closes because another tab deleted or upgraded the database. */
	onClosed(callback: () => void): void
```

In `wrap`, add `let closed: (() => void) | undefined` beside `firstWrite`, and replace the `onversionchange` line and its comment with:

```ts
	// Another tab deleting or upgrading the database would otherwise block behind this connection.
	// After closing, the tracker hears about it and stops writing (spec §7.2).
	db.onversionchange = () => {
		db.close()
		closed?.()
	}
```

In the returned object, after `onFirstWrite`:

```ts
		onClosed: (callback) => {
			closed = callback
		},
```

Run: `npx vitest run src/model/store.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing tracker test**

Append to `src/model/tracker.test.ts`:

```ts
describe("closed (spec §7.2)", () => {
	it("moves to closed when another tab deletes the database, and stops writing", async () => {
		const { tracker, factory } = make()
		await tracker.init()
		await new Promise((resolve) => {
			factory.deleteDatabase("rookdex").onsuccess = resolve
		})
		expect(tracker.getState().error).toBe("closed")
		await tracker.tick("wildlife/a")
		expect(tracker.getState().error).toBe("closed")
		expect(tracker.getState().records["wildlife/a"]).toBeUndefined()
	})
})
```

Run: `npx vitest run src/model/tracker.test.ts`
Expected: FAIL, `error` is `undefined`.

- [ ] **Step 4: Handle it in the tracker model**

In `src/model/tracker.ts`:

1. `export type TrackerError = ImportError | "storage" | "name" | "closed"`
2. In `createTracker`, after `let store: Store | undefined`:
   ```ts
   	// Set when another tab deletes the database under us; writes stop until the page reloads.
   	let closed = false
   ```
3. Replace `ready()` with:
   ```ts
   	function ready(): Store {
   		if (closed) throw new Error("Store closed by another tab")
   		if (!store) throw new Error("Tracker not initialised")
   		return store
   	}

   	/** The error a failed write shows: the true cause when the store was closed under us. */
   	function writeError(): TrackerError {
   		return closed ? "closed" : "storage"
   	}
   ```
4. In `guard` and in `setDoneFor`, change `fail("storage")` to `fail(writeError())`.
5. In `boot`, after `db.onFirstWrite(requestPersist)`:
   ```ts
   			db.onClosed(() => {
   				closed = true
   				fail("closed")
   			})
   ```

Run: `npx vitest run src/model src/islands`
Expected: PASS. The island needs no change: it already maps `state.error` through `s.tracker.errors`, and Task 1 added the `closed` string.

- [ ] **Step 5: Type check and commit**

Run: `npx astro check`
Expected: 0 errors.

```bash
npx biome check --write src/model/store.ts src/model/store.test.ts src/model/tracker.ts src/model/tracker.test.ts
git add src/model
git commit -m "Tell the tracker when another tab deletes its data"
```

---

### Task 9: Deleting everything on this device

**Files:**
- Create: `src/scripts/delete-all.ts`, `src/scripts/delete-all.test.ts`
- Modify: `src/islands/seenFlag.ts`, `src/islands/InstallPrompt.tsx`, `src/islands/Tracker.tsx`

**Interfaces:**
- Consumes: `DB_NAME` from `src/model/store.ts`.
- Produces: `INSTALL_SEEN_KEY`, `HINT_SEEN_KEY` from `src/islands/seenFlag.ts`; `type DeleteResult = "deleted" | "failed" | "unsupported"`, `LOCAL_KEYS`, `deleteAllData(idb: IDBFactory | undefined, storage: Pick<Storage, "removeItem"> | undefined, onBlocked: () => void): Promise<DeleteResult>`.

- [ ] **Step 1: Move the two keys into `seenFlag.ts`**

At the top of `src/islands/seenFlag.ts`:

```ts
// The two flags Rookdex keeps in localStorage. Here, not in the islands, so the Settings page's
// delete script can name them without pulling React into its bundle.
export const INSTALL_SEEN_KEY = "rookdex.install-prompt-seen"
export const HINT_SEEN_KEY = "rookdex.persist-hint-seen"
```

In `src/islands/InstallPrompt.tsx`: import `INSTALL_SEEN_KEY` alongside `readFlag, writeFlag` and change the key line to `export const SEEN_KEY = INSTALL_SEEN_KEY`. In `src/islands/Tracker.tsx`: import `HINT_SEEN_KEY` from `./seenFlag` (merge it into that file's existing `./seenFlag` import if there is one) and change line 19 to `export const HINT_KEY = HINT_SEEN_KEY`.

Run: `npx vitest run src/islands`
Expected: PASS (nothing changed in behaviour).

- [ ] **Step 2: Write the failing test**

`src/scripts/delete-all.test.ts`:

```ts
import { IDBFactory } from "fake-indexeddb"
import { describe, expect, it, vi } from "vitest"
import { HINT_SEEN_KEY, INSTALL_SEEN_KEY } from "../islands/seenFlag"
import { DB_NAME, openStore } from "../model/store"
import { deleteAllData } from "./delete-all"

async function exists(factory: IDBFactory): Promise<boolean> {
	return (await factory.databases()).some((db) => db.name === DB_NAME)
}

function memory(entries: string[]) {
	const keys = new Set(entries)
	const storage = {
		removeItem: (key: string) => {
			keys.delete(key)
		},
	}
	return { keys, storage }
}

describe("deleteAllData (spec §7.2)", () => {
	it("deletes the rookdex database and both flags, and nothing else", async () => {
		const factory = new IDBFactory()
		const store = await openStore(factory)
		await store.put("profiles", { id: "p1", name: "A", created_at: "2026-09-23T10:00:00.000Z" })
		const { keys, storage } = memory([INSTALL_SEEN_KEY, HINT_SEEN_KEY, "unrelated"])
		const onBlocked = vi.fn()
		await expect(deleteAllData(factory, storage, onBlocked)).resolves.toBe("deleted")
		expect(await exists(factory)).toBe(false)
		expect([...keys]).toEqual(["unrelated"])
		expect(onBlocked).not.toHaveBeenCalled()
	})

	it("reports blocked once, then succeeds when the other tab closes, with one request", async () => {
		const factory = new IDBFactory()
		// A raw connection with no versionchange handler stands in for a tab that holds on.
		const other = await new Promise<IDBDatabase>((resolve) => {
			const open = factory.open(DB_NAME, 1)
			open.onsuccess = () => resolve(open.result)
		})
		const requests = vi.spyOn(factory, "deleteDatabase")
		const onBlocked = vi.fn(() => {
			setTimeout(() => other.close(), 10)
		})
		await expect(deleteAllData(factory, undefined, onBlocked)).resolves.toBe("deleted")
		expect(onBlocked).toHaveBeenCalledOnce()
		expect(requests).toHaveBeenCalledOnce()
		expect(await exists(factory)).toBe(false)
	})

	it("reports failed on an error event, and keeps the flags", async () => {
		const request = {} as IDBOpenDBRequest
		const factory = { deleteDatabase: () => request } as unknown as IDBFactory
		const removeItem = vi.fn()
		const result = deleteAllData(factory, { removeItem }, vi.fn())
		const fireError = request.onerror as unknown as () => void
		fireError()
		await expect(result).resolves.toBe("failed")
		expect(removeItem).not.toHaveBeenCalled()
	})

	it("reports failed when deleteDatabase throws", async () => {
		const factory = {
			deleteDatabase: () => {
				throw new DOMException("denied", "SecurityError")
			},
		} as unknown as IDBFactory
		await expect(deleteAllData(factory, undefined, vi.fn())).resolves.toBe("failed")
	})

	it("reports unsupported without IndexedDB", async () => {
		await expect(deleteAllData(undefined, undefined, vi.fn())).resolves.toBe("unsupported")
	})

	it("still reports deleted when localStorage throws", async () => {
		const storage = {
			removeItem: () => {
				throw new DOMException("blocked", "SecurityError")
			},
		}
		await expect(deleteAllData(new IDBFactory(), storage, vi.fn())).resolves.toBe("deleted")
	})
})
```

Run: `npx vitest run src/scripts/delete-all.test.ts`
Expected: FAIL, `Failed to resolve import "./delete-all"`.

- [ ] **Step 3: Write `src/scripts/delete-all.ts`**

```ts
import { HINT_SEEN_KEY, INSTALL_SEEN_KEY } from "../islands/seenFlag"
import { DB_NAME } from "../model/store"

export type DeleteResult = "deleted" | "failed" | "unsupported"

/** Everything Rookdex keeps in localStorage. The service worker cache stays, so the app still opens offline. */
export const LOCAL_KEYS = [INSTALL_SEEN_KEY, HINT_SEEN_KEY] as const

/**
 * Deletes every profile and all progress on this device (spec §7.2). `blocked` is not a failure:
 * the request stays pending and fires `success` once other tabs close their connections, so this
 * reports it once and keeps waiting. It never sends a second request. The flags go only after the
 * database is gone, so a failed delete leaves the device as it was.
 */
export function deleteAllData(
	idb: IDBFactory | undefined,
	storage: Pick<Storage, "removeItem"> | undefined,
	onBlocked: () => void
): Promise<DeleteResult> {
	if (!idb) return Promise.resolve("unsupported")
	return new Promise((resolve) => {
		let request: IDBOpenDBRequest
		try {
			request = idb.deleteDatabase(DB_NAME)
		} catch {
			resolve("failed")
			return
		}
		let told = false
		request.onblocked = () => {
			if (told) return
			told = true
			onBlocked()
		}
		request.onerror = () => resolve("failed")
		request.onsuccess = () => {
			for (const key of LOCAL_KEYS) {
				try {
					storage?.removeItem(key)
				} catch {
					// Blocked storage: the flags were never readable either, so nothing is left behind.
				}
			}
			resolve("deleted")
		}
	})
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx vitest run src/scripts/delete-all.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Type check and commit**

Run: `npx astro check`
Expected: 0 errors.

```bash
npx biome check --write src/scripts/delete-all.ts src/scripts/delete-all.test.ts src/islands/seenFlag.ts src/islands/InstallPrompt.tsx src/islands/Tracker.tsx
git add src
git commit -m "Add the delete-everything routine for the Settings page"
```

---

### Task 10: The storage row, the install row and the version line

**Files:**
- Create: `src/scripts/settings.ts`, `src/scripts/settings.test.ts`, `src/model/version.ts`, `src/model/version.test.ts`

**Interfaces:**
- Consumes: the global `BeforeInstallPromptEvent` type (`src/types/pwa.d.ts`).
- Produces: `wireStorageRow(row: HTMLElement, storage: { persisted?: () => Promise<boolean> } | undefined): Promise<void>`; `interface InstallWindow`; `wireInstallRow(row: HTMLElement, win: InstallWindow): void`; `appVersion(pkgVersion: string, sha: string | undefined): string`. Markup hooks used by Task 11: storage row `[data-storage-row]` with `data-yes`, `data-no` and a `[data-value]` child; install row `[data-install-row]` holding `[data-install-button]`, `[data-install-installed]`, `[data-install-ios]`.

- [ ] **Step 1: Write the failing version test**

`src/model/version.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { appVersion } from "./version"

describe("appVersion (spec §7.3)", () => {
	it("joins the package version and the short commit", () => {
		expect(appVersion("0.1.0", "3b4dd8e0c1f2a3b4c5d6e7f8091a2b3c4d5e6f70")).toBe("0.1.0 · 3b4dd8e")
	})

	it("says dev when the build has no commit", () => {
		expect(appVersion("0.1.0", undefined)).toBe("0.1.0 · dev")
		expect(appVersion("0.1.0", "")).toBe("0.1.0 · dev")
	})
})
```

Run: `npx vitest run src/model/version.test.ts`
Expected: FAIL, `Failed to resolve import "./version"`.

- [ ] **Step 2: Write `src/model/version.ts`**

```ts
/**
 * The Settings version line: the package version and the commit the build ran on (spec §7.3).
 * GitHub Actions sets GITHUB_SHA on every run; a local build has none and says "dev".
 */
export function appVersion(pkgVersion: string, sha: string | undefined): string {
	return `${pkgVersion} · ${sha ? sha.slice(0, 7) : "dev"}`
}
```

Run: `npx vitest run src/model/version.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing row tests**

`src/scripts/settings.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { type InstallWindow, wireInstallRow, wireStorageRow } from "./settings"

function storageRow(): HTMLElement {
	document.body.innerHTML = `
		<dl>
			<div data-storage-row data-yes="Yes" data-no="No" hidden>
				<dt>Protected from clearing</dt><dd data-value></dd>
			</div>
		</dl>`
	return document.querySelector("[data-storage-row]") as HTMLElement
}

describe("wireStorageRow (spec §7.2)", () => {
	it.each([
		[true, "Yes"],
		[false, "No"],
	])("shows persisted() = %s as %s", async (persisted, text) => {
		const row = storageRow()
		await wireStorageRow(row, { persisted: () => Promise.resolve(persisted) })
		expect(row.hidden).toBe(false)
		expect(row.querySelector("[data-value]")?.textContent).toBe(text)
	})

	it("leaves the row out without the API", async () => {
		const row = storageRow()
		await wireStorageRow(row, undefined)
		expect(row.isConnected).toBe(false)
		const other = storageRow()
		await wireStorageRow(other, {})
		expect(other.isConnected).toBe(false)
	})

	it("leaves the row out when persisted() rejects", async () => {
		const row = storageRow()
		await wireStorageRow(row, { persisted: () => Promise.reject(new Error("denied")) })
		expect(row.isConnected).toBe(false)
	})
})

function installRow(): HTMLElement {
	document.body.innerHTML = `
		<dl>
			<div data-install-row hidden>
				<dt>Install</dt>
				<dd>
					<button type="button" data-install-button hidden>Install Rookdex</button>
					<span data-install-installed hidden>Installed</span>
					<span data-install-ios hidden>Share, then Add to Home Screen</span>
				</dd>
			</div>
		</dl>`
	return document.querySelector("[data-install-row]") as HTMLElement
}

function fakeWindow(options: { standalone?: boolean; iosStandalone?: boolean } = {}) {
	const listeners: Record<string, ((event: Event) => void)[]> = {}
	const win: InstallWindow = {
		matchMedia: (query) => ({
			matches: options.standalone === true && query === "(display-mode: standalone)",
		}),
		navigator: options.iosStandalone === undefined ? {} : { standalone: options.iosStandalone },
		addEventListener: (type, listener) => {
			listeners[type] ??= []
			listeners[type].push(listener)
		},
	}
	const fire = (type: string, event: Event) => {
		for (const listener of listeners[type] ?? []) listener(event)
	}
	return { win, fire }
}

function promptEvent() {
	return Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
		prompt: vi.fn(() => Promise.resolve()),
		userChoice: Promise.resolve({ outcome: "dismissed" as const }),
	})
}

/** The texts a sighted user sees in the row's value cell. */
function shown(row: HTMLElement): (string | null)[] {
	return [...row.querySelectorAll<HTMLElement>("dd > *")]
		.filter((el) => !el.hidden)
		.map((el) => el.textContent)
}

describe("wireInstallRow (spec §7.3)", () => {
	it("says Installed in the installed app", () => {
		const row = installRow()
		wireInstallRow(row, fakeWindow({ standalone: true }).win)
		expect(row.hidden).toBe(false)
		expect(shown(row)).toEqual(["Installed"])
	})

	it("shows the how-to in Safari on iOS", () => {
		const row = installRow()
		wireInstallRow(row, fakeWindow({ iosStandalone: false }).win)
		expect(row.hidden).toBe(false)
		expect(shown(row)).toEqual(["Share, then Add to Home Screen"])
	})

	it("stays hidden when nothing applies", () => {
		const row = installRow()
		wireInstallRow(row, fakeWindow().win)
		expect(row.hidden).toBe(true)
	})

	it("offers the button after beforeinstallprompt and removes it after prompt(), whatever the outcome", async () => {
		const row = installRow()
		const { win, fire } = fakeWindow()
		wireInstallRow(row, win)
		const event = promptEvent()
		fire("beforeinstallprompt", event)
		expect(event.defaultPrevented).toBe(true)
		expect(row.hidden).toBe(false)
		expect(shown(row)).toEqual(["Install Rookdex"])
		row.querySelector("button")?.click()
		await vi.waitFor(() => expect(row.querySelector("button")).toBeNull())
		expect(event.prompt).toHaveBeenCalledOnce()
		expect(row.hidden).toBe(true)
	})

	it("switches to Installed on appinstalled", async () => {
		const row = installRow()
		const { win, fire } = fakeWindow()
		wireInstallRow(row, win)
		fire("beforeinstallprompt", promptEvent())
		row.querySelector("button")?.click()
		fire("appinstalled", new Event("appinstalled"))
		await vi.waitFor(() => expect(row.querySelector("button")).toBeNull())
		expect(row.hidden).toBe(false)
		expect(shown(row)).toEqual(["Installed"])
	})
})
```

Run: `npx vitest run src/scripts/settings.test.ts`
Expected: FAIL, `Failed to resolve import "./settings"`.

- [ ] **Step 4: Write `src/scripts/settings.ts`**

```ts
// Settings page wiring (spec §7). Every row that depends on the browser ships in the page with
// `hidden` and all its variants already rendered; these functions only decide what to show.

/**
 * "Protected from clearing": Yes or No from `navigator.storage.persisted()`. Asking shows no
 * prompt. The row is left out when the API is missing or the call rejects.
 */
export async function wireStorageRow(
	row: HTMLElement,
	storage: { persisted?: () => Promise<boolean> } | undefined
): Promise<void> {
	const value = row.querySelector<HTMLElement>("[data-value]")
	if (!value || typeof storage?.persisted !== "function") {
		row.remove()
		return
	}
	try {
		const persisted = await storage.persisted()
		value.textContent = (persisted ? row.dataset.yes : row.dataset.no) ?? ""
		row.hidden = false
	} catch {
		row.remove()
	}
}

/** The slice of `window` the install row reads. `window` satisfies it; the tests pass a fake. */
export interface InstallWindow {
	matchMedia(query: string): { matches: boolean }
	navigator: { standalone?: boolean }
	addEventListener(
		type: "beforeinstallprompt" | "appinstalled",
		listener: (event: Event) => void
	): void
}

/**
 * Install row: "Installed" in the installed app, the Share how-to in iOS Safari (which defines
 * `navigator.standalone` and never fires `beforeinstallprompt`), the button once the browser
 * offers installation, and nothing otherwise. The prompt works once, so the button goes after it.
 */
export function wireInstallRow(row: HTMLElement, win: InstallWindow): void {
	const button = row.querySelector<HTMLButtonElement>("[data-install-button]")
	const installed = row.querySelector<HTMLElement>("[data-install-installed]")
	const ios = row.querySelector<HTMLElement>("[data-install-ios]")
	if (!button || !installed || !ios) return
	const parts = [button, installed, ios]
	const show = (part: HTMLElement | null) => {
		for (const each of parts) each.hidden = each !== part
		row.hidden = part === null
	}

	let isInstalled =
		win.matchMedia("(display-mode: standalone)").matches || win.navigator.standalone === true
	if (isInstalled) {
		show(installed)
		return
	}
	show(win.navigator.standalone === false ? ios : null)

	let deferred: BeforeInstallPromptEvent | undefined
	win.addEventListener("beforeinstallprompt", (event) => {
		event.preventDefault()
		deferred = event as BeforeInstallPromptEvent
		show(button)
	})
	win.addEventListener("appinstalled", () => {
		isInstalled = true
		show(installed)
	})
	button.addEventListener("click", async () => {
		const offer = deferred
		if (!offer) return
		deferred = undefined
		await offer.prompt().catch(() => {})
		button.remove()
		show(isInstalled ? installed : null)
	})
}
```

- [ ] **Step 5: Run it to verify it passes**

Run: `npx vitest run src/scripts/settings.test.ts src/model/version.test.ts`
Expected: PASS.

- [ ] **Step 6: Type check and commit**

Run: `npx astro check`
Expected: 0 errors.

```bash
npx biome check --write src/scripts/settings.ts src/scripts/settings.test.ts src/model/version.ts src/model/version.test.ts
git add src
git commit -m "Add the storage, install and version logic for Settings"
```

---

### Task 11: The Settings page and its delete dialog

**Files:**
- Create: `src/pages/[locale]/settings.astro`, `src/test/settings-page.test.ts`
- Modify: `src/scripts/settings.ts`, `src/scripts/settings.test.ts`

**Interfaces:**
- Consumes: `s.settings.*` (Task 1), `deleteAllData` and `DeleteResult` (Task 9), `wireStorageRow`, `wireInstallRow`, `appVersion` (Task 10), `renderDoc` (Task 2), the `.modal` and `.actions` styles already in `global.css`.
- Produces: `wireDeleteDialog(root: HTMLElement, run: (onBlocked: () => void) => Promise<DeleteResult>): void`; route `/{locale}/settings/`. Markup hooks: `[data-delete]` root holding `[data-delete-open]`, `[data-delete-status]`, and a `<dialog>` with `data-blocked`, `data-failed`, `data-done`, `[data-delete-alert]`, `[data-delete-cancel]`, `[data-delete-confirm]`.

- [ ] **Step 1: Write the failing dialog test**

Append to `src/scripts/settings.test.ts` (extend the imports: `type DeleteResult` from `./delete-all` and `wireDeleteDialog` from `./settings`):

```ts
function dangerBox() {
	document.body.innerHTML = `
		<div data-delete>
			<button type="button" data-delete-open>Delete all data on this device</button>
			<p role="status" data-delete-status></p>
			<dialog
				data-blocked="Close other Rookdex tabs to finish."
				data-failed="Something went wrong. Nothing was deleted."
				data-done="All data on this device is deleted."
			>
				<p role="alert" data-delete-alert></p>
				<button type="button" data-delete-cancel>Cancel</button>
				<button type="button" data-delete-confirm>Delete everything</button>
			</dialog>
		</div>`
	const root = document.querySelector("[data-delete]") as HTMLElement
	const get = <T extends HTMLElement>(selector: string) => root.querySelector(selector) as T
	return {
		root,
		open: get<HTMLButtonElement>("[data-delete-open]"),
		status: get<HTMLElement>("[data-delete-status]"),
		dialog: get<HTMLDialogElement>("dialog"),
		alert: get<HTMLElement>("[data-delete-alert]"),
		cancel: get<HTMLButtonElement>("[data-delete-cancel]"),
		confirm: get<HTMLButtonElement>("[data-delete-confirm]"),
	}
}

/** A delete that settles when the test says so. */
function pendingRun() {
	let settle: (result: DeleteResult) => void = () => {}
	let blocked: () => void = () => {}
	const run = vi.fn(
		(onBlocked: () => void) =>
			new Promise<DeleteResult>((resolve) => {
				blocked = onBlocked
				settle = resolve
			})
	)
	return { run, settle: (result: DeleteResult) => settle(result), block: () => blocked() }
}

describe("wireDeleteDialog (spec §7.2)", () => {
	it("opens with Cancel focused, and Cancel closes it and returns focus", () => {
		const box = dangerBox()
		wireDeleteDialog(box.root, pendingRun().run)
		box.open.click()
		expect(box.dialog.open).toBe(true)
		expect(document.activeElement).toBe(box.cancel)
		box.cancel.click()
		expect(box.dialog.open).toBe(false)
		expect(document.activeElement).toBe(box.open)
	})

	it("disables the confirm button while the request is pending, so a double tap sends one", async () => {
		const box = dangerBox()
		const { run, settle } = pendingRun()
		wireDeleteDialog(box.root, run)
		box.open.click()
		box.confirm.click()
		box.confirm.click()
		expect(box.confirm.disabled).toBe(true)
		expect(run).toHaveBeenCalledOnce()
		settle("deleted")
		await vi.waitFor(() => expect(box.dialog.open).toBe(false))
		expect(box.status.textContent).toBe("All data on this device is deleted.")
		expect(document.activeElement).toBe(box.open)
	})

	it("asks to close other tabs when blocked, stays open, then finishes on success", async () => {
		const box = dangerBox()
		const { run, settle, block } = pendingRun()
		wireDeleteDialog(box.root, run)
		box.open.click()
		box.confirm.click()
		block()
		expect(box.alert.textContent).toBe("Close other Rookdex tabs to finish.")
		expect(box.dialog.open).toBe(true)
		expect(box.confirm.disabled).toBe(true)
		settle("deleted")
		await vi.waitFor(() => expect(box.dialog.open).toBe(false))
	})

	it.each(["failed", "unsupported"] as const)(
		"says nothing was deleted when the result is %s, and allows a retry",
		async (result) => {
			const box = dangerBox()
			const { run, settle } = pendingRun()
			wireDeleteDialog(box.root, run)
			box.open.click()
			box.confirm.click()
			settle(result)
			await vi.waitFor(() =>
				expect(box.alert.textContent).toBe("Something went wrong. Nothing was deleted.")
			)
			expect(box.dialog.open).toBe(true)
			expect(box.confirm.disabled).toBe(false)
			expect(box.status.textContent).toBe("")
		}
	)
})
```

Run: `npx vitest run src/scripts/settings.test.ts`
Expected: FAIL, `wireDeleteDialog is not a function`.

- [ ] **Step 2: Add `wireDeleteDialog` to `src/scripts/settings.ts`**

Add at the top: `import type { DeleteResult } from "./delete-all"`. Append:

```ts
/**
 * "Delete all data on this device" (spec §7.2). Native <dialog> with Cancel first, so showModal()
 * focuses it and a stray Enter cancels. The confirm button stays disabled until the request
 * settles, including while other tabs block it. Success closes the dialog and speaks through the
 * page's status line; anything else keeps the dialog open and says nothing was deleted.
 */
export function wireDeleteDialog(
	root: HTMLElement,
	run: (onBlocked: () => void) => Promise<DeleteResult>
): void {
	const open = root.querySelector<HTMLButtonElement>("[data-delete-open]")
	const status = root.querySelector<HTMLElement>("[data-delete-status]")
	const dialog = root.querySelector("dialog")
	const alert = root.querySelector<HTMLElement>("[data-delete-alert]")
	const cancel = root.querySelector<HTMLButtonElement>("[data-delete-cancel]")
	const confirm = root.querySelector<HTMLButtonElement>("[data-delete-confirm]")
	if (!open || !status || !dialog || !alert || !cancel || !confirm) return

	open.addEventListener("click", () => {
		alert.textContent = ""
		status.textContent = ""
		dialog.showModal()
	})
	cancel.addEventListener("click", () => dialog.close())
	// Fires for Cancel, Escape and success alike.
	dialog.addEventListener("close", () => open.focus())

	confirm.addEventListener("click", async () => {
		if (confirm.disabled) return
		confirm.disabled = true
		alert.textContent = ""
		const result = await run(() => {
			alert.textContent = dialog.dataset.blocked ?? ""
		})
		confirm.disabled = false
		if (result === "deleted") {
			dialog.close()
			status.textContent = dialog.dataset.done ?? ""
		} else {
			alert.textContent = dialog.dataset.failed ?? ""
		}
	})
}
```

Run: `npx vitest run src/scripts/settings.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing page test**

`src/test/settings-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import Settings from "../pages/[locale]/settings.astro"
import { renderDoc } from "./render"

const settings = (locale: "en" | "no") => renderDoc(Settings, { params: { locale } })

describe("Settings page (spec §7)", () => {
	it("is the Settings tab, with three groups", async () => {
		const doc = await settings("en")
		expect(doc.querySelector("h1")?.textContent).toBe("Settings")
		expect(
			doc.querySelector('nav[aria-label="Main"] [aria-current="page"]')?.textContent?.trim()
		).toBe("Settings")
		expect([...doc.querySelectorAll("main section > h2")].map((h) => h.textContent)).toEqual([
			"Language",
			"Your data",
			"App",
		])
	})

	it("uses the whole word in the title, without the tab label's soft hyphen", async () => {
		const doc = await settings("no")
		expect(doc.querySelector("h1")?.textContent).toBe("Innstillinger")
		expect(doc.title).toBe("Innstillinger · Rookdex")
	})

	it("marks the current language and links the other to its own Settings page", async () => {
		const doc = await settings("no")
		const group = doc.querySelector('section[aria-labelledby="settings-language"]')
		expect(group?.querySelector('[aria-current="page"]')?.textContent?.trim()).toBe("Norsk")
		expect(group?.querySelector("a")?.getAttribute("href")).toBe("/en/settings/")
	})

	it("ships the browser-dependent rows hidden until the script decides", async () => {
		const doc = await settings("en")
		expect(doc.querySelector("[data-storage-row]")?.hasAttribute("hidden")).toBe(true)
		expect(doc.querySelector("[data-install-row]")?.hasAttribute("hidden")).toBe(true)
	})

	it("points export and import at the Tracker's profile menu", async () => {
		const doc = await settings("en")
		const link = [...doc.querySelectorAll("main a")].find(
			(a) => a.textContent === "Profile menu in Tracker"
		)
		expect(link?.getAttribute("href")).toBe("/en/tracker/")
	})

	it("puts Cancel first in the delete dialog, with an alert for its messages", async () => {
		const doc = await settings("en")
		const buttons = [...doc.querySelectorAll("dialog button")].map((b) => b.textContent?.trim())
		expect(buttons).toEqual(["Cancel", "Delete everything"])
		expect(doc.querySelector('dialog [role="alert"]')?.textContent).toBe("")
	})

	it("keeps the success status in the page, empty, outside the dialog", async () => {
		const doc = await settings("en")
		const status = doc.querySelector('[role="status"][data-delete-status]')
		expect(status?.textContent).toBe("")
		expect(status?.closest("dialog")).toBeNull()
	})

	it("shows the version and links the source", async () => {
		const doc = await settings("en")
		const rows = [...doc.querySelectorAll("main dl > div")]
		const value = (label: string) =>
			rows.find((row) => row.querySelector("dt")?.textContent === label)?.querySelector("dd")
		expect(value("Version")?.textContent?.trim()).toMatch(/^0\.1\.0 · ([0-9a-f]{7}|dev)$/)
		expect(value("Source code")?.querySelector("a")?.getAttribute("href")).toBe(
			"https://github.com/rookdex/rookdex"
		)
	})
})
```

Run: `npx vitest run src/test/settings-page.test.ts`
Expected: FAIL, the import of `settings.astro` does not resolve.

- [ ] **Step 4: Write `src/pages/[locale]/settings.astro`**

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import pkg from "../../../package.json"
import { isLocale, type Locale, locales, t } from "../../i18n"
import Base from "../../layouts/Base.astro"
import { appVersion } from "../../model/version"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale } }))
}

// Settings acts on the whole device; per-profile export, import and delete stay in the Tracker's
// profile menu (spec §7).
const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const s = t(locale as Locale)
const version = appVersion(pkg.version, process.env.GITHUB_SHA)
---

<Base locale={locale} title={s.settings.title} description={s.settings.description} path="settings">
	<h1>{s.settings.title}</h1>

	<section class="settings-group" aria-labelledby="settings-language">
		<h2 id="settings-language">{s.settings.language}</h2>
		<ul class="rows">
			{
				locales.map((l) => (
					<li class="row">
						{l === locale ? (
							<span aria-current="page" lang={l}>
								{s.languageNames[l]}
							</span>
						) : (
							<a href={getRelativeLocaleUrl(l, "settings")} hreflang={l} lang={l}>
								{s.languageNames[l]}
							</a>
						)}
						{l === locale && (
							<svg
								class="check"
								viewBox="0 0 24 24"
								width="16"
								height="16"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d="M5 12.5l4.5 4.5L19 7.5" />
							</svg>
						)}
					</li>
				))
			}
		</ul>
	</section>

	<section class="settings-group" aria-labelledby="settings-data">
		<h2 id="settings-data">{s.settings.data}</h2>
		<dl class="rows">
			<div class="row">
				<dt>{s.settings.stored}</dt>
				<dd>{s.settings.storedValue}</dd>
			</div>
			<div class="row" data-storage-row data-yes={s.settings.yes} data-no={s.settings.no} hidden>
				<dt>{s.settings.persisted}</dt>
				<dd data-value></dd>
			</div>
			<div class="row">
				<dt>{s.settings.transfer}</dt>
				<dd><a href={getRelativeLocaleUrl(locale, "tracker")}>{s.settings.transferLink}</a></dd>
			</div>
		</dl>
		<div class="danger" data-delete>
			<p>{s.settings.dangerBody}</p>
			<button type="button" class="danger-button" data-delete-open>{s.settings.deleteAll}</button>
			<p class="delete-status" role="status" data-delete-status></p>
			<dialog
				class="modal"
				aria-labelledby="delete-all-title"
				data-blocked={s.settings.blocked}
				data-failed={s.settings.failed}
				data-done={s.settings.done}
			>
				<h2 id="delete-all-title">{s.settings.dialogTitle}</h2>
				<p>{s.settings.dangerBody}</p>
				<p role="alert" data-delete-alert></p>
				<div class="actions">
					<button type="button" data-delete-cancel>{s.settings.cancel}</button>
					<button type="button" class="danger-button" data-delete-confirm>{s.settings.confirm}</button>
				</div>
			</dialog>
		</div>
	</section>

	<section class="settings-group" aria-labelledby="settings-app">
		<h2 id="settings-app">{s.settings.app}</h2>
		<dl class="rows">
			<div class="row" data-install-row hidden>
				<dt>{s.settings.install}</dt>
				<dd>
					<button type="button" class="row-button" data-install-button hidden>
						{s.settings.installButton}
					</button>
					<span data-install-installed hidden>{s.settings.installed}</span>
					<span data-install-ios hidden>{s.settings.iosHowTo}</span>
				</dd>
			</div>
			<div class="row">
				<dt>{s.settings.version}</dt>
				<dd>{version}</dd>
			</div>
			<div class="row">
				<dt>{s.settings.source}</dt>
				<dd><a href="https://github.com/rookdex/rookdex">{s.settings.sourceLink}</a></dd>
			</div>
		</dl>
	</section>
</Base>

<script>
	import { deleteAllData } from "../../scripts/delete-all"
	import { wireDeleteDialog, wireInstallRow, wireStorageRow } from "../../scripts/settings"

	// Either store can be missing or throw on access (private modes, blocked site data).
	function database(): IDBFactory | undefined {
		try {
			return window.indexedDB ?? undefined
		} catch {
			return undefined
		}
	}

	function flags(): Storage | undefined {
		try {
			return window.localStorage
		} catch {
			return undefined
		}
	}

	const storageRow = document.querySelector<HTMLElement>("[data-storage-row]")
	if (storageRow) wireStorageRow(storageRow, navigator.storage)

	const installRow = document.querySelector<HTMLElement>("[data-install-row]")
	if (installRow) wireInstallRow(installRow, window)

	const danger = document.querySelector<HTMLElement>("[data-delete]")
	if (danger) {
		wireDeleteDialog(danger, (onBlocked) => deleteAllData(database(), flags(), onBlocked))
	}
</script>

<style>
	.settings-group {
		margin-bottom: var(--space-5);
	}

	.settings-group > h2 {
		margin: 0 0 var(--space-2);
		color: var(--text-muted);
		font-size: 0.8125rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.rows {
		margin: 0;
		padding: 0;
		list-style: none;
		background: var(--bg-raised);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	/* Muted label left, value or action right, the pattern phone settings screens use. */
	.row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		min-height: 48px;
		padding: 0 14px;
		font-size: 0.875rem;
	}

	.row + .row {
		border-top: 1px solid var(--border);
	}

	.row dt {
		color: var(--text-muted);
	}

	.row dd {
		margin: 0;
		color: var(--text);
		text-align: right;
	}

	.row a,
	.row-button {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
	}

	.row-button {
		padding: 0 var(--space-3);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg);
		color: var(--text);
		font: inherit;
		cursor: pointer;
	}

	.check {
		flex: none;
		color: var(--accent);
	}

	.danger {
		margin-top: var(--space-3);
		padding: var(--space-3);
		border: 1px solid var(--accent);
		border-radius: var(--radius);
	}

	.danger > p {
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	/* Danger is the accent as an outline; filled pink stays for positive actions (plan decision 8). */
	.danger-button,
	.actions .danger-button {
		min-height: var(--tap);
		padding: 0 var(--space-3);
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		background: transparent;
		color: var(--accent);
		font: inherit;
		font-weight: 600;
		cursor: pointer;
	}

	.danger-button:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.delete-status {
		margin: var(--space-2) 0 0;
	}
</style>
```

- [ ] **Step 5: Run the page test to verify it passes**

Run: `npx vitest run src/test/settings-page.test.ts`
Expected: PASS. If the version test fails with `process is not defined`, stop and report it rather than working around it: plan decision 4 then falls back to the spec's route, a Vite `define` in `astro.config.mjs`. (`import.meta.env.GITHUB_SHA` is not a fix; Vite exposes only `PUBLIC_` variables there.)

- [ ] **Step 6: Run the whole suite, the type check and a build**

Run: `npx vitest run`, then `npx astro check`, then `npm run build`, then `ls dist/en/settings/index.html dist/no/settings/index.html && grep -o "0\.1\.0 · [a-z0-9]*" dist/en/settings/index.html`
Expected: PASS, 0 errors, both files listed, and `0.1.0 · dev` printed for a local build.

- [ ] **Step 7: Commit**

```bash
npx biome check --write "src/pages/[locale]/settings.astro" src/test/settings-page.test.ts src/scripts/settings.ts src/scripts/settings.test.ts
git add src
git commit -m "Add the Settings page with delete-all for this device"
```

---

### Task 12: Whole-branch verification, the measurements and the PR

**Files:** none changed unless a check fails; a fix goes into the task it belongs to, with its own commit.

- [ ] **Step 1: The full gate CI runs**

Run, in order: `npx biome ci .`, `npx astro check`, `npx vitest run`, `npm run build`
Expected: all green. Record the test count from the Vitest summary line for the PR.

- [ ] **Step 2: Security and size checks on the build**

```bash
grep -rlE ' on[a-z]+="' dist --include=*.html || echo "no inline handlers"
grep -rl 'javascript:' dist --include=*.html || echo "no javascript: URLs"
grep -rl 'unsafe-inline' dist public/_headers || echo "no unsafe-inline"
test ! -e dist/en/tracker/rumours/index.html && echo "old rumours page gone"
grep -c '"/en/news/"\|"/en/settings/"' dist/sw.js
wc -c src/scripts/history-buttons.ts src/scripts/language-menu.ts
```

Expected: the three "no …" lines, "old rumours page gone", a count of at least 2 (both new pages in the precache list; if the worker is not at `dist/sw.js`, find it with `ls dist/*.js`), and the two scripts together under 3,000 bytes unminified (§13). If they are over, trim comments before code, and report the number either way.

- [ ] **Step 3: Measure the layout in the Browser pane**

Start the `preview` config from `.claude/launch.json` (Wrangler serving `dist`, port 8787). For each page `/en/`, `/no/settings/`, `/en/guides/before-you-start/`, at widths 320, 360, 768 and 1024 (height 800, via `resize_window`), run this with `javascript_tool` once with `measure(1)` and once with `measure(1.3)`, then reload:

```js
async function measure(scale) {
	document.documentElement.style.fontSize = `${scale * 100}%`
	await document.fonts.ready
	const box = (el) => el.getBoundingClientRect()
	const header = document.querySelector(".site-header")
	const out = { width: innerWidth, scale }
	out.headerOverflow = header.scrollWidth - header.clientWidth
	out.historyInTab = !document.querySelector("[data-history]").hidden
	out.headerControls = [...header.querySelectorAll(".brand, .lang summary")].map((el) =>
		Math.round(box(el).height)
	)
	// Desktop row: the first label's text (link box + 12 px padding) against the brand's left edge.
	const firstTab = document.querySelector(".tabbar a")
	out.tabAlign = Math.round(box(firstTab).left + 12 - box(header.querySelector(".brand")).left)
	out.tabs = [...document.querySelectorAll(".tabbar a")].map((a) => ({
		label: a.textContent.trim(),
		clipped: a.scrollWidth > a.clientWidth,
		height: Math.round(box(a).height),
	}))
	scrollTo(0, document.documentElement.scrollHeight)
	await new Promise((r) => requestAnimationFrame(r))
	const bar = document.querySelector(".tabbar")
	out.footerGapToBar =
		getComputedStyle(bar).position === "fixed"
			? Math.round(box(bar).top - box(document.querySelector(".site-footer")).bottom)
			: "in flow"
	out.footer = [...document.querySelectorAll(".footer-pairs > div")].map((pair) => ({
		label: pair.querySelector("dt").textContent,
		labelTop: Math.round(box(pair.querySelector("dt")).top),
		valueHeight: Math.round(box(pair.querySelector("dd")).height),
		valueBottom: Math.round(box(pair.querySelector("dd")).bottom),
	}))
	const sources = document.querySelector(".sources")
	if (sources) out.sources = { height: Math.round(box(sources).height), overflow: sources.scrollWidth - sources.clientWidth }
	document.documentElement.style.fontSize = ""
	return out
}
```

Then, at 320 and 360 only, simulate the installed row (the pane cannot emulate standalone): run `document.querySelector("[data-history]").hidden = false; document.querySelector(".site-header .wordmark").classList.add("visually-hidden")`, then `measure(1)` and `measure(1.3)` again.

Pass criteria (§14):
- `headerOverflow` ≤ 0 everywhere, including the simulated installed row at 320 × 130 %; `historyInTab` is `false` in every normal run.
- `headerControls` all 44.
- `tabAlign` is 0 at 768 and 1024 (§5: the row lines up with the brand, not the content column).
- No tab `clipped`; phone tab heights ≥ 56; on `/no/` at 130 % the Settings cell wraps to two lines and the bar stays within `--tabbar-h` (68 px at a 16 px root, 88 at 130 %).
- `footerGapToBar` ≥ 0 at 320 and 360 in both languages.
- Every `valueHeight` is 20 (one line) and pairs on the same row share `labelTop` and `valueBottom`.
- `sources.overflow` ≤ 0; one source takes one 44 px line.

Take one screenshot per width at 100 % on `/no/settings/` (the busiest page) for the in-session review. Any failing number is a defect: fix it in the owning task's files, commit, and measure again.

- [ ] **Step 4: Open the PR**

```bash
git push -u origin frontend
gh pr create --base main --head frontend --title "Add app-style navigation, Settings and News" --body-file <body file>
```

Body (fill the bracketed numbers from steps 1–3; write the file in the scratchpad):

```markdown
Adds the navigation and pages from the frontend spec (`docs/superpowers/specs/2026-09-23-rookdex-frontend-design.md`), built from the plan in `docs/superpowers/plans/2026-09-23-rookdex-frontend.md`.

## What changes

- Four tabs: Home, Tracker, News, Settings. Bottom bar on phones, a text row under the header from 768 px. Plain links, no JavaScript.
- Back and forward buttons in the installed app only; the wordmark hides on phone width in the installed app.
- The language switch is a dropdown (globe + code) at every size.
- New Settings page: language, what is stored and whether it is protected, delete all data on this device, install state, version and source.
- Rumours moved to the new News page; `/tracker/rumours/` redirects there with a 301.
- Guide sources are one quiet line of outlet names; a guide citing one outlet twice fails the build.
- The footer is the disclaimer plus four label/value pairs.
- A Tracker open in another tab now says "Your data changed in another tab" after a delete-all, instead of a wrong storage error.

## Checks

- `biome ci`, `astro check`, [N] tests and the build are green.
- No inline handlers, no `javascript:` URLs, no `unsafe-inline`; the CSP is unchanged.
- History and language scripts: [N] bytes together, unminified (budget 3 KB).
- Measured at 320 / 360 / 768 / 1024 px, 100 % and 130 % text: [header overflow, tab heights, Norwegian Settings wrap, footer gap to the bar, footer rows, sources line].

## Still to check on my phone (version preview)

- Back and forward in the installed app, including after returning to a page.
- The gap under the bottom bar on a phone with a home indicator.
- Delete all data, with the Tracker open in a second tab.
- Norwegian at the largest text size.
```

- [ ] **Step 5: Hand over**

Report to Malin: the PR link, the measured numbers, the phone checklist above, and plan decision 7 ("fremgang" versus "fremdrift") for her to confirm. Do not merge.
