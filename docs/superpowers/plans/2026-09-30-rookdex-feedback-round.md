# Rookdex Feedback Round (Spec A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the feedback round: hover and focus everywhere, tooltips, one safe external-link component with a build check, tracker cards in an even grid with a Sources page, a compact footer, a tidier Settings, a corrected "Before you start" guide and an update notice backed by a waiting service worker.

**Architecture:** Shared building blocks come first (the `--bg-hover` token, the tooltip pattern with `src/scripts/tooltip.ts`, `ExternalLink.astro`), then a third Astro integration (`integrations/external-links.mjs`) that fails the build on any unsafe link. The feature tasks build on them: the footer, Settings, the tracker cards and the static Sources page. The last two tasks change the service worker (it waits, and a version header guards its cache) and add `src/scripts/update-notice.ts`, which `register-sw.ts` hands its registration to.

**Tech Stack:** Astro 7 (static output, i18n routing, Container API in tests), React 19 islands, Vitest 5 (node environment for `.astro`, jsdom for islands and scripts), jsdom 30 (already a devDependency), Cloudflare Workers static assets (`_headers`). No new packages.

**Spec:** `docs/superpowers/specs/2026-09-25-rookdex-feedback-round-design.md` (+ `2026-09-25-rookdex-feedback-round-stress-test.md`). Read both before Task 1.

## Global Constraints

- No new npm packages. jsdom (already a devDependency) is the only HTML parser, used by the build check.
- Every control is at least 44 × 44 px (`--tap`).
- No raw hex outside `src/styles/tokens.css` (`src/styles/tokens.test.ts` enforces it for `.css`, `.astro`, `.tsx`). The one new token is `--bg-hover: #161616`.
- Every `:hover` rule in `global.css` sits inside `@media (hover: hover)`; touch gets `:active`. Transitions are 120 ms. Every transition, animation and glow stops under `prefers-reduced-motion: reduce`.
- Focus is the hover lift plus the 2 px pink outline at 2 px offset (inset −2 px for tabs and icon buttons). On pink-filled surfaces the outline is white (`--text`).
- Nothing with a tooltip, and nothing rendered by `ExternalLink`, takes `aria-label`. Names come from visually hidden text; tooltips are `aria-hidden="true"` children.
- Every link that leaves rookdex.app goes through `src/components/ExternalLink.astro`, which accepts `https://` only. Guide bodies have no inline external links.
- The CSP in `astro.config.mjs` does not change. New scripts are bundled module scripts. No `style="…"` attributes in markup; the only runtime style write is `style.setProperty("--notice-h", …)` through the CSSOM, which `style-src 'self'` allows.
- **Astro scoped styles do not reach into child components.** A page's `<style>` rule like `.row a` never matches the `<a>` that `ExternalLink` renders. Use `:global(a)` inside the scoped selector, or put the rule in `global.css`.
- Copy lives in `src/i18n/en.ts` and `src/i18n/no.ts` (`no` is typed as `Strings`, so both change in the same task). No `!`, no "leak", no "ROOKDEX" in strings (`copy.test.ts`). Copy quoted in the spec is final.
- Mobile-first CSS: base rules target the phone; only `min-width: 768px` and `min-width: 1024px` queries.
- Code style: Biome (tabs, double quotes, no semicolons, line width 100). Local lint: `npx biome ci --line-ending=auto .`. Before every commit, run `npx biome check --write <the files this task touched>`: it fixes format and import order, which the plan's snippets don't always match. This checkout shows CRLF-only errors, so confirm lint in an LF worktree (`git -c core.autocrlf=false worktree add ../rookdex-lf HEAD`) before trusting a red local run.
- Commits: imperative sentence subject like the repo history ("Add …", "Keep …"), author `malinfossum.dev@proton.me`, no `Co-Authored-By`, no AI attribution, no em dashes anywhere (code, comments, copy, commits, PR).
- Branch: `feedback-spec` (already rebased on `main` at `d219974`). Test one file with `npx vitest run <path>`; the whole suite with `npm test`; types with `npm run check`; the build (which runs all three integrations) with `npm run build`.

**Deviations from the spec, all small and deliberate (list them under "Rulings" in the PR):**
1. `ExternalLink` takes a required `locale` prop instead of reading `Astro.currentLocale`. Every component here already takes `locale`, and Container API renders in tests have no current locale.
2. The News page's rumour links go through `ExternalLink` too. The spec's list in §3.1 missed them, and the build check (§11) would fail the build otherwise.
3. Book links, the Sources chip and the Sources page's back links use absolute paths (`/{locale}/tracker/sources/#<id>`, `/{locale}/tracker/#item-<id>`). Same targets as the spec's relative ones, but they don't depend on the trailing slash.
4. Tooltip colours are `color-mix` of `--text` into `--bg` (13 % is `#1f1f1f`, 21 % is `#333333` to the nearest step), because raw hex is banned outside `tokens.css` and the spec adds only one token.
5. The footer chip strings and the © line are stored in sentence case and set in capitals by CSS, so screen readers read words, not letters.
6. `tracker.sources` stays (its text "Sources" is exactly the tooltip and chip text) and is reused; `tracker.report` goes; `tracker.reportSoon` becomes "Report: coming soon" and is both the tooltip and the flag's hidden name.
7. `deleteAllData` drops its `storage` parameter, because it no longer touches localStorage.
8. The Sources page needs search titles, which the spec doesn't give: "Sources for the GTA 6 tracker · Rookdex" and "Kilder for GTA 6-sjekklisten · Rookdex". Its description is the lede. Malin approved them at review (2026-09-30).
9. Tab bar CSS switches `[aria-current="page"]` to `[aria-current]`, so the Tracker tab keeps its look on the Sources page.
10. `tooltip.ts` also listens to `pointerover` (to know which control is hovered when Escape is pressed) and `click` (the tap rule), on top of the spec's three listeners.
11. The ≥ 1024 px two-column `.item-groups` grid goes: each group heading now spans the list, and the cards form the grid.
12. The update notice also counts an active worker as "had a controller" (`registration.active`), not only `container.controller`. A hard reload leaves a page uncontrolled under an active worker. Without this, that page would keep running old code after an update and 404 on late chunks. Cost: two tabs opened on the very first visit can reload once.
13. On a phone the footer strip is a two-row grid: icons and © share one centre line, the chip takes the second row. The spec's "icons, chip and © share one centre line" can't hold with the 169 px target at 320 px (the Norwegian chip is 219 px wide). This is the layout of the mockup Malin approved; from 768 px all three share one line as the spec says.
14. The update card sits right after the tab bar, before `<main>`, not after it (spec §10.3). On the Tracker, keyboard users would otherwise Tab through every card to reach Reload. The phone tab bar sets the precedent: first in the DOM, at the bottom of the screen. Malin's call at the stress test.
15. While the update card shows, the body's bottom padding grows by its height (spec §10.4 says it never shifts content). Without it the card hides the footer's links at the end of every page, which fails WCAG 2.4.11. Cost: on a page shorter than the screen, the footer moves up once when the card appears. Malin's call at the stress test.

**Settled at review (2026-09-30):** the Norwegian Sources lede and back link say "oversikten", matching the tab name "Oversikt" and the rest of the Norwegian UI. Malin picked it from a rendered comparison; the spec copy is updated to match.

## Review Focus

1. **In-page anchors and bare `<a>` elements in built pages** (the skip link `#main`, `#about`, the Sources chips' `#cat-…`, an `<a>` without `href`): the build check must pass them, never fail the build on every page. Pinned in Task 3.
2. **The longest item name on a card without a description, at 320 px:** the name wraps before the book icon and the flag never touches the book. Pinned by a measurement step in Task 6.
3. **Norwegian at 320 px:** the footer chip ("{n} dager til lansering") and the widest footer tooltip ("Fjerning og juridisk: e-post") stay inside the viewport. Pinned by a measurement step in Task 4.
4. **The update notice appearing while a dialog or a field has focus:** it must never move focus. Pinned in Task 11.
5. **`public/_headers` checked out with CRLF on Windows:** the version line must still land inside the `/*` block, and the real file must pass. Pinned in Task 10.

---

### Task 1: Hover token, hover and focus rules, tooltips

**Files:**
- Create: `docs/superpowers/plans/2026-09-30-rookdex-feedback-round.md` (this plan, committed in Step 0)
- Modify: `src/styles/tokens.css`, `src/styles/tokens.test.ts`
- Modify: `src/styles/global.css` (hover colours at lines 145-147, 212-215, 251-254, 837-840; new sections)
- Create: `src/styles/hover.test.ts`
- Create: `src/scripts/tooltip.ts`, `src/scripts/tooltip.test.ts`
- Modify: `src/layouts/Base.astro:119-125` (wire the tooltips)
- Modify: `src/pages/[locale]/settings.astro` (hover and focus lift for `.row-button` and `.danger-button`, in its scoped `<style>`)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - CSS token `--bg-hover`.
  - Tooltip markup contract, used by Tasks 4 and 6: the control has class `has-tip` (plus `tip-end` when it sits at a right edge) and contains `<span class="tip" aria-hidden="true">text</span>`. The control's name is visually hidden text inside it.
  - `wireTooltips(doc: Document): () => void` in `src/scripts/tooltip.ts`, and `TAP_TIP_MS = 2000`. Attributes it sets on a `.has-tip` control: `data-tip-open` (tap) and `data-tip-hidden` (Escape).

- [ ] **Step 0: Commit the plan**

```bash
git add docs/superpowers/plans/2026-09-30-rookdex-feedback-round.md
git commit -m "Add the feedback-round implementation plan"
```

- [ ] **Step 1: Write the failing token and stylesheet tests**

In `src/styles/tokens.test.ts`, add `"--bg-hover": 1,` to the `counts` object right after `"--bg-raised": 1,`, and add three rows to the contrast table after `["--text-muted", "--bg-raised", 7],`:

```ts
		["--text", "--bg-hover", 7],
		["--text-muted", "--bg-hover", 7],
		["--link", "--bg-hover", 7],
```

Create `src/styles/hover.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("./global.css", import.meta.url), "utf8")

/** Top-level rules as [prelude, body] pairs, comments removed. */
function topLevel(text: string): [string, string][] {
	const source = text.replace(/\/\*[\s\S]*?\*\//g, "")
	const rules: [string, string][] = []
	let depth = 0
	let start = 0
	let open = 0
	for (let i = 0; i < source.length; i++) {
		if (source[i] === "{") {
			if (depth === 0) open = i
			depth++
		} else if (source[i] === "}") {
			depth--
			if (depth === 0) {
				rules.push([source.slice(start, open).trim(), source.slice(open + 1, i)])
				start = i + 1
			}
		}
	}
	return rules
}

describe("hover and focus rules (feedback spec §3.2)", () => {
	it("keeps every :hover rule behind (hover: hover), so touch never sticks", () => {
		const outside = topLevel(css).filter(
			([prelude, body]) =>
				!prelude.startsWith("@media (hover: hover)") && `${prelude}${body}`.includes(":hover")
		)
		expect(outside.map(([prelude]) => prelude)).toEqual([])
	})

	it("uses the --bg-hover token instead of hover colours mixed by hand", () => {
		expect(css).not.toContain("var(--text) 9%")
		expect(css).toContain("var(--bg-hover)")
	})

	it("switches every transition off under reduced motion", () => {
		const reduced = topLevel(css).filter(([prelude]) =>
			prelude.startsWith("@media (prefers-reduced-motion: reduce)")
		)
		// The universal rule, not any rule: `.bar-fill` already has `transition: none` today.
		const universal = /\*,\s*\*::before,\s*\*::after\s*\{\s*transition: none !important;/
		expect(reduced.some(([, body]) => universal.test(body))).toBe(true)
	})
})
```

- [ ] **Step 2: Run them to verify they fail**

Run: `npx vitest run src/styles`
Expected: FAIL. The token count lacks `--bg-hover`, `tokenValue("--bg-hover")` throws, `.history button:hover…` is outside a hover query, and `var(--text) 9%` is still present.

- [ ] **Step 3: Add the token**

In `src/styles/tokens.css`, after `--bg-raised: #0d0d0d;`:

```css
	/* Hover lift: one step above raised chrome (feedback spec §3.2). */
	--bg-hover: #161616;
```

- [ ] **Step 4: Replace the hand-mixed hover colours in `global.css`**

1. Delete the whole `.history button:hover:not(:disabled) { … }` rule (lines 145-147). The new section covers it.
2. In `.lang details[open] > summary`, change `background: color-mix(in srgb, var(--text) 9%, var(--bg));` to `background: var(--bg-hover);`. Keep the border line.
3. Replace

```css
.lang a:hover,
.lang a[aria-current="page"] {
	background: color-mix(in srgb, var(--text) 9%, var(--bg));
}
```

with

```css
.lang a[aria-current="page"] {
	background: var(--bg-hover);
}
```

4. Delete the `.menu button:hover, .menu button:focus-visible { background: var(--bg); }` rule (lines 837-840).
5. In the `a { … }` rule near the top, add two lines after `text-underline-offset: 0.15em;`:

```css
	text-decoration-thickness: 1px;
	text-decoration-color: color-mix(in srgb, var(--link) 40%, transparent);
```

- [ ] **Step 5: Add the hover, focus and tooltip sections to `global.css`**

Insert after the `.visually-hidden { … }` rule (end of "Utilities"):

```css
/* Hover and focus (feedback spec §3.2). Hover lifts to --bg-hover; things that can be selected
   also preview their selected marker. Hover lives behind (hover: hover), so touch gets :active. */

.tabbar a,
.chips button,
.chips a,
.history button,
.lang summary,
.lang a,
.menu button,
.actions button,
.profile-menu > button,
.hint button,
.deleted-list button,
.icon-link,
.item,
.item-icon {
	transition:
		background-color 120ms,
		border-color 120ms,
		color 120ms,
		box-shadow 120ms,
		filter 120ms;
}

@media (hover: hover) {
	a:hover {
		text-decoration-color: var(--link);
		text-decoration-thickness: 2px;
	}

	.tabbar a:hover,
	.history button:hover:not(:disabled),
	.lang summary:hover,
	.lang a:hover,
	.menu button:hover,
	.actions button:not(.primary):hover,
	.profile-menu > button:hover,
	.hint button:hover,
	.deleted-list button:hover,
	.icon-link:hover,
	.chips button:not([aria-pressed="true"]):hover {
		background: var(--bg-hover);
		color: var(--text);
	}

	.chips a:hover {
		background: var(--bg-hover);
	}

	/* Preview: a faint copy of the selected marker. */
	.chips button:not([aria-pressed="true"]):hover {
		border-color: color-mix(in srgb, var(--accent) 50%, transparent);
	}

	.tabbar a:not([aria-current]):hover::before {
		content: "";
		position: absolute;
		top: -1px;
		left: 50%;
		width: 32px;
		height: 2px;
		margin-left: -16px;
		border-radius: 0 0 2px 2px;
		background: color-mix(in srgb, var(--accent) 45%, transparent);
	}

	.actions .primary:hover {
		filter: brightness(1.12);
		box-shadow: var(--glow);
	}
}

@media (hover: hover) and (min-width: 768px) {
	.tabbar a:not([aria-current]):hover::before {
		content: none;
	}

	.tabbar a:not([aria-current]):hover::after {
		content: "";
		position: absolute;
		left: 12px;
		right: 12px;
		bottom: -1px;
		height: 2px;
		background: color-mix(in srgb, var(--accent) 45%, transparent);
	}
}

/* Touch: a press state instead of hover. */
@media (hover: none) {
	.tabbar a:active,
	.history button:active:not(:disabled),
	.lang a:active,
	.menu button:active,
	.actions button:not(.primary):active,
	.profile-menu > button:active,
	.hint button:active,
	.deleted-list button:active,
	.icon-link:active,
	.chips button:not([aria-pressed="true"]):active,
	.chips a:active {
		background: var(--bg-hover);
	}
}

/* Focus is the hover lift plus the pink outline. */
.tabbar a:focus-visible,
.history button:focus-visible,
.lang summary:focus-visible,
.lang a:focus-visible,
.menu button:focus-visible,
.actions button:not(.primary):focus-visible,
.profile-menu > button:focus-visible,
.hint button:focus-visible,
.deleted-list button:focus-visible,
.icon-link:focus-visible,
.chips button:not([aria-pressed="true"]):focus-visible,
.chips a:focus-visible {
	background: var(--bg-hover);
	color: var(--text);
}

.actions .primary:focus-visible {
	filter: brightness(1.12);
	box-shadow: var(--glow);
}

.tabbar a:focus-visible,
.history button:focus-visible,
.icon-link:focus-visible,
.item-icon:focus-visible {
	outline-offset: -2px;
}

/* Tooltips (feedback spec §3.3). The tip is an aria-hidden child of its control, so the control
   keeps its own name and the pointer can move onto the tip without it closing. */

.has-tip {
	position: relative;
}

.tip {
	position: absolute;
	bottom: calc(100% + 6px);
	left: 50%;
	z-index: 6;
	padding: 4px 8px;
	border: 1px solid color-mix(in srgb, var(--text) 21%, var(--bg));
	border-radius: 4px;
	background: color-mix(in srgb, var(--text) 13%, var(--bg));
	color: var(--text);
	font-family: var(--font-sans);
	font-size: 0.75rem;
	font-weight: 500;
	letter-spacing: normal;
	line-height: 1.4;
	text-transform: none;
	white-space: nowrap;
	transform: translateX(-50%);
	visibility: hidden;
	opacity: 0;
	transition:
		opacity 120ms,
		visibility 120ms;
}

/* Bridges the 6 px gap, so the pointer can travel onto the tip (WCAG 1.4.13, hoverable). */
.tip::before {
	content: "";
	position: absolute;
	inset-inline: 0;
	top: 100%;
	height: 8px;
}

/* Icons at a card's or the screen's right edge: anchor the tip right, so it never overflows. */
.tip-end .tip {
	left: auto;
	right: 0;
	transform: none;
}

@media (hover: hover) {
	.has-tip:hover > .tip {
		visibility: visible;
		opacity: 1;
	}
}

.has-tip:focus-visible > .tip,
.has-tip[data-tip-open] > .tip {
	visibility: visible;
	opacity: 1;
}

/* Last, so Escape beats hover and focus (same specificity). */
.has-tip[data-tip-hidden] > .tip {
	visibility: hidden;
	opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
	*,
	*::before,
	*::after {
		transition: none !important;
	}
}
```

Then, at the end of the `<style>` in `src/pages/[locale]/settings.astro`, add the Settings buttons' lift. It can't go in `global.css`: the scoped `.row-button` rule compiles to the same specificity, loads after `global.css` and wins every tie (measured: a focused Install button stayed `rgb(0, 0, 0)`).

```css
	/* Hover and focus lift (feedback spec §3.2). Here, not in global.css: these scoped rules load
	   after it and win every tie. */
	.row-button,
	.danger-button {
		transition:
			background-color 120ms,
			color 120ms;
	}

	@media (hover: hover) {
		.row-button:hover,
		.danger-button:not(:disabled):hover {
			background: var(--bg-hover);
		}
	}

	@media (hover: none) {
		.row-button:active,
		.danger-button:not(:disabled):active {
			background: var(--bg-hover);
		}
	}

	.row-button:focus-visible,
	.danger-button:not(:disabled):focus-visible {
		background: var(--bg-hover);
	}
```

`:not(:disabled)` puts the danger rules at (0,4,0), so they also beat `.actions .danger-button` inside the dialog. Pink on `#161616` is about 5.4:1.

- [ ] **Step 6: Run the stylesheet tests**

Run: `npx vitest run src/styles`
Expected: PASS.

- [ ] **Step 7: Write the failing tooltip script test**

Create `src/scripts/tooltip.test.ts`:

```ts
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TAP_TIP_MS, wireTooltips } from "./tooltip"

let unwire: () => void

beforeEach(() => {
	document.body.innerHTML = `
		<button type="button" class="has-tip" id="flag" aria-disabled="true">
			<span class="visually-hidden">Report: coming soon</span>
			<span class="tip" aria-hidden="true">Report: coming soon</span>
		</button>
		<a class="has-tip" id="book" href="#x"><span class="tip" aria-hidden="true">Sources</span></a>
		<button type="button" id="plain">Plain</button>`
	unwire = wireTooltips(document)
})

afterEach(() => {
	unwire()
	vi.useRealTimers()
})

const el = (id: string) => document.getElementById(id) as HTMLElement
const key = (name: string) =>
	new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true })

describe("tooltips (feedback spec §3.3)", () => {
	it("shows a tapped aria-disabled control's tooltip for about 2 s", () => {
		vi.useFakeTimers()
		el("flag").click()
		expect(el("flag").hasAttribute("data-tip-open")).toBe(true)
		vi.advanceTimersByTime(TAP_TIP_MS)
		expect(el("flag").hasAttribute("data-tip-open")).toBe(false)
	})

	it("ignores taps on enabled controls", () => {
		el("book").dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }))
		expect(el("book").hasAttribute("data-tip-open")).toBe(false)
	})

	it("hides the focused control's tooltip on Escape until focus moves", () => {
		el("book").focus()
		const event = key("Escape")
		document.dispatchEvent(event)
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(true)
		// Escape still reaches dialogs: nothing is cancelled.
		expect(event.defaultPrevented).toBe(false)
		el("plain").focus()
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(false)
	})

	it("hides the hovered control's tooltip on Escape until the pointer leaves", () => {
		el("book").dispatchEvent(new MouseEvent("pointerover", { bubbles: true }))
		document.dispatchEvent(key("Escape"))
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(true)
		// Moving onto the tip itself is still inside the control.
		const tip = el("book").querySelector(".tip") as HTMLElement
		el("book").dispatchEvent(new MouseEvent("pointerout", { bubbles: true, relatedTarget: tip }))
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(true)
		el("book").dispatchEvent(
			new MouseEvent("pointerout", { bubbles: true, relatedTarget: document.body })
		)
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(false)
	})

	it("closes a tapped tooltip on Escape", () => {
		el("flag").click()
		el("flag").focus()
		document.dispatchEvent(key("Escape"))
		expect(el("flag").hasAttribute("data-tip-open")).toBe(false)
		expect(el("flag").hasAttribute("data-tip-hidden")).toBe(true)
	})

	it("ignores other keys", () => {
		el("book").focus()
		document.dispatchEvent(key("Enter"))
		expect(el("book").hasAttribute("data-tip-hidden")).toBe(false)
	})
})
```

- [ ] **Step 8: Run it to verify it fails**

Run: `npx vitest run src/scripts/tooltip.test.ts`
Expected: FAIL with "Failed to resolve import ./tooltip".

- [ ] **Step 9: Write `src/scripts/tooltip.ts`**

```ts
// Tooltip behaviour CSS can't do alone (feedback spec §3.3). Escape hides the tooltip that is
// showing until the pointer leaves or focus moves (WCAG 1.4.13, dismissible), and a tap on an
// aria-disabled control shows its tooltip for a moment, so a control that does nothing on a phone
// still explains itself. One set of delegated listeners covers every `.has-tip` on the page,
// including the ones an island renders later.

export const TAP_TIP_MS = 2000
const TIP = ".has-tip"

function controlOf(target: EventTarget | null, selector = TIP): Element | null {
	return target instanceof Element ? target.closest(selector) : null
}

export function wireTooltips(doc: Document): () => void {
	const win = doc.defaultView ?? window
	let hovered: Element | null = null
	let timer: number | undefined

	const reset = (control: Element) => {
		control.removeAttribute("data-tip-hidden")
		control.removeAttribute("data-tip-open")
	}

	const onPointerOver = (event: Event) => {
		hovered = controlOf(event.target)
	}

	const onPointerOut = (event: Event) => {
		const control = controlOf(event.target)
		const next = (event as MouseEvent).relatedTarget
		if (!control || (next instanceof Node && control.contains(next))) return
		if (hovered === control) hovered = null
		reset(control)
	}

	const onFocusOut = (event: Event) => {
		const control = controlOf(event.target)
		if (control) reset(control)
	}

	// Never preventDefault: Escape must still close a dialog underneath.
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key !== "Escape") return
		for (const control of [hovered, controlOf(doc.activeElement)]) {
			if (!control) continue
			control.removeAttribute("data-tip-open")
			control.setAttribute("data-tip-hidden", "")
		}
	}

	const onClick = (event: Event) => {
		const control = controlOf(event.target, `${TIP}[aria-disabled="true"]`)
		if (!control) return
		control.removeAttribute("data-tip-hidden")
		control.setAttribute("data-tip-open", "")
		win.clearTimeout(timer)
		timer = win.setTimeout(() => control.removeAttribute("data-tip-open"), TAP_TIP_MS)
	}

	doc.addEventListener("pointerover", onPointerOver)
	doc.addEventListener("pointerout", onPointerOut)
	doc.addEventListener("focusout", onFocusOut)
	doc.addEventListener("keydown", onKeyDown)
	doc.addEventListener("click", onClick)
	return () => {
		win.clearTimeout(timer)
		doc.removeEventListener("pointerover", onPointerOver)
		doc.removeEventListener("pointerout", onPointerOut)
		doc.removeEventListener("focusout", onFocusOut)
		doc.removeEventListener("keydown", onKeyDown)
		doc.removeEventListener("click", onClick)
	}
}
```

- [ ] **Step 10: Run the tooltip test**

Run: `npx vitest run src/scripts/tooltip.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 11: Wire it on every page**

In `src/layouts/Base.astro`, replace the `<script>` block (lines 119-125) with:

```astro
		<script>
			import { wireOfflineNotice } from "../scripts/offline-notice"
			import { wireTooltips } from "../scripts/tooltip"
			import "../scripts/register-sw"

			const el = document.getElementById("offline-notice")
			if (el) wireOfflineNotice(el, window, el.dataset.text ?? "")
			wireTooltips(document)
		</script>
```

- [ ] **Step 12: Run the suite and the type check**

Run: `npm test` then `npm run check`
Expected: all tests PASS, `0 errors`.

- [ ] **Step 13: Commit**

```bash
git add src/styles src/scripts/tooltip.ts src/scripts/tooltip.test.ts src/layouts/Base.astro src/pages/[locale]/settings.astro
git commit -m "Add the hover token, hover and focus states and the tooltip pattern"
```

---

### Task 2: ExternalLink and every existing external link

**Files:**
- Create: `src/components/ExternalLink.astro`, `src/components/ExternalLink.test.ts`
- Modify: `src/components/Sources.astro`, `src/components/Sources.test.ts`
- Modify: `src/pages/[locale]/guides/[slug].astro:45` (pass `locale`)
- Modify: `src/pages/[locale]/news.astro:36-38`, `src/test/news-page.test.ts`
- Modify: `src/pages/[locale]/settings.astro:117` and its `<style>` (`.row a`)
- Modify: `src/components/Footer.astro:30`, `src/components/Footer.test.ts`
- Modify: `src/model/guides.ts:16-17`, `src/model/guides.test.ts`
- Modify: `src/i18n/en.ts`, `src/i18n/no.ts` (add `newTab`)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `<ExternalLink href locale class? icon?>slot</ExternalLink>`: props `{ href: string; locale: Locale; class?: string; icon?: boolean }`. Renders `<a href target="_blank" rel="noopener noreferrer" class>`, the slot, an `aria-hidden` ↗ SVG with class `ext-icon` when `icon` is true (default), then `<span class="visually-hidden new-tab-note"> (…)</span>`. Throws unless `href` starts with `https://`.
  - `Sources.astro` props become `{ urls: string[]; label: string; locale: Locale }`.
  - Copy key `newTab`: "opens in a new tab" / "åpnes i ny fane".

- [ ] **Step 1: Write the failing ExternalLink test**

Create `src/components/ExternalLink.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { renderDoc } from "../test/render"
import ExternalLink from "./ExternalLink.astro"

const link = (props: Record<string, unknown>, text = "GitHub") =>
	renderDoc(ExternalLink, { props, slots: { default: text } })

describe("ExternalLink (feedback spec §3.1)", () => {
	it("opens in a new tab without leaking the opener or the referrer", async () => {
		const doc = await link({ href: "https://github.com/rookdex/rookdex", locale: "en" })
		const a = doc.querySelector("a")
		expect(a?.getAttribute("href")).toBe("https://github.com/rookdex/rookdex")
		expect(a?.getAttribute("target")).toBe("_blank")
		expect(a?.getAttribute("rel")).toBe("noopener noreferrer")
		expect(a?.hasAttribute("aria-label")).toBe(false)
	})

	it("shows a hidden ↗ icon and says the tab opens, in each language", async () => {
		const en = await link({ href: "https://example.com/", locale: "en" })
		expect(en.querySelector("a svg.ext-icon")?.getAttribute("aria-hidden")).toBe("true")
		expect(en.querySelector(".visually-hidden.new-tab-note")?.textContent).toBe(
			" (opens in a new tab)"
		)
		const no = await link({ href: "https://example.com/", locale: "no" })
		expect(no.querySelector(".new-tab-note")?.textContent).toBe(" (åpnes i ny fane)")
	})

	it("drops the icon but keeps the note with icon={false}", async () => {
		const doc = await link({ href: "https://example.com/", locale: "en", icon: false })
		expect(doc.querySelector("svg.ext-icon")).toBeNull()
		expect(doc.querySelector(".new-tab-note")).not.toBeNull()
	})

	it("passes a class through", async () => {
		const doc = await link({ href: "https://example.com/", locale: "en", class: "icon-link" })
		expect(doc.querySelector("a")?.classList.contains("icon-link")).toBe(true)
	})

	it.each(["http://example.com/", "javascript:alert(1)", "/en/", "//example.com/"])(
		"refuses %s at build time",
		async (href) => {
			await expect(link({ href, locale: "en" })).rejects.toThrow(/https:\/\//)
		}
	)
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/components/ExternalLink.test.ts`
Expected: FAIL with "Failed to resolve import ./ExternalLink.astro".

- [ ] **Step 3: Add the copy key**

In `src/i18n/en.ts`, after `skipToContent: "Skip to content",` add `newTab: "opens in a new tab",`. In `src/i18n/no.ts`, after its `skipToContent` line add `newTab: "åpnes i ny fane",`.

- [ ] **Step 4: Write `src/components/ExternalLink.astro`**

```astro
---
import { type Locale, t } from "../i18n"

interface Props {
	href: string
	locale: Locale
	class?: string
	/** false for icon-only links: their tooltip carries the ↗ instead. */
	icon?: boolean
}

// Every link that leaves rookdex.app (feedback spec §3.1). No aria-label prop on purpose: it would
// override the hidden note. The new-tab-note class is the marker the build check looks for, and
// nothing else emits it.
const { href, locale, class: className, icon = true } = Astro.props
if (!href.startsWith("https://")) {
	throw new Error(`ExternalLink needs an https:// href, got "${href}"`)
}
const s = t(locale)
---

