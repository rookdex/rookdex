# Play session runbook

Android spec §6. The plan was 26 to 28 October, with the closed test live by Thursday 29 October. That would have left 14 days of testing to 12 November and up to 7 days of production review before launch on 19 November.

**Status 31 October:** steps 1 to 8 are done. The closed test went live on 29 October at 14:02. PR 2 (Digital Asset Links) merged on 30 October, and the same day the app passed the phone check: it opens without a URL bar.

The 12th tester opted in on the morning of 31 October, so the 14-day clock started that day. 15 testers are on the list and at least 12 have opted in. Play only shows "12 or more", so the exact count above 12 is unknown. The earliest date to apply for production access is 14 November, and review takes up to 7 days. The Play listing is live by launch only if review takes 5 days or less. The site launches on 19 November as a PWA either way, and the Play listing follows when Google approves it.

| Day | Steps |
|---|---|
| Monday 26 | Testers, 1, 2, 3 |
| Day Google approves | 4, 5 |
| The day after | 6 (send for review) |

## Testers (from Monday 26 October)

- [ ] Send the tester message and collect at least 14 testers' Google account emails, the ones they use in Play on an Android phone. iPhone users can't count.
- [ ] Keep that list private: in my password manager or my own notes, then in Play Console's tester list. Never in this repo, a doc, an issue or an AI chat. It is other people's personal data.
- [ ] Late replies are fine: testers can be added to the list after the track goes live. The clock only counts days with 12 or more opted in.

## 1. Account checks

- [ ] Identity verification approved.
- [ ] Device check (Play Console app on an Android phone with Google services), if Play still asks.
- [ ] Phone verification (unlocks after identity).
- [ ] Identity still in review? Steps 2 and 3 don't need it. Then try Create app (step 4): if Play Console allows it, the forms in step 5 can be filled in while I wait.

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

- [ ] PWABuilder generates this key on its own servers. With Play App Signing on, it is only the **upload** key: Google holds the key that signs what users install. If I ever suspect the upload key leaked, reset it in Play Console (Protected with Play, Play Store protection, Manage Play app signing) the same way as a lost one.
- [ ] Unzip the download **outside** the repo.
- [ ] Keystore and its passwords go into my password manager, plus one offline copy.
- [ ] Never paste the key, its passwords or `signing-key-info.txt` into a chat or an AI tool. `.gitignore` refuses them if they land in the repo by mistake.
- [ ] If the key is lost: Play App Signing lets me reset the upload key. Slow, not fatal.

## 4. Create the app

- [ ] Play Console, Create app: default language English (United States), App, Free.
- [ ] Play App Signing on (the default).
- [ ] Automatic protection: leave it on. It blocks installs that don't come from Play, so testers install through the opt-in link. It lives under Protected with Play (the shield icon in the left rail).

## 5. Fill in the forms

- [ ] Store listing and graphics from `listing.md`.
- [ ] Data safety from `data-safety.md`.
- [ ] Content rating from `content-rating.md`.
- [ ] Everything else from `app-content.md`.
- [ ] Finished forms leave the dashboard. To reopen one: Policy and programs (the pulse icon), App content, Actioned, Manage.

## 6. Closed testing

- [ ] Test and release, Closed testing: create a track, upload the `.aab`.
- [ ] Testers: an email list with every collected address (aim for 14 or 15, so one dropping out doesn't reset the 14-day clock).
- [ ] Send for review. While it is in review, the Test and release overview can still show "Closed testing: Get started". That card is stale. Clicking it makes a second track.
- [ ] When approved, share the opt-in link with every tester: the track's Testers tab, Copy link (the web one), which is `https://play.google.com/apps/testing/app.rookdex`. Not "Copy shareable link" on the app bundle page: that is internal app sharing, and those installs don't count toward the 12.
- [ ] Check the count of opted-in testers daily on the Dashboard: the clock only counts days with 12 or more. Play shows the count only, never who opted in, so a reminder goes to everyone.

## 7. Fingerprints for PR 2

- [ ] Protected with Play (the shield icon), expand Play Store protection, Manage Play app signing. The old App integrity page is now only a pointer to it.
- [ ] Copy the SHA-256 of the **app signing key** and of the **upload key**. Both are public values. The page's own Digital Asset Links JSON lists the app signing key only. The upload key is added on top (Android spec §7). The certificate zip also holds two hybrid (post-quantum) certificates: they are not needed in `assetlinks.json`.
- [ ] Take them from Play Console only, never from `signing-key-info.txt` (it also holds the passwords).
- [ ] Build PR 2 (plan Part 2) with them. Done: merged on 30 October.

## 8. Device check on a tester phone (after PR 2 deploys)

- [ ] The app opens without a URL bar.
- [ ] The install prompt stays hidden.
- [ ] The in-app back and forward buttons behave next to Android's own back gesture.

## Later

- [ ] 14 November at the earliest (14 days after the 12th tester opted in on 31 October): apply for production access. Review takes up to 7 days. Until then, keep at least 12 testers opted in: the clock only counts days with 12 or more.
- [ ] After launch (19 November): the hub screenshots show the countdown, which is gone by then. Re-run `docs/android/screenshots.mjs` against a local `npm run preview` with the hub path set to `?phase=after` (works on localhost only) and replace the hub shots in Play Console.
