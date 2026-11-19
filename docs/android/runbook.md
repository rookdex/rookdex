# Play session runbook

Android spec §6. The plan was 26 to 28 October, with the closed test live by Thursday 29 October. That would have left 14 days of testing to 12 November and up to 7 days of production review before launch on 19 November.

**Status 31 October:** steps 1 to 8 are done. The closed test went live on 29 October at 14:02. PR 2 (Digital Asset Links) merged on 30 October, and the same day the app passed the phone check: it opens without a URL bar.

The 12th tester opted in on the morning of 31 October, so the 14-day clock started that day. 17 testers are on the list and at least 12 have opted in. Play only shows "12 or more", so the exact count above 12 is unknown. Play Console counts the 14 days so that the earliest date to apply for production access is 15 November (Console on 9 and 12 November). Access review takes up to 7 days, and the first production release is reviewed after that, so the Play listing is unlikely to be live on launch day. The site launches on 19 November as a PWA either way, and the Play listing follows when Google approves it.

**Status 19 November:** I applied for production access on 16 November at 10:09. Google answered on 18 November at 22:56 with "More testing required": the closed test has to run for 14 more days before I can apply again. The site went live as a PWA at midnight on 19 November as planned. Round 2 is described below.

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
| Status bar color | `#000000` |
| Splash color | `#000000` |
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

## Round 2 (19 November to the second application)

Google's email gives two possible reasons and does not say which one applied: testers were not engaged during the closed test, or testing best practices were not followed, "which may include gathering and acting on user feedback through updates to your app". The [guidance page](https://support.google.com/googleplay/android-developer/answer/14151465) gives no thresholds, so nothing here guarantees a pass. The steps below close the gaps the email names.

What Play could see in round 1 (my reading, not Google's):

- One bundle, version code 1 from 29 October, for the whole test. Search, the Dex, backup and the redesigns all shipped as web deploys, and a web deploy is not a release in Play.
- Feedback came by email and in person, so nothing landed on the Testing feedback page.
- My answers said no tester asked for a change, so the changes I listed were not tied to feedback.

### Check first

- [ ] Test and release, Closed testing: count the releases on the track.
- [ ] Ratings and reviews, Testing feedback: count the entries.
- [ ] Dashboard: note the earliest date to apply again (about 2 December).

### Testers

- [ ] Send the round 2 message. Three things to try: tick finds in the tracker and use the search, look something up in the Dex, make a backup in Settings. Two places for feedback: the private feedback field on Rookdex's page in the Play Store, and the report button in the app.
- [ ] Keep everyone opted in until production access is granted.
- [ ] Around 26 November: one reminder with one concrete question.

### Feedback log

- [ ] Keep a log outside this repo: date, channel (Play, email, in person), theme, what I did about it and the release it shipped in. No names.
- [ ] Read the Testing feedback page every few days and answer what comes in.
- [ ] Read the pre-launch report for every new bundle and fix what it flags.

### Bubblewrap setup (done 19 November)

I build the bundles with Bubblewrap on my own machine, so the keystore and both passwords never leave it.

- [x] `npm install -g @bubblewrap/cli` (1.27.0).
- [x] JDK 17, 64-bit: the Temurin 17 zip from Adoptium, unpacked to `~/.bubblewrap/jdk`. Bubblewrap accepts version 17 only. Its own installer fetches a 32-bit build on Windows, and the Gradle project it generates asks for a 1536 MB heap, so I skipped it. The system Java is untouched.
- [x] Android SDK: the one Android Studio installed, with build-tools 36.1.0 added (`sdkmanager --install "build-tools;36.1.0"`). Bubblewrap only accepts an SDK folder that has `tools` or `bin` at its root, so I added an empty `tools` folder.
- [x] `~/.bubblewrap/config.json` holds `jdkPath` and `androidSdkPath`. With both filled in, Bubblewrap asks nothing on first run.
- [x] `bubblewrap doctor` confirms both paths. A test project generated from the live manifest built an unsigned `.apk` and `.aab`, with the three shortcuts in it.
- `minSdkVersion` in `twa-manifest.json` has to be `24` (Android 7.0). Bubblewrap 1.27.0 defaults to `21`, its own helper library needs `24`, and the build fails on the default.
- After a Bubblewrap upgrade: it looks for `sdkmanager` in `tools/bin` or `bin`, which this SDK layout doesn't have. If it asks for a newer build-tools version, I install that version by hand the same way.

### New bundles

At least two new releases on the closed track before I apply again, the first by 25 November. Each one carries a real change.

- [x] Decide how to sign before the first rebuild. Decided 19 November: Bubblewrap on my own machine (setup above). PWABuilder's update path (Signing key: Use mine) takes the keystore file, the key alias and both passwords on its site, where the key was generated in October. An unsigned package can't be uploaded to Play.
- [ ] Rebuild with the same values as step 2, plus App version (`1.1.0`), App version code `2` (then `3`) and the existing key. I type the passwords myself, never into a chat or an AI tool.
- [x] Changes that live in the wrapper, manifest side (done 19 November): `public/manifest.webmanifest` has app shortcuts to Tracker, Dex and News and a monochrome icon (`/monochrome-icon-512x512.png`, `purpose: "monochrome"`). The shortcut URLs are `/?tab=tracker`, `/?tab=dex` and `/?tab=news`. The root page opens the tab in the reader's language, the same way it resolves `start_url`. Fixes testers ask for ship on the web and are named in the release notes.
- [ ] Rebuild only after that manifest is deployed: both tools read the live `https://rookdex.app/manifest.webmanifest`. Set Monochrome icon URL to `https://rookdex.app/monochrome-icon-512x512.png`. With Bubblewrap, `twa-manifest.json` should list three `shortcuts` after `init` (in an existing project, after `merge`).
- [ ] What a tester sees in bundle 2 is the shortcuts (long-press the app icon). The monochrome icon doesn't show yet: Bubblewrap and PWABuilder use it only as the notification icon, and notification delegation is off. Neither builds an Android themed icon from it today, so bundle 3 needs a change of its own.
- [ ] Closed testing, Create new release: upload the `.aab`, write release notes in English and Norwegian that say which feedback the release answers, send for review.
- [ ] `assetlinks.json` stays as it is: same upload key, same app signing key.
- [ ] When the release is live: check on a tester phone that the app still opens without a URL bar, and that a long-press on the icon shows Tracker, Dex and News, each opening in the language the app already uses. A phone that hasn't opened the app since the manifest deploy still holds the old start page and lands on the home page once.

### Apply again

- [ ] Answers come from the log: the feedback, the change, the release it shipped in. Say plainly that most changes reach testers as web updates without a new bundle.
- [ ] Engagement: what testers did after launch on 19 November, and how that differs from the countdown weeks.

## Later

- [x] Applied for production access on 16 November. Rejected on 18 November: see Round 2.
- [ ] After launch (19 November): the hub screenshots show the countdown, which is gone by then. Re-run `docs/android/screenshots.mjs` against a local `npm run preview` with the hub path set to `?phase=after` (works on localhost only) and replace the hub shots in Play Console.
