# Rookdex Android (Play Store) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship what the repo needs for Rookdex to go on Google Play as a Trusted Web Activity: a privacy page (EN and NB) linked from the footer and Settings, the `docs/android/` pack I paste into Play Console, a signing-key guard in `.gitignore`, and later `assetlinks.json`.

**Architecture:** No Android code in the repo (spec approach A). PR 1 is site work plus docs: one new Astro page built like `news.astro`, a fourth footer icon, a new Settings row, plain-markdown docs, a feature graphic rendered from an SVG source like the OG banner, and phone screenshots captured from a production build over the DevTools protocol. PR 2 adds `public/.well-known/assetlinks.json` once Play Console shows the two SHA-256 fingerprints.

**Tech Stack:** Astro 7 (static, `astro:i18n`), flat-key JSON bundles in `src/locales/`, Vitest 5 with the Astro Container API (`src/test/render.ts`), axe-core 4.13 (already installed through vitest-axe), Biome, Lighthouse CI, Cloudflare Workers static assets, headless Brave over CDP for captures.

**Spec:** `docs/superpowers/specs/2026-10-16-rookdex-android-design.md`

## Global Constraints

- Package name `app.rookdex`. Developer name "Rookdex". Public email `legal@rookdex.app`. Website `https://rookdex.app`.
- Privacy URLs: `/en/privacy/` and `/nb/privacy/`. One shared slug: no translated slug. Norwegian title and link text say "Personvern".
- Store category Entertainment. Target audience 18 and over only.
- No "GTA", "Rockstar" or game art in the app name, icon or graphics. The full description may name the game once, as plain text.
- No Ko-fi link, donation link or Pro sale anywhere in this work.
- The signing key, its passwords and `signing-key-info.txt` are never read, pasted into a chat or shown to an AI tool. Fingerprints come from Play Console only.
- Copy rules (`src/i18n/copy.test.ts`): no `!`, no "leak"/"lekk*", no "ROOKDEX" in strings, search titles at most 65 characters and containing "Rookdex". `en.json` and `nb.json` keep identical key sets (`src/i18n/bundles.test.ts`).
- No em dashes (—) in any copy, doc, comment or commit.
- Controls on one row share one height (44 px, `--tap`) and one centre line. Measure, don't eyeball.
- Mobile-first CSS: baseline is the phone; `min-width: 768px` and `1024px` add on top.
- Commit author `malinfossum.dev@proton.me`. No `Co-Authored-By`, no AI attribution.
- Line endings: after editing a file with the Edit tool, run `sed -i 's/\r$//' <file>` before `git add` (CRLF working-copy trap).

## Decisions taken while planning (2026-10-17)

- **Phone footer gets a third row.** Measured on production at 320 px: the strip is 288 px wide, the © line 118.6 px. Four 44 px icons (188 px) + 16 px gap + 118.6 px = 322.6 px, which overflows. Malin chose: under 768 px the strip is three rows (icons, launch chip, ©). From 768 px it stays one line.
- **Screenshot profile is the default "Player 1" / "Spiller 1"**, not a profile renamed "Main". It is what a new user sees, it is not a real person, and it needs no UI scripting. Same intent as spec §5.
- **Feature graphic is a JPEG** (`docs/android/feature-graphic.jpg`), not PNG. Play wants the feature graphic as JPEG or 24-bit PNG without alpha, and a canvas PNG is always RGBA. Screenshots stay PNG only if Chrome writes them without alpha; Task 7 checks and falls back to JPEG.
- **The Android section also links Chrome's privacy notice.** Spec §3 says Chrome's policy applies; a link makes that checkable. It uses `ExternalLink` like the Cloudflare link.
- **The page is titled "Privacy policy" / "Personvernerklæring"** (h1 and search title), not "Privacy" / "Personvern" as in spec §2. Play's User Data policy wants the page labelled as a privacy policy. The footer tip and the Settings label stay short: "Privacy" / "Personvern". Malin's call in the plan stress test.
- **The hosting section names the legal basis, the processor and transfers, and the who section names the right to complain** (GDPR Art. 13; Play also wants retention covered). Spec §3 lists the sections; these are two extra sentences inside them, not new sections.
- **Screenshots show the real UI**, which has plain-text mentions of the game (news, the footer disclaimer). Spec §5's "no GTA in graphics" rule is read as: no game art, logos or "GTA" in the icon, feature graphic or name. Screenshots must show no game art or logo.
- **The screenshot script is a standalone copy of the CDP harness in `docs/readme/capture.mjs`**, not a shared module. Both are dev-only scripts that never ship; extracting a module would mean refactoring an untested script the day before I leave.

## Review Focus

1. **The phone footer at 320 px with Norwegian copy and 200 % text size.** The © line and the chip must stay inside the strip, the four icons on one centre line, nothing clipped. Task 2 measures en and nb at 320, 768 and 1024 px.
2. **The fourth tooltip at the screen edge.** On a phone the tips open to the right; the fourth icon's tip needs its own `--tip-inset` or it runs off-screen. Task 2 adds the rule and checks the tip's right edge at 320 px.
3. **A reader arriving on `/nb/privacy/` from a search result.** The language switch, hreflang and the sitemap must treat the page like any other; the build's SEO check fails a page that is built but not in `indexablePaths`. Task 1 adds it and the build runs in Task 8.
4. **Copy drifting from the Settings button.** The privacy page tells people to press "Delete all data on this device". If that label changes, the instruction must follow. Task 1 interpolates `settings.deleteAll` instead of repeating the words, and the test asserts it.
5. **A keystore landing in the repo.** If the PWABuilder zip is unpacked inside the checkout, git must refuse the key and the bundle. Task 4's test proves the guard can go red as well as green.

---

## File structure

| File | Change | Responsibility |
|---|---|---|
| `src/pages/[locale]/privacy.astro` | create | The privacy page, both locales |
| `src/test/privacy-page.test.ts` | create | Page structure, links, date, axe |
| `src/locales/en.json`, `src/locales/nb.json` | modify | `privacy.*`, `footer.privacy`, `settings.privacy*`, `seo.titles.privacy` |
| `src/model/seo.ts`, `src/model/seo.test.ts` | modify | `privacy` joins `indexablePaths` |
| `lighthouserc.json` | modify | Adds `/en/privacy/` |
| `src/components/Footer.astro`, `Footer.test.ts` | modify | Fourth icon: privacy shield |
| `src/styles/global.css` | modify | Phone footer three rows, fourth tip inset |
| `src/pages/[locale]/settings.astro`, `src/test/settings-page.test.ts` | modify | Privacy row in Your data |
| `.gitignore`, `src/test/gitignore.test.ts` | modify, create | Signing key and bundle guard |
| `docs/android/listing.md`, `data-safety.md`, `content-rating.md`, `app-content.md`, `runbook.md` | create | Text pasted into Play Console |
| `docs/brand/feature.html`, `docs/brand/serve.mjs` | create, modify | Feature graphic source and save route |
| `docs/android/feature-graphic.jpg` | create | 1024×500 render |
| `docs/android/screenshots.mjs`, `docs/android/screenshots/*.png` | create | Phone screenshot capture and output |
| PR 2: `public/.well-known/assetlinks.json`, `src/test/assetlinks.test.ts`, `integrations/precache.mjs`, `integrations/precache.test.ts` | create, modify | Digital Asset Links |

---

## Part 1: PR 1 (16 to 17 October, before I leave)

### Task 0: Branch

- [ ] **Step 1: Start PR 1 from an up-to-date main**

