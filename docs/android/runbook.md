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