<a href={href} class={className} target="_blank" rel="noopener noreferrer"
	><slot />{
		icon && (
			<svg
				class="ext-icon"
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
				<path d="M7 17 17 7M9 7h8v8" />
			</svg>
		)
	}<span class="visually-hidden new-tab-note">{` (${s.newTab})`}</span></a
>
```

Add to `global.css` after the `a { … }` rule:

```css
/* The ↗ on external text links (feedback spec §3.1). */
.ext-icon {
	width: 0.8em;
	height: 0.8em;
	margin-inline-start: 0.2em;
	vertical-align: -0.05em;
}
```

- [ ] **Step 5: Run the ExternalLink test**

Run: `npx vitest run src/components/ExternalLink.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Tighten the guide schema, test first**

Add to `src/model/guides.test.ts` (inside the existing file, as its own `describe`; `guideSchema` is already exported from `./guides`):

```ts
describe("guide sources are https only (feedback spec §9)", () => {
	const base = { title: "T", summary: "S", updated: "2026-09-30" }

	it.each(["http://example.com/", "javascript:alert(1)", "data:text/html,x"])(
		"rejects %s",
		(url) => {
			expect(guideSchema.safeParse({ ...base, sources: [url] }).success).toBe(false)
		}
	)

	it("accepts https", () => {
		expect(guideSchema.safeParse({ ...base, sources: ["https://example.com/"] }).success).toBe(true)
	})
})
```

If `guideSchema` is not yet imported in that file, add it to the existing import from `./guides`.

Run: `npx vitest run src/model/guides.test.ts`
Expected: FAIL on the three rejections.

Then in `src/model/guides.ts` change `.array(z.string().url())` to `.array(z.url({ protocol: /^https$/ }))` (the same form `schema.ts` uses for seed sources) and update the comment above `guideSchema` to add: "Sources are https only, like the seed's, so no other scheme can reach a link (feedback spec §9)."

Run: `npx vitest run src/model/guides.test.ts`
Expected: PASS.

- [ ] **Step 7: Rewrite `src/components/Sources.astro` (the wrap fix), test first**

Replace the body of `src/components/Sources.test.ts`'s first test with:

```ts
	it("is a section labelled by its h2, each outlet link opening in a new tab", async () => {
		const doc = await renderDoc(Sources, {
			props: {
				urls: ["https://www.rockstargames.com/VI", "https://www.ign.com/articles/x"],
				label: "Kilder",
				locale: "no",
			},
		})
		const section = doc.querySelector("section")
		const heading = doc.getElementById(section?.getAttribute("aria-labelledby") ?? "")
		expect(heading?.tagName).toBe("H2")
		expect(heading?.textContent).toBe("Kilder")
		const links = [...doc.querySelectorAll("section a")].map((a) => [
			a.textContent?.replace(/\s+/g, " ").trim(),
			a.getAttribute("href"),
			a.getAttribute("target"),
		])
		expect(links).toEqual([
			["rockstargames.com (åpnes i ny fane)", "https://www.rockstargames.com/VI", "_blank"],
			["ign.com (åpnes i ny fane)", "https://www.ign.com/articles/x", "_blank"],
		])
	})
```

and add `locale: "en"` to the props of the "renders nothing" test.

Run: `npx vitest run src/components/Sources.test.ts`
Expected: FAIL (no `target`, no note).

Replace `src/components/Sources.astro` with:

```astro
---
import type { Locale } from "../i18n"
import { outletOf } from "../model/outlet"
import ExternalLink from "./ExternalLink.astro"

interface Props {
	urls: string[]
	label: string
	locale: Locale
}

// A quiet line under the guide: the label and the outlet links flow like one sentence (spec §9).
// The <h2> stays a real heading, because the section is labelled by it; only its look shrinks.
// Each <li> is an inline block, so a line can break between sources (feedback spec §9).
const { urls, label, locale } = Astro.props
---

{
	urls.length > 0 && (
		<section class="sources" aria-labelledby="sources">
			<h2 id="sources">{label}</h2>
			<ul>
				{urls.map((url) => (
					<li>
						<ExternalLink href={url} locale={locale}>
							{outletOf(url)}
						</ExternalLink>
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

	.sources ul {
		display: inline;
		margin: 0;
		padding: 0;
	}

	.sources li {
		display: inline-block;
	}

	.sources li:not(:last-child)::after {
		content: "·";
		margin-inline: var(--space-2);
		color: var(--text-muted);
	}

	/* The link is rendered by ExternalLink, outside this component's scope. */
	.sources :global(a) {
		white-space: nowrap;
	}
</style>
```

In `src/pages/[locale]/guides/[slug].astro`, change line 45 to:

```astro
		<Sources urls={entry.data.sources} label={s.guides.sources} locale={locale as Locale} />
```

Run: `npx vitest run src/components/Sources.test.ts`
Expected: PASS.

- [ ] **Step 8: News rumour links, test first**

Add to `src/test/news-page.test.ts`:

```ts
	it("links each rumour's report out in a new tab", async () => {
		const doc = await renderDoc(News, { params: { locale: "en" } })
		const links = [...doc.querySelectorAll(".rumour-list .meta a")]
		expect(links).toHaveLength(rumours.length)
		for (const a of links) {
			expect(a.getAttribute("target")).toBe("_blank")
			expect(a.getAttribute("rel")).toBe("noopener noreferrer")
			expect(a.querySelector(".new-tab-note")).not.toBeNull()
		}
	})
```

Run: `npx vitest run src/test/news-page.test.ts` (expect FAIL), then in `src/pages/[locale]/news.astro` import `ExternalLink from "../../components/ExternalLink.astro"` (first in the frontmatter imports; Biome sorts them) and replace lines 36-38 with:

```astro
											<ExternalLink href={press.url} locale={locale as Locale}>
												{fill(s.rumours.reportedBy, { outlet: outletOf(press.url) })}
											</ExternalLink>
```

Run: `npx vitest run src/test/news-page.test.ts`
Expected: PASS.

- [ ] **Step 9: Settings and footer GitHub links**

In `src/pages/[locale]/settings.astro`: import `ExternalLink from "../../components/ExternalLink.astro"` (first in the frontmatter imports; Biome sorts them); replace line 117 with

```astro
				<dd><ExternalLink href="https://github.com/rookdex/rookdex" locale={locale as Locale}>{s.settings.sourceLink}</ExternalLink></dd>
```