This plan lands on `docs/android-spec` (PR #59). After #59 is merged:

```bash
git switch main
git pull
git switch -c feat/android-play-prep
```

If #59 is not merged yet, branch from `docs/android-spec` instead and rebase onto `main` after it merges.

---

### Task 1: The privacy page

**Files:**
- Create: `src/pages/[locale]/privacy.astro`
- Create: `src/test/privacy-page.test.ts`
- Modify: `src/locales/en.json`, `src/locales/nb.json`
- Modify: `src/model/seo.ts:24-32`, `src/model/seo.test.ts:24-35`
- Modify: `lighthouserc.json`

**Interfaces:**
- Consumes: `Base` props `locale`, `title`, `description`, `path`, `tab` (`src/layouts/Base.astro:16-28`); `ExternalLink` props `href` (https only), `locale`; `translator(locale).t(key, vars)`; `getRelativeLocaleUrl(locale, path)` from `astro:i18n`.
- Produces: route `/{locale}/privacy/`; keys `privacy.*` and `seo.titles.privacy` used by Tasks 2 and 3 only through the URL. `indexablePaths()` now returns `["", "tracker", "tracker/sources", "news", "privacy", ...guides]`.

- [ ] **Step 1: Write the failing SEO test**

In `src/model/seo.test.ts`, replace the first `it` inside `describe("indexablePaths (SEO spec §4.1)"`:

```ts
	it("lists home, tracker, its sources, news, privacy, then each guide once under guides/", () => {
		expect(indexablePaths(["before-you-start", "before-you-start"])).toEqual([
			"",
			"tracker",
			"tracker/sources",
			"news",
			"privacy",
			"guides/before-you-start",
		])
	})
```

- [ ] **Step 2: Write the failing page test**

Create `src/test/privacy-page.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { JSDOM, VirtualConsole } from "jsdom"
import { describe, expect, it } from "vitest"
import { translator } from "../i18n"
import Privacy from "../pages/[locale]/privacy.astro"
import { renderDoc } from "./render"

const page = (locale: "en" | "nb") => renderDoc(Privacy, { params: { locale } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

// axe-core runs inside its own JSDOM window: renderDoc's tests run in the node environment, where
// vitest-axe has no global document. Colour contrast needs layout, which jsdom lacks; Lighthouse CI
// checks it on the built page instead.
type Axe = { run(context: Document, options?: object): Promise<{ violations: { id: string }[] }> }
const axeSource = readFileSync(
	new URL("../../node_modules/axe-core/axe.min.js", import.meta.url),
	"utf8"
)
async function axeViolations(html: string): Promise<string[]> {
	const { window } = new JSDOM(html, {
		runScripts: "outside-only",
		virtualConsole: new VirtualConsole(),
	})
	window.eval(axeSource)
	const axe = (window as unknown as { axe: Axe }).axe
	const results = await axe.run(window.document, { rules: { "color-contrast": { enabled: false } } })
	return results.violations.map((v) => v.id)
}

describe("Privacy page (Android spec §3)", () => {
	it("is a sub-page of Settings, so the Settings tab stays lit", async () => {
		const doc = await page("en")
		expect(doc.querySelector("h1")?.textContent).toBe("Privacy policy")
		const lit = doc.querySelector('nav[aria-label="Main"] [aria-current]')
		expect(text(lit)).toBe("Settings")
		expect(lit?.getAttribute("aria-current")).toBe("true")
	})

	it("is labelled a privacy policy in its heading and search title (Play User Data policy)", async () => {
		expect((await page("en")).title).toBe("Privacy policy · Rookdex")
		const nb = await page("nb")
		expect(nb.title).toBe("Personvernerklæring · Rookdex")
		expect(nb.querySelector("h1")?.textContent).toBe("Personvernerklæring")
	})

	it.each(["en", "nb"] as const)("names the legal basis, processor and right to complain in %s", async (locale) => {
		const { t } = translator(locale)
		const doc = await page(locale)
		expect(doc.querySelector('section[aria-labelledby="privacy-hosting"]')?.textContent).toContain(
			t("privacy.hostingBasis")
		)
		expect(doc.querySelector('section[aria-labelledby="privacy-who"]')?.textContent).toContain(
			t("privacy.rights")
		)
	})

	it.each(["en", "nb"] as const)("has the seven sections in order in %s", async (locale) => {
		const { t } = translator(locale)
		const doc = await page(locale)
		expect([...doc.querySelectorAll("main section > h2")].map((h) => h.textContent)).toEqual([
			t("privacy.storedTitle"),
			t("privacy.leavesTitle"),
			t("privacy.hostingTitle"),
			t("privacy.linksTitle"),
			t("privacy.androidTitle"),
			t("privacy.deleteTitle"),
			t("privacy.whoTitle"),
		])
		for (const section of doc.querySelectorAll("main section")) {
			const id = section.getAttribute("aria-labelledby")
			expect(id && doc.getElementById(id)?.tagName).toBe("H2")
		}
	})

	it("dates the text in each language's own format", async () => {
		expect(text((await page("en")).querySelector(".meta"))).toMatch(
			/^Last updated \d{1,2} [A-Z][a-z]+ 20\d\d$/
		)
		expect(text((await page("nb")).querySelector(".meta"))).toMatch(
			/^Sist oppdatert \d{1,2}\. [a-zæøå]+ 20\d\d$/
		)
	})

	it("lists the three things stored on the device", async () => {
		const doc = await page("en")
		const items = [...doc.querySelectorAll('section[aria-labelledby="privacy-stored"] li')]
		expect(items.map((li) => li.textContent)).toEqual([
			"Your profiles and what you have ticked off (IndexedDB).",
			'Which profile is active, the language you picked, and three notes that a message was already shown: the install prompt, the storage hint and "update later" (localStorage).',
			"An offline copy of the site, so it works without a network (the service worker cache).",
		])
	})

	it.each(["en", "nb"] as const)(
		"names the Settings button by its own label and links to it in %s",
		async (locale) => {
			const { t } = translator(locale)
			const doc = await page(locale)
			const section = doc.querySelector('section[aria-labelledby="privacy-delete"]')
			expect(section?.textContent).toContain(t("settings.deleteAll"))
			expect(section?.querySelector("a")?.getAttribute("href")).toBe(
				`/${locale}/settings/#settings-data`
			)
		}
	)

	it("links Cloudflare's and Chrome's policies out in a new tab", async () => {
		const doc = await page("nb")
		const hrefs = [...doc.querySelectorAll('main a[target="_blank"]')].map((a) =>
			a.getAttribute("href")
		)
		expect(hrefs).toEqual([
			"https://www.cloudflare.com/privacypolicy/",
			"https://www.google.com/chrome/privacy/",
		])
		expect(text(doc.querySelector('a[href="https://www.cloudflare.com/privacypolicy/"]'))).toContain(
			"(på engelsk)"
		)
	})

	it("names who runs Rookdex and gives the contact address", async () => {
		const doc = await page("en")
		const section = doc.querySelector('section[aria-labelledby="privacy-who"]')
		expect(section?.textContent).toContain("Rookdex is run by Malin Fossum in Norway.")
		expect(section?.querySelector('a[href="mailto:legal@rookdex.app"]')?.textContent).toBe(
			"legal@rookdex.app"
		)
	})

	it("has no axe violations in either language", async () => {
		for (const locale of ["en", "nb"] as const) {
			const doc = await page(locale)
			expect(await axeViolations(`<!doctype html>${doc.documentElement.outerHTML}`)).toEqual([])
		}
	})

	it("uses an axe harness that can go red", async () => {
		expect(
			await axeViolations('<!doctype html><html lang="en"><title>x</title><main><img src="a.png"></main></html>')
		).toContain("image-alt")
	})
})
```

- [ ] **Step 3: Run the tests to see them fail**

Run: `npx vitest run src/model/seo.test.ts src/test/privacy-page.test.ts`
Expected: FAIL. The SEO test lacks `"privacy"`; the page test cannot resolve `../pages/[locale]/privacy.astro`.

- [ ] **Step 4: Add `privacy` to `indexablePaths`**

In `src/model/seo.ts`, inside `indexablePaths`:

```ts
	return [
		"",
		"tracker",
		"tracker/sources",
		"news",
		"privacy",
		...validSlugs(guideSlugs).map((slug) => `guides/${slug}`),
	]
```

- [ ] **Step 5: Add the copy to both bundles**

Add after `"seo.titles.settings"` in `src/locales/en.json`:

```json
	"seo.titles.privacy": "Privacy policy · Rookdex",
```

and in `src/locales/nb.json`:

```json
	"seo.titles.privacy": "Personvernerklæring · Rookdex",
