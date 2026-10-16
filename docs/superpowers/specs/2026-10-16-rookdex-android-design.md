# Rookdex: Android (Play Store) design spec

Written 2026-10-16 from the Android brainstorm (sessions 54, 56, 64 and 65). It puts Rookdex on Google Play as a Trusted Web Activity (TWA): a thin Android shell that opens the live site in Chrome without browser chrome. The site stays the product. This spec covers what the repo needs for that, and the Play forms I fill in by hand.

GTA VI launches Thursday 19 November 2026. A new personal Play account needs a closed test with at least 12 testers opted in for 14 days in a row, then a production review of up to 7 days. The latest safe go-live for the closed test is therefore **Thursday 29 October**. I'm away 18 to 22 October with only a phone, so my Play session runs 23 to 27 October.

## 1. What this spec covers

- A privacy page in English and Norwegian, linked from the footer and from Settings. Play requires a privacy policy URL, and the site has none.
- `docs/android/`: store listing text (EN and NB), data safety answers, content rating answers, target audience, a feature graphic, phone screenshots and a runbook for my Play session.
- `.gitignore` guards so a signing key or app bundle can't be committed by accident.
- A second, small PR after the first upload: `public/.well-known/assetlinks.json`.
- Closing design spec §13 Q1 (the trademark screen). Done in this spec's PR.

### Non-goals

- No Android project in the repo. PWABuilder builds the app bundle on my machine (section 2, approach A).
- No CI build or signing. The signing key never leaves my machine and my password manager.
- No notifications, location or Play Billing in the shell.
- No Ko-fi link and no Pro sales anywhere yet (section 8 sets the rule for later).
- No translated URL slug. The Norwegian page lives at `/nb/privacy/` (section 2).
- No iOS.

## 2. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Approach | **A:** site PR plus docs; I build the bundle in PWABuilder; `assetlinks.json` in a second PR | Nothing new to maintain, no signing key in CI, fits the 29 October deadline. A Bubblewrap project with CI builds (approach B) can come in phase 2 if it earns its keep. |
| Play account | Personal, developer name "Rookdex", public email `legal@rookdex.app` | Registered 2026-10-16. Identity, device and phone checks are pending. |
| Package name | `app.rookdex` | Reverse of `rookdex.app`. It's permanent once uploaded. PWABuilder's default `app.rookdex.twa` is longer and says nothing useful. |
| Privacy URLs | `/en/privacy/` and `/nb/privacy/` | Every page shares one slug across locales: `Base.astro` builds canonical, hreflang and the language switch from a single `path`. A translated slug would need a per-locale path map for one page. The Norwegian title and link text say "Personvern". |
| Privacy page placement | Its own page, Settings tab highlighted | Locked in brainstorm Q3. It's a sub-page of Settings. |
| Store category | Entertainment | Game companions cluster there. Tools is for utilities. |
| Target audience | 18 and over only | GTA VI is PEGI 18. Any age under 13 pulls in the Families policy. |
| Trademark | Clear | Section 9. |

## 3. The privacy page

`src/pages/[locale]/privacy.astro`, built like `news.astro`: `getStaticPaths` over `locales`, `Base` with `path="privacy"` and `tab="settings"`. All copy lives in `src/locales/en.json` and `nb.json` under `privacy.*` keys. Plain language, short sections with `h2` headings, a "Last updated" line set to the ship date and rendered with `Intl.DateTimeFormat`.

Content, in this order (checked against the code on 2026-10-16):

1. **What Rookdex stores, on your device only.** Profiles and progress (IndexedDB). The active profile, the language choice and three "already seen" flags: the install prompt, the storage hint and "update later" (`localStorage`). An offline copy of the site (the service worker cache).
2. **What leaves your device: nothing.** No account, no cookies, no analytics, no ads, no trackers. Fonts are self-hosted.
3. **Hosting.** Cloudflare serves the site. Like any web host, it sees your IP address to deliver the pages. Rookdex runs no server code and keeps no logs (`wrangler.jsonc` serves static assets only). Production was checked on 2026-10-16: no cookies, and no Cloudflare analytics beacon injected. Link to Cloudflare's privacy policy through `ExternalLink`; the Norwegian copy notes that the page is in English.
4. **Links to other sites.** Sources and the GitHub link go to other sites; their own policies apply there.
5. **The Android app.** It is this website opened through Chrome, so everything above applies, plus Chrome's own policy.
6. **Delete your data.** Settings, then "Delete all data on this device". Uninstalling the app or clearing the site's data does the same.
7. **Who runs Rookdex, contact and changes.** "Rookdex is run by Malin Fossum in Norway." Contact `legal@rookdex.app`. No postal address. If Rookdex ever stores anything off your device (phase 2 accounts), this page changes before that ships.

