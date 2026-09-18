# Seed report

The audit trail for the tracker's shipped seed content (Rookdex phase 1b, Task 16). Every item
below is sourced against `allowlist.json`; the gate in `src/model/seed.test.ts` enforces the tier
rules at build time. Sources were gathered by five research agents (reports in
`.superpowers/sdd/2026-09-16-rookdex-phase-1b/research-*.md`), merged by the implementer, then run
through the gate.

## Wildlife

| id | name | status | sources |
|---|---|---|---|
| wildlife/american-alligator | American alligator | confirmed | Trailer 1 (YouTube); GamesRadar |
| wildlife/green-iguana | Green iguana | confirmed | Trailer 2 (YouTube); PC Gamer |
| wildlife/loggerhead-sea-turtle | Loggerhead sea turtle | confirmed | Trailer 1 (YouTube); PC Gamer |
| wildlife/snake | Snake | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/american-flamingo | American flamingo | confirmed | Trailer 1 (YouTube); GamesRadar |
| wildlife/herring-gull | Herring gull | confirmed | Trailer 1 (YouTube); PC Gamer |
| wildlife/pelican | Pelican | confirmed | Trailer 2 (YouTube); PC Gamer |
| wildlife/duck | Duck | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/heron | Heron | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/spoonbill | Spoonbill | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/crane | Crane | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/raccoon | Raccoon | confirmed | Trailer 2 (YouTube); PC Gamer |
| wildlife/florida-panther | Florida panther | confirmed | Trailer 2 (YouTube); PC Gamer |
| wildlife/deer | Deer | confirmed | Trailer 2 (YouTube); PC Gamer |
| wildlife/bobcat | Bobcat | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/fox | Fox | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/beaver | Beaver | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/boar | Boar | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/squirrel | Squirrel | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/dolphin | Dolphin | confirmed | Trailer 1 (YouTube); GamesRadar |
| wildlife/great-white-shark | Great white shark | confirmed | Trailer 2 (YouTube); PC Gamer |
| wildlife/manatee | Manatee | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |
| wildlife/eel | Eel | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase |

No `expected` wildlife items: the research agent found no non-leak-tainted source for a wildlife
checklist/zoo system (see Rejected).

## Vehicles

| id | name | status | sources |
|---|---|---|---|
| vehicles/declasse-tulip | Declasse Tulip | confirmed | Trailer 1 (YouTube); GTABase; RockstarINTEL |
| vehicles/maibatsu-sanchez | Maibatsu Sanchez | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/lcc-avarus | LCC Avarus | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/marquis | Marquis | confirmed | Trailer 2 (YouTube); RockstarINTEL |
| vehicles/vapid-stanier | 1955 Vapid Stanier | confirmed | rockstargames.com/VI/editions; GTABase |
| vehicles/vehicle-garages | Vehicle Garages | expected (GTA V) | GTABase (GTA 6 feature); GTABase (GTA V properties guide) |
| vehicles/vehicle-customization | Vehicle Customization Shops | expected (GTA V) | GTABase (GTA 6 feature); GTABase (Los Santos Customs, GTA V) |

## Places

| id | name | status | sources |
|---|---|---|---|
| places/vice-city | Vice City | confirmed | rockstargames.com/VI; rockstargames.com/VI/vice-city |
| places/leonida-keys | Leonida Keys | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/grassrivers | Grassrivers | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/port-gellhorn | Port Gellhorn | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/ambrosia | Ambrosia | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/mount-kalaga-national-park | Mount Kalaga National Park | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/leonida-penitentiary | Leonida Penitentiary | confirmed | rockstargames.com/VI/vice-city |
| places/only-raw-records | Only Raw Records | confirmed | rockstargames.com/VI/vice-city |

No `expected` places items: the research agent found no non-leak-tainted source for a place-based
checklist system (properties, garages, stunt jumps) that named GTA 6 specifically (see Rejected).

## Collectibles

| id | name | status | sources |
|---|---|---|---|
| collectibles/classic-car-collection | Classic Car Collection | confirmed | rockstargames.com/VI/editions; GamesRadar |
| collectibles/spaceship-parts | Spaceship Parts | expected (GTA V) | GTABase (x2) |
| collectibles/letter-scraps | Letter Scraps | expected (GTA V) | GTABase (x2) |
| collectibles/stunt-jumps | Stunt Jumps | expected (GTA V) | GTABase; GamesRadar |
| collectibles/time-trials | Time Trials | expected (GTA V) | GTABase (x2) |

## Rumours