```

Add this block to `src/locales/en.json`, after the last `settings.*` key (keep valid JSON: watch the commas):

```json
	"privacy.title": "Privacy policy",
	"privacy.description": "What Rookdex stores on your device, what leaves it (nothing) and how to delete it.",
	"privacy.intro": "Your progress stays on your device. There is no account and nothing to sign up for.",
	"privacy.updated": "Last updated {date}",
	"privacy.storedTitle": "What Rookdex stores, on your device only",
	"privacy.storedBody": "Rookdex keeps a few things in your browser's storage on this device:",
	"privacy.storedProfiles": "Your profiles and what you have ticked off (IndexedDB).",
	"privacy.storedChoices": "Which profile is active, the language you picked, and three notes that a message was already shown: the install prompt, the storage hint and \"update later\" (localStorage).",
	"privacy.storedOffline": "An offline copy of the site, so it works without a network (the service worker cache).",
	"privacy.leavesTitle": "What leaves your device: nothing",
	"privacy.leavesBody": "There is no account, no cookies, no analytics, no ads and no trackers. The fonts come from Rookdex itself, not from a font service.",
	"privacy.hostingTitle": "Hosting",
	"privacy.hostingBody": "Cloudflare serves the site. Like any web host, it sees your IP address so it can deliver the pages to you. Rookdex runs no server code of its own and keeps no logs.",
	"privacy.hostingBasis": "Cloudflare does this for Rookdex as a data processor, under its data processing agreement. Its network is global, so a request may be handled outside the EEA, and that agreement covers it with the EU's standard contractual clauses. The legal basis is a legitimate interest in delivering the site to you safely (GDPR Article 6(1)(f)). Rookdex keeps nothing itself, so there is nothing to retain or delete on its side.",
	"privacy.hostingLink": "Cloudflare's privacy policy",
	"privacy.linksTitle": "Links to other sites",
	"privacy.linksBody": "Sources, news reports and the GitHub link take you to other sites. Their own privacy policies apply there.",
	"privacy.androidTitle": "The Android app",
	"privacy.androidBody": "The Rookdex app on Google Play is this website opened through Chrome. Everything on this page applies to the app, and Chrome's own privacy notice applies to Chrome.",
	"privacy.androidLink": "Chrome's privacy notice",
	"privacy.deleteTitle": "Delete your data",
	"privacy.deleteBody": "Go to Settings and choose \"{button}\". Uninstalling the app or clearing this site's data in your browser does the same.",
	"privacy.deleteLink": "Open Settings",
	"privacy.whoTitle": "Who runs Rookdex",
	"privacy.whoBody": "Rookdex is run by Malin Fossum in Norway.",
	"privacy.contact": "Questions about privacy:",
	"privacy.rights": "You can ask what is processed about you, and you can complain to Datatilsynet, the Norwegian Data Protection Authority.",
	"privacy.changes": "If Rookdex ever stores anything off your device, for example accounts, this page changes before that ships.",
```

And to `src/locales/nb.json`, in the same position:

```json
	"privacy.title": "Personvernerklæring",
	"privacy.description": "Hva Rookdex lagrer på enheten din, hva som forlater den (ingenting) og hvordan du sletter det.",
	"privacy.intro": "Fremgangen din blir på enheten din. Det finnes ingen konto og ingenting å registrere seg for.",
	"privacy.updated": "Sist oppdatert {date}",
	"privacy.storedTitle": "Hva Rookdex lagrer, bare på enheten din",
	"privacy.storedBody": "Rookdex lagrer noen få ting i nettleserens lagring på denne enheten:",
	"privacy.storedProfiles": "Profilene dine og det du har krysset av (IndexedDB).",
	"privacy.storedChoices": "Hvilken profil som er aktiv, språket du valgte, og tre merknader om at en melding allerede er vist: installeringsforslaget, lagringstipset og «oppdater senere» (localStorage).",
	"privacy.storedOffline": "En kopi av nettstedet som virker uten nett (service worker-bufferen).",
	"privacy.leavesTitle": "Hva som forlater enheten din: ingenting",
	"privacy.leavesBody": "Det finnes ingen konto, ingen informasjonskapsler, ingen analyse, ingen reklame og ingen sporing. Skriftene kommer fra Rookdex selv, ikke fra en skrifttjeneste.",
	"privacy.hostingTitle": "Drift",
	"privacy.hostingBody": "Cloudflare leverer nettstedet. Som alle nettverter ser Cloudflare IP-adressen din for å kunne levere sidene. Rookdex kjører ingen egen serverkode og fører ingen logger.",
	"privacy.hostingBasis": "Cloudflare gjør dette for Rookdex som databehandler, etter sin databehandleravtale. Nettverket er globalt, så en forespørsel kan bli behandlet utenfor EØS, og avtalen dekker det med EUs standard personvernbestemmelser. Behandlingsgrunnlaget er en berettiget interesse i å levere nettstedet trygt til deg (personvernforordningen artikkel 6 nr. 1 bokstav f). Rookdex lagrer ingenting selv, så det finnes ingenting å oppbevare eller slette hos Rookdex.",
	"privacy.hostingLink": "Cloudflares personvernerklæring (på engelsk)",
	"privacy.linksTitle": "Lenker til andre nettsteder",
	"privacy.linksBody": "Kilder, nyhetssaker og GitHub-lenken tar deg til andre nettsteder. Der gjelder deres egne personvernerklæringer.",
	"privacy.androidTitle": "Android-appen",
	"privacy.androidBody": "Rookdex-appen på Google Play er dette nettstedet åpnet gjennom Chrome. Alt på denne siden gjelder for appen, og Chromes egen personvernerklæring gjelder for Chrome.",
	"privacy.androidLink": "Chromes personvernerklæring",
	"privacy.deleteTitle": "Slett dataene dine",
	"privacy.deleteBody": "Gå til Innstillinger og velg «{button}». Å avinstallere appen eller slette nettstedets data i nettleseren gjør det samme.",
	"privacy.deleteLink": "Åpne Innstillinger",
	"privacy.whoTitle": "Hvem som driver Rookdex",
	"privacy.whoBody": "Rookdex drives av Malin Fossum i Norge.",
	"privacy.contact": "Spørsmål om personvern:",
	"privacy.rights": "Du kan spørre hva som behandles om deg, og du kan klage til Datatilsynet.",
	"privacy.changes": "Hvis Rookdex noen gang lagrer noe utenfor enheten din, for eksempel kontoer, endres denne siden før det lanseres.",
```

- [ ] **Step 6: Create the page**

Create `src/pages/[locale]/privacy.astro`:

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import ExternalLink from "../../components/ExternalLink.astro"
import { isLocale, type Locale, locales, translator } from "../../i18n"
import Base from "../../layouts/Base.astro"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale }, props: {} }))
}

// The privacy page (Android spec §3), a sub-page of Settings. Any new storage, network call or
// third party updates this page in the same PR (spec §8).
const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const { t } = translator(locale as Locale)
// The day this text last changed. Move it with every change to the privacy copy.
const UPDATED = new Date("2026-10-17T00:00:00Z")
const dateLocale = locale === "nb" ? "nb-NO" : "en-GB"
const updated = new Intl.DateTimeFormat(dateLocale, { dateStyle: "long", timeZone: "UTC" }).format(
	UPDATED
)
---

<Base
	locale={locale}
	title={t("seo.titles.privacy")}
	description={t("privacy.description")}
	path="privacy"
	tab="settings"
>
	<article class="privacy">
		<h1>{t("privacy.title")}</h1>
		<p class="tagline">{t("privacy.intro")}</p>
		<p class="meta">{t("privacy.updated", { date: updated })}</p>

		<section aria-labelledby="privacy-stored">
			<h2 id="privacy-stored">{t("privacy.storedTitle")}</h2>
			<p>{t("privacy.storedBody")}</p>
			<ul>
				<li>{t("privacy.storedProfiles")}</li>
				<li>{t("privacy.storedChoices")}</li>
				<li>{t("privacy.storedOffline")}</li>
			</ul>
		</section>

		<section aria-labelledby="privacy-leaves">
			<h2 id="privacy-leaves">{t("privacy.leavesTitle")}</h2>
			<p>{t("privacy.leavesBody")}</p>
		</section>

		<section aria-labelledby="privacy-hosting">
			<h2 id="privacy-hosting">{t("privacy.hostingTitle")}</h2>
			<p>{t("privacy.hostingBody")}</p>
			<p>{t("privacy.hostingBasis")}</p>
			<p>
				<ExternalLink href="https://www.cloudflare.com/privacypolicy/" locale={locale as Locale}>
					{t("privacy.hostingLink")}
				</ExternalLink>
			</p>
		</section>

		<section aria-labelledby="privacy-links">
			<h2 id="privacy-links">{t("privacy.linksTitle")}</h2>
			<p>{t("privacy.linksBody")}</p>
		</section>

		<section aria-labelledby="privacy-android">
			<h2 id="privacy-android">{t("privacy.androidTitle")}</h2>
			<p>{t("privacy.androidBody")}</p>
			<p>
				<ExternalLink href="https://www.google.com/chrome/privacy/" locale={locale as Locale}>
					{t("privacy.androidLink")}
				</ExternalLink>
			</p>
		</section>

		<section aria-labelledby="privacy-delete">
			<h2 id="privacy-delete">{t("privacy.deleteTitle")}</h2>
			<p>{t("privacy.deleteBody", { button: t("settings.deleteAll") })}</p>
			<p>
				<a href={`${getRelativeLocaleUrl(locale, "settings")}#settings-data`}>
					{t("privacy.deleteLink")}
				</a>
			</p>
		</section>

		<section aria-labelledby="privacy-who">
			<h2 id="privacy-who">{t("privacy.whoTitle")}</h2>
			<p>{t("privacy.whoBody")}</p>
			<p>
				{t("privacy.contact")} <a href="mailto:legal@rookdex.app">legal@rookdex.app</a>
			</p>
			<p>{t("privacy.rights")}</p>
			<p>{t("privacy.changes")}</p>
		</section>
	</article>