Play wants the policy to name the developer on the listing ("Rookdex") and give a privacy contact. GDPR Art. 13 also wants the controller named, because Cloudflare processes visitor IP addresses on my behalf. My name is already public on the Play developer profile, so naming it here costs nothing new.

## 4. Links to the page

- **Footer:** a fourth icon link in the HUD strip, a shield, between the legal mail link and About. Same pattern as the other three: `visually-hidden` label plus the `tip`. Label key `footer.privacy` ("Privacy" / "Personvern"). The strip is re-measured at 320 px: it must not wrap or overflow.
- **Settings, Your data:** a new last row, `dt` "Privacy" and `dd` a link "Privacy policy", the same shape as the "Export or import" row.
- **SEO:** `privacy` joins `indexablePaths` in `src/model/seo.ts`, so the sitemap and hreflang pick it up. `seo.titles.privacy` and a description key give the page its title and meta description.

## 5. `docs/android/`

All text is written in my voice and pasted into Play Console by hand.

- **`listing.md`:** app name "Rookdex"; short description (80 characters at most) and full description (4,000 at most) in English (default, en-US) and Norwegian (nb-NO). The unofficial fan-project line sits in the first paragraph of the full description, because Play's impersonation policy wants it visible. Privacy policy URL `https://rookdex.app/en/privacy/`. Contact email `legal@rookdex.app`, website `https://rookdex.app`. No "GTA", "Rockstar" or game art in the name, icon or graphics (design spec, Take-Two trap); the description may name the game once, as plain text, to say what Rookdex is for.
- **`data-safety.md`:** collects no data, shares no data. No account, so the account-deletion questions don't apply. Each answer cites the section 3 fact behind it. The IP address Cloudflare sees to serve pages is processed only to deliver the request, which Play's data safety guidance treats as ephemeral processing rather than collection; the file says so, so the answer can be defended if Play asks.
- **`content-rating.md`:** IARC questionnaire, app type "Reference, News, or Educational". No violence, sexual content, profanity, drugs, gambling, user interaction, user-generated content, location sharing or purchases. Expected result: the lowest rating in every region.
- **`app-content.md`:** the other App content forms. Target audience 18+. Ads: none. App access: everything works without sign-in. News app: no (the News tab is rumour round-ups, not a publisher). Government, financial, health: none.
- **`runbook.md`:** section 6.
- **Graphics:**
  - Icon: the existing `public/pwa-512x512.png`.
  - Feature graphic, 1024×500, required: `docs/brand/feature.html`, a variant of `og.html` with the same tokens and mark, rendered to `docs/android/feature-graphic.png` the way the OG banner was.
  - Phone screenshots: hub, tracker, news and settings, in English and Norwegian, 1080×1920 PNG (a 360×640 viewport at device scale 3) into `docs/android/screenshots/`. Captured from a production build so the service worker and fonts are real, with a fresh profile named "Main" and demo ticks, never my own profiles or names.

## 6. My Play session (runbook, 23 to 27 October)

1. **Finish account checks** if any are still open: identity, device (Play Console app on an Android phone with Google services), then phone (it unlocks after identity).
2. **Build:** PWABuilder with `https://rookdex.app`, Android, Google Play. Package `app.rookdex`, app and launcher name "Rookdex", display standalone, status bar and splash colour `#000000`, notification and location delegation off, Play Billing off, fallback Custom Tabs. Signing key: create new.
3. **Keep the key safe:** the downloaded zip holds the keystore and its passwords. Both go into my password manager plus one offline copy. Unzip it outside the repo. `.gitignore` still refuses `*.keystore`, `*.jks`, `signing-key-info.txt`, `*.aab`, `*.apk` and `*.idsig` in case it lands there. The key, its passwords and `signing-key-info.txt` are never pasted into a chat or an AI tool. If the key is lost, Play App Signing lets me reset the upload key, so loss is recoverable but slow.
4. **Create the app** in Play Console: default language English, app (not game), free. Play App Signing on (the default).
5. **Fill in** the listing, graphics, privacy URL and App content forms from `docs/android/`.
6. **Closed testing:** upload the bundle, add at least 12 testers by email list (family, classmates, the GET cohort), send for review, share the opt-in link. Every tester needs an Android phone and the Google account email they use in Play; iPhone users can't count. Collect the emails before 23 October. The 14-day clock counts days with at least 12 testers opted in, so aim for 14 or 15 in case one drops out.
7. **Copy both SHA-256 fingerprints** from Play Console, Test and release, App integrity: the app signing key and the upload key. Both are public values and go into PR 2. Take them from Play Console, not from `signing-key-info.txt`, which also holds the passwords.
8. **Device check on a tester phone:** the app opens without a URL bar (after PR 2 deploys), the install prompt stays hidden, and the in-app back and forward buttons behave next to Android's own back gesture.