and in its `<style>`, change the selector `.row a,` to `.row :global(a),` (scoped styles can't reach the anchor ExternalLink renders).

In `src/components/Footer.astro`: import `ExternalLink from "./ExternalLink.astro"`; replace line 30 with

```astro
			<dd><ExternalLink href="https://github.com/rookdex/rookdex" locale={locale}>{s.footer.source}</ExternalLink></dd>
```

In `src/components/Footer.test.ts`, the second test's `dd` text list ends with `"GitHub (åpnes i ny fane)"` instead of `"GitHub"`, and the map normalises whitespace: `dd.textContent?.replace(/\s+/g, " ").trim()`.

- [ ] **Step 10: Run the suite, the type check and the build**

Run: `npm test`, `npm run check`, `npm run build`
Expected: all PASS; the build still logs `seo check passed`.

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Send every external link through one component that opens a new tab safely"
```

---

### Task 3: External-link build check

**Files:**
- Create: `integrations/external-links.mjs`, `integrations/external-links.test.ts`
- Modify: `astro.config.mjs:4-11`

**Interfaces:**
- Consumes: `listFiles(root)` from `integrations/precache.mjs`; the `.new-tab-note` marker from Task 2.
- Produces: `findUnsafeLinks(html: string, site: string): { href: string; reason: string }[]` and the default export `externalLinks()` (an Astro integration named `rookdex-external-links`).

- [ ] **Step 1: Write the failing test**

Create `integrations/external-links.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { findUnsafeLinks } from "./external-links.mjs"

const SITE = "https://rookdex.app"
const safe = (href: string) =>
	`<a href="${href}" target="_blank" rel="noopener noreferrer">x<span class="visually-hidden new-tab-note"> (opens in a new tab)</span></a>`
const check = (body: string) => findUnsafeLinks(`<!doctype html><body>${body}</body>`, SITE)

describe("findUnsafeLinks (feedback spec §11)", () => {
	it("passes a link rendered by ExternalLink", () => {
		expect(check(safe("https://github.com/rookdex/rookdex"))).toEqual([])
	})

	it("fails an external link without target=_blank", () => {
		const html = safe("https://example.com/").replace(' target="_blank"', "")
		expect(check(html)).toEqual([{ href: "https://example.com/", reason: "no target=_blank" }])
	})

	it("fails when rel lacks either token", () => {
		expect(check(safe("https://example.com/").replace("noopener noreferrer", "noopener"))).toEqual([
			{ href: "https://example.com/", reason: "rel lacks noopener or noreferrer" },
		])
		expect(
			check(safe("https://example.com/").replace("noopener noreferrer", "noreferrer"))
		).toEqual([{ href: "https://example.com/", reason: "rel lacks noopener or noreferrer" }])
	})

	it("matches rel tokens case-insensitively and in any spacing", () => {
		const html = safe("https://example.com/").replace(
			'rel="noopener noreferrer"',
			'REL="  NoReferrer   NoOpener "'
		)
		expect(check(html)).toEqual([])
	})

	it("fails without the new-tab note, even with other hidden text", () => {
		const html =
			'<a href="https://example.com/" target="_blank" rel="noopener noreferrer">x<span class="visually-hidden"> (opens in a new tab)</span></a>'
		expect(check(html)).toEqual([{ href: "https://example.com/", reason: "no new-tab note" }])
	})

	it("counts a protocol-relative URL as external", () => {
		expect(check('<a href="//example.com/x">x</a>').map((p) => p.href)).toEqual(["//example.com/x"])
	})

	it.each(["javascript:alert(1)", "data:text/html,x", "http://example.com/", " JavaScript:x"])(
		"fails the scheme of %j",
		(href) => {
			expect(check(`<a href="${href}">x</a>`)).toEqual([{ href, reason: "scheme not allowed" }])
		}
	)

	it("passes mailto, relative, in-page and same-origin links, and anchors without href", () => {
		expect(
			check(
				[
					'<a class="skip" href="#main">Skip</a>',
					'<a href="mailto:legal@rookdex.app">mail</a>',
					'<a href="/en/tracker/">tracker</a>',
					'<a href="../#item-wildlife/pelican">back</a>',
					'<a href="/en/settings/#about">about</a>',
					'<a href="#cat-wildlife">chip</a>',
					'<a href="https://rookdex.app/no/">home</a>',
					'<a href="//rookdex.app/en/">home</a>',
					"<a>no href</a>",
				].join("")
			)
		).toEqual([])
	})

	it("never checks <link> elements", () => {
		expect(
			findUnsafeLinks(
				'<html><head><link rel="alternate" hreflang="no" href="https://rookdex.app/no/"><link rel="canonical" href="http://example.com/"></head></html>',
				SITE
			)
		).toEqual([])
	})
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run integrations/external-links.test.ts`
Expected: FAIL with "Failed to resolve import ./external-links.mjs".

- [ ] **Step 3: Write `integrations/external-links.mjs`**

```js
// Astro integration. After the static build it parses every built page and fails the build on an
// external link that could leak the opener or the referrer, open in the same tab without saying
// so, or carry a scheme other than https: or mailto: (feedback spec §11). CI runs tests before
// the build, so a check of dist/ lives here, like the SEO check.
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { JSDOM } from "jsdom"
import { listFiles } from "./precache.mjs"

/** Every `<a href>` in `html` that must not ship, with the reason. `<link>` is never checked. */
export function findUnsafeLinks(html, site) {
	const base = `${site.replace(/\/$/, "")}/`
	const siteHost = new URL(base).host
	const { document } = new JSDOM(html).window
	const problems = []
	for (const a of document.querySelectorAll("a[href]")) {
		const href = a.getAttribute("href") ?? ""
		let url
		try {
			// The URL parser strips the whitespace and tabs a browser would, so " java\tscript:" is
			// seen as the javascript: scheme it really is.
			url = new URL(href, base)
		} catch {
			problems.push({ href, reason: "unparseable" })
			continue
		}
		if (url.protocol === "mailto:") continue
		// Relative links resolve against https://rookdex.app, so any other scheme was written out.
		if (url.protocol !== "https:") {
			problems.push({ href, reason: "scheme not allowed" })
			continue
		}
		if (url.host === siteHost) continue
		const rel = (a.getAttribute("rel") ?? "").toLowerCase().split(/\s+/)
		if ((a.getAttribute("target") ?? "").toLowerCase() !== "_blank") {
			problems.push({ href, reason: "no target=_blank" })
		} else if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
			problems.push({ href, reason: "rel lacks noopener or noreferrer" })
		} else if (!a.querySelector(".new-tab-note")) {
			problems.push({ href, reason: "no new-tab note" })
		}
	}
	return problems
}

export default function externalLinks() {
	let site = ""
	return {
		name: "rookdex-external-links",
		hooks: {
			"astro:config:done": ({ config }) => {
				site = String(config.site ?? "")
			},
			"astro:build:done": async ({ dir, logger }) => {
				if (!site) throw new Error("external-link check: astro.config.mjs has no site")
				const root = fileURLToPath(dir)
				const pages = (await listFiles(root)).filter((file) => file.endsWith(".html"))
				const errors = []
				for (const file of pages) {
					for (const { href, reason } of findUnsafeLinks(
						await readFile(join(root, file), "utf8"),
						site
					)) {
						errors.push(`${file}: ${href} (${reason})`)
					}
				}
				if (errors.length > 0) {
					throw new Error(`External-link check failed:\n${errors.join("\n")}`)
				}
				logger.info(`external-link check passed: ${pages.length} pages`)
			},
		},
	}
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run integrations/external-links.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Register it after the precache integration**

In `astro.config.mjs`, add `import externalLinks from "./integrations/external-links.mjs"` before the `precache` import (Biome sorts imports), and change the integrations line to:

```js
	integrations: [react(), precache(), seoCheck(), externalLinks()],
```

- [ ] **Step 6: Prove it bites, then build clean**

1. Temporarily add `<a href="https://example.com/">x</a>` to `src/pages/404.astro`, run `npm run build`, and confirm it fails with `404.html: https://example.com/ (no target=_blank)`.
2. Remove the line again. Run `npm run build`.
Expected: the log shows `external-link check passed: N pages` (N is every built `.html` file) and `seo check passed`.

- [ ] **Step 7: Commit**

```bash
git add integrations/external-links.mjs integrations/external-links.test.ts astro.config.mjs
git commit -m "Fail the build on any external link that is unsafe or doesn't say it opens a new tab"
```

---

### Task 4: Footer HUD strip

**Files:**
- Modify: `src/components/Footer.astro` (rewrite), `src/components/Footer.test.ts` (rewrite)
- Create: `src/scripts/footer-countdown.ts`, `src/scripts/footer-countdown.test.ts`
- Modify: `src/styles/global.css` (replace the `.site-footer`/`.footer-pairs` rules at lines 266-310 and the `.site-footer` padding in the 768 px query)
- Modify: `src/i18n/en.ts`, `src/i18n/no.ts` (`footer` block), `src/i18n/copy.test.ts`
- Modify: `README.md` (§ Licence: credit the Octicons GitHub mark)

**Interfaces:**
- Consumes: `ExternalLink` (Task 2), the tooltip contract (Task 1), `daysToGo` and `hubPhase` from `src/model/launch.ts`.
- Produces:
  - `footerStatus(now: Date, templates: { days: string; oneDay: string; out: string }): string`
  - `wireFooterStatus(chip: HTMLElement, now: Date): void`
  - Footer copy keys: `footer.disclaimer`, `footer.github`, `footer.legal`, `footer.about`, `footer.launchDate`, `footer.daysToLaunch`, `footer.oneDayToLaunch`, `footer.outNow`. The old keys `source`, `legalLabel`, `codeLicenceLabel`, `codeLicence`, `guideLicenceLabel`, `guideLicence`, `sourceLabel` are removed (Settings gets its own in Task 5).
  - CSS class `.icon-link` (44 × 44 icon control), reused nowhere else yet.

- [ ] **Step 1: Write the failing countdown test**

Create `src/scripts/footer-countdown.test.ts`:

```ts
// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { footerStatus, wireFooterStatus } from "./footer-countdown"

const templates = { days: "{n} days to launch", oneDay: "{n} day to launch", out: "Out now" }
const at = (iso: string) => new Date(iso)

describe("footer launch chip (feedback spec §6)", () => {
	it("counts whole days before launch", () => {
		expect(footerStatus(at("2026-11-17T00:00:00+01:00"), templates)).toBe("2 days to launch")
	})

	it("uses the singular on the last day", () => {
		expect(footerStatus(at("2026-11-18T20:00:00+01:00"), templates)).toBe("1 day to launch")
	})

	it("says out now from launch day on", () => {
		expect(footerStatus(at("2026-11-19T00:00:00+01:00"), templates)).toBe("Out now")
		expect(footerStatus(at("2027-01-01T12:00:00+01:00"), templates)).toBe("Out now")
	})

	it("swaps the no-JS date for the live text", () => {
		document.body.innerHTML = `<a data-footer-status data-days="{n} dager til lansering" data-one-day="{n} dag til lansering" data-out="Ute nå"><span data-status-text>19 Nov 2026</span></a>`
		const chip = document.querySelector<HTMLElement>("[data-footer-status]") as HTMLElement
		wireFooterStatus(chip, at("2026-11-09T12:00:00+01:00"))
		expect(chip.textContent).toBe("10 dager til lansering")
	})

	it("leaves the date alone when a template is missing", () => {
		document.body.innerHTML = `<a data-footer-status data-days="{n} days"><span data-status-text>19 Nov 2026</span></a>`
		const chip = document.querySelector<HTMLElement>("[data-footer-status]") as HTMLElement
		wireFooterStatus(chip, at("2026-11-09T12:00:00+01:00"))
		expect(chip.textContent).toBe("19 Nov 2026")
	})
})
```

Run: `npx vitest run src/scripts/footer-countdown.test.ts`
Expected: FAIL with "Failed to resolve import ./footer-countdown".

- [ ] **Step 2: Write `src/scripts/footer-countdown.ts`**

```ts
// The footer's launch chip (feedback spec §6). The page ships the launch date; this swaps in the
// live state once, at load. The templates come from data attributes, so no copy is bundled here.
import { daysToGo, hubPhase } from "../model/launch"

export interface StatusTemplates {
	days: string
	oneDay: string
	out: string
}

export function footerStatus(now: Date, templates: StatusTemplates): string {
	if (hubPhase(now) === "after") return templates.out
	const n = daysToGo(now)
	return (n === 1 ? templates.oneDay : templates.days).replace("{n}", String(n))
}

export function wireFooterStatus(chip: HTMLElement, now: Date): void {
	const text = chip.querySelector<HTMLElement>("[data-status-text]")
	const { days, oneDay, out } = chip.dataset
	if (!text || !days || !oneDay || !out) return
	text.textContent = footerStatus(now, { days, oneDay, out })
}
```

Run: `npx vitest run src/scripts/footer-countdown.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 3: Replace the footer copy**

In `src/i18n/en.ts`, replace the whole `footer: { … }` block with:

```ts
	footer: {
		disclaimer:
			"Unofficial fan project. Not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.",
		github: "Source code on GitHub",
		legal: "Takedown and legal: email",
		about: "About and licences",
		// Set in capitals by CSS, so screen readers read words (feedback spec §6).
		launchDate: "19 Nov 2026",
		daysToLaunch: "{n} days to launch",
		oneDayToLaunch: "{n} day to launch",
		outNow: "Out now",
	},
```

In `src/i18n/no.ts`:

```ts
	footer: {
		disclaimer:
			"Uoffisielt fanprosjekt. Ikke tilknyttet eller godkjent av Rockstar Games eller Take-Two Interactive.",
		github: "Kildekode på GitHub",
		legal: "Fjerning og juridisk: e-post",
		about: "Om og lisenser",
		launchDate: "19 Nov 2026",
		daysToLaunch: "{n} dager til lansering",
		oneDayToLaunch: "{n} dag til lansering",
		outNow: "Ute nå",
	},
```

Add to `src/i18n/copy.test.ts`:

```ts
describe("countdown templates (brand Task 5, feedback spec §15.11)", () => {
	it.each([
		["en", en],
		["no", no],
	] as const)("%s keeps {n} in every countdown template", (_locale, s) => {
		for (const template of [
			s.hub.daysToGo,
			s.hub.oneDayToGo,
			s.hub.daySince,
			s.footer.daysToLaunch,
			s.footer.oneDayToLaunch,
		]) {
			expect(template).toContain("{n}")
		}
	})
})
```

- [ ] **Step 4: Write the failing footer test**

Replace `src/components/Footer.test.ts` with:

```ts
import { describe, expect, it } from "vitest"
import { t } from "../i18n"
import { renderDoc } from "../test/render"
import Footer from "./Footer.astro"

const hiddenName = (a: Element) =>
	a.querySelector(".visually-hidden:not(.new-tab-note)")?.textContent?.trim()

describe.each(["en", "no"] as const)("footer in %s (feedback spec §6)", (locale) => {
	const s = t(locale)

	it("has the one-sentence disclaimer", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		expect(doc.querySelectorAll("footer p.footer-disclaimer")).toHaveLength(1)
		expect(doc.querySelector(".footer-disclaimer")?.textContent).toBe(s.footer.disclaimer)
	})

	it("has three icon links named by hidden text, with hidden tooltips", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		const icons = [...doc.querySelectorAll(".footer-icons a")]
		expect(icons.map((a) => a.getAttribute("href"))).toEqual([
			"https://github.com/rookdex/rookdex",
			"mailto:legal@rookdex.app",
			`/${locale}/settings/#about`,
		])
		expect(icons.map(hiddenName)).toEqual([s.footer.github, s.footer.legal, s.footer.about])
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
		expect(icons[0].querySelector(".tip")?.textContent).toBe(`${s.footer.github} ↗`)
	})

	it("ships the launch date in the status chip, with the live templates beside it", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		const chip = doc.querySelector<HTMLElement>("a.status-chip")
		expect(chip?.getAttribute("href")).toBe(`/${locale}/`)
		expect(chip?.querySelector("[data-status-text]")?.textContent).toBe("19 Nov 2026")
		expect(chip?.dataset.days).toBe(s.footer.daysToLaunch)
		expect(chip?.dataset.oneDay).toBe(s.footer.oneDayToLaunch)
		expect(chip?.dataset.out).toBe(s.footer.outNow)
		expect(chip?.querySelector(".status-dot")?.getAttribute("aria-hidden")).toBe("true")
	})

	it("ends with the © line and the build year", async () => {
		const doc = await renderDoc(Footer, { props: { locale } })
		expect(doc.querySelector(".footer-copy")?.textContent?.trim()).toBe(
			`© Rookdex ${new Date().getFullYear()}`
		)
		expect(doc.querySelector("footer dl")).toBeNull()
	})
})
```

Run: `npx vitest run src/components/Footer.test.ts`
Expected: FAIL (old markup; `s.footer.source` no longer exists, so `npm run check` would also fail until Step 5).

- [ ] **Step 5: Rewrite `src/components/Footer.astro`**

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import { type Locale, t } from "../i18n"
import ExternalLink from "./ExternalLink.astro"

interface Props {
	locale: Locale
}

// The "HUD strip" (feedback spec §6): one sentence, three icon links, the launch chip and the ©
// line. The label and value pairs live in Settings, About.
const { locale } = Astro.props
const s = t(locale)
const year = new Date().getFullYear()
---

<footer class="site-footer">
	<p class="footer-disclaimer">{s.footer.disclaimer}</p>
	<div class="footer-strip">
		<ul class="footer-icons">
			<li>
				<ExternalLink
					href="https://github.com/rookdex/rookdex"
					locale={locale}
					icon={false}
					class="icon-link has-tip"
				>
					<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true">
						<path
							d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"
						></path>
					</svg>
					<span class="visually-hidden">{s.footer.github}</span>
					<span class="tip" aria-hidden="true">{`${s.footer.github} ↗`}</span>
				</ExternalLink>
			</li>
			<li>
				<a class="icon-link has-tip" href="mailto:legal@rookdex.app">
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
						<rect x="3" y="5" width="18" height="14" rx="2"></rect>
						<path d="m3 7 9 6 9-6"></path>
					</svg>
					<span class="visually-hidden">{s.footer.legal}</span>
					<span class="tip" aria-hidden="true">{s.footer.legal}</span>
				</a>
			</li>
			<li>
				<a class="icon-link has-tip" href={`${getRelativeLocaleUrl(locale, "settings")}#about`}>
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
						<circle cx="12" cy="12" r="9"></circle>
						<path d="M12 11v5M12 8h.01"></path>
					</svg>
					<span class="visually-hidden">{s.footer.about}</span>
					<span class="tip" aria-hidden="true">{s.footer.about}</span>
				</a>
			</li>
		</ul>
		<a
			class="status-chip"
			href={getRelativeLocaleUrl(locale, "")}
			data-footer-status
			data-days={s.footer.daysToLaunch}
			data-one-day={s.footer.oneDayToLaunch}
			data-out={s.footer.outNow}
		>
			<span class="status-dot" aria-hidden="true"></span>
			<span data-status-text>{s.footer.launchDate}</span>
		</a>
		<p class="footer-copy">© Rookdex {year}</p>
	</div>
</footer>

<script>
	import { wireFooterStatus } from "../scripts/footer-countdown"

	const chip = document.querySelector<HTMLElement>("[data-footer-status]")
	if (chip) wireFooterStatus(chip, new Date())