</Base>

<style>
	.meta {
		color: var(--text-muted);
		font-size: 0.875rem;
	}
</style>
```

`#settings-data` is the id of the "Your data" heading in `settings.astro`, where the delete button lives.

- [ ] **Step 7: Run the tests to see them pass**

Run: `npx vitest run src/model/seo.test.ts src/test/privacy-page.test.ts src/i18n`
Expected: PASS, including the bundle parity and copy-rule tests in `src/i18n`.

If the axe test reports a violation, fix the markup, not the test. If `region` or `landmark-*` rules fire on the shared layout, that is a real finding for every page: stop and report it rather than disabling the rule.

- [ ] **Step 8: Confirm the processor sentence against its source**

Open Cloudflare's customer data processing agreement (`https://www.cloudflare.com/cloudflare-customer-dpa/`) and confirm two facts `privacy.hostingBasis` rests on: it applies to self-serve accounts without a separate signature, and it covers transfers outside the EEA with the EU standard contractual clauses. If either is wrong, rewrite the sentence to match what the agreement says (both bundles) and tell Malin. Note the date checked in the commit message.

- [ ] **Step 8b: Add the page to Lighthouse CI**

In `lighthouserc.json`, add `"http://localhost/en/privacy/"` as the last entry of `ci.collect.url`.

- [ ] **Step 9: Commit**

```bash
sed -i 's/\r$//' src/locales/en.json src/locales/nb.json src/model/seo.ts src/model/seo.test.ts lighthouserc.json
git add src/pages/[locale]/privacy.astro src/test/privacy-page.test.ts src/locales/en.json src/locales/nb.json src/model/seo.ts src/model/seo.test.ts lighthouserc.json
git commit -m "Add the privacy page in English and Norwegian"
```

---

### Task 2: Footer privacy icon and the three-row phone footer

**Files:**
- Modify: `src/components/Footer.astro:40-61` (insert after the legal mail `<li>`), header comment at line 11
- Modify: `src/components/Footer.test.ts:20-36`
- Modify: `src/styles/global.css:309-350`
- Modify: `src/locales/en.json`, `src/locales/nb.json`

**Interfaces:**
- Consumes: route `/{locale}/privacy/` from Task 1.
- Produces: key `footer.privacy`; the footer's icon order GitHub, legal mail, privacy, About.

- [ ] **Step 1: Write the failing test**

In `src/components/Footer.test.ts`, replace the second `it` with:

```ts
	it("has four icon links named by hidden text, with hidden tooltips", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		const icons = [...doc.querySelectorAll(".footer-icons a")]
		expect(icons.map((a) => a.getAttribute("href"))).toEqual([
			"https://github.com/rookdex/rookdex",
			"mailto:legal@rookdex.app",
			`/${locale}/privacy/`,
			`/${locale}/settings/#about`,
		])
		expect(icons.map(hiddenName)).toEqual([
			t("footer.github"),
			t("footer.legal"),
			t("footer.privacy"),
			t("footer.about"),
		])
		for (const a of icons) {
			expect(a.hasAttribute("aria-label")).toBe(false)
			expect(a.classList.contains("has-tip")).toBe(true)
			expect(a.querySelector(".tip")?.getAttribute("aria-hidden")).toBe("true")
			expect(a.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
		}
		// GitHub leaves the site: new tab, the note, and the ↗ in its tooltip instead of an icon.
		expect(icons[0].getAttribute("target")).toBe("_blank")
		expect(icons[0].querySelector(".new-tab-note")).not.toBeNull()
		expect(icons[0].querySelector(".ext-icon")).toBeNull()
		expect(icons[0].querySelector(".tip")?.textContent).toBe(`${t("footer.github")} ↗`)
		// Privacy stays on the site.
		expect(icons[2].hasAttribute("target")).toBe(false)
		expect(icons[2].querySelector(".tip")?.textContent).toBe(t("footer.privacy"))
	})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/components/Footer.test.ts`
Expected: FAIL. Three hrefs instead of four, and `footer.privacy` is not a key.

- [ ] **Step 3: Add the key**

`src/locales/en.json`, after `"footer.legal"`:

```json
	"footer.privacy": "Privacy",
```

`src/locales/nb.json`, after `"footer.legal"`:

```json
	"footer.privacy": "Personvern",
```

- [ ] **Step 4: Add the icon**

In `src/components/Footer.astro`, insert this `<li>` between the legal mail `<li>` and the About `<li>`:

```astro
			<li>
				<a class="icon-link has-tip" href={getRelativeLocaleUrl(locale, "privacy")}>
					<svg
						viewBox="0 0 24 24"
						width="22"
						height="22"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M12 3 5 6v5c0 4.4 3 8.3 7 9.5 4-1.2 7-5.1 7-9.5V6z"></path>
					</svg>
					<span class="visually-hidden">{t("footer.privacy")}</span>
					<span class="tip" aria-hidden="true">{t("footer.privacy")}</span>
				</a>
			</li>
```

Change the header comment's "three icon links" to "four icon links".

- [ ] **Step 5: Run the test to see it pass**

Run: `npx vitest run src/components/Footer.test.ts src/i18n`
Expected: PASS.

- [ ] **Step 6: Make the phone footer three rows**

In `src/styles/global.css`, replace the `.footer-strip` baseline rule:

```css
.footer-strip {
	display: grid;
	grid-template-columns: 1fr;
	grid-template-areas:
		"icons"
		"chip"
		"copy";
	align-items: center;
	gap: var(--space-1);
}
```

Add the fourth tip inset after the `li:nth-child(3)` rule:

```css
.footer-icons li:nth-child(4) {
	--tip-inset: calc(3 * (var(--tap) + var(--space-1)));
}
```

Replace the comment above `.site-footer` (lines 309-312) with:

```css
/* The footer "HUD strip" (feedback spec §6, Android spec §4). Phone: the four icons, the chip and
   the © each take a row, because four icons and the © overflow 320 px by 35 px on one row. The
   English footer is N px at 320 (the Norwegian one is M px). From 768 px everything sits on one
   centre line. */
```

N and M are filled in from the measurement in Step 7, not guessed.

The 768 px and 1024 px rules switch `.footer-strip` to flex, so the grid areas don't apply there. Leave them alone.

- [ ] **Step 7: Measure the footer**

Start the dev server with `preview_start` (name from `.claude/launch.json`; add an `npm run dev` entry on port 4321 if none exists). In one batched round, for `/en/` and `/nb/` at 320×700, 768×1024 and 1024×768, run in the page:

```js
await document.fonts.ready
const box = (el) => el.getBoundingClientRect()
const strip = document.querySelector(".footer-strip")
const icons = [...document.querySelectorAll(".footer-icons a")].map(box)
const chip = box(document.querySelector(".status-chip"))
const copy = box(document.querySelector(".footer-copy"))
const mid = (b) => Math.round(b.top + b.height / 2)
const tip = document.querySelector(".footer-icons li:nth-child(4) .tip")
tip.style.visibility = "visible"
const tipBox = box(tip)
tip.style.visibility = ""
;({
	vw: innerWidth,
	pageScroll: document.documentElement.scrollWidth,
	stripOverflow: strip.scrollWidth - strip.clientWidth,
	iconSizes: icons.map((b) => `${Math.round(b.width)}x${Math.round(b.height)}`),
	iconMids: icons.map(mid),
	chipMid: mid(chip),
	copyMid: mid(copy),
	tipRight: Math.round(tipBox.right),
	footerHeight: Math.round(box(document.querySelector(".site-footer")).height),
})
```

Pass criteria:
- Every width: `pageScroll === vw`, `stripOverflow === 0`, every icon `44x44`, the four `iconMids` equal.
- 320: chip and © each on their own row below the icons; `tipRight <= vw - 16`.
- 768 and 1024: `iconMids`, `chipMid` and `copyMid` within 1 px of each other (one line).

Write the two 320 px `footerHeight` values into the CSS comment as N (en) and M (nb). Fix and re-measure once if anything fails; if it still fails, stop and show Malin.

Repeat the 320 px en check once with the root font size at 200 % (`document.documentElement.style.fontSize = "200%"`): `pageScroll === vw` and `stripOverflow === 0`.

- [ ] **Step 8: Commit**

```bash
sed -i 's/\r$//' src/components/Footer.astro src/components/Footer.test.ts src/styles/global.css src/locales/en.json src/locales/nb.json
git add src/components/Footer.astro src/components/Footer.test.ts src/styles/global.css src/locales/en.json src/locales/nb.json
git commit -m "Link the privacy page from the footer and give the phone footer a row for the ©"
```

---

### Task 3: Privacy row in Settings

**Files:**
- Modify: `src/pages/[locale]/settings.astro` (the "Your data" `<dl>`, after the `settings.transfer` row)
- Modify: `src/test/settings-page.test.ts`
- Modify: `src/locales/en.json`, `src/locales/nb.json`

**Interfaces:**
- Consumes: route `/{locale}/privacy/` from Task 1.
- Produces: keys `settings.privacy`, `settings.privacyLink`.

- [ ] **Step 1: Write the failing test**

Add to `src/test/settings-page.test.ts`, inside the `describe`, after the "points export and import" test:

```ts
	it.each(["en", "nb"] as const)("ends Your data with a link to the privacy page in %s", async (locale) => {
		const doc = await settings(locale)
		const rows = [...doc.querySelectorAll('section[aria-labelledby="settings-data"] dl > .row')]
		const last = rows.at(-1)
		expect(last?.querySelector("dt")?.textContent).toBe(locale === "en" ? "Privacy" : "Personvern")
		const link = last?.querySelector("dd a")
		expect(link?.textContent).toBe(locale === "en" ? "Privacy policy" : "Personvernerklæring")
		expect(link?.getAttribute("href")).toBe(`/${locale}/privacy/`)
	})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/test/settings-page.test.ts`
Expected: FAIL. The last row is "Export or import".

- [ ] **Step 3: Add the keys**

`src/locales/en.json`, after `"settings.transferLink"`:

```json
	"settings.privacy": "Privacy",
	"settings.privacyLink": "Privacy policy",