| id | name | reported by |
|---|---|---|
| rumours/online-2027-launch | GTA 6 Multiplayer in 2027 | pcgamer.com |
| rumours/pc-release-timing | GTA 6 PC Release Timing | pcgamer.com |
| rumours/post-launch-map-expansion | Post-Launch Map Expansion | gtabase.com |

## Rejected

Merged from the five research reports (full detail in each `research-*.md`):

**Wildlife:** domestic pets seen on-screen (Chihuahua, Doberman, German Shepherd, Rottweiler,
bodega cat, pet python) — framed by press as pets, not wildlife; the animal study/zoo system —
a game system, not a species, and not clearly sourced as press-speculated; RDR2-style "Legendary
Animals" hunting encounters — no qualifying precedent source; all animals whose only origin was
the 2022 leak (cows, crayfish, frogs, pigeon, possum, rats, skunks, whales, "skunk ape") or a
gtabase.com "unconfirmed/likely candidate" list (black bear, chickens, chipmunks, cormorant,
coyotes, crows, eagles, egrets, goose, hawks, horses, key deer, lionfish, manta rays, muskrat,
octopus, turkey, otters, pigs, rabbits, sheep, vultures); a hedged heron/spoonbill/nutria mention
that was too tentative to source alone (heron and spoonbill were instead sourced from GTABase's
plain confirmed list); a duplicate generic "Shark" item merged into the more specific "Great white
shark."

**Vehicles:** roughly 40 vehicle names (Bravado Banshee, Pegassi Zorrusso, Karin Futo, Grotti
Carbonizzare, Vapid Sandking XL, Enus Windsor Drop, Pegassi Tempesta, and others) surfaced only in
aggregated search summaries with no single directly-fetched allowlisted page confirming them by
name; "Ride Out Customs" as a named mod shop — only in an unverified summary, the actual GTABase
article names no shops; GTABase's "296 vehicles confirmed" and community "200+/60+ spotted" counts
— unsubstantiated and likely include leaked/datamined assets; a "long-nose race car," "Sirius
muscle car," "Vapid Riata" — could not confirm against the actual GamesRadar article text.