</script>
```

- [ ] **Step 6: Replace the footer CSS**

In `global.css`, replace everything from `.site-footer {` through the `.footer-pairs a { … }` rule (lines 266-310) with:

```css
/* The footer "HUD strip" (feedback spec §6). Phone: icons and © share the first row, the chip
   takes the second (the approved mockup, measured 169 px at 320). From 768 px: one centre line. */
.site-footer {
	padding: 12px var(--space-3) var(--space-3);
	border-top: 1px solid var(--border);
	background: var(--bg-raised);
	color: var(--text-muted);
	font-size: 0.75rem;
}

.footer-disclaimer {
	max-width: none;
	margin: 0 0 var(--space-2);
}

.footer-strip {
	display: grid;
	grid-template-columns: 1fr auto;
	grid-template-areas:
		"icons copy"
		"chip chip";
	align-items: center;
	gap: var(--space-2) var(--space-3);
}

/* The icons sit at the left edge on a phone, so their tips open to the right. */
.footer-icons .tip {
	left: 0;
	transform: none;
}

.footer-icons {
	grid-area: icons;
	display: flex;
	gap: var(--space-1);
	margin: 0;
	padding: 0;
	list-style: none;
}

.icon-link {
	display: inline-grid;
	place-items: center;
	width: var(--tap);
	height: var(--tap);
	border-radius: var(--radius);
	color: var(--text-muted);
	text-decoration: none;
}

.icon-link svg {
	width: 22px;
	height: 22px;
}

.status-chip {
	grid-area: chip;
	justify-self: start;
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	min-height: var(--tap);
	padding: 0 14px;
	border: 1px solid color-mix(in srgb, var(--accent) 55%, transparent);
	border-radius: 999px;
	color: var(--text);
	font-size: 0.75rem;
	font-weight: 600;
	letter-spacing: 0.08em;
	text-decoration: none;
	text-transform: uppercase;
	transition: background-color 120ms;
}

@media (hover: hover) {
	.status-chip:hover {
		background: var(--bg-hover);
	}
}

.status-chip:active,
.status-chip:focus-visible {
	background: var(--bg-hover);
}

.status-dot {
	flex: none;
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--accent);
	box-shadow: 0 0 10px var(--accent);
	animation: status-pulse 2s ease-in-out infinite;
}

@keyframes status-pulse {
	50% {
		opacity: 0.35;
	}
}

@media (prefers-reduced-motion: reduce) {
	.status-dot {
		animation: none;
		box-shadow: none;
	}
}

.footer-copy {
	grid-area: copy;
	margin: 0;
	font-family: var(--font-display);
	font-size: 1rem;
	font-weight: 400;
	letter-spacing: 0.14em;
	line-height: 1;
	text-transform: uppercase;
}
```

In the `@media (min-width: 768px)` block, the `.site-header, .site-footer { padding-inline: var(--space-4); }` rule stays. Add to that block:

```css
	/* From 768 px, icons, chip and © share one centre line (spec §6). */
	.site-footer {
		padding-top: var(--space-3);
	}

	.footer-disclaimer {
		text-align: center;
	}

	.footer-strip {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	}

	.footer-icons .tip {
		left: 50%;
		transform: translateX(-50%);
	}
```

Add to the `@media (min-width: 1024px)` block:

```css
	/* One row: the disclaimer takes the free space, the strip sits at the right. */
	.site-footer {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		padding-block: var(--space-3);
	}

	.footer-disclaimer {
		flex: 1;
		margin: 0;
		text-align: left;
	}

	.footer-strip {
		flex-wrap: nowrap;
	}
```

- [ ] **Step 7: Run the tests and the check**

Run: `npx vitest run src/components/Footer.test.ts src/scripts/footer-countdown.test.ts src/i18n`, then `npm test`, `npm run check`, `npm run build`
Expected: all PASS; the build logs `external-link check passed`.

- [ ] **Step 8: Measure in the Browser pane (Review Focus 3)**

Build and serve (`npm run build`, then `npx astro preview`, or ask the controller for the `preview_start` config), open `/no/` and `/en/`, and read numbers with `getBoundingClientRect()` at 320 px and 1024 px wide:
- Footer height: target 169 px or less on a phone at 320 px (icons and © on row 1, the chip on row 2), 103 px at 768 px, one row of 77 px at 1024 px. Never shrink a control below 44 px. The stress test measured the old flex layout at 197 px in three rows (the Norwegian chip can't share a row with the icons at 320 px), which is why the phone strip is a grid.
- The boxes that share a row share one vertical centre (difference 1 px or less): the icon links and `.footer-copy` on a phone, all three from 768 px.
- Nothing overflows at 320 px: `document.documentElement.scrollWidth === 320`, with the chip showing "10 dager til lansering"-length text (set it by hand in devtools if today's count is shorter), and with the "Fjerning og juridisk: e-post" tooltip forced visible (`data-tip-open` on its link). On a phone the icon tips open to the right (left-anchored), so they stay between 16 px and the right edge.
Write the numbers into the task report; they go in the PR.

- [ ] **Step 8b: Credit the GitHub mark**

The footer's GitHub icon is the Octicons `mark-github` path (MIT, © GitHub Inc.), and MIT asks for the notice in copies. In `README.md` under `## Licence`, after the line that starts "Code is MIT", add:

```
The GitHub mark in the footer comes from Octicons (MIT, © GitHub Inc.) and is used under GitHub's logo guidelines to link to this repository.
```

- [ ] **Step 9: Commit**

```bash
git add src/components/Footer.astro src/components/Footer.test.ts src/scripts/footer-countdown.ts src/scripts/footer-countdown.test.ts src/styles/global.css src/i18n README.md
git commit -m "Compact the footer into one strip with icon links and a launch chip"
```

---

### Task 5: Settings About, language row, delete-all and the install prompt

**Files:**
- Modify: `src/pages/[locale]/settings.astro` (About group, language row, dialog copy, script, style)
- Modify: `src/test/settings-page.test.ts`
- Modify: `src/model/version.ts`, `src/model/version.test.ts`
- Modify: `src/scripts/delete-all.ts`, `src/scripts/delete-all.test.ts`
- Modify: `src/islands/InstallPrompt.tsx:19-23`, `src/islands/InstallPrompt.test.tsx`
- Modify: `src/i18n/en.ts`, `src/i18n/no.ts` (`settings` block)
- Modify: `LICENSE` (scope paragraph: guide text is CC BY-SA 4.0)

**Interfaces:**
- Consumes: `ExternalLink` (Task 2), `isStandalone` from `src/scripts/standalone.ts`.
- Produces:
  - `commitUrl(sha: string): string` in `src/model/version.ts`.
  - `deleteAllData(idb: IDBFactory | undefined, onBlocked: () => void): Promise<DeleteResult>` (the `storage` parameter and `LOCAL_KEYS` are gone).
  - `<section id="about">` on the Settings page: the target of the footer ⓘ (Task 4) and the guide's install link (Task 9).
  - Copy keys: `settings.about`, `settings.legal`, `settings.codeLicence`, `settings.guideLicence`, `settings.trademarks`, `settings.keepsChoices`. `settings.app` is removed.

- [ ] **Step 1: Copy**

In `src/i18n/en.ts`, in `settings`, replace `app: "App",` with `about: "About",`, and add after `sourceLink: "GitHub",`:

```ts
		legal: "Takedown and legal",
		codeLicence: "Code licence",
		guideLicence: "Guide licence",
		trademarks: "All trademarks belong to their owners.",
		keepsChoices: "Your choices about the install prompt and hints stay, so they do not return.",
```

In `src/i18n/no.ts`, replace `app: "App",` with `about: "Om",` and add:

```ts
		legal: "Fjerning og juridisk",
		codeLicence: "Kodelisens",
		guideLicence: "Guidelisens",
		trademarks: "Alle varemerker tilhører sine eiere.",
		keepsChoices: "Valgene dine om installering og tips blir liggende, så de ikke kommer tilbake.",
```

- [ ] **Step 2: `commitUrl`, test first**

Add to `src/model/version.test.ts`:

```ts
describe("commitUrl (feedback spec §7.1)", () => {
	it("links the full sha on GitHub", () => {
		const sha = "0123456789abcdef0123456789abcdef01234567"
		expect(commitUrl(sha)).toBe(`https://github.com/rookdex/rookdex/commit/${sha}`)
	})
})
```

(add `commitUrl` to the file's import from `./version`). Run it (FAIL), then add to `src/model/version.ts`:

```ts
/** The commit page for the Settings version link (feedback spec §7.1). */
export function commitUrl(sha: string): string {
	return `https://github.com/rookdex/rookdex/commit/${sha}`
}
```

Run: `npx vitest run src/model/version.test.ts`
Expected: PASS.

- [ ] **Step 3: Delete-all keeps the flags, test first**

Replace `src/scripts/delete-all.test.ts` with:

```ts
import { IDBFactory } from "fake-indexeddb"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DB_NAME, openStore } from "../model/store"
import { deleteAllData } from "./delete-all"

async function exists(factory: IDBFactory): Promise<boolean> {
	return (await factory.databases()).some((db) => db.name === DB_NAME)
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe("deleteAllData (spec §7.2, feedback spec §7.3)", () => {
	it("deletes the rookdex database and leaves localStorage alone", async () => {
		const storage = { removeItem: vi.fn(), clear: vi.fn(), setItem: vi.fn() }
		vi.stubGlobal("localStorage", storage)
		const factory = new IDBFactory()
		const store = await openStore(factory)
		await store.put("profiles", { id: "p1", name: "A", created_at: "2026-09-23T10:00:00.000Z" })
		const onBlocked = vi.fn()
		await expect(deleteAllData(factory, onBlocked)).resolves.toBe("deleted")
		expect(await exists(factory)).toBe(false)
		expect(onBlocked).not.toHaveBeenCalled()
		expect(storage.removeItem).not.toHaveBeenCalled()
		expect(storage.clear).not.toHaveBeenCalled()
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
		await expect(deleteAllData(factory, onBlocked)).resolves.toBe("deleted")
		expect(onBlocked).toHaveBeenCalledOnce()
		expect(requests).toHaveBeenCalledOnce()
		expect(await exists(factory)).toBe(false)
	})

	it("reports failed on an error event", async () => {
		const request = {} as IDBOpenDBRequest
		const factory = { deleteDatabase: () => request } as unknown as IDBFactory
		const result = deleteAllData(factory, vi.fn())
		const fireError = request.onerror as unknown as () => void
		fireError()
		await expect(result).resolves.toBe("failed")
	})

	it("reports failed when deleteDatabase throws", async () => {
		const factory = {
			deleteDatabase: () => {
				throw new DOMException("denied", "SecurityError")
			},
		} as unknown as IDBFactory
		await expect(deleteAllData(factory, vi.fn())).resolves.toBe("failed")
	})

	it("reports unsupported without IndexedDB", async () => {
		await expect(deleteAllData(undefined, vi.fn())).resolves.toBe("unsupported")
	})
})
```

Run: `npx vitest run src/scripts/delete-all.test.ts` (FAIL: the blocked test times out after 5 s, because the old code reads `onBlocked` as its storage argument and never calls it. The localStorage test passes even on the old code: it guards against a future `localStorage.removeItem` and is not the red step). Then replace `src/scripts/delete-all.ts` with:

```ts
import { DB_NAME } from "../model/store"

export type DeleteResult = "deleted" | "failed" | "unsupported"

/**
 * Deletes every profile and all progress on this device (spec §7.2). `blocked` is not a failure:
 * the request stays pending and fires `success` once other tabs close their connections, so this
 * reports it once and keeps waiting. It never sends a second request. The install and hint flags
 * in localStorage stay, so the prompt and the hint don't come back (feedback spec §7.3). The
 * service worker cache stays too, so the app still opens offline.
 */
export function deleteAllData(
	idb: IDBFactory | undefined,
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
		request.onsuccess = () => resolve("deleted")
	})
}
```

Run: `npx vitest run src/scripts/delete-all.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 4: The install prompt ignores the installed app, test first**

Add to `src/islands/InstallPrompt.test.tsx` (import `isStandalone`'s behaviour is exercised through `matchMedia`):

```tsx
	it("never opens inside the installed app (feedback spec §8)", () => {
		vi.spyOn(window, "matchMedia").mockImplementation(
			(query: string) =>
				({ matches: query === "(display-mode: standalone)", media: query }) as MediaQueryList
		)
		render(<InstallPrompt locale="en" />)
		const event = fireInstallPrompt()
		expect(event.defaultPrevented).toBe(false)
		expect(screen.getByRole("dialog", { hidden: true })).not.toHaveAttribute("open")
		vi.restoreAllMocks()
	})
```

Run it (FAIL), then in `src/islands/InstallPrompt.tsx` import `{ isStandalone } from "../scripts/standalone"` and change the handler's guard (line 20) to:

```tsx
			// Inside the handler, not before the hooks: an early return there breaks the rules of hooks.
			if (isStandalone(window) || readFlag(SEEN_KEY)) return
```

Run: `npx vitest run src/islands/InstallPrompt.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Write the failing Settings page tests**

In `src/test/settings-page.test.ts`: add `vi` and `afterEach` to the vitest import, add `afterEach(() => vi.unstubAllEnvs())` at the top level, change the group list in the first test to `["Language", "Your data", "About"]`, delete the old "shows the version and links the source" test, and add:

```ts
	const rowsOf = (doc: Document) => [...doc.querySelectorAll("#about dl > div")]
	const label = (row: Element) => row.querySelector("dt")?.textContent

	it("names the About group and gives it the #about anchor, install first", async () => {
		const doc = await settings("en")
		const about = doc.getElementById("about")
		expect(about?.tagName).toBe("SECTION")
		expect(doc.getElementById(about?.getAttribute("aria-labelledby") ?? "")?.textContent).toBe(
			"About"
		)
		expect(rowsOf(doc).map(label)).toEqual([
			"Install",
			"Version",
			"Source code",
			"Code licence",
			"Guide licence",
			"Takedown and legal",
		])
		expect(rowsOf(doc)[0].hasAttribute("data-install-row")).toBe(true)
		expect(about?.querySelector("p.note")?.textContent).toBe(
			"All trademarks belong to their owners."
		)
	})

	it("links the licence, the repository and the legal address", async () => {
		const doc = await settings("no")
		const rows = rowsOf(doc)
		const href = (i: number) => rows[i].querySelector("dd a")?.getAttribute("href")
		expect(href(2)).toBe("https://github.com/rookdex/rookdex")
		expect(rows[3].querySelector("dd")?.textContent?.trim()).toBe("MIT")
		expect(href(4)).toBe("https://creativecommons.org/licenses/by-sa/4.0/")
		expect(href(5)).toBe("mailto:legal@rookdex.app")
		expect(rows.map(label).slice(2)).toEqual([
			"Kildekode",
			"Kodelisens",
			"Guidelisens",
			"Fjerning og juridisk",
		])
	})

	it("links the version's commit when the build has a sha", async () => {
		const sha = "0123456789abcdef0123456789abcdef01234567"
		vi.stubEnv("GITHUB_SHA", sha)
		const doc = await settings("en")
		const dd = rowsOf(doc)[1].querySelector("dd")
		expect(dd?.textContent?.replace(/\s+/g, " ").trim()).toBe(
			`${pkg.version} · 0123456 (opens in a new tab)`
		)
		expect(dd?.querySelector("a")?.getAttribute("href")).toBe(
			`https://github.com/rookdex/rookdex/commit/${sha}`
		)
	})

	it("keeps a dev build's version as plain text", async () => {
		vi.stubEnv("GITHUB_SHA", "")
		const doc = await settings("en")
		const dd = rowsOf(doc)[1].querySelector("dd")
		expect(dd?.textContent?.trim()).toBe(`${pkg.version} · dev`)
		expect(dd?.querySelector("a")).toBeNull()
	})

	it("lets the other language's link fill its row", async () => {
		const doc = await settings("en")
		const link = doc.querySelector('section[aria-labelledby="settings-language"] a')
		expect(link?.classList.contains("row-link")).toBe(true)
		expect(link?.closest("li")?.classList.contains("row-has-link")).toBe(true)
	})

	it("tells people the install and hint choices stay", async () => {
		const doc = await settings("en")
		expect(doc.querySelector("dialog")?.textContent).toContain(
			"Your choices about the install prompt and hints stay, so they do not return."
		)
	})
```

`versionPattern` is no longer used; delete it.

Run: `npx vitest run src/test/settings-page.test.ts`
Expected: FAIL.

- [ ] **Step 6: Update `src/pages/[locale]/settings.astro`**

Frontmatter: replace `import { appVersion } from "../../model/version"` with `import { appVersion, commitUrl } from "../../model/version"`, keep the `ExternalLink` import Task 2 added (don't add it twice), and replace `const version = appVersion(pkg.version, process.env.GITHUB_SHA)` with:

```ts
// Read at render, so tests can stub it. A local build has no sha and shows "dev".
const sha = process.env.GITHUB_SHA
```

Language list: change the `<li class="row">` to `<li class={l === locale ? "row" : "row row-has-link"}>` and give the `<a>` `class="row-link"`.

Dialog: after `<p>{s.settings.dangerBody}</p>` inside the `<dialog>`, add `<p>{s.settings.keepsChoices}</p>`.

Replace the whole `<section class="settings-group" aria-labelledby="settings-app"> … </section>` with:

```astro
	<section id="about" class="settings-group" aria-labelledby="settings-about">
		<h2 id="settings-about">{s.settings.about}</h2>
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
				<dd>
					{
						sha ? (
							<>
								{pkg.version} ·{" "}
								<ExternalLink href={commitUrl(sha)} locale={locale as Locale}>
									{sha.slice(0, 7)}
								</ExternalLink>
							</>
						) : (
							appVersion(pkg.version, sha)
						)
					}
				</dd>
			</div>
			<div class="row">
				<dt>{s.settings.source}</dt>
				<dd>
					<ExternalLink href="https://github.com/rookdex/rookdex" locale={locale as Locale}>
						{s.settings.sourceLink}
					</ExternalLink>
				</dd>
			</div>
			<div class="row">
				<dt>{s.settings.codeLicence}</dt>
				<dd>MIT</dd>
			</div>
			<div class="row">
				<dt>{s.settings.guideLicence}</dt>
				<dd>
					<ExternalLink
						href="https://creativecommons.org/licenses/by-sa/4.0/"
						locale={locale as Locale}
					>
						CC BY-SA 4.0
					</ExternalLink>
				</dd>
			</div>
			<div class="row">
				<dt>{s.settings.legal}</dt>
				<dd><a href="mailto:legal@rookdex.app">legal@rookdex.app</a></dd>
			</div>
		</dl>
		<p class="note">{s.settings.trademarks}</p>
	</section>
```

Script: delete the `flags()` helper and change the delete wiring to `wireDeleteDialog(danger, (onBlocked) => deleteAllData(database(), onBlocked))`.

Style: add at the end of the `<style>`:

```css
	/* The other language's link fills its row, so the whole row switches (feedback spec §7.2). */
	.row-has-link {
		padding: 0;
	}

	/* Clips the link's fill to the list's rounded corners, so the separator stays straight. */
	.rows:has(.row-link) {
		overflow: hidden;
	}

	.row-link {
		flex: 1;
		align-self: stretch;
		display: flex;
		align-items: center;
		padding: 0 14px;
		outline-offset: -2px;
		transition: background-color 120ms;
	}

	@media (hover: hover) {
		.row-link:hover {
			background: var(--bg-hover);
		}
	}

	@media (hover: none) {
		.row-link:active {
			background: var(--bg-hover);
		}
	}

	.row-link:focus-visible {
		background: var(--bg-hover);
	}

	.note {
		margin: var(--space-2) 0 0;
		color: var(--text-muted);
		font-size: 0.8125rem;
	}
```

(`.row a` already became `.row :global(a)` in Task 2; `.row-link` is in this component's own markup, so its scoped rules apply.)

- [ ] **Step 7: Run the Settings tests, then everything**

Run: `npx vitest run src/test/settings-page.test.ts src/scripts src/islands/InstallPrompt.test.tsx`, then `npm test`, `npm run check`, `npm run build`
Expected: all PASS.

- [ ] **Step 7b: Make LICENSE agree with the guide licence**

LICENSE's scope paragraph puts everything outside the brand files under MIT, which includes the guide text the About group now says is CC BY-SA 4.0. In `LICENSE`, replace

```
public/favicon.ico). Everything else in this repository is under the MIT
License that follows.
```

with

```
public/favicon.ico). Guide text under src/content/ is licensed under CC BY-SA
4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Everything else in this
repository is under the MIT License that follows.
```

Then read LICENSE, `README.md` § Licence and the Settings About section side by side: all three say the same thing.

- [ ] **Step 8: Commit**

```bash
git add src LICENSE
git commit -m "Gather licences and links under Settings About and keep the seen-flags on delete"
```

---

### Task 6: Tracker cards and the Sources chip

**Files:**
- Create: `src/islands/tracker/icons.tsx`
- Modify: `src/islands/tracker/ItemList.tsx` (rewrite `ItemRow`, new prop)
- Modify: `src/islands/tracker/CategoryNav.tsx` (Sources chip)
- Modify: `src/islands/Tracker.tsx:159-174` (pass the new props)
- Modify: `src/islands/Tracker.test.tsx` (first test rewritten, new tests)
- Modify: `src/styles/global.css` (tracker card rules at lines 610-721 and the 768/1024 blocks)
- Modify: `src/i18n/en.ts`, `src/i18n/no.ts` (`tracker.report` removed, `tracker.reportSoon` changed)

**Interfaces:**
- Consumes: the tooltip contract and `wireTooltips` (Task 1).
- Produces:
  - `BookIcon()` and `FlagIcon()` from `src/islands/tracker/icons.tsx`.
  - `ItemList` gains prop `sourcesHref: string` (the Sources page URL, e.g. `/en/tracker/sources/`); each book link is `${sourcesHref}#${item.id}`.
  - `CategoryNav` gains prop `sources: { href: string; label: string }`.
  - Each card's checkbox keeps `id="item-<seed id>"` (Task 7 and the Sources page's back links rely on it).