```

`src/locales/nb.json`, after `"settings.transferLink"`:

```json
	"settings.privacy": "Personvern",
	"settings.privacyLink": "Personvernerklæring",
```

- [ ] **Step 4: Add the row**

In `src/pages/[locale]/settings.astro`, after the `settings.transfer` row inside the "Your data" `<dl>`:

```astro
			<div class="row">
				<dt>{t("settings.privacy")}</dt>
				<dd><a href={getRelativeLocaleUrl(locale, "privacy")}>{t("settings.privacyLink")}</a></dd>
			</div>
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/test/settings-page.test.ts src/i18n`
Expected: PASS.

- [ ] **Step 6: Measure the row**

With the dev server from Task 2, at 320×700 on `/nb/settings/`: the new row's `dt` and the link share one centre line (within 1 px), the link is at least 44 px tall, and `document.documentElement.scrollWidth === 320`.

- [ ] **Step 7: Commit**

```bash
sed -i 's/\r$//' src/pages/[locale]/settings.astro src/test/settings-page.test.ts src/locales/en.json src/locales/nb.json
git add src/pages/[locale]/settings.astro src/test/settings-page.test.ts src/locales/en.json src/locales/nb.json
git commit -m "Link the privacy page from Settings"
```

---

### Task 4: Signing key guard

**Files:**
- Modify: `.gitignore`
- Create: `src/test/gitignore.test.ts`

**Interfaces:** none.

- [ ] **Step 1: Write the failing test**

Create `src/test/gitignore.test.ts`:

```ts
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = fileURLToPath(new URL("../..", import.meta.url))

/** True when git would refuse to track `path`. check-ignore exits 1 for "not ignored", which throws. */
function ignored(path: string): boolean {
	try {
		execFileSync("git", ["check-ignore", "--quiet", "--no-index", path], { cwd: root })
		return true
	} catch {
		return false
	}
}

describe("signing key guard (Android spec §6 step 3)", () => {
	it.each(["x.keystore", "x.jks", "signing-key-info.txt", "x.aab", "x.apk", "x.idsig", "nested/app/x.aab"])(
		"refuses %s",
		(path) => {
			expect(ignored(path)).toBe(true)
		}
	)

	it("still tracks an ordinary file, so the guard can go red", () => {
		expect(ignored("x.json")).toBe(false)
	})
})
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/test/gitignore.test.ts`
Expected: FAIL on every "refuses" case; the `x.json` case passes.

- [ ] **Step 3: Add the guard**

Append to `.gitignore`:

```gitignore

# Android signing key and app bundles (Android spec §6 step 3). The key lives in my password
# manager and one offline copy, never in the repo.
*.keystore
*.jks
signing-key-info.txt
*.aab
*.apk
*.idsig
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/test/gitignore.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
sed -i 's/\r$//' .gitignore
git add .gitignore src/test/gitignore.test.ts
git commit -m "Refuse Android signing keys and app bundles in git"
```

---

### Task 5: The Play Console text pack

**Files:**
- Create: `docs/android/listing.md`, `docs/android/data-safety.md`, `docs/android/content-rating.md`, `docs/android/app-content.md`, `docs/android/runbook.md`

**Interfaces:**
- Consumes: privacy URL from Task 1; graphics paths from Tasks 6 and 7.
- Produces: the files I paste from on 23 to 27 October.

- [ ] **Step 1: Write `docs/android/listing.md`**

````markdown
# Store listing

Pasted into Play Console, Grow, Store presence, Main store listing. English (en-US) is the default language; Norwegian (nb-NO) is a translation added under Manage translations.

## Contact details

| Field | Value |
|---|---|
| App name | Rookdex |
| Email | legal@rookdex.app |
| Website | https://rookdex.app |
| Privacy policy | https://rookdex.app/en/privacy/ |
| Category | Entertainment |
| Tags | none needed |

## English (en-US)

**Short description** (80 characters at most):

```text
Launch countdown, offline progress tracker and guides. Free, no account.
```

**Full description** (4,000 characters at most):

```text
Rookdex is an unofficial fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.

Rookdex is a free, open-source companion for GTA VI. It counts down to launch night, then helps you keep track of what you find.

What you get:
• A countdown to launch, then a dashboard of what to do next
• A tracker for collectibles, places, vehicles and wildlife, with progress per category
• Several profiles on one device, with export and import
• News: press reports that are not confirmed yet, each with its source
• A guide to what to sort out before launch night
• English and Norwegian

Private by design: no account, no ads, no analytics and no trackers. Your progress stays on your device, and the app works offline.

The app is the website rookdex.app in an app. The code is open on GitHub under the MIT licence.
```

## Norsk bokmål (nb-NO)

**Kort beskrivelse** (maks 80 tegn):

```text
Nedtelling, sjekkliste som virker uten nett, og guider. Gratis, ingen konto.
```

**Full beskrivelse** (maks 4000 tegn):

```text
Rookdex er et uoffisielt fanprosjekt. Det er ikke tilknyttet eller godkjent av Rockstar Games eller Take-Two Interactive.

Rookdex er en gratis følgesvenn med åpen kildekode for GTA VI. Den teller ned til lanseringskvelden og hjelper deg å holde oversikt over det du finner.

Dette får du:
• Nedtelling til lansering, deretter en oversikt over hva du kan gjøre nå
• Sjekkliste for samleobjekter, steder, kjøretøy og dyreliv, med fremdrift per kategori
• Flere profiler på én enhet, med eksport og import
• Nyheter: det pressen melder som ikke er bekreftet ennå, hver sak med kilde
• En guide til hva du bør ordne før lanseringskvelden
• Engelsk og norsk

Personvern først: ingen konto, ingen reklame, ingen analyse og ingen sporing. Fremgangen din blir på enheten din, og appen virker uten nett.

