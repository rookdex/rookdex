# Rookdex — feedback round stress test

Run 2026-09-25 on `2026-09-25-rookdex-feedback-round-design.md`, before writing the plan. It covered four lenses (security, privacy, accessibility, loopholes) and was done in a fresh context against the current code. The findings below are verified against the code and all 16 proposed changes are folded into the spec. None of them grows the scope.

## Findings and where they landed

| # | Severity | Finding | Spec fix |
|---|---|---|---|
| 1 | 🟠 | A crafted `#item-…` hash (`/` breaks `querySelector`, `%` breaks `decodeURIComponent`) throws inside the Tracker and unmounts it; the hash survives reload. | §4: decode in try/catch, `getElementById`, failures do nothing |
| 2 | 🟡 | Guide sources allow any URL scheme; the link check only looked at `http(s)`. | §3.1 https-only `ExternalLink`, §9 schema, §11 scheme rule |
| 3 | 🟠 | The update notice's live region starts inside a `hidden` container, so it may never be announced. | §10.3: live region outside the card, text on the next task |
| 4 | 🟠 | On touch, the Report flag does nothing and its tooltip never shows. | §3.3: a tap on an `aria-disabled` control shows its tooltip |
| 5 | 🟡 | Tooltips vanish across the gap to the icon (1.4.13 hoverable); the accessible-name wiring was unspecified. | §3.3 bridge, `aria-hidden` tooltip, hidden-text names; §3.1 no `aria-label` |
| 6 | 🟡 | The update notice can cover the focused control (2.4.11). | §10.4: `--notice-h` in `scroll-padding-bottom` |
| 7 | 🟡 | Dozens of links named "Sources" and "Back to the item in the tracker". | §4, §5: hidden item name in the accessible name |
| 8 | 🟡 | The Tracker tab says "current page" on the Sources page. | §5: `aria-current="true"` there |
| 9 | 🟠 | A tab open from the first install never reloads after pressing Reload. | §10.3: `hadController` flag, the first claim only sets it |
| 10 | 🟠 | Focus after arriving from Sources fails: checkboxes are disabled until IndexedDB is ready. | §4: run once when `status` becomes `ready` |
| 11 | 🟠 | `/settings/#install` lands at the top in the browsers that can install (the row appears late). | §7.1: `id="about"` on the always-visible section |
| 12 | 🟠 | Corner icons cover the name and overlap in short cards. | §4: the mockup's `padding-right` and flow footer row |
| 13 | 🟡 | Reload may post to a redundant worker; an update already installing at startup is missed. | §10.3: read `waiting` at click, watch `installing` at startup |
| 14 | 🟡 | The notice was placed for a bottom tab bar between 768 and 1023 px, where the bar is at the top. | §10.4: three placements |
| 15 | 🟡 | The link check had no parser, missed `//host`, matched `rel` loosely and accepted any hidden text. | §11: `jsdom`, `.new-tab-note` marker, token match; §9 no inline external links |
| 16 | 🟡 | A missed `_headers` edit silently switches the version guard off; a future Worker would too. | §10.2 fails the build; §16 1c note |
| 17 | 🟡 | An early return before InstallPrompt's hooks breaks the rules of hooks. | §8: the check goes in the `beforeinstallprompt` handler |

Privacy: ✅. No new network calls, no third parties, `noreferrer` on every external link, and the only new storage is a per-tab `sessionStorage` flag.

## Considered and rejected

- **Selecting text in a card.** The label overlay makes the name and description unselectable. That is the price of the whole-card toggle (s17); getting selection back means dropping the overlay.
- **Checking the version of precached pages at install.** A deploy during `cache.addAll` could mix versions in a new worker's cache. The window is seconds, and the next online visit installs a fresh worker.
- **Holding the reload while a dialog is open.** Every tab reloading was locked in s20. A pending delete-all keeps running after unload, so only confirmation text is lost.
- **Old-code tabs during the first update.** Tabs running the pre-spec `register-sw.ts` don't reload on `controllerchange`. It happens once and is covered by §10.1.
- **A visual highlight after arriving on the tracker.** `:target` can't match elements a client-only island renders later, and a timed highlight adds scope. Focus plus scrolling is enough.
- **The notice announcing again on each page.** While a worker waits, each page load announces once; Later silences the tab.
- **`SKIP_WAITING` from any same-origin page.** Only same-origin pages can send it, and all it can do is apply an update the site itself deployed.
- **Cloudflare `_headers` on HTML.** Verified: it applies to static asset responses, navigations included, and `npm run preview` (`wrangler dev`) serves it too.
- **The CSP statement in §14.** Whether Astro inlines or bundles the small scripts, its CSP support hashes inline ones. No change needed.