- [ ] **Step 1: Copy**

`src/i18n/en.ts`, `tracker`: delete `report: "Report",` and set `reportSoon: "Report: coming soon",`. `src/i18n/no.ts`: delete `report: "Rapporter",` and set `reportSoon: "Rapporter: kommer snart",`. Keep `sources` ("Sources" / "Kilder"): it is the tooltip and the chip text now.

- [ ] **Step 2: Write the failing tracker tests**

In `src/islands/Tracker.test.tsx`, add `import { wireTooltips } from "../scripts/tooltip"` and replace the first test ("renders groups, tiers, sources and a disabled report button") with:

```tsx
	it("renders one card per item, with a book link and a flag instead of source links", async () => {
		await ready()
		expect(screen.getByRole("heading", { name: "Wildlife", level: 2 })).toBeInTheDocument()
		expect(screen.getByRole("heading", { name: /reptiles/i, level: 3 })).toBeInTheDocument()
		expect(screen.getByText("Expected, as in GTA V")).toBeInTheDocument()
		expect(document.querySelectorAll("li.item")).toHaveLength(3)
		expect(screen.queryByRole("link", { name: "Site" })).toBeNull()

		const book = screen.getByRole("link", { name: "Sources: Pelican" })
		expect(book).toHaveAttribute("href", "/en/tracker/sources/#wildlife/pelican")
		expect(book).not.toHaveAttribute("aria-label")
		expect(book.querySelector(".tip")).toHaveAttribute("aria-hidden", "true")
		expect(book.querySelector(".tip")).toHaveTextContent("Sources")

		const flags = screen.getAllByRole("button", { name: "Report: coming soon" })
		expect(flags).toHaveLength(3)
		expect(flags[0]).toHaveAttribute("aria-disabled", "true")
		// aria-disabled, not disabled: it stays focusable so its tooltip is reachable.
		expect(flags[0]).not.toBeDisabled()

		// Tab runs top to bottom: checkbox, book (top right), flag (bottom right).
		const card = document.querySelector("li.item") as HTMLElement
		expect([...card.querySelectorAll("input, a, button")].map((e) => e.tagName)).toEqual([
			"INPUT",
			"A",
			"BUTTON",
		])
	})

	it("toggles an item from its label, and a flag tap shows the tooltip without toggling", async () => {
		await ready()
		fireEvent.click(screen.getByText("Pelican"))
		// The tick goes through IndexedDB before the controlled checkbox re-renders.
		await waitFor(() => expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeChecked())

		const unwire = wireTooltips(document)
		const flag = screen.getAllByRole("button", { name: "Report: coming soon" })[0]
		fireEvent.click(flag)
		expect(flag).toHaveAttribute("data-tip-open")
		expect(screen.getByRole("checkbox", { name: "Bike" })).not.toBeChecked()
		unwire()
	})
```

In the "Category toggles" describe, add:

```tsx
	it("ends the chip row with a Sources link, not a toggle", async () => {
		await ready()
		const nav = screen.getByRole("navigation", { name: "Categories" })
		const items = [...nav.querySelectorAll("li")]
		const last = items[items.length - 1].firstElementChild
		expect(last?.tagName).toBe("A")
		expect(last).toHaveAttribute("href", "/en/tracker/sources/")
		expect(last).toHaveTextContent("Sources")
		expect(last).not.toHaveAttribute("aria-pressed")
	})
```

Run: `npx vitest run src/islands/Tracker.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Write `src/islands/tracker/icons.tsx`**

```tsx
// Tracker icons (feedback spec §4, §5). Decorative only: every control names itself with hidden
// text, so the SVGs are hidden from assistive tech.
const common = {
	viewBox: "0 0 24 24",
	width: 22,
	height: 22,
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	"aria-hidden": true,
} as const

export function BookIcon() {
	return (
		<svg {...common}>
			<path d="M4 19V5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
			<path d="M19 19v2H6" />
		</svg>
	)
}

export function FlagIcon() {
	return (
		<svg {...common}>
			<path d="M5 21V4" />
			<path d="M5 4h11l-2 4 2 4H5" />
		</svg>
	)
}
```

- [ ] **Step 4: Rewrite the card in `ItemList.tsx`**

Add `import { BookIcon, FlagIcon } from "./icons"`. Add `sourcesHref: string` to `Props` (with the doc comment `/** The Sources page; each book link adds "#<item id>". */`), destructure it, pass `sourcesHref={sourcesHref}` to each `ItemRow`, add `sourcesHref: string` to `RowProps`, and replace `ItemRow` with:

```tsx
/**
 * One card per item (feedback spec §4). The label's ::after covers the card, so a click anywhere
 * toggles the one real checkbox; the corner icons sit above that layer.
 */
function ItemRow({ item, done, disabled, onToggle, sourcesHref, strings }: RowProps) {
	// The seed id has exactly one slash (schema), so it is unique as a DOM id as it stands.
	const inputId = `item-${item.id}`
	const tier =
		item.status === "confirmed"
			? strings.confirmed
			: fill(strings.expectedFrom, { precedent: item.precedent ?? "" })
	return (
		<li className="item">
			<div className="item-main">
				<input
					id={inputId}
					type="checkbox"
					checked={done}
					disabled={disabled}
					onChange={(event) => onToggle(item.id, event.target.checked)}
				/>
				<label htmlFor={inputId}>{item.name}</label>
			</div>
			{/* Before the flag in the DOM, so Tab runs top to bottom. It is absolutely positioned, so
			    its place here changes no layout. */}
			<a className="item-icon item-book has-tip tip-end" href={`${sourcesHref}#${item.id}`}>
				<BookIcon />
				<span className="visually-hidden">
					{strings.sources}: {item.name}
				</span>
				<span className="tip" aria-hidden="true">
					{strings.sources}
				</span>
			</a>
			<span className="tier" data-status={item.status}>
				{tier}
			</span>
			{item.description && <p className="item-desc">{item.description}</p>}
			<div className="item-foot">
				{/* aria-disabled keeps it focusable, so its tooltip explains it (spec §3.3). */}
				<button type="button" className="item-icon has-tip tip-end" aria-disabled="true">
					<FlagIcon />
					<span className="visually-hidden">{strings.reportSoon}</span>
					<span className="tip" aria-hidden="true">
						{strings.reportSoon}
					</span>
				</button>
			</div>
		</li>
	)
}
```

- [ ] **Step 5: Add the Sources chip to `CategoryNav.tsx`**

Add `import { BookIcon } from "./icons"`, add `sources: { href: string; label: string }` to `Props`, destructure it, and after the `categories.map(…)` block add:

```tsx
				{/* A link to another page, not a filter, so it has no aria-pressed (spec §5). */}
				<li>
					<a className="chip-link" href={sources.href}>
						<BookIcon />
						{sources.label}
					</a>
				</li>
```

- [ ] **Step 6: Pass the props from `Tracker.tsx`**

Before the `if (state.status === "error")` line, add:

```tsx
	const sourcesHref = `/${locale}/tracker/sources/`
```

Add `sources={{ href: sourcesHref, label: s.tracker.sources }}` to `<CategoryNav …>` and `sourcesHref={sourcesHref}` to `<ItemList …>`.

- [ ] **Step 7: Run the tracker tests**

Run: `npx vitest run src/islands`
Expected: PASS, including the axe test. If `Tracker.profiles.test.tsx` or `Tracker.import.test.tsx` reference `"Report"` or source links, update them the same way.

- [ ] **Step 8: Card and chip CSS**

In `global.css`, replace the rules from `.item-group ul {` through `.report { … }` (lines 635-721) with:

```css
.item-group ul {
	display: grid;
	/* min() keeps one column inside a 320 px screen at 200 % text (reflow). */
	grid-template-columns: repeat(auto-fill, minmax(min(16rem, 100%), 1fr));
	gap: 12px;
	margin: 0 0 var(--space-4);
	padding: 0;
	list-style: none;
}

/* One card per item; rows stretch, so cards in a row share one height and bottom edge. */
.item {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--space-1);
	padding: 12px 12px 12px 16px;
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-raised);
}

/* 40 px on the right keeps the name clear of the book icon. */
.item-main {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	min-height: var(--tap);
	padding-right: 40px;
}

.item-main input {
	appearance: none;
	display: grid;
	place-content: center;
	flex: none;
	width: 20px;
	height: 20px;
	margin: 0;
	border: 2px solid var(--text-muted);
	border-radius: 4px;
	background: transparent;
}

.item-main input::before {
	content: "";
	width: 12px;
	height: 12px;
	clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
	background: var(--accent-text);
	transform: scale(0);
}

.item-main input:checked {
	border-color: var(--accent);
	background: var(--accent);
}

.item-main input:checked::before {
	transform: scale(1);
}

@media (forced-colors: active) {
	.item-main input::before {
		background: CanvasText;
	}
}

/* The card carries the focus ring instead (below). */
.item-main input:focus-visible {
	outline: none;
}

.item-main label {
	flex: 1;
	font-size: 0.9375rem;
	font-weight: 600;
	cursor: pointer;
}

/* The whole card is the label's click area. */
.item-main label::after {
	content: "";
	position: absolute;
	inset: 0;
	border-radius: inherit;
}

.item:has(input:disabled) label {
	cursor: default;
}

.tier {
	align-self: flex-start;
	margin-inline-start: 28px;
	padding: 1px 8px;
	border: 1px solid color-mix(in srgb, currentColor 50%, transparent);
	border-radius: 999px;
	color: var(--text-muted);
	font-size: 0.75rem;
}

/* Tier colours come from their own tokens so a theme can swap them without touching the accent. */
.tier[data-status="confirmed"] {
	color: var(--tier-confirmed);
}

.tier[data-status="expected"] {
	color: var(--tier-expected);
}

.item-desc {
	margin: 0 0 0 28px;
	color: var(--text-muted);
	font-size: 0.875rem;
	line-height: 1.5;
}

/* In the flow, pushed to the bottom: the flag can never overlap the book. The negative right
   margin puts its box 13 px from the card's bottom edge and 7 px from its right edge (spec §4). */
.item-foot {
	display: flex;
	justify-content: flex-end;
	margin: auto -6px 0 0;
}

/* .item .item-icon outranks the shared `.tracker button` reset. */
.item .item-icon {
	position: relative;
	z-index: 1;
	display: inline-grid;
	place-items: center;
	width: var(--tap);
	height: var(--tap);
	padding: 0;
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: var(--text-muted);
	cursor: pointer;
}

.item .item-icon svg {
	width: 22px;
	height: 22px;
}

.item .item-icon[aria-disabled="true"] {
	cursor: default;
}

.item .item-book {
	position: absolute;
	top: 12px;
	right: 6px;
}

.item .item-book:focus-visible {
	color: var(--link);
	background: color-mix(in srgb, var(--link) 12%, transparent);
}

.item:has(input:focus-visible) {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
	background: var(--bg-hover);
}

@media (hover: hover) {
	.item:hover {
		background: var(--bg-hover);
		border-color: color-mix(in srgb, var(--accent) 50%, transparent);
	}

	.item .item-book:hover {
		color: var(--link);
		background: color-mix(in srgb, var(--link) 12%, transparent);
	}
}

@media (hover: none) {
	.item .item-book:active {
		color: var(--link);
		background: color-mix(in srgb, var(--link) 12%, transparent);
	}
}

@media (hover: hover) and (prefers-reduced-motion: no-preference) {
	.item:hover {
		box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 15%, transparent);
	}
}

/* The Sources chip: a link, drawn as an outlined cyan chip. */
.chips a {
	display: inline-flex;
	align-items: center;
	gap: var(--space-2);
	min-height: var(--tap);
	padding: var(--space-2) var(--space-3);
	border: 1px solid var(--link);
	border-radius: 999px;
	color: var(--link);
	text-decoration: none;
}

.chips a svg {
	flex: none;
	width: 18px;
	height: 18px;
}
```

In the `@media (min-width: 768px)` block, change `.chips button { … }` to `.chips button, .chips a { … }` (full width, left aligned, `border-radius: var(--radius)`). In the `@media (min-width: 1024px)` block, delete the `.item-groups { … }` rule (the cards are the grid now).

- [ ] **Step 9: Run the suite, check and build**

Run: `npm test`, `npm run check`, `npm run build`
Expected: all PASS.

- [ ] **Step 10: Measure in the Browser pane (Review Focus 2)**

Find the longest live item name: `node -e "const fs=require('fs');const all=fs.readdirSync('src/seed').filter(f=>f!=='rumours.json').flatMap(f=>JSON.parse(fs.readFileSync('src/seed/'+f)));const i=all.filter(x=>!x.retired).sort((a,b)=>b.name.length-a.name.length)[0];console.log(i.id,i.name.length,!!i.description)"`. Serve the build, open `/en/tracker/` at 320 px and 1024 px, and read `getBoundingClientRect()`:
- Cards in one row share `top` and `bottom` (difference 0.5 px or less).
- Book box: 13 px below the card's top edge and 7 px in from its right edge, measured on the li's border box, and its vertical centre equals `.item-main`'s (0.5 px or less). Flag box: 13 px above the bottom edge and 7 px in from the right.
- Reflow: at 320 px, run `document.documentElement.style.fontSize = "200%"` in the console; `scrollWidth === clientWidth` on `/en/tracker/` and `/no/tracker/`.
- Keyboard walk on one card: Tab goes checkbox, book, flag.
- The label's text right edge is left of the book box's left edge on every card, including the longest name. If that card has a description, also check a card without one: temporarily delete one description in devtools and confirm the book and flag boxes don't intersect.
- Clicking the card's empty area (not the icons) toggles it; clicking the flag doesn't.
Record the numbers for the PR.

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Lay tracker items out as even cards with a sources link and a report flag"
```

---

### Task 7: Arriving at `#item-<id>` from the Sources page

**Files:**
- Create: `src/islands/tracker/hash.ts`, `src/islands/tracker/hash.test.ts`
- Modify: `src/islands/Tracker.tsx` (one effect)
- Modify: `src/islands/Tracker.test.tsx` (new describe)

**Interfaces:**
- Consumes: checkbox ids `item-<seed id>` (Task 6).
- Produces: `hashTarget(hash: string, doc: Document): HTMLInputElement | null`. Never throws.

- [ ] **Step 1: Write the failing unit test**

Create `src/islands/tracker/hash.test.ts`:

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest"
import { hashTarget } from "./hash"

beforeEach(() => {
	document.body.innerHTML = `<input type="checkbox" id="item-wildlife/pelican"><p id="item-note"></p>`
})

describe("hashTarget (feedback spec §4)", () => {
	it("finds a checkbox whose id contains a slash", () => {
		expect(hashTarget("#item-wildlife/pelican", document)?.id).toBe("item-wildlife/pelican")
	})

	it("decodes a percent-encoded hash", () => {
		expect(hashTarget("#item-wildlife%2Fpelican", document)?.id).toBe("item-wildlife/pelican")
	})

	it.each(["", "#", "#wildlife/pelican", "#item-wildlife/dodo", "#item-%", "#item-%E0%A4%A", "#item-note"])(
		"returns null for %j",
		(hash) => {
			expect(hashTarget(hash, document)).toBeNull()
		}
	)
})
```

Run: `npx vitest run src/islands/tracker/hash.test.ts`
Expected: FAIL with "Failed to resolve import ./hash".

- [ ] **Step 2: Write `src/islands/tracker/hash.ts`**

```ts
/**
 * The tracker checkbox a `#item-<id>` hash points at, or null (feedback spec §4). Never throws:
 * `decodeURIComponent` throws on a hash like `#item-%`, and `querySelector` would throw on the
 * slash every seed id contains, so this decodes in a try/catch and uses getElementById.
 */
export function hashTarget(hash: string, doc: Document): HTMLInputElement | null {
	let id: string
	try {
		id = decodeURIComponent(hash.slice(1))
	} catch {
		return null
	}
	if (!id.startsWith("item-")) return null
	const el = doc.getElementById(id)
	return el?.tagName === "INPUT" ? (el as HTMLInputElement) : null
}
```

Run: `npx vitest run src/islands/tracker/hash.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 3: Write the failing Tracker test**

Add to `src/islands/Tracker.test.tsx` (add `render` to the Testing Library import and `afterEach` to the vitest import):

```tsx
describe("Arriving from the Sources page (feedback spec §4)", () => {
	const scroll = vi.fn()
	beforeEach(() => {
		scroll.mockClear()
		Element.prototype.scrollIntoView = scroll
	})

	it("waits for the store, then focuses the checkbox once, even with a slash in the id", async () => {
		window.history.replaceState(null, "", "/en/tracker/#item-wildlife/pelican")
		render(<Tracker locale="en" />)
		const box = await screen.findByRole("checkbox", { name: "Pelican" })
		await waitFor(() => expect(document.activeElement).toBe(box))
		expect(box).toBeEnabled()
		expect(scroll).toHaveBeenCalledOnce()
		expect(scroll).toHaveBeenCalledWith({ block: "center" })
	})

	it.each(["#item-wildlife/dodo", "#item-%", "#nothing"])(
		"does nothing for %j and the tracker stays mounted",
		async (hash) => {
			window.history.replaceState(null, "", `/en/tracker/${hash}`)
			await ready()
			expect(document.activeElement).toBe(document.body)
			expect(scroll).not.toHaveBeenCalled()
			expect(screen.getByRole("checkbox", { name: "Pelican" })).toBeInTheDocument()
		}
	)
})
```