Appen er nettstedet rookdex.app i en app. Koden er åpen på GitHub under MIT-lisensen.
```

## Graphics

| Asset | File | Play's rule |
|---|---|---|
| App icon | `public/pwa-512x512.png` | 512 × 512, 32-bit PNG |
| Feature graphic | `docs/android/feature-graphic.jpg` | 1024 × 500, JPEG or 24-bit PNG |
| Phone screenshots, English | `docs/android/screenshots/en-*.png` | 2 to 8, 1080 × 1920 |
| Phone screenshots, Norwegian | `docs/android/screenshots/nb-*.png` | 2 to 8, 1080 × 1920 |

Upload the screenshots in this order: hub, tracker, news, settings.

The name, icon and graphics carry no "GTA", "Rockstar" or game art. The full description names the game once, to say what Rookdex is for.
````

- [ ] **Step 2: Check the description lengths**

Run:

```bash
node -e '
const md = require("node:fs").readFileSync("docs/android/listing.md", "utf8")
const blocks = [...md.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1])
const [enShort, enFull, nbShort, nbFull] = blocks
console.log({ enShort: [...enShort].length, enFull: [...enFull].length, nbShort: [...nbShort].length, nbFull: [...nbFull].length, gta: (enFull.match(/GTA/g) || []).length + "/" + (nbFull.match(/GTA/g) || []).length })'
```

Expected: both short descriptions at most 80, both full at most 4000, `gta: "1/1"`, and no "GTA" in either short description.

- [ ] **Step 3: Write `docs/android/data-safety.md`**

````markdown
# Data safety

Play Console, Policy, App content, Data safety. The answers rest on the privacy page (`/en/privacy/`, Android spec §3), checked against the code on 2026-10-16.

## Data collection and security

| Question | Answer | Why |
|---|---|---|
| Does your app collect or share any of the required user data types? | **No** | Everything Rookdex stores stays on the device: profiles and ticks in IndexedDB, the active profile, language and three "already seen" flags in localStorage, and the service worker cache. Nothing is sent anywhere. No account, no cookies, no analytics, no ads, no SDKs. |

Answering No skips the encryption, deletion and per-data-type questions. Play then shows "No data collected" and "No data shared with third parties".

## If Play asks about the IP address

Cloudflare sees the visitor's IP address to deliver the pages, like any web host. Rookdex runs no server code and keeps no logs (`wrangler.jsonc` serves static assets only). Play's data safety guidance does not count data processed only ephemerally to serve a request as collection, so the answer stays No. If a reviewer disagrees, the fallback is to declare "Approximate location: IP address", collected, not shared, processed ephemerally, required, for app functionality.

## Account deletion

Not applicable: Rookdex has no accounts. The "Delete your data" section of the privacy page explains how to delete on-device data.
````

- [ ] **Step 4: Write `docs/android/content-rating.md`**

````markdown
# Content rating (IARC)

Play Console, Policy, App content, Content rating, Start questionnaire.

| Field | Answer |
|---|---|
| Email | legal@rookdex.app |
| Category | Reference, News, or Educational |

| Question | Answer |
|---|---|
| Violence, blood or gore | No |
| Sexual content or nudity | No |
| Profanity or crude humour | No |
| Drugs, alcohol or tobacco | No |
| Gambling, simulated gambling or real-money betting | No |
| Users can interact or exchange content | No |
| User-generated content shared with others | No |
| Shares the user's current location | No |
| Digital purchases | No |
| Unrestricted internet access (a browser or search engine) | No. The app opens rookdex.app only; links to other sites open in the user's browser. |

Rookdex lists items and news about a mature game, but shows no game content itself: text, icons and links only.

Expected result: the lowest rating in every region (for example PEGI 3, ESRB Everyone). The target audience is still 18 and over (`app-content.md`); that is a separate form.
````

- [ ] **Step 5: Write `docs/android/app-content.md`**

````markdown
# App content

Play Console, Policy, App content. Every form except Data safety (`data-safety.md`) and Content rating (`content-rating.md`).

| Form | Answer |
|---|---|
| Privacy policy | https://rookdex.app/en/privacy/ |
| App access | All functionality is available without special access. No sign-in. |
| Ads | No, the app does not contain ads. |
| Target audience and content | 18 and over only. GTA VI is PEGI 18; any age under 13 pulls in the Families policy. Not appealing to children. |
| News app | No. The News tab is round-ups of unconfirmed press reports with links to the source, not a news publisher. |
| Advertising ID | No, the app does not use an advertising ID. |
| Government app | No |
| Financial features | None |
| Health | None |
````

- [ ] **Step 6: Write `docs/android/runbook.md`**

````markdown
# Play session runbook (23 to 27 October)

Android spec §6. Latest safe closed-test go-live: Thursday 29 October.

## Before 23 October

- [ ] Collect at least 14 testers' Google account emails, the ones they use in Play on an Android phone. iPhone users can't count.
- [ ] Keep that list private: in my password manager or my own notes, then in Play Console's tester list. Never in this repo, a doc, an issue or an AI chat. It is other people's personal data.

## 1. Account checks

- [ ] Identity verification approved.
- [ ] Device check (Play Console app on an Android phone with Google services), if Play still asks.
- [ ] Phone verification (unlocks after identity).

## 2. Build the bundle in PWABuilder

Open https://www.pwabuilder.com, enter `https://rookdex.app`, choose Android, Google Play.

| Option | Value |
|---|---|
| Package ID | `app.rookdex` |
| App name | Rookdex |
| Launcher name | Rookdex |
| Display mode | Standalone |
| Status bar colour | `#000000` |
| Splash colour | `#000000` |
| Notification delegation | Off |
| Location delegation | Off |
| Google Play Billing | Off |
| Fallback | Custom Tabs |
| Signing key | Create new |

## 3. Keep the key safe

- [ ] PWABuilder generates this key on its own servers. With Play App Signing on, it is only the **upload** key: Google holds the key that signs what users install. If I ever suspect the upload key leaked, reset it in Play Console (App integrity) the same way as a lost one.
- [ ] Unzip the download **outside** the repo.
- [ ] Keystore and its passwords go into my password manager, plus one offline copy.
- [ ] Never paste the key, its passwords or `signing-key-info.txt` into a chat or an AI tool. `.gitignore` refuses them if they land in the repo by mistake.
- [ ] If the key is lost: Play App Signing lets me reset the upload key. Slow, not fatal.

## 4. Create the app

- [ ] Play Console, Create app: default language English (United States), App, Free.
- [ ] Play App Signing on (the default).

## 5. Fill in the forms

- [ ] Store listing and graphics from `listing.md`.
- [ ] Data safety from `data-safety.md`.
- [ ] Content rating from `content-rating.md`.
- [ ] Everything else from `app-content.md`.

## 6. Closed testing