## 7. PR 2: Digital Asset Links

`public/.well-known/assetlinks.json` with one statement for `app.rookdex`, relation `delegate_permission/common.handle_all_urls`, and two `sha256_cert_fingerprints`: the Play app signing key and the upload key, both copied from Play Console (step 7). A Vitest test parses the file and checks the package name and two fingerprints in the `AA:BB:...` shape.

Until it deploys, Chrome shows a URL bar at the top of the app. That is cosmetic and goes away by itself once the file is live. A dot folder under `public/` is easy to lose between the Astro build and the Workers asset upload, so check the preview URL before merging: `/.well-known/assetlinks.json` returns 200 with `application/json`. If it 404s, the fix belongs in PR 2 (an asset-include rule), not in a workaround. After the production deploy, run the same check on `rookdex.app` and Google's Statement List tester. PR 2 lands by 31 October, before the freeze.

## 8. Rules for later

- **No donation or sale links inside the app.** Play rejected donation links in other open-source apps, and digital goods sold inside a Play app must use Play Billing. When Ko-fi or Pro lands, the links render on the web only. Detection: the TWA opens with `document.referrer` starting `android-app://app.rookdex`; store that in `sessionStorage` on first load and hide the links for the session.
- **Privacy page first.** Any new storage, network call or third party updates section 3 in the same PR.

## 9. Trademark screen (closes design spec §13 Q1)

Done 2026-10-16. TMview, covering EUIPO, USPTO, UKIPO, WIPO and Norway's Patentstyret: no mark contains "rookdex". Nearest fuzzy hits: Rockdex (AU, class 9, phone cases and hardware), ROOFDEX (US, ended, class 2), ROOKNEX (UK, classes 7 and 8). None conflicts. Nearest live marks: ROOK (rook.io, class 9) and a family of ROOK marks for health data in the US (classes 9, 41, 42). A compound mark in a different field is low risk. Play Store search for "rookdex": no results. Registering our own mark is optional and not needed for Play. Not legal advice.

## 10. Testing

- **Unit:** `indexablePaths` includes `privacy`. The footer test expects four icon links with the privacy label. A Settings test finds the privacy row and its href. The existing bundle tests keep `en.json` and `nb.json` key sets equal.
- **Accessibility:** `vitest-axe` on the rendered privacy page; Lighthouse CI adds `/en/privacy/` (accessibility = 100, performance at least 90).
- **Layout, measured not eyeballed:** the footer strip at 320, 768 and 1024 px (no wrap, the four icons share one centre line, 44 px targets), and the privacy page at 320 px (no horizontal scroll).
- **Guard:** `git check-ignore` hits for `x.keystore`, `x.jks`, `signing-key-info.txt`, `x.aab`, `x.apk` and `x.idsig`, and misses for `x.json` (so the guard can go red).

## 11. Order and calendar

| When | What | Who |
|---|---|---|
| 16 Oct | Play account registered; identity, device and phone checks started | me |
| 16 to 17 Oct | This spec, the plan, PR 1 (privacy page, links, `docs/android/`, graphics, `.gitignore`) merged and deployed | me |
| 18 to 22 Oct | Away. Identity check runs. | |
| 23 to 27 Oct | Runbook steps 1 to 7 | me |
| By 29 Oct | Closed test live with 12+ testers opted in | me |
| After first upload | PR 2 (`assetlinks.json`) | me |
| ~12 Nov | Apply for production access, review up to 7 days | me |
| 19 Nov | GTA VI launch | |

If production access or its review lands after 19 November, nothing breaks: the website is the product, and testers keep the closed-test build. The store listing is a bonus for launch week, not a dependency.

## Considered and rejected

- **A test that every `localStorage` key appears on the privacy page.** It would need the page to mirror code identifiers. The rule in section 8 (privacy page updated in the same PR) does the job without coupling copy to code.
- **A query parameter in the TWA start URL instead of `document.referrer`.** It would change the canonical start URL and the manifest for a rule that has nothing to hide yet. Decide when Ko-fi lands.
- **Hiding my legal name.** Play shows it on a personal account anyway, and GDPR wants the controller named. Accepted.
- **First launch offline.** A TWA opened for the first time with no network shows Chrome's error page until the service worker is installed. Every later launch works offline. Accepted for a companion people open on launch night with a network.
- **Production review landing after launch.** Accepted; see section 11.

> Stress-tested 2026-10-17 (skill 1b85fca): 8 applied, 1 adapted, 1 decided by me.