Run: `npx vitest run src/islands/Tracker.test.tsx`
Expected: the first test FAILS (focus stays on body).

- [ ] **Step 4: Add the effect to `Tracker.tsx`**

Change the React import to `import { type ChangeEvent, useEffect, useRef, useState } from "react"`, add `import { hashTarget } from "./tracker/hash"`, and after the `const current = …`/`currentName` lines add:

```tsx
	// Arriving from a Sources page back link (feedback spec §4): once, when the store is ready and
	// the checkboxes can take focus. Nothing here may throw into React: an uncaught error would
	// unmount the whole Tracker, and the hash survives a reload.
	const arrived = useRef(false)
	useEffect(() => {
		if (state.status !== "ready" || arrived.current) return
		arrived.current = true
		try {
			const box = hashTarget(window.location.hash, document)
			if (!box) return
			box.focus({ preventScroll: true })
			box.scrollIntoView({ block: "center" })
		} catch {
			// A browser without scrollIntoView options still got the focus.
		}
	}, [state.status])
```

- [ ] **Step 5: Run the tests, then everything**

Run: `npx vitest run src/islands`, then `npm test`, `npm run check`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add src/islands
git commit -m "Focus the tracker item a Sources back link points at once the tracker is ready"
```

---

### Task 8: Sources page

**Files:**
- Create: `src/pages/[locale]/tracker/sources.astro`, `src/test/sources-page.test.ts`
- Modify: `src/components/TabBar.astro` (`sub` prop), `src/layouts/Base.astro` (computes `sub`), `src/layouts/Base.test.ts`
- Modify: `src/model/seo.ts:24-26`, `src/model/seo.test.ts:23-31`
- Modify: `src/styles/global.css` (`.tabbar a[aria-current="page"]` selectors, 5 places)
- Modify: `src/i18n/en.ts`, `src/i18n/no.ts` (`sources` block, `seo.titles.sources`)

**Interfaces:**
- Consumes: `ExternalLink` (Task 2), `outletOf`, `categoryIds`, `groupItems`, `seedItems` from `src/model/seed.ts`, checkbox ids from Task 6.
- Produces: the page `/{locale}/tracker/sources/` with `<article id="<seed id>">` per live item (the book links' targets); `TabBar` prop `sub?: boolean`; `indexablePaths` now includes `"tracker/sources"`.

- [ ] **Step 1: Copy**

`src/i18n/en.ts`, after the `news` block:

```ts
	sources: {
		title: "Sources",
		lede: "Where every item in the tracker comes from.",
		back: "Back to the item in the tracker",
	},
```

and in `seo.titles` add `sources: "Sources for the GTA 6 tracker · Rookdex",`. `src/i18n/no.ts`:

```ts
	sources: {
		title: "Kilder",
		lede: "Hvor hvert element i oversikten kommer fra.",
		back: "Tilbake til elementet i oversikten",
	},
```

and `sources: "Kilder for GTA 6-sjekklisten · Rookdex",` in `seo.titles`.

- [ ] **Step 2: indexablePaths, test first**

In `src/model/seo.test.ts`, change the first `indexablePaths` test to:

```ts
	it("lists home, tracker, its sources, news, then each guide once under guides/", () => {
		expect(indexablePaths(["before-you-start", "before-you-start"])).toEqual([
			"",
			"tracker",
			"tracker/sources",
			"news",
			"guides/before-you-start",
		])
	})
```

Run it (FAIL), then change `indexablePaths` in `src/model/seo.ts` to return `["", "tracker", "tracker/sources", "news", ...validSlugs(guideSlugs).map((slug) => `guides/${slug}`)]`. Run: `npx vitest run src/model/seo.test.ts` (PASS).

- [ ] **Step 3: The sub-page tab state, test first**

Add to `src/layouts/Base.test.ts` inside "main navigation":

```ts
	it("keeps the Tracker tab lit on its Sources page, without claiming to be that page", async () => {
		const doc = await page("tracker/sources")
		const lit = doc.querySelectorAll('nav[aria-label="Main"] [aria-current]')
		expect(lit).toHaveLength(1)
		expect(lit[0].textContent?.trim()).toBe("Tracker")
		expect(lit[0].getAttribute("aria-current")).toBe("true")
	})
```

Run: `npx vitest run src/layouts/Base.test.ts` (FAIL: `"page"`).

In `src/components/TabBar.astro`, add to `Props`:

```ts
	/** The page sits below the current tab (the Sources page under Tracker): the tab stays lit
	 *  but says "true", because it links to a different page (feedback spec §5). */
	sub?: boolean
```

destructure `sub = false`, and set `aria-current={id === current ? (sub ? "true" : "page") : undefined}`.

In `src/layouts/Base.astro`, change the tabs import to `import { currentTab, TAB_PATHS, type Tab } from "../model/tabs"`, add after `const s = t(locale)`:

```ts
const current = currentTab(path, tab)
const sub = current !== null && path !== TAB_PATHS[current]
```

and render `<TabBar locale={locale} current={current} sub={sub} />`.

In `global.css`, change every `.tabbar a[aria-current="page"]` selector to `.tabbar a[aria-current]` (the rule, its `.tab-icon` rule and `::before` at the top level; `::before` and `::after` in the 768 px block). Leave `.lang a[aria-current="page"]` alone.

Run: `npx vitest run src/layouts/Base.test.ts` (PASS).

- [ ] **Step 4: Write the failing Sources page test**

Create `src/test/sources-page.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { categoryIds, seedItems } from "../model/seed"
import Sources from "../pages/[locale]/tracker/sources.astro"
import { renderDoc } from "./render"

const live = seedItems.filter((item) => !item.retired)
const page = (locale: "en" | "no") => renderDoc(Sources, { params: { locale } })
const text = (el: Element | null | undefined) => el?.textContent?.replace(/\s+/g, " ").trim()

describe("Sources page (feedback spec §5)", () => {
	it("is a titled page under the Tracker tab", async () => {
		const doc = await page("en")
		expect(doc.querySelector("h1")?.textContent).toBe("Sources")
		expect(doc.querySelector(".lede")?.textContent).toBe(
			"Where every item in the tracker comes from."
		)
		expect(doc.title).toBe("Sources for the GTA 6 tracker · Rookdex")
		const lit = doc.querySelector('nav[aria-label="Main"] [aria-current]')
		expect(text(lit)).toBe("Tracker")
		expect(lit?.getAttribute("aria-current")).toBe("true")
	})

	it("has one entry per live item, anchored on its seed id", async () => {
		const doc = await page("en")
		const ids = [...doc.querySelectorAll("article.source-entry")].map((a) => a.id)
		expect([...ids].sort()).toEqual(live.map((item) => item.id).sort())
		for (const item of seedItems.filter((i) => i.retired)) {
			expect(doc.getElementById(item.id)).toBeNull()
		}
	})

	it("links every source out in a new tab, with its outlet under it", async () => {
		const doc = await page("no")
		for (const item of live) {
			const entry = doc.getElementById(item.id)
			expect(text(entry?.querySelector("h3"))).toBe(item.name)
			const links = [...(entry?.querySelectorAll('a[target="_blank"]') ?? [])]
			expect(links.map((a) => a.getAttribute("href"))).toEqual(item.sources.map((s) => s.url))
			for (const a of links) expect(a.querySelector(".new-tab-note")).not.toBeNull()
			expect(entry?.querySelectorAll(".outlet")).toHaveLength(item.sources.length)
		}
	})

	it("counts the live items of each category on its chip, in the tracker's order", async () => {
		const doc = await page("en")
		const chips = [...doc.querySelectorAll(".source-chips a")]
		const categories = categoryIds(live)
		expect(chips.map((a) => a.getAttribute("href"))).toEqual(categories.map((c) => `#cat-${c}`))
		expect(chips.map((a) => a.querySelector(".count")?.textContent)).toEqual(
			categories.map((c) => String(live.filter((item) => item.category === c).length))
		)
		for (const c of categories) expect(doc.getElementById(`cat-${c}`)?.tagName).toBe("H2")
	})

	it("links back to each item's checkbox, named with the item", async () => {
		const doc = await page("en")
		for (const item of live) {
			const back = doc.getElementById(item.id)?.querySelector("a.back")
			expect(back?.getAttribute("href")).toBe(`/en/tracker/#item-${item.id}`)
			expect(text(back)).toBe(`Back to the item in the tracker: ${item.name}`)
		}
	})
})
```

Run: `npx vitest run src/test/sources-page.test.ts`
Expected: FAIL with "Failed to resolve import ../pages/[locale]/tracker/sources.astro".

- [ ] **Step 5: Write `src/pages/[locale]/tracker/sources.astro`**

```astro
---
import { getRelativeLocaleUrl } from "astro:i18n"
import ExternalLink from "../../../components/ExternalLink.astro"
import { isLocale, type Locale, locales, t } from "../../../i18n"
import Base from "../../../layouts/Base.astro"
import { outletOf } from "../../../model/outlet"
import { categoryIds, groupItems, seedItems } from "../../../model/seed"

export function getStaticPaths() {
	return locales.map((locale) => ({ params: { locale } }))
}

// Where every tracker item comes from (feedback spec §5). Built from the seed, zero JavaScript.
// Categories and entries follow the tracker's order; retired items are left out, as there.
const { locale } = Astro.params
if (!isLocale(locale)) throw new Error(`Unknown locale: ${locale}`)
const s = t(locale as Locale)
const live = seedItems.filter((item) => !item.retired)
const sections = categoryIds(live).map((category) => ({
	category,
	label: s.category[category] ?? category,
	items: [...groupItems(live.filter((item) => item.category === category)).values()].flat(),
}))
const tracker = getRelativeLocaleUrl(locale as Locale, "tracker")
---

<Base locale={locale} title={s.seo.titles.sources} description={s.sources.lede} path="tracker/sources">
	<h1>{s.sources.title}</h1>
	<p class="lede">{s.sources.lede}</p>
	<nav aria-label={s.tracker.categories}>
		<ul class="source-chips">
			{
				sections.map((section) => (
					<li>
						<a href={`#cat-${section.category}`}>
							{section.label}
							<span class="count">{section.items.length}</span>
						</a>
					</li>
				))
			}
		</ul>
	</nav>
	{
		sections.map((section) => (
			<section class="source-section" aria-labelledby={`cat-${section.category}`}>
				<h2 id={`cat-${section.category}`}>{section.label}</h2>
				{section.items.map((item) => (
					<article id={item.id} class="source-entry">
						<h3>{item.name}</h3>
						<ul class="tap-links">
							{item.sources.map((source) => (
								<li>
									<ExternalLink href={source.url} locale={locale as Locale}>
										{source.title}
									</ExternalLink>
									<span class="outlet">{outletOf(source.url)}</span>
								</li>
							))}
						</ul>
						<a class="back" href={`${tracker}#item-${item.id}`}>
							{s.sources.back}<span class="visually-hidden">: {item.name}</span>
						</a>
					</article>
				))}
			</section>
		))
	}
</Base>

<style>
	h1 {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: var(--space-1);
	}

	.lede {
		color: var(--text-muted);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.source-chips {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		margin: 0 0 var(--space-4);
		padding: 0;
		list-style: none;
	}

	.source-chips a {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--tap);
		padding: 0 var(--space-3);
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--bg-raised);
		color: var(--text);
		font-size: 0.9375rem;
		text-decoration: none;
		transition: background-color 120ms, border-color 120ms;
	}

	@media (hover: hover) {
		.source-chips a:hover {
			background: var(--bg-hover);
			border-color: color-mix(in srgb, var(--accent) 50%, transparent);
		}
	}

	@media (hover: none) {
		.source-chips a:active {
			background: var(--bg-hover);
		}
	}

	.source-chips a:focus-visible {
		background: var(--bg-hover);
	}

	.count {
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.source-section {
		display: grid;
		gap: 12px;
		margin-bottom: var(--space-5);
	}

	.source-section h2 {
		margin-bottom: 0;
		font-size: 1.25rem;
	}

	.source-entry {
		padding: 12px 12px 12px 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg-raised);
	}

	/* The entry a book icon pointed at. */
	.source-entry:target {
		border-color: var(--link);
	}

	@media (prefers-reduced-motion: no-preference) {
		.source-entry:target {
			box-shadow: 0 0 16px color-mix(in srgb, var(--link) 20%, transparent);
		}
	}

	.source-entry h3 {
		margin: 0 0 var(--space-1);
		font-size: 0.9375rem;
		font-weight: 600;
	}

	.source-entry ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* The 44 px target is the link itself (the global .tap-links utility), not the row. */
	.source-entry li {
		display: flex;
		flex-direction: column;
	}

	.outlet {
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.back {
		display: inline-flex;
		align-items: center;
		min-height: var(--tap);
		color: var(--text-muted);
		font-size: 0.8125rem;
	}
</style>
```

- [ ] **Step 6: Run the tests, check and build**

Run: `npx vitest run src/test/sources-page.test.ts`, then `npm test`, `npm run check`, `npm run build`
Expected: all PASS. The build's seo check now reports two more files, and `dist/sitemap.xml` lists 10 URLs (confirm: `grep -c "<loc>" dist/sitemap.xml` prints `10`). The precache list includes `/en/tracker/sources/` and `/no/tracker/sources/` (confirm in `dist/sw.js`).

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "Add a Sources page under the tracker and list it in the sitemap"
```

---

### Task 9: "Before you start" guide

**Files:**
- Modify: `src/content/guides/en/before-you-start.md`, `src/content/guides/no/before-you-start.md`
- Create: `src/test/guide-content.test.ts`

**Interfaces:**
- Consumes: `#about` on Settings (Task 5); the https-only schema (Task 2); the build check (Task 3).
- Produces: nothing code depends on.

- [ ] **Step 1: Re-check the facts (the spec requires it on the day the content is written)**

Open both sources in the Browser pane and confirm each fact below still holds. If one changed, write the current fact and note the change in the task report.
- `https://www.rockstargames.com/newswire/article/5171972o3ak5oa/pre-order-grand-theft-auto-vi-on-june-25` (the Newswire pre-order article; if this URL turns out to be a different article, the other candidate is `https://www.rockstargames.com/newswire/article/517oa135328155/grand-theft-auto-vi-pre-orders-begin-on-june-25`; use whichever carries the Vintage Vice City Pack and the GTA+ month. If neither is the pre-order article, find it from the Newswire index and use that URL)
- `https://store.playstation.com/no-no/concept/10000730` (the PlayStation Store page for Norway)
Facts: Standard 949 kr, Ultimate 1 189 kr, an Ultimate Upgrade sold separately; pre-order or purchase before 20 November gives the Vintage Vice City Pack (a car with a garage, outfits, a weapon pattern); a digital pre-order includes one month of GTA+, which on PlayStation renews until cancelled and must be redeemed by 31 March 2027; GTA+ perks are for GTA Online and the games library, not GTA VI single-player; physical boxes hold a download code and are sold from 12 November; the PlayStation Store charges at pre-order; the standard digital edition's price on the Microsoft Store for Norway. If the Xbox price can't be confirmed, drop "and the Xbox Store" / "og Xbox Store" from Buying in Norway.

If you can't open the Browser pane, or a page asks for a date of birth, a sign-in or anything beyond declining non-essential cookies, stop and report BLOCKED with what you saw. The controller or Malin then checks the facts by hand. Never enter personal data. If a fact changed in a way that changes the advice (a price, a date, what GTA+ covers or how it renews), report it before you write the copy. List each fact next to the URL you read it from.

- [ ] **Step 2: Write the failing content test**

Create `src/test/guide-content.test.ts`:

```ts
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (locale: string) =>
	readFileSync(
		new URL(`../content/guides/${locale}/before-you-start.md`, import.meta.url),
		"utf8"
	).replace(/\r\n/g, "\n")
const body = (text: string) => text.slice(text.indexOf("\n---\n", 4) + 5)
const headings = (text: string) => [...body(text).matchAll(/^## (.+)$/gm)].map((m) => m[1])

describe.each([
	[
		"en",
		[
			"The date",
			"Editions",
			"Pre-order bonus",
			"GTA+",
			"Preload",
			"Buying in Norway",
			"What Rookdex does on launch night",
		],
	],
	[
		"no",
		[
			"Datoen",
			"Utgaver",
			"Bonus ved forhåndsbestilling",
			"GTA+",
			"Forhåndsnedlasting",
			"Kjøp i Norge",
			"Hva Rookdex gjør på lanseringskvelden",
		],
	],
])("Before you start, %s (feedback spec §9)", (locale, expected) => {
	const text = read(locale)

	it("has the sections in order", () => {
		expect(headings(text)).toEqual(expected)
	})

	it("links only inside the app from its body", () => {
		expect(body(text)).not.toMatch(/\]\((https?:)?\/\//)
		expect(body(text)).toContain(`](/${locale}/settings/#about)`)
		expect(body(text)).toContain(`](/${locale}/)`)
	})

	it("cites the pre-order article and the PlayStation Store page, and is dated", () => {
		expect(text).toMatch(/\n {2}- https:\/\/www\.rockstargames\.com\/newswire\/article\/\S+\n/)
		expect(text).toContain("  - https://store.playstation.com/no-no/concept/10000730")
		expect(text).not.toContain("https://www.rockstargames.com/newswire\n")
		expect(text).not.toContain("updated: 2026-09-09")
	})
})
```

Run: `npx vitest run src/test/guide-content.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the English guide**

Run `date +"%Y-%m-%d"` and use the output as `updated`. Replace `src/content/guides/en/before-you-start.md` with (substituting the date and, if Step 1 changed it, the article URL):

```markdown
---
title: Before you start
searchTitle: "Before you start: GTA 6 launch checklist · Rookdex"
summary: What to sort out before launch night so you can play at midnight.
updated: YYYY-MM-DD
sources:
  - https://www.rockstargames.com/newswire/article/5171972o3ak5oa/pre-order-grand-theft-auto-vi-on-june-25
  - https://store.playstation.com/no-no/concept/10000730
---

## The date

The game releases on **19 November 2026** on PlayStation 5 and Xbox Series X|S. Digital editions unlock at midnight CET. There is no PC version at launch, and it is single-player at launch.

## Editions

Two editions are on sale: Standard at 949 kr and Ultimate at 1 189 kr. The store page lists what Ultimate adds. If you buy Standard, you can move up later with the Ultimate Upgrade instead of buying the game again.

## Pre-order bonus

Pre-order the game, or buy it before 20 November, and you get the Vintage Vice City Pack: a car with a garage to keep it in, a few outfits and a weapon pattern.

## GTA+

A digital pre-order includes one month of GTA+. On PlayStation the membership renews by itself until you cancel it, and you have to redeem the month by 31 March 2027. GTA+ perks apply to GTA Online and the GTA+ games library, not to single-player GTA VI. If you don't want to pay for a second month, cancel before it renews.

## Preload

Preload opens on **12 November**. Start it the day it opens: the download is large, and launch-night servers are slow. A physical copy doesn't save you the download. The box holds a download code, and physical copies go on sale on 12 November.

## Buying in Norway

The standard digital edition is 949 kr on the PlayStation Store and the Xbox Store. The PlayStation Store charges you when you pre-order, not on release day. Physical copies come from the usual Norwegian retailers.

## What Rookdex does on launch night

[The home page](/en/) turns into your dashboard at midnight. [Install the site](/en/settings/#about) on your phone before then, so it works even when the wifi is busy.
```