- [ ] Test and release, Closed testing: create a track, upload the `.aab`.
- [ ] Testers: an email list with every collected address (aim for 14 or 15, so one dropping out doesn't reset the 14-day clock).
- [ ] Send for review. When approved, share the opt-in link with every tester.
- [ ] Check the count of opted-in testers daily: the clock only counts days with 12 or more.

## 7. Fingerprints for PR 2

- [ ] Test and release, App integrity, App signing: copy the SHA-256 of the **app signing key** and of the **upload key**. Both are public values.
- [ ] Take them from Play Console only, never from `signing-key-info.txt` (it also holds the passwords).
- [ ] Build PR 2 (plan Part 2) with them. Target: merged by 31 October.

## 8. Device check on a tester phone (after PR 2 deploys)

- [ ] The app opens without a URL bar.
- [ ] The install prompt stays hidden.
- [ ] The in-app back and forward buttons behave next to Android's own back gesture.

## Later

- [ ] About 12 November: apply for production access (review takes up to 7 days).
- [ ] After launch (19 November): the hub screenshots show the countdown, which is gone by then. Re-run `docs/android/screenshots.mjs` against a local `npm run preview` with the hub path set to `?phase=after` (works on localhost only) and replace the hub shots in Play Console.
````

- [ ] **Step 7: Lint and commit**

Run: `npx biome ci docs/android` (markdown is outside Biome's scope today, so this should report no files or no errors; it guards against a stray `.json` or `.mjs`).

```bash
git add docs/android/listing.md docs/android/data-safety.md docs/android/content-rating.md docs/android/app-content.md docs/android/runbook.md
git commit -m "Add the Play Console text pack and session runbook"
```

---

### Task 6: Feature graphic

**Files:**
- Create: `docs/brand/feature.html`
- Modify: `docs/brand/serve.mjs`
- Create: `docs/android/feature-graphic.jpg`

**Interfaces:**
- Consumes: the OG banner's mark geometry and tokens (`docs/brand/og.html`).
- Produces: `docs/android/feature-graphic.jpg`, 1024 × 500, referenced by `listing.md`.

- [ ] **Step 1: Let `serve.mjs` save the feature graphic too**

In `docs/brand/serve.mjs`, replace the header comment and the POST branch:

```js
// Dev-only helper for the banner (spec §8) and the Play feature graphic (Android spec §5). Serves
// the repository over HTTP so the sources can load the self-hosted faces from node_modules, and
// accepts each render at a fixed POST path. Never deployed: docs/ is not part of the build.
```

```js
/** POST path to the file it writes, relative to the repository root. Nothing else is writable. */
const outputs = {
	"/og.png": "public/og.png",
	"/feature-graphic.jpg": "docs/android/feature-graphic.jpg",
}
```

(place `outputs` after `types`), and:

```js
	if (req.method === "POST" && Object.hasOwn(outputs, url.pathname)) {
		const chunks = []
		for await (const chunk of req) chunks.push(chunk)
		const body = Buffer.concat(chunks)
		await writeFile(join(root, outputs[url.pathname]), body)
		res.writeHead(200, { "content-type": "application/json" })
		res.end(JSON.stringify({ bytes: body.length }))
		return
	}
```

Add `".jpg": "image/jpeg",` to `types`.

- [ ] **Step 2: Create `docs/brand/feature.html`**

Copy `docs/brand/og.html` to `docs/brand/feature.html` and change exactly these parts:

1. `<title>Rookdex Play feature graphic source</title>`
2. The comment and SVG root:

```html
		<!-- 1024 × 500, the OG lockup scaled for Play (Android spec §5). No "GTA", "Rockstar" or
		     game art: Play's listing rules and the Take-Two trap in the design spec. -->
		<svg id="og" xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
			<title>Rookdex: your launch-night companion</title>
```

3. `<rect width="1024" height="500" fill="#000000" />`
4. The mark group: `<g transform="translate(0 61) scale(0.72)">` (contents unchanged).
5. The three texts:

```html
			<text id="wordmark" x="350" y="236" font-family="Bebas Neue" font-size="140" letter-spacing="5" fill="#f2f2f2">ROOKDEX</text>
			<text id="tagline" x="352" y="290" font-family="DM Sans Variable" font-weight="600" font-size="28" fill="#f2f2f2">Your launch-night companion.</text>
			<text id="muted" x="352" y="340" font-family="DM Sans Variable" font-weight="500" font-size="18" fill="#a3a3a3">track your progress · works offline · free · unofficial</text>
```

6. The stripe: `<rect x="0" y="480" width="1024" height="20" fill="url(#stripe)" />`
7. In `render()`: canvas `1024` × `500`, `drawImage(img, 0, 0, 1024, 500)`, fill the canvas black before drawing (`ctx.fillStyle = "#000000"; ctx.fillRect(0, 0, 1024, 500)`), and encode as JPEG:

```js
				const png = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.95))
				const saved = await (await fetch("/feature-graphic.jpg", { method: "POST", body: png })).json()
```

8. Update the `render()` comment to say 1024 × 500 and JPEG (Play's feature graphic takes no alpha).

- [ ] **Step 3: Render and check the edges**

Run `node docs/brand/serve.mjs` in the background, open `http://localhost:4400/docs/brand/feature.html` in the Browser pane, wait for "Fonts ready", then call `render()` from the console (`javascript_tool`).

Pass criteria from the returned object: `width 1024`, `height 500`, `bytes > 0`, every value in `edges` at most `964` (60 px right margin). If the wordmark edge is over, drop its `font-size` by 8 and render again; one more round at most, then stop and show Malin.

Screenshot the page and show Malin the result before committing. It is a public asset.

- [ ] **Step 4: Verify the file**

Run:

```bash
node -e 'const b=require("node:fs").readFileSync("docs/android/feature-graphic.jpg"); let i=2; while(i<b.length){ if(b[i]!==0xFF){break} const m=b[i+1], len=b.readUInt16BE(i+2); if(m>=0xC0&&m<=0xC3){ console.log({h:b.readUInt16BE(i+5), w:b.readUInt16BE(i+7), components:b[i+9], bytes:b.length}); break } i+=2+len }'
```

Expected: `{ h: 500, w: 1024, components: 3 }`, bytes under 15 MB.

- [ ] **Step 5: Lint and commit**

Run: `npx biome ci docs/brand` (Biome lints `.html` and `.mjs` here).

```bash
sed -i 's/\r$//' docs/brand/serve.mjs docs/brand/feature.html
git add docs/brand/serve.mjs docs/brand/feature.html docs/android/feature-graphic.jpg
git commit -m "Add the Play feature graphic and its source"
```

---

### Task 7: Phone screenshots

**Files:**
- Create: `docs/android/screenshots.mjs`
- Create: `docs/android/screenshots/{en,nb}-{1-hub,2-tracker,3-news,4-settings}.png`

**Interfaces:**
- Consumes: a production build served by `npm run preview` (`wrangler dev`, default `http://localhost:8787`), Tasks 1 to 3 merged into the build.
- Produces: eight 1080 × 1920 screenshots referenced by `listing.md`.

- [ ] **Step 1: Write the capture script**

Create `docs/android/screenshots.mjs`. The browser and CDP part is a copy of two ranges of `docs/readme/capture.mjs`: `browserPath` (lines 12 to 13) and lines 25 to 66, from `const profile` to `const wait` (spawn headless Brave with a throwaway profile, connect, `send`, `evaluate`, `wait`). Don't copy `base`, `here`, `tickIndexes`, `shots` or `viewport`; this script defines its own. The rest is:

```js
// Dev-only helper for the Play listing (Android spec §5). Screenshots a production build on a
// 360 × 640 phone at device scale 3 (1080 × 1920) in English and Norwegian, with a fresh browser
// profile and a few demo ticks, never real profiles. Run it against `npm run preview` after
// `npm run build`, or pass another origin as the first argument. Never deployed.
// The harness is a copy of docs/readme/capture.mjs on purpose: both are dev-only scripts.

const base = process.argv[2] ?? "http://localhost:8787"
const out = fileURLToPath(new URL("./screenshots/", import.meta.url))
const tickIndexes = [0, 1, 3, 4, 6, 8, 10, 12, 15]
const pages = [
	["1-hub", ""],
	["2-tracker", "tracker/"],
	["3-news", "news/"],
	["4-settings", "settings/"],
]

/** PNG colour type from the IHDR chunk: 2 is RGB, 6 is RGBA. Play takes no alpha. */
const pngColourType = (buffer) => buffer[25]

try {
	await send("Emulation.setDeviceMetricsOverride", {
		width: 360,
		height: 640,
		deviceScaleFactor: 3,
		mobile: true,
	})
	// First visit: let the service worker install, and mark the one-time hints as seen.
	await send("Page.navigate", { url: `${base}/en/` })
	await wait(3000)
	await evaluate(
		`localStorage.setItem("rookdex.install-prompt-seen", "1"); localStorage.setItem("rookdex.persist-hint-seen", "1")`
	)
	await send("Page.navigate", { url: `${base}/en/tracker/` })
	await wait(3000)
	const ticked = await evaluate(`(async () => {
		const boxes = [...document.querySelectorAll("input[type=checkbox]")]
		for (const i of ${JSON.stringify(tickIndexes)}) {
			boxes[i]?.click()
			await new Promise((r) => setTimeout(r, 60))
		}
		return document.querySelectorAll("input[type=checkbox]:checked").length
	})()`)
	console.log(`ticked ${ticked} items`)

	mkdirSync(out, { recursive: true })
	for (const locale of ["en", "nb"]) {
		for (const [name, path] of pages) {
			await send("Page.navigate", { url: `${base}/${locale}/${path}` })
			await wait(3000)
			await evaluate("window.scrollTo(0, 0)")
			const { result } = await send("Page.captureScreenshot", { format: "png" })
			const png = Buffer.from(result.data, "base64")
			const file = join(out, `${locale}-${name}.png`)
			writeFileSync(file, png)
			const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`
			console.log(`${locale}-${name}.png ${size} colour type ${pngColourType(png)}`)
		}
	}
} finally {
	socket.close()
	browser.kill()
	await wait(500)
	rmSync(profile, { recursive: true, force: true })
}
```

Imports at the top: `spawn` from `node:child_process`; `mkdirSync`, `mkdtempSync`, `rmSync`, `writeFileSync` from `node:fs`; `tmpdir` from `node:os`; `join` from `node:path`; `fileURLToPath` from `node:url`.

- [ ] **Step 2: Build, serve and capture**

```bash
npm run build
```

Start `npm run preview` in the background (it is `wrangler dev`; a rebuild under it wipes `dist/`, so don't rebuild while it runs). Then:

```bash
node docs/android/screenshots.mjs
```

Expected: `ticked 9 items`, eight lines each reading `1080x1920`. Stop the preview server afterwards.

- [ ] **Step 3: Handle alpha if Chrome wrote it**

If any line says `colour type 6`, change the capture to `{ format: "jpeg", quality: 95 }`, write `.jpg` files instead, drop the colour-type log, update `listing.md`'s graphics table to `screenshots/en-*.jpg` and `nb-*.jpg`, and capture again. If every line says `colour type 2`, keep PNG.

- [ ] **Step 4: Look at them**

Open all eight with the Read tool. Check: no install prompt, storage hint or update notice; the tracker shows the demo ticks and "Player 1" / "Spiller 1"; no real names; no game art or logos (plain-text mentions in the real UI are fine); the Norwegian shots are in Norwegian; nothing clipped at the bottom by the tab bar. Show Malin the four English shots before committing.

- [ ] **Step 5: Lint and commit**

Run: `npx biome ci docs/android`

```bash
sed -i 's/\r$//' docs/android/screenshots.mjs
git add docs/android/screenshots.mjs docs/android/screenshots docs/android/listing.md
git commit -m "Add the Play phone screenshots and their capture script"
```

---

### Task 8: Verify the branch and open PR 1

**Files:** none new.

- [ ] **Step 1: Full checks**

Run each and read the output:

```bash
npx vitest run
npx astro check
npm run build
```

Expected: all tests pass; no type errors; the build passes, including the SEO check (privacy is in the sitemap) and the external-link check (both new external links have `target="_blank"` and `rel="noopener noreferrer"`).

Then, in the LF worktree (`../rookdex-lf`, the main checkout shows CRLF noise), check out this branch and run `npx biome ci .`. Expected: no errors.

- [ ] **Step 2: Privacy page layout**

With the dev server, at 320×700 on `/en/privacy/` and `/nb/privacy/`: `document.documentElement.scrollWidth === 320`, the Settings tab is lit, the language switch goes to the other locale's privacy page. Repeat the scroll-width check on `/nb/privacy/` with the root font size at 200 % (`document.documentElement.style.fontSize = "200%"`): still no horizontal scroll. Screenshot `/nb/privacy/` at 320 for the PR.

- [ ] **Step 3: Lighthouse**

Run the Lighthouse CI recipe from `domain/astro.md` against `dist/` (or let CI's Lighthouse job run on the PR). Expected for `/en/privacy/`: accessibility 100, performance at least 90, SEO 100.

- [ ] **Step 4: Fresh-context review**

Dispatch one reviewer subagent on the most capable model with the spec, this plan and `git diff main...HEAD`. Fix what it confirms.

- [ ] **Step 5: Push and open the PR**

```bash
git push -u origin feat/android-play-prep
gh pr create --title "Privacy page and the Play Store prep pack" --body-file - <<'EOF'
Prepares Rookdex for Google Play as a Trusted Web Activity (Android spec, `docs/superpowers/specs/2026-10-16-rookdex-android-design.md`).

