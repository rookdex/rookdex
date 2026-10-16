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