- [ ] **Step 4: Write the Norwegian guide**

Replace `src/content/guides/no/before-you-start.md` with (same `updated` and sources):

```markdown
---
title: Før du begynner
searchTitle: "Før du begynner: GTA 6-sjekkliste for lanseringen · Rookdex"
summary: Det du bør ordne før lanseringskvelden, så du kan spille ved midnatt.
updated: YYYY-MM-DD
sources:
  - https://www.rockstargames.com/newswire/article/5171972o3ak5oa/pre-order-grand-theft-auto-vi-on-june-25
  - https://store.playstation.com/no-no/concept/10000730
---

## Datoen

Spillet slippes **19. november 2026** på PlayStation 5 og Xbox Series X|S. Digitale utgaver låses opp ved midnatt norsk tid. Det kommer ingen PC-versjon ved lansering, og spillet er enspiller ved lansering.

## Utgaver

To utgaver er i salg: Standard til 949 kr og Ultimate til 1 189 kr. Butikksiden viser hva Ultimate gir i tillegg. Kjøper du Standard, kan du gå over til Ultimate senere med Ultimate Upgrade i stedet for å kjøpe spillet på nytt.

## Bonus ved forhåndsbestilling

Forhåndsbestiller du spillet, eller kjøper det før 20. november, får du Vintage Vice City Pack: en bil med en garasje å ha den i, noen antrekk og et våpenmønster.

## GTA+

En digital forhåndsbestilling gir én måned med GTA+. På PlayStation fornyes medlemskapet av seg selv til du sier det opp, og måneden må løses inn innen 31. mars 2027. GTA+-fordelene gjelder GTA Online og GTA+-spillbiblioteket, ikke enspillerdelen av GTA VI. Vil du ikke betale for en måned til, må du si opp før det fornyes.

## Forhåndsnedlasting

Forhåndsnedlasting åpner **12. november**. Start den samme dag: nedlastingen er stor, og serverne er trege på lanseringskvelden. En fysisk utgave sparer deg ikke for nedlastingen. Esken inneholder en nedlastingskode, og fysiske utgaver selges fra 12. november.

## Kjøp i Norge

Standard digital utgave koster 949 kr i PlayStation Store og Xbox Store. PlayStation Store trekker pengene når du forhåndsbestiller, ikke på lanseringsdagen. Fysiske utgaver får du hos de vanlige norske butikkene.

## Hva Rookdex gjør på lanseringskvelden

[Forsiden](/no/) blir dashbordet ditt ved midnatt. [Installer siden](/no/settings/#about) på telefonen før det, så virker den selv når wifi-en er full.
```

- [ ] **Step 5: Run the tests and build**

Run: `npx vitest run src/test/guide-content.test.ts`, then `npm test`, `npm run build`
Expected: all PASS; the build's content layer accepts the two https sources from different outlets, and the external-link check passes the guide pages.

- [ ] **Step 6: Measure the sources line (spec §9)**

In the Browser pane at 320 px on `/en/guides/before-you-start/`: the sources line wraps onto two lines and `document.documentElement.scrollWidth` is 320. Then on `/no/guides/before-you-start/`: every `h2` has `scrollWidth` equal to its `clientWidth` ("Forhåndsbestillingsbonus" measured 297 in 288, which is why the heading is "Bonus ved forhåndsbestilling"). Record it for the PR.

- [ ] **Step 7: Commit**

```bash
git add src/content src/test/guide-content.test.ts
git commit -m "Add editions, the pre-order bonus and GTA+ to the launch guide and fix the physical-copy line"
```

---

### Task 10: The waiting service worker and its version guard

**Files:**
- Modify: `src/sw/sw.js`
- Create: `src/sw/sw.test.ts`
- Modify: `integrations/precache.mjs`, `integrations/precache.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `sw.js` listens for `message` `{ type: "SKIP_WAITING" }`; install no longer skips waiting; SWR stores a page only when `X-Rookdex-Version` equals `VERSION` or is missing.
  - `fillWorker(template: string, version: string, urls: string[]): string`, `computeVersion(root: string, files: string[]): Promise<string>`, `withVersionHeader(headers: string, version: string): string` exported from `integrations/precache.mjs`.
  - Every static response under `/*` carries `X-Rookdex-Version: <version>` (Task 11's notice relies on the worker never caching a mismatched page).

- [ ] **Step 1: Write the failing precache tests**

Add to `integrations/precache.test.ts` (extend the import to `computeVersion, fillWorker, precacheUrls, shouldPrecache, withVersionHeader` and add `import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"`, `import { tmpdir } from "node:os"`, `import { join } from "node:path"`):

```ts
describe("withVersionHeader (feedback spec §10.2)", () => {
	const headers = [
		"/*",
		"  X-Content-Type-Options: nosniff",
		"",
		"/sw.js",
		"  Cache-Control: no-cache",
		"",
		"https://:version.:subdomain.workers.dev/*",
		"  X-Robots-Tag: noindex",
		"",
	].join("\n")

	it("adds the version line inside the /* block only", () => {
		const lines = withVersionHeader(headers, "abc123def456").split("\n")
		expect(lines.slice(0, 3)).toEqual([
			"/*",
			"  X-Rookdex-Version: abc123def456",
			"  X-Content-Type-Options: nosniff",
		])
		expect(lines.filter((line) => line.includes("X-Rookdex-Version"))).toHaveLength(1)
	})

	it("handles a CRLF checkout", () => {
		const out = withVersionHeader(headers.replace(/\n/g, "\r\n"), "v1")
		expect(out.split(/\r?\n/).slice(0, 2)).toEqual(["/*", "  X-Rookdex-Version: v1"])
	})

	it("fails without exactly one /* block", () => {
		expect(() => withVersionHeader("/sw.js\n  Cache-Control: no-cache\n", "v1")).toThrow(
			/exactly one/
		)
		expect(() => withVersionHeader("/*\n  A: b\n\n/*\n  C: d\n", "v1")).toThrow(/exactly one/)
	})

	it("accepts the real public/_headers", async () => {
		const real = await readFile(new URL("../public/_headers", import.meta.url), "utf8")
		expect(withVersionHeader(real, "v1")).toContain("X-Rookdex-Version: v1")
	})
})

describe("computeVersion", () => {
	it("ignores _headers, so writing the version line can't change the version", async () => {
		const root = await mkdtemp(join(tmpdir(), "rookdex-"))
		await mkdir(join(root, "en"))
		await writeFile(join(root, "en/index.html"), "<p>page</p>")
		await writeFile(join(root, "_headers"), "/*\n")
		const files = ["en/index.html", "_headers"]
		const before = await computeVersion(root, files)
		await writeFile(join(root, "_headers"), "/*\n  X-Rookdex-Version: x\n")
		expect(await computeVersion(root, files)).toBe(before)
		await writeFile(join(root, "en/index.html"), "<p>changed</p>")
		expect(await computeVersion(root, files)).not.toBe(before)
	})
})

describe("fillWorker", () => {
	it("fills both placeholders", () => {
		const out = fillWorker('const VERSION = "__VERSION__"\nconst PRECACHE = "__PRECACHE__"', "v1", [
			"/en/",
		])
		expect(out).toBe('const VERSION = "v1"\nconst PRECACHE = ["/en/"]')
	})
})
```

Run: `npx vitest run integrations/precache.test.ts`
Expected: FAIL (the three functions are not exported).

- [ ] **Step 2: Refactor `integrations/precache.mjs`**

Add the three functions above `export default`:

```js
/** The worker with its two placeholders filled. */
export function fillWorker(template, version, urls) {
	return template
		.replace('"__VERSION__"', JSON.stringify(version))
		.replace('"__PRECACHE__"', JSON.stringify(urls))
}

/** A 12-character hash of every precached file's path and content. `_headers` is not precached,
 *  so the version line written into it never changes the version. */
export async function computeVersion(root, files) {
	const hash = createHash("sha256")
	for (const file of files.filter(shouldPrecache)) {
		hash.update(file)
		hash.update(await readFile(join(root, file)))
	}
	return hash.digest("hex").slice(0, 12)
}

/**
 * `_headers` with `X-Rookdex-Version` added to its `/*` block (feedback spec §10.2). Throws unless
 * there is exactly one: a missing header silently switches the worker's version guard off.
 */
export function withVersionHeader(headers, version) {
	const lines = headers.split(/\r?\n/)
	const blocks = lines.flatMap((line, i) => (line.trim() === "/*" ? [i] : []))
	if (blocks.length !== 1) {
		throw new Error(`_headers needs exactly one "/*" block, found ${blocks.length}`)
	}
	lines.splice(blocks[0] + 1, 0, `  X-Rookdex-Version: ${version}`)
	return lines.join("\n")
}
```

and replace the body of the `astro:build:done` hook with:

```js
				const root = fileURLToPath(dir)
				const files = await listFiles(root)
				const urls = precacheUrls(files)
				const version = await computeVersion(root, files)

				const template = await readFile(new URL("../src/sw/sw.js", import.meta.url), "utf8")
				await writeFile(join(root, "sw.js"), fillWorker(template, version, urls))

				const headersFile = join(root, "_headers")
				await writeFile(headersFile, withVersionHeader(await readFile(headersFile, "utf8"), version))
				logger.info(`sw.js written: ${urls.length} URLs, version ${version}; _headers versioned`)
```

Update the file's top comment to mention the header: "…saves it as dist/sw.js, and stamps the same version into dist/_headers."

Run: `npx vitest run integrations/precache.test.ts`
Expected: PASS.

- [ ] **Step 3: Write the failing worker test**

Create `src/sw/sw.test.ts`:

```ts
import { readFileSync } from "node:fs"
import vm from "node:vm"
import { describe, expect, it, vi } from "vitest"
import { fillWorker } from "../../integrations/precache.mjs"

const template = readFileSync(new URL("./sw.js", import.meta.url), "utf8")
type Listener = (event: unknown) => void

/** Runs the worker in a sandbox with fake self, caches and fetch (feedback spec §15.3). */
function loadWorker(network: () => Promise<Response>) {
	const listeners = new Map<string, Listener>()
	const store = new Map<string, Response>()
	const put = vi.fn(async (key: string, response: Response) => {
		store.set(key, response)
	})
	const cache = {
		addAll: vi.fn(async () => {}),
		match: vi.fn(async (key: string) => store.get(key)),
		put,
	}
	const self = {
		location: { origin: "https://rookdex.app" },
		addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
		skipWaiting: vi.fn(async () => {}),
		clients: { claim: vi.fn(async () => {}) },
	}
	const caches = {
		open: vi.fn(async () => cache),
		keys: vi.fn(async () => []),
		delete: vi.fn(async () => true),
		match: vi.fn(async () => undefined),
	}
	vm.runInNewContext(fillWorker(template, "v1", ["/en/"]), {
		self,
		caches,
		fetch: vi.fn(network),
		URL,
		Response,
		Promise,
	})
	return { listeners, self, cache, put }
}

async function navigate(worker: ReturnType<typeof loadWorker>) {
	let responded: Promise<Response> | undefined
	const pending: Promise<unknown>[] = []
	worker.listeners.get("fetch")?.({
		request: { method: "GET", url: "https://rookdex.app/en/news/", mode: "navigate" },
		respondWith: (p: Promise<Response>) => {
			responded = p
		},
		waitUntil: (p: Promise<unknown>) => pending.push(p),
	})
	const response = await responded
	await Promise.all(pending)
	return response
}

const page = (headers: Record<string, string>) => async () => new Response("page", { headers })

describe("service worker (feedback spec §10.1)", () => {
	it("precaches on install but waits instead of taking over", async () => {
		const worker = loadWorker(page({}))
		const pending: Promise<unknown>[] = []
		worker.listeners.get("install")?.({ waitUntil: (p: Promise<unknown>) => pending.push(p) })
		await Promise.all(pending)
		expect(worker.cache.addAll).toHaveBeenCalledWith(["/en/"])
		expect(worker.self.skipWaiting).not.toHaveBeenCalled()
	})

	it("takes over on SKIP_WAITING and ignores other messages", () => {
		const worker = loadWorker(page({}))
		worker.listeners.get("message")?.({ data: { type: "PING" } })
		worker.listeners.get("message")?.({ data: null })
		expect(worker.self.skipWaiting).not.toHaveBeenCalled()
		worker.listeners.get("message")?.({ data: { type: "SKIP_WAITING" } })
		expect(worker.self.skipWaiting).toHaveBeenCalledOnce()
	})

	it("shows a page from another version but never stores it", async () => {
		const worker = loadWorker(page({ "X-Rookdex-Version": "v2" }))
		const response = await navigate(worker)
		expect(await response?.text()).toBe("page")
		expect(worker.put).not.toHaveBeenCalled()
	})

	it("stores a page from its own version", async () => {
		const worker = loadWorker(page({ "X-Rookdex-Version": "v1" }))
		await navigate(worker)
		expect(worker.put).toHaveBeenCalledWith("https://rookdex.app/en/news/", expect.anything())
	})

	it("stores a page without the header (dev servers, and a Worker that forgot it)", async () => {
		const worker = loadWorker(page({}))
		await navigate(worker)
		expect(worker.put).toHaveBeenCalledOnce()
	})
})
```

Run: `npx vitest run src/sw/sw.test.ts`
Expected: FAIL (install calls `skipWaiting`, no `message` listener, the mismatched page is stored).

- [ ] **Step 4: Change `src/sw/sw.js`**

Replace the install listener with:

```js
// The new worker precaches, then waits. The page's update notice asks it to take over, so an open
// page never runs half on the old version and half on the new (feedback spec §10.1).
self.addEventListener("install", (event) => {
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)))
})