## What changes on the site

- New privacy page at `/en/privacy/` and `/nb/privacy/`: what is stored on the device, that nothing leaves it, hosting, the Android app, how to delete, who runs Rookdex. In the sitemap and Lighthouse CI.
- A fourth footer icon (shield) links to it. On phones the © now gets its own row, because four icons and the © overflow 320 px on one row.
- Settings, Your data ends with a Privacy row.

## What lands in docs

- `docs/android/`: store listing (EN and NB), data safety, content rating and App content answers, the runbook for my Play session, the feature graphic and eight phone screenshots.
- `docs/brand/feature.html` renders the feature graphic the same way the OG banner is rendered.

## Guard

- `.gitignore` refuses keystores, `signing-key-info.txt` and app bundles, with a test that proves the guard can go red.

`assetlinks.json` follows in a second PR, once Play Console shows the signing fingerprints.
EOF
```

Then call `get_status` on the ccd_pr tools, bind the PR if needed, and read its CI. Ask Malin to merge (merging is hers). After the deploy, check `https://rookdex.app/en/privacy/` returns 200.

---

## Part 2: PR 2, Digital Asset Links (after the first upload, by 31 October)

Runs only after runbook step 7, when Malin has copied both SHA-256 fingerprints from Play Console. They are public values; she pastes them into the chat.

### Task 9: `assetlinks.json`

**Files:**
- Create: `public/.well-known/assetlinks.json`
- Create: `src/test/assetlinks.test.ts`
- Modify: `integrations/precache.mjs`, `integrations/precache.test.ts`

**Interfaces:**
- Produces: `https://rookdex.app/.well-known/assetlinks.json`, read by Chrome and Google's Digital Asset Links service.

- [ ] **Step 0: Branch**

```bash
git switch main
git pull
git switch -c feat/assetlinks
```

- [ ] **Step 1: Write the failing tests**

Create `src/test/assetlinks.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

describe("assetlinks.json (Android spec §7)", () => {
	const statements = JSON.parse(
		readFileSync(new URL("../../public/.well-known/assetlinks.json", import.meta.url), "utf8")
	)

	it("has one statement that hands app.rookdex every URL", () => {
		expect(statements).toHaveLength(1)
		expect(statements[0].relation).toEqual(["delegate_permission/common.handle_all_urls"])
		expect(statements[0].target.namespace).toBe("android_app")
		expect(statements[0].target.package_name).toBe("app.rookdex")
	})

	it("lists two distinct SHA-256 fingerprints: the app signing key and the upload key", () => {
		const prints: string[] = statements[0].target.sha256_cert_fingerprints
		expect(prints).toHaveLength(2)
		expect(new Set(prints).size).toBe(2)
		for (const print of prints) expect(print).toMatch(FINGERPRINT)
	})
})
```

In `integrations/precache.test.ts`, add next to the existing `shouldPrecache` cases (match the file's existing style for `it`/`it.each`):

```ts
	it("skips the Digital Asset Links file: Google fetches it, not the app", () => {
		expect(shouldPrecache(".well-known/assetlinks.json")).toBe(false)
	})
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/test/assetlinks.test.ts integrations/precache.test.ts`
Expected: FAIL. The file doesn't exist, and `shouldPrecache` returns true.

- [ ] **Step 3: Create the file**

`public/.well-known/assetlinks.json`, with the two values Malin copied from Play Console, App integrity (app signing key first, upload key second), in uppercase colon form:

```json
[
	{
		"relation": ["delegate_permission/common.handle_all_urls"],
		"target": {
			"namespace": "android_app",
			"package_name": "app.rookdex",
			"sha256_cert_fingerprints": ["<app signing key SHA-256 from Play Console>", "<upload key SHA-256 from Play Console>"]
		}
	}
]
```

The two angle-bracket values are the only inputs this plan can't know in advance; the test fails until both are real fingerprints.

- [ ] **Step 4: Skip it in the precache**

In `integrations/precache.mjs`, inside `shouldPrecache`, after the `og.` check:

```js
	if (file.startsWith(".well-known/")) return false
```

and add "the Digital Asset Links file" to the list in the function's doc comment.

- [ ] **Step 5: Run them to see them pass**

Run: `npx vitest run src/test/assetlinks.test.ts integrations/precache.test.ts`
Expected: PASS.

- [ ] **Step 6: Check the build ships the dot folder**

```bash
npm run build
ls dist/.well-known/assetlinks.json
```

Expected: the file exists in `dist/`.

- [ ] **Step 7: Commit, push, open the PR**

```bash
sed -i 's/\r$//' integrations/precache.mjs integrations/precache.test.ts
git add public/.well-known/assetlinks.json src/test/assetlinks.test.ts integrations/precache.mjs integrations/precache.test.ts
git commit -m "Add Digital Asset Links for the Android app"
git push -u origin feat/assetlinks
gh pr create --title "Digital Asset Links for the Android app" --body "Adds \`/.well-known/assetlinks.json\` for \`app.rookdex\` with the Play app signing key and the upload key (Android spec §7), so the app opens without Chrome's URL bar. Skipped by the precache: Google fetches it, not the app."
```

- [ ] **Step 8: Check the preview before merging**

On the PR's preview URL: `/.well-known/assetlinks.json` returns 200 with `content-type: application/json`. If it 404s, the fix belongs in this PR (an asset-include rule in `wrangler.jsonc`), not a workaround.

- [ ] **Step 9: After the production deploy**

- `https://rookdex.app/.well-known/assetlinks.json` returns 200 with `application/json`.
- Google's Statement List tester (`https://developers.google.com/digital-asset-links/tools/generator`) with `rookdex.app`, `app.rookdex` and each fingerprint: "linked".
- Runbook step 8 on a tester phone: no URL bar.

---

## Considered and rejected (plan stress test)

- **Adding `axe-core` as a direct devDependency.** It is already installed through vitest-axe at 4.13.0. If that ever changes, the privacy test fails loudly on a missing file, not silently. Adding a package needs an ask for no gain today.
- **`hreflang="en"` on the Norwegian Cloudflare link.** `ExternalLink` has no such prop, and the link text already says "(på engelsk)".
- **Generating the upload key locally with `keytool` instead of in PWABuilder.** It needs a JDK on my machine and a different PWABuilder flow. With Play App Signing the PWABuilder key is only the upload key, and Play can reset it.
- **A link to Datatilsynet on the privacy page.** The name is enough to find them; a third external link adds nothing a reader needs.

> Stress-tested 2026-10-17 (skill 1b85fca): 6 applied, 0 adapted, 1 decided by me.