**Places:** Leonida (the state) and Liberty City — containers/backstory references, not discrete
places; the Vice City neighborhood names circulating widely (Ocean Beach, Washington Beach, Little
Havana, and dozens more, including on GTABase's own map page) — trace back to the 2022 map leak,
not to anything Rockstar has posted or a trailer-plus-press pairing; Boobie's strip club, recording
studio, and Brian's boat yard — real businesses but never given a proper name by Rockstar; the
"PTT Youngin$" store / gang compound raid Ultimate Edition content — could not verify the exact
wording against an official or allowlisted press page; purchasable garages/properties — GTABase's
own claim carried no disclosed source; Stunt Jumps / Under the Bridge / Hidden Packages as a
returning system — the GamesRadar and Newswire pages that looked promising rendered truncated or
title-only for the agent, so no verified quote could be cited.

**Collectibles:** Hidden Packages and drug stashes/briefcases — no valid GTA V/RDR2 precedent
system; shooting-range accuracy challenges — not a discrete collectible/checklist system; Under the
Bridge, Knife Flights, Submarine Pieces, Nuclear Waste, Peyote Plants, Monkey Mosaics, Playing
Cards — real GTA V/Online systems, but no press source discussing them as expected in GTA 6;
Cigarette Cards, Dinosaur Bones, Rock Carvings, Dreamcatchers (RDR2 precedents) — no press source
expecting these Old-West systems in Florida-set GTA 6; a wildlife "study"/zoo checklist — leak-
adjacent framing, and belongs to wildlife rather than collectibles regardless; trading cards in the
Ultimate Edition — searched specifically, found only the confirmed physical-goods-free bonus list.

**Rumours:** Gloriana as a full playable state — GTABase's own allowlisted map page has since
walked this back to "a small island," so it is resolved rather than a live rumour; missions paying
out in cryptocurrency — the originating insider walked this back as "scrapped years ago"; a third
playable protagonist — Rockstar co-head Rod Nelson has addressed this in press interviews, settling
it rather than leaving it open; dynamic hurricanes/flooding as a weather system — every solid claim
traced back to leak-derived descriptions; the "Cyberleek" feature-list breakdown (stamina meter,
morality/focus systems, wanted-level changes, stealth indicator) — a blow-by-blow breakdown of
leaked footage, disqualified under rule 2 regardless of the outlet; an in-game stock market /
BAWSAQ-style system — this has a GTA V precedent, so it belongs in the main seed's `expected` tier
rather than Rumours (no qualifying source was found for it there either, so it is not shipped in
either place this round).

## Injection attempts

None reported by any of the five research agents. No fetched, allowlisted page asked an agent to
take any action; all page content was treated as data.

## Source-check review

The full review is at `.superpowers/sdd/2026-09-16-rookdex-phase-1b/research-review.md`. It was
run with WebFetch only (no browser), which cannot render YouTube's client-side player and hit
truncation on several long `gamesradar.com`/`pcgamer.com` articles before reaching the body text —
the review itself flags this as a tooling limitation, not a finding that a claim is false, and
distinguishes "unreachable" from "unsupported" on that basis. Fix round 1 re-opened every flagged
id's cited press page in a real browser (full JS rendering, no truncation) to settle each one.

**IDs the review could not confirm via WebFetch (marked unreachable or inconclusive) — re-checked
in a browser:**

| id | what the cited press page actually says | outcome |
|---|---|---|
| wildlife/american-alligator | GamesRadar trailer-1 breakdown: "flamingos, alligators, dolphins, and sharks all make an appearance" | supported — kept, sources unchanged |
| wildlife/loggerhead-sea-turtle | PC Gamer nature-watchers article has a dedicated "Loggerhead turtle (Caretta caretta)" section | supported — kept, sources unchanged |
| wildlife/american-flamingo | same GamesRadar sentence as alligator, above | supported — kept, sources unchanged |
| wildlife/herring-gull | same PC Gamer article has a dedicated "Herring Gull (Larus Argentatus)" section | supported — kept, sources unchanged |
| wildlife/florida-panther | PC Gamer national-park article: "even a Florida panther (Leonida panther?) stalking unsuspecting deer" | supported — kept, sources unchanged |
| wildlife/deer | same sentence as florida-panther, above | supported — kept, sources unchanged |
| wildlife/dolphin | same GamesRadar sentence as alligator, above | supported — kept, sources unchanged |
| wildlife/green-iguana | PC Gamer bodega-cats article: "there's also an enormous iguana ambling toward Jason's house in the very second shot" | supported — kept, sources unchanged |
| wildlife/pelican | same PC Gamer article: "you probably saw a bunch of seagulls and pelicans flying overhead as the trailer opens" | supported — kept, sources unchanged |
| rumours/online-2027-launch | PC Gamer, quoting Twitch CEO Dan Clancy: multiplayer launches "next year" (2027), after GTA 6 | supported — kept, sources unchanged |
| rumours/pc-release-timing | PC Gamer: "The PC release date for GTA 6 likely won't be before November 2027" | supported — kept, sources unchanged |

**IDs the review flagged as wrong-status — fixed:**

| id | problem | fix |
|---|---|---|
| `vehicles/vapid-stanier` | cited official source (take2games.com pre-order release) never names the car | re-sourced to `rockstargames.com/VI/editions`, which names "the timeless two-tone '55 Vapid Stanier sedan and garage" once the Vintage Vice City Pack panel is expanded — replaces the take2games.com source; GTABase press source unchanged. Description's pre-order cutoff corrected from "before 19 November 2026" to "before 20 November 2026" to match the official page's own wording ("purchases before November 20, 2026") |
| `vehicles/vehicle-garages` | cited source confirms garages exist in GTA 6 but never ties them to GTA V | added `gtabase.com/grand-theft-auto-v/properties/` (GTA V's Story Mode properties/garages guide) as a second source, actually tying `precedent: "GTA V"` to a source |
| `vehicles/vehicle-customization` | same problem, no GTA V tie-in | added `gtabase.com/grand-theft-auto-v/properties/story-mode/los-santos-customs` (Los Santos Customs, GTA V's vehicle customization shop) as a second source |
| `collectibles/time-trials` | description said GTA V time trials "count toward completion"; the cited precedent source says they're "an optional endeavor, not required for 100% Completion" | rewrote the description to match the source: "A set of timed vehicle and stunt-plane courses in GTA V, an optional extra not required for 100% completion; press coverage expects time trials to return in GTA 6." |

**Specific question — do `collectibles/spaceship-parts` and `collectibles/letter-scraps` get named
separately?** The review found both items' GTA V precedent source gives each its own full paragraph
("Collect all 50 Spaceship Parts…" / "Collect all the 50 Letter Scraps…"). No change — both items
kept as they were.

**Rumour `rumours/post-launch-map-expansion`** was already confirmed supported by the review (the
gtabase.com map page states Rockstar "plans to continue to develop the game's world after release");
kept unchanged.

All fixes verified with `npx vitest run src/model/seed.test.ts` (18/18 passing) after the edits.