self.addEventListener("message", (event) => {
	if (event.data?.type === "SKIP_WAITING") self.skipWaiting()
})
```

In `staleWhileRevalidate`, change `if (response.ok) {` to `if (response.ok && sameVersion(response)) {`, and add at the end of the file:

```js
/**
 * A page belongs in this worker's cache only if the server built it for this worker's version
 * (or didn't say). While a new worker waits, the old one still serves; without this, it would
 * store new pages that ask for scripts its cache never had. The page is still shown either way.
 */
function sameVersion(response) {
	const version = response.headers.get("X-Rookdex-Version")
	return version === null || version === VERSION
}
```

- [ ] **Step 5: Run the tests and build**

Run: `npx vitest run src/sw integrations`, then `npm test`, `npm run build`
Expected: all PASS; the build logs `_headers versioned`, and `dist/_headers` has `  X-Rookdex-Version: <12 hex>` as the line after `/*` (confirm with `head -3 dist/_headers`) while `dist/sw.js` holds the same version.

- [ ] **Step 6: Commit**

```bash
git add src/sw integrations
git commit -m "Let a new service worker wait for the page and never cache a page from another version"
```

---

### Task 11: The update notice

**Files:**
- Create: `src/scripts/update-notice.ts`, `src/scripts/update-notice.test.ts`
- Modify: `src/scripts/register-sw.ts` (rewrite)
- Modify: `src/layouts/Base.astro` (markup after `<main>`), `src/layouts/Base.test.ts`
- Modify: `src/styles/global.css` (`scroll-padding-bottom` twice, notice rules)
- Modify: `src/i18n/en.ts`, `src/i18n/no.ts` (`update` block)

**Interfaces:**
- Consumes: the `SKIP_WAITING` message and the waiting worker (Task 10).
- Produces:
  - `wireUpdateNotice(doc: Document, env: UpdateEnv): void` and `LATER_KEY = "rookdex.update-later"`, where

```ts
export interface WorkerLike extends EventTarget {
	readonly state: string
	postMessage(message: unknown): void
}
export interface UpdateEnv {
	container: EventTarget & { readonly controller: unknown }
	registration: EventTarget & {
		readonly waiting: WorkerLike | null
		readonly installing: WorkerLike | null
		readonly active: unknown
	}
	storage: () => Pick<Storage, "getItem" | "setItem"> | undefined
	reload: () => void
	defer: (task: () => void) => void
}
```

  - Markup contract in `Base.astro`: `[data-update-notice]` (the card, `hidden`, `data-text`), `[data-update-reload]`, `[data-update-later]` inside it, and `[data-update-status]` (`role="status"`, visually hidden, empty) outside it.
  - CSS custom property `--notice-h` on `<html>` while the card shows.

- [ ] **Step 1: Copy**

`src/i18n/en.ts`, after `offline`: `update: { ready: "A new version is ready", reload: "Reload", later: "Later" },`. `src/i18n/no.ts`: `update: { ready: "En ny versjon er klar", reload: "Oppdater", later: "Senere" },`.

- [ ] **Step 2: Write the failing notice test**

Create `src/scripts/update-notice.test.ts`:

```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LATER_KEY, type UpdateEnv, type WorkerLike, wireUpdateNotice } from "./update-notice"

class FakeWorker extends EventTarget implements WorkerLike {
	state = "installing"
	postMessage = vi.fn()
	become(state: string) {
		this.state = state
		this.dispatchEvent(new Event("statechange"))
	}
}

class FakeRegistration extends EventTarget {
	waiting: FakeWorker | null = null
	installing: FakeWorker | null = null
	active: object | null = null
}

class FakeContainer extends EventTarget {
	controller: object | null = null
}

function memoryStorage() {
	const map = new Map<string, string>()
	return {
		getItem: (key: string) => map.get(key) ?? null,
		setItem: (key: string, value: string) => {
			map.set(key, value)
		},
	}
}

function setup(options: {
	controller?: boolean
	waiting?: boolean
	installing?: boolean
	active?: boolean
	storage?: UpdateEnv["storage"]
}) {
	document.body.innerHTML = `
		<button id="field">field</button>
		<div data-update-notice data-text="A new version is ready" hidden>
			<p>A new version is ready</p>
			<button type="button" data-update-reload>Reload</button>
			<button type="button" data-update-later>Later</button>
		</div>
		<p role="status" data-update-status></p>`
	document.documentElement.style.removeProperty("--notice-h")
	const container = new FakeContainer()
	container.controller = options.controller === false ? null : {}
	const registration = new FakeRegistration()
	if (options.waiting) registration.waiting = new FakeWorker()
	if (options.installing) registration.installing = new FakeWorker()
	if (options.active) registration.active = {}
	const reload = vi.fn()
	const deferred: (() => void)[] = []
	const store = memoryStorage()
	wireUpdateNotice(document, {
		container,
		registration,
		storage: options.storage ?? (() => store),
		reload,
		defer: (task) => deferred.push(task),
	})
	const card = document.querySelector<HTMLElement>("[data-update-notice]") as HTMLElement
	const live = document.querySelector<HTMLElement>("[data-update-status]") as HTMLElement
	const flush = () => {
		for (const task of deferred.splice(0)) task()
	}
	const click = (selector: string) =>
		(document.querySelector(selector) as HTMLButtonElement).click()
	return { container, registration, reload, card, live, flush, click, store }
}

beforeEach(() => {
	vi.restoreAllMocks()
})

describe("update notice (feedback spec §10.3)", () => {
	it("never shows on a first visit, when no worker controls the page", () => {
		const { card } = setup({ controller: false, waiting: true })
		expect(card.hidden).toBe(true)
	})

	it("shows for a worker already waiting, and announces on the next task", () => {
		const { card, live, flush } = setup({ waiting: true })
		expect(card.hidden).toBe(false)
		expect(live.textContent).toBe("")
		flush()
		expect(live.textContent).toBe("A new version is ready")
	})

	it("shows when a worker that was installing at startup finishes", () => {
		const { card, registration } = setup({ installing: true })
		expect(card.hidden).toBe(true)
		registration.installing?.become("installed")
		expect(card.hidden).toBe(false)
	})

	it("shows when an update is found later", () => {
		const { card, registration } = setup({})
		const worker = new FakeWorker()
		registration.installing = worker
		registration.dispatchEvent(new Event("updatefound"))
		worker.become("installed")
		expect(card.hidden).toBe(false)
	})

	it("never moves focus when it appears", () => {
		const field = () => document.getElementById("field") as HTMLElement
		const { registration } = setup({ installing: true })
		field().focus()
		registration.installing?.become("installed")
		expect(document.activeElement).toBe(field())
	})

	it("posts SKIP_WAITING to the worker waiting at click time, not the one it first saw", () => {
		const { registration, click } = setup({ waiting: true })
		const first = registration.waiting as FakeWorker
		const newer = new FakeWorker()
		registration.waiting = newer
		click("[data-update-reload]")
		expect(newer.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" })
		expect(first.postMessage).not.toHaveBeenCalled()
	})

	it("reloads at once when another tab already switched", () => {
		const { registration, click, reload } = setup({ waiting: true })
		registration.waiting = null
		click("[data-update-reload]")
		expect(reload).toHaveBeenCalledOnce()
	})

	it("reloads once when the new version takes over", () => {
		const { container, reload } = setup({ waiting: true })
		container.dispatchEvent(new Event("controllerchange"))
		container.dispatchEvent(new Event("controllerchange"))
		expect(reload).toHaveBeenCalledOnce()
	})

	it("treats the first install's claim as no update, then reloads on the next change", () => {
		const { container, reload } = setup({ controller: false })
		container.dispatchEvent(new Event("controllerchange"))
		expect(reload).not.toHaveBeenCalled()
		container.dispatchEvent(new Event("controllerchange"))
		expect(reload).toHaveBeenCalledOnce()
	})

	it("hides on Later for the rest of the tab's session", () => {
		const first = setup({ waiting: true })
		first.flush()
		first.click("[data-update-later]")
		expect(first.card.hidden).toBe(true)
		expect(first.live.textContent).toBe("")
		expect(first.store.getItem(LATER_KEY)).toBe("1")
		const storage = () => first.store
		const again = setup({ waiting: true, storage })
		expect(again.card.hidden).toBe(true)
	})

	it("survives blocked storage: Later still hides, and the notice can return", () => {
		const blocked = () => {
			throw new DOMException("blocked", "SecurityError")
		}
		const first = setup({ waiting: true, storage: blocked })
		expect(first.card.hidden).toBe(false)
		first.click("[data-update-later]")
		expect(first.card.hidden).toBe(true)
		expect(setup({ waiting: true, storage: blocked }).card.hidden).toBe(false)
	})

	it("sends focus back to where it was when Later hides the card", () => {
		setup({ waiting: true })
		const field = document.getElementById("field") as HTMLElement
		const later = document.querySelector<HTMLElement>("[data-update-later]") as HTMLElement
		field.focus()
		later.focus()
		later.click()
		expect(document.activeElement).toBe(field)
	})

	it("reloads a hard-reloaded tab (no controller, an active worker) when the update takes over", () => {
		const { container, reload } = setup({ controller: false, active: true })
		container.dispatchEvent(new Event("controllerchange"))
		expect(reload).toHaveBeenCalledOnce()
	})

	it("sets --notice-h while visible and clears it when hidden (WCAG 2.4.11)", () => {
		const { click } = setup({ waiting: true })
		const root = document.documentElement
		expect(root.style.getPropertyValue("--notice-h")).toMatch(/^\d+px$/)
		click("[data-update-later]")
		expect(root.style.getPropertyValue("--notice-h")).toBe("")
	})
})
```

Run: `npx vitest run src/scripts/update-notice.test.ts`
Expected: FAIL with "Failed to resolve import ./update-notice".

- [ ] **Step 3: Write `src/scripts/update-notice.ts`**

```ts
// The "new version is ready" notice (feedback spec §10.3). The new service worker waits; this
// shows the notice, sends SKIP_WAITING on Reload and reloads every open tab once when the new
// version takes over. Everything the browser owns comes in through `env`, so it is testable.

export const LATER_KEY = "rookdex.update-later"
/** The card's gap to the tab bar or the screen edge, added to its height for scroll padding. */
const GAP = 16

export interface WorkerLike extends EventTarget {
	readonly state: string
	postMessage(message: unknown): void
}

export interface UpdateEnv {
	container: EventTarget & { readonly controller: unknown }
	registration: EventTarget & {
		readonly waiting: WorkerLike | null
		readonly installing: WorkerLike | null
		readonly active: unknown
	}
	storage: () => Pick<Storage, "getItem" | "setItem"> | undefined
	reload: () => void
	defer: (task: () => void) => void
}

export function wireUpdateNotice(doc: Document, env: UpdateEnv): void {
	const card = doc.querySelector<HTMLElement>("[data-update-notice]")
	const live = doc.querySelector<HTMLElement>("[data-update-status]")
	const reloadButton = card?.querySelector<HTMLButtonElement>("[data-update-reload]")
	const laterButton = card?.querySelector<HTMLButtonElement>("[data-update-later]")
	if (!card || !live || !reloadButton || !laterButton) return
	const root = doc.documentElement

	// A first install's clients.claim() also fires controllerchange; only a change after the page
	// already had a controller is an update. This covers a tab kept open from the first install.
	// A hard reload leaves a page without a controller while a worker is active; that page reloads too.
	let hadController = Boolean(env.container.controller || env.registration.active)
	let reloading = false
	const reloadOnce = () => {
		if (reloading) return
		reloading = true
		env.reload()
	}
	env.container.addEventListener("controllerchange", () => {
		if (!hadController) {
			hadController = true
			return
		}
		reloadOnce()
	})

	const laterChosen = () => {
		try {
			return env.storage()?.getItem(LATER_KEY) === "1"
		} catch {
			return false
		}
	}

	// Re-measured on resize: a rotated phone can wrap the card taller than it first was.
	const measure = () => root.style.setProperty("--notice-h", `${card.offsetHeight + GAP}px`)

	const show = () => {
		if (!env.container.controller || laterChosen() || !card.hidden) return
		card.hidden = false
		measure()
		// Filled on the next task, once the region is known to be in the tree, so it is announced
		// once. Showing never moves focus.
		env.defer(() => {
			live.textContent = card.dataset.text ?? ""
		})
	}

	const hide = () => {
		card.hidden = true
		live.textContent = ""
		root.style.removeProperty("--notice-h")
	}

	const watch = (worker: WorkerLike) => {
		worker.addEventListener("statechange", () => {
			if (worker.state === "installed") show()
		})
	}

	if (env.registration.waiting) show()
	// register() resolves after load, so updatefound may already have fired for this worker.
	if (env.registration.installing) watch(env.registration.installing)
	env.registration.addEventListener("updatefound", () => {
		if (env.registration.installing) watch(env.registration.installing)
	})
	doc.defaultView?.addEventListener("resize", () => {
		if (!card.hidden) measure()
	})

	reloadButton.addEventListener("click", () => {
		// Read now: a newer deploy may have replaced the worker the notice first saw.
		const waiting = env.registration.waiting
		if (waiting) waiting.postMessage({ type: "SKIP_WAITING" })
		else reloadOnce()
	})

	// Hiding the focused Later button would drop focus on <body>. Focus goes back to where it was
	// before it entered the card.
	let returnTo: HTMLElement | null = null
	doc.addEventListener("focusin", (event) => {
		const target = event.target as HTMLElement
		if (!card.contains(target)) returnTo = target
	})

	laterButton.addEventListener("click", () => {
		const hadFocus = card.contains(doc.activeElement)
		hide()
		if (hadFocus && returnTo?.isConnected) returnTo.focus()
		try {
			env.storage()?.setItem(LATER_KEY, "1")
		} catch {
			// Blocked storage: the notice can come back on the next page.
		}
	})
}
```

Run: `npx vitest run src/scripts/update-notice.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 4: Rewrite `src/scripts/register-sw.ts`**

```ts
// Registers the service worker once the page has loaded, so it never competes with first paint,
// then hands the registration to the update notice (feedback spec §10.3).
import { wireUpdateNotice } from "./update-notice"

if ("serviceWorker" in navigator) {
	window.addEventListener("load", () => {
		navigator.serviceWorker
			.register("/sw.js")
			.then((registration) => {
				wireUpdateNotice(document, {
					container: navigator.serviceWorker,
					registration,
					storage: () => window.sessionStorage,
					reload: () => window.location.reload(),
					defer: (task) => window.setTimeout(task, 0),
				})
			})
			.catch(() => {
				// No service worker is a degraded mode, not an error the visitor can act on.
			})
	})
}
```

- [ ] **Step 5: Markup in `Base.astro`, test first**

Add to `src/layouts/Base.test.ts`:

```ts
describe("update notice markup (feedback spec §10.3)", () => {
	it("ships the card hidden and the live region outside it, empty", async () => {
		const doc = await page("", { locale: "no" })
		const card = doc.querySelector<HTMLElement>("[data-update-notice]")
		expect(card?.hasAttribute("hidden")).toBe(true)
		expect(card?.dataset.text).toBe("En ny versjon er klar")
		expect([...(card?.querySelectorAll("button") ?? [])].map((b) => b.textContent?.trim())).toEqual(
			["Oppdater", "Senere"]
		)
		const live = doc.querySelector('[data-update-status][role="status"]')
		expect(live?.textContent).toBe("")
		expect(live?.closest("[data-update-notice]")).toBeNull()
		expect(live?.classList.contains("visually-hidden")).toBe(true)
	})
})
```

Run it (FAIL), then in `src/layouts/Base.astro` add right after `<TabBar … />`, before `<main>` (keyboard users reach Reload and Later without tabbing through a whole page; the skip link still jumps past it):

```astro
		<div class="update-notice" data-update-notice data-text={s.update.ready} hidden>
			<p>{s.update.ready}</p>
			<div class="actions">
				<button type="button" class="primary" data-update-reload>{s.update.reload}</button>
				<button type="button" data-update-later>{s.update.later}</button>
			</div>
		</div>
		<p class="visually-hidden" role="status" data-update-status></p>
```

Run: `npx vitest run src/layouts/Base.test.ts` (PASS; the existing "header, nav, main, footer" order test still passes because it selects only those four tags).

- [ ] **Step 6: Placement and scroll padding CSS**

In `global.css`:
1. In the `html` rule, change the scroll padding to `scroll-padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--notice-h, 0px));` and extend its comment: "…plus the update notice while it shows."
2. In the 768 px block, change `html { scroll-padding-bottom: 0; }` to `html { scroll-padding-bottom: var(--notice-h, 0px); }`.
2b. Scroll padding can't scroll past the end of the page, so the footer would sit behind the card there (WCAG 2.4.11). In the `body` rule, change the padding to `padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--notice-h, 0px));`. In the 768 px block, change `body { padding-bottom: 0; }` to `body { padding-bottom: var(--notice-h, 0px); }`.
3. Add after the `.offline` rule:

```css
/* Update notice (feedback spec §10.4): overlays and sits under dialogs. The body's bottom padding grows
   by its height, so the footer is never hidden behind it at the end of a page. */
.update-notice {
	position: fixed;
	left: var(--space-3);
	right: var(--space-3);
	bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + var(--space-2));
	z-index: 4;
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-2) var(--space-3);
	padding: 8px 8px 8px var(--space-3);
	border: 1px solid var(--border);
	border-radius: var(--radius);
	background: var(--bg-raised);
	box-shadow: 0 8px 24px color-mix(in srgb, var(--bg) 60%, transparent);
	animation: notice-in 160ms ease-out;
}

.update-notice p {
	margin: 0;
	font-size: 0.875rem;
}

.update-notice .actions {
	flex-wrap: nowrap;
}

.update-notice .actions button {
	padding-block: 0;
}

@keyframes notice-in {
	from {
		opacity: 0;
	}
}

@media (prefers-reduced-motion: reduce) {
	.update-notice {
		animation: none;
	}
}
```

4. In the 768 px block add `.update-notice { bottom: var(--space-3); }`; in the 1024 px block add `.update-notice { left: auto; width: 22rem; }`.

- [ ] **Step 7: Run everything**

Run: `npm test`, `npm run check`, `npm run build`
Expected: all PASS.

- [ ] **Step 8: Measure the card (spec §10.4)**

With the build served, make the card visible in devtools (`document.querySelector("[data-update-notice]").hidden = false`) and read at 320 px and 1024 px: English card height (target 62 px at 1024 px; at 320 px it may wrap, and its text must stay at two lines or fewer), both buttons 44 px tall with equal `bottom`, `main`'s `getBoundingClientRect().top` unchanged when it appears (no layout shift above the fold), and, scrolled to the end, every footer link's `bottom` above the card's `top`, and the Norwegian card at 320 px ("Oppdater" / "Senere") with text at two lines or fewer. Record the numbers.

- [ ] **Step 9: Commit**

```bash
git add src/scripts/update-notice.ts src/scripts/update-notice.test.ts src/scripts/register-sw.ts src/layouts src/styles/global.css src/i18n
git commit -m "Tell people when a new version is ready and switch every open tab once they reload"
```

---

### Task 12: Gates, measurements, the real update flow and the PR (controller)

**Files:** none new; the PR body.

- [ ] **Step 1: Gates**

Run: `npm test`, `npm run check`, `npm run build`. In an LF worktree (`git -c core.autocrlf=false worktree add ../rookdex-lf HEAD`, then `npm ci` and `npx biome ci .` there, then remove the worktree): 0 errors. Record the test count and the three integration log lines (`sw.js written … _headers versioned`, `seo check passed: N files`, `external-link check passed: N pages`).

- [ ] **Step 2: Whole-page measurements (spec §15)**

In the Browser pane at 320 px and 1024 px, confirm and record, reusing the numbers Tasks 4, 6, 9 and 11 reported where they still hold:
- tracker cards in a row share height and bottom edge; corner insets symmetric; no text under either icon
- footer heights and one centre line
- the Settings language link's box equals its row's box (`getBoundingClientRect()` of the `a.row-link` and its `li`)
- the update card's buttons: 44 px, one bottom edge, no layout shift, and no footer link behind the card at the end of the page
- the guide sources line wraps at 320 px without overflow
- hover and focus states at both widths: screenshot a hovered tab, chip, card and footer icon, and a keyboard-focused card and book link
- the Sources page: arriving via a book link scrolls to the entry with the cyan `:target` border; its back link lands on the tracker with that checkbox focused.

- [ ] **Step 3: The real update flow (spec §15)**

`.claude/launch.json` already has a `preview` entry (`npm run preview`, port 8787). Start it with `preview_start` and the name `preview`, and don't edit the file. Then:
1. Build, open `http://localhost:8787/en/`, reload once so the worker controls the page, open a second tab on `/en/tracker/`.
2. Change one visible string, rebuild (the dev server serves the new `dist/`), and navigate in the first tab. The notice appears; `curl -sI http://localhost:8787/en/` shows `X-Rookdex-Version` with the new version; the page still runs the old version.
3. Press Reload. Both tabs reload once onto the new version.
4. Revert the string change and rebuild.

- [ ] **Step 4: Push and open the PR**

Push `feedback-spec` and open the PR with `gh pr create`. Title: "Polish the tracker, footer and Settings, add a Sources page and an update notice". Body (fill in the measured numbers):

```markdown
Spec A of the feedback round: `docs/superpowers/specs/2026-09-25-rookdex-feedback-round-design.md` (+ stress test), plan `docs/superpowers/plans/2026-09-30-rookdex-feedback-round.md`.

## What changes
- Hover and focus states everywhere (`--bg-hover`), tooltips on icon controls, Escape to dismiss.
- One `ExternalLink` component for every link that leaves the site, and a build check that fails on an unsafe one.
- Tracker items are even cards with a Sources link and a report flag; a new Sources page under the tracker (in the sitemap, 10 URLs).
- The footer is one compact strip with a launch chip; licences and links moved to Settings, About.
- Delete-all keeps the install and hint choices; the install prompt never shows in the installed app.
- "Before you start" covers editions, the pre-order bonus and GTA+, and fixes the physical-copy line.
- A new version waits, and a notice offers Reload or Later; pages carry `X-Rookdex-Version` so the worker never caches a page from another version.

## Rulings
(the 15 deviations from the plan header, one line each)

## Measured
| Check | 320 px | 1024 px |
|---|---|---|
| Footer height | | |
| Cards in a row: height / bottom difference | | |
| Book / flag insets | | |
| Language link box vs row box | | |
| Update card height, buttons | | |
| Guide sources line | | |

## Verified
- Tests: N passing. `astro check`: 0 errors. Biome (LF worktree): 0 errors.
- Build: `sw.js written …`, `seo check passed: N files`, `external-link check passed: N pages`.
- Real update flow on `npm run preview`: notice shown, header present, both tabs switched on Reload.

## After merge
- This deploy is the first update under the new rules. The live worker has no version guard yet, so while the new worker waits, the old one can still cache new pages (spec §10.1). Tabs opened before the deploy show no notice. They switch when they all close, or from the notice on the next page they load. Every later update is guarded.
- Check the header on production: `curl -sI https://rookdex.app/en/ | grep -i x-rookdex-version` prints the same 12-character version as `curl -s https://rookdex.app/sw.js | grep -m1 VERSION`.
- Search Console: the two Sources pages come in through the sitemap; no action needed.
```

- [ ] **Step 5: Hand-off notes for Malin**

In the final summary, list: the rulings (8, the Sources search titles, approved at review), and the follow-ups outside this spec: the offline notice's live region (spec §16), tooltips for the header's back and forward buttons (icon-only controls that still use `aria-label`), and the `preview` job posting its URL on the PR (1c); and for 1c: if a Worker script is added, HTML must stay static assets or the Worker must set `X-Rookdex-Version`, or the version guard is off. Also: guide `h2`s overflow at 320 px with 200 % text ("Forhåndsnedlasting" needs 458 px), so `overflow-wrap: break-word` on headings is a follow-up.

> Stress-tested 2026-09-30 (skill 1fc847e): 22 applied, 3 adapted, 4 decided by me.
