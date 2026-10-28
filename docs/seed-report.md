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
| places/the-city | Vice City | confirmed | rockstargames.com/VI; rockstargames.com/VI/vice-city |
| places/the-keys | Leonida Keys | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/grassrivers | Grassrivers | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/port-gellhorn | Port Gellhorn | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/ambrosia | Ambrosia | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/mount-kalaga-national-park | Mount Kalaga National Park | confirmed | rockstargames.com/VI/only-in-leonida; GTABase |
| places/state-penitentiary | Leonida Penitentiary | confirmed | rockstargames.com/VI/vice-city |
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

## Refresh, 28 October 2026

The second research pass, three weeks before launch. Four research agents (one per category) read
the official material published since 18 September (the Launch Trailer on 15 October, An Extended
Look, Rockstar Newswire, the `rockstargames.com/VI` pages with every panel and dialog opened) and
the allowlisted press that identifies what those videos and pages show. Reports are in
`.superpowers/sdd/2026-10-28-seed-refresh/research-*.md`. The same tier rules and the same leak rule
apply as in the first pass, and every candidate passed the gate before I ruled on it.

The seed grows from 43 to 215 items: 1 wildlife, 141 vehicles, 24 places and 6 collectibles.

**What the new material holds.** The Launch Trailer Newswire text names no vehicles, places or
animals. The new names sit behind clicks: the expandable panels on `/VI/editions` (the Ultimate
Edition vehicles and mod shops) and the Explore dialogs on `/VI/only-in-leonida` (neighbourhoods,
landmarks and businesses). Most vehicles come from press identifications of Trailer 1, Trailer 2 and
An Extended Look, the same pattern as the shipped Declasse Tulip: an official video plus a press page
naming the vehicle and the trailer it was seen in. GTABase's per-vehicle pages state where each
vehicle was seen, and that sentence is how leak-sourced entries were filtered out.

**My rulings.**

- Vehicles: the 141 trailer and editions sightings ship. 59 vehicles seen only in official
  screenshots or artwork wait until after launch, because no official text names them and nobody
  checked the images. The Declasse Vamos stays out: GTABase traces it to the 2022 leak.
- Wildlife: only the ray ships. Rockstar named whales, macaques, armadillos, toads, feral cats and
  jellyfish in Game Informer's cover story, but none is in official footage yet, and filing them as
  `expected` would need a precedent they don't have. They wait for launch footage.
- Collectibles: all six ship, including the races and BASE jumps, which sit in Challenges beside
  Time Trials.
- Places: all 24 ship. Five of them (Ocean Beach, Washington Beach, Lake Leonida, Stockyard, Watson
  Bay) were rejected in September as leak names. Rockstar's own text names them now, and an official
  naming outranks the leak overlap.

**Ids.** Three place ids would carry a brand token, so they follow `places/the-city`:
`places/southside`, `places/the-city-airport` and `places/the-lake`. The display names keep the real
words. Übermacht is written Ubermacht, because names are ASCII.

**New groups.** Aircraft, Emergency and Commercial (vehicles) and Neighborhoods (places), with labels
in both locales.

### Wildlife (1)

| id | name | status | sources |
|---|---|---|---|
| wildlife/ray | Ray | confirmed | Rockstar Newswire; GamesRadar; RockstarINTEL |

### Vehicles (141)

| id | name | status | sources |
|---|---|---|---|
| vehicles/grotti-cheetah-95 | 1995 Grotti Cheetah | confirmed | rockstargames.com/VI/editions; GTABase; PC Gamer |
| vehicles/vapid-ganado | Vapid Ganado | confirmed | rockstargames.com/VI/editions; GTABase; GamesRadar; PC Gamer |
| vehicles/vapid-dominator-67-buggy | 1967 Vapid Dominator Buggy | confirmed | rockstargames.com/VI/editions; GTABase; GamesRadar; PC Gamer |
| vehicles/dinka-enduro | Dinka Enduro | confirmed | rockstargames.com/VI/editions; GTABase; GamesRadar; PC Gamer |
| vehicles/crest-kayak | Crest Kayak | confirmed | rockstargames.com/VI/editions; GTABase; GamesRadar |
| vehicles/shitzu-squalo | Shitzu Squalo | confirmed | rockstargames.com/VI/editions; GTABase; GamesRadar |
| vehicles/rideout-customs | Rideout Customs | confirmed | rockstargames.com/VI/editions; GamesRadar |
| vehicles/one-eyed-willies-mod-shop | One-Eyed Willie's Mod Shop | confirmed | rockstargames.com/VI/editions; GamesRadar |
| vehicles/buckingham-windsor-drop | Buckingham Windsor Drop | confirmed | Rockstar Newswire; GTABase |
| vehicles/declasse-granger-police | Declasse Granger Police | confirmed | Rockstar Newswire; GTABase |
| vehicles/ubermacht-sentinel-classic | Ubermacht Sentinel Classic | confirmed | Rockstar Newswire; GTABase; GamesRadar |
| vehicles/maibatsu-penumbra-ff | Maibatsu Penumbra FF | confirmed | Rockstar Newswire; GTABase |
| vehicles/progen-emerus | Progen Emerus | confirmed | Rockstar Newswire; GTABase |
| vehicles/karin-feroci | Karin Feroci | confirmed | Rockstar Newswire; GTABase |
| vehicles/fathom-fr36 | Fathom FR36 | confirmed | Rockstar Newswire; GTABase |
| vehicles/pegassi-infernus-classic | Pegassi Infernus Classic | confirmed | Rockstar Newswire; GTABase |
| vehicles/grotti-itali-rsx | Grotti Itali RSX | confirmed | Rockstar Newswire; GTABase |
| vehicles/vapid-lowline | Vapid Lowline | confirmed | Rockstar Newswire; GTABase |
| vehicles/pfister-neon | Pfister Neon | confirmed | Rockstar Newswire; GTABase |
| vehicles/mammoth-patriot-mil-spec | Mammoth Patriot Mil-Spec | confirmed | Rockstar Newswire; GTABase |
| vehicles/ubermacht-rebla-gts | Ubermacht Rebla GTS | confirmed | Rockstar Newswire; GTABase |
| vehicles/canis-terminus | Canis Terminus | confirmed | Rockstar Newswire; GTABase |
| vehicles/karin-vivanite | Karin Vivanite | confirmed | Rockstar Newswire; GTABase |
| vehicles/benefactor-xls | Benefactor XLS | confirmed | Rockstar Newswire; GTABase |
| vehicles/ubermacht-zion-cabrio | Ubermacht Zion Cabrio | confirmed | Rockstar Newswire; GTABase |
| vehicles/principe-lectro | Principe Lectro | confirmed | Rockstar Newswire; GTABase |
| vehicles/pegassi-faggio | Pegassi Faggio | confirmed | Rockstar Newswire; GTABase |
| vehicles/buckingham-luxor | Buckingham Luxor | confirmed | Rockstar Newswire; GTABase |
| vehicles/buckingham-valkyrie | Buckingham Valkyrie | confirmed | Rockstar Newswire; GTABase |
| vehicles/dundreary-landstalker-xl-police | Dundreary Landstalker XL Police | confirmed | Rockstar Newswire; GTABase |
| vehicles/brute-ambulance | Brute Ambulance | confirmed | Rockstar Newswire; GTABase |
| vehicles/brute-stockade | Brute Stockade | confirmed | Rockstar Newswire; GTABase; GamesRadar |
| vehicles/hvy-airtug | HVY Airtug | confirmed | Rockstar Newswire; GTABase |
| vehicles/vapid-benson | Vapid Benson | confirmed | Rockstar Newswire; GTABase |
| vehicles/hvy-biff | HVY Biff | confirmed | Rockstar Newswire; GTABase |
| vehicles/jobuilt-flatbed | JoBuilt Flatbed | confirmed | Rockstar Newswire; GTABase |
| vehicles/declasse-granger-taxi | Declasse Granger Taxi | confirmed | Rockstar Newswire; GTABase |
| vehicles/brute-tipper | Brute Tipper | confirmed | Rockstar Newswire; GTABase |
| vehicles/brute-utility-truck | Brute Utility Truck | confirmed | Rockstar Newswire; GTABase |
| vehicles/nagasaki-caddy | Nagasaki Caddy | confirmed | Rockstar Newswire; GTABase |
| vehicles/bravado-bison-900-95 | Bravado Bison 900 '95 | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/nagasaki-blazer | Nagasaki Blazer | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/albany-buccaneer | Albany Buccaneer | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/albany-buccaneer-custom | Albany Buccaneer Custom | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/bravado-buffalo | Bravado Buffalo | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/bravado-buffalo-stx | Bravado Buffalo STX | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-caracara | Vapid Caracara | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/grotti-carbonizzare | Grotti Carbonizzare | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/vapid-chino | Vapid Chino | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/pfister-comet-retro-custom | Pfister Comet Retro Custom | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/pfister-comet-s2-cabrio | Pfister Comet S2 Cabrio | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/invetero-coquette-d10 | Invetero Coquette D10 | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/grotti-furia | Grotti Furia | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/karin-futo | Karin Futo | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/bravado-gauntlet-hellfire | Bravado Gauntlet Hellfire | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/declasse-granger-3600lx | Declasse Granger 3600LX | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/annis-hellion | Annis Hellion | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/karin-intruder | Karin Intruder | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/vapid-liberator | Vapid Liberator | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/nagasaki-outlaw | Nagasaki Outlaw | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/schyster-pmp-700 | Schyster PMP 700 | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/albany-primo | Albany Primo | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/imponte-ruiner | Imponte Ruiner | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/vapid-sandking-xl | Vapid Sandking XL | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/benefactor-schafter-v12 | Benefactor Schafter V12 | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/obey-tailgater | Obey Tailgater | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/declasse-tulip-m-100 | Declasse Tulip M-100 | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/pegassi-zorrusso | Pegassi Zorrusso | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/declasse-bobcat-xl | Declasse Bobcat XL | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/ubermacht-cypher | Ubermacht Cypher | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-dominator | Vapid Dominator | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-dominator-asp | Vapid Dominator ASP | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-dominator-gtx | Vapid Dominator GTX | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/benefactor-dubsta | Benefactor Dubsta | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/annis-elegy-90 | Annis Elegy '90 | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/bravado-gauntlet-classic | Bravado Gauntlet Classic | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/grotti-itali-gto | Grotti Itali GTO | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/ocelot-jugular | Ocelot Jugular | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/obey-omnis-e-gt | Obey Omnis e-GT | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-reclaimer | Vapid Reclaimer | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/declasse-sabre-turbo | Declasse Sabre Turbo | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/canis-seminole-frontier | Canis Seminole Frontier | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-slamvan | Vapid Slamvan | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/zirconium-stratum | Zirconium Stratum | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/karin-sultan | Karin Sultan | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/nagasaki-carbon-rs | Nagasaki Carbon RS | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/western-sovereign | Western Sovereign | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/dinka-double-t | Dinka Double-T | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/pegassi-speeder | Pegassi Speeder | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/shitzu-tropic | Shitzu Tropic | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/mammoth-dodo | Mammoth Dodo | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/buckingham-nimbus | Buckingham Nimbus | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/sea-sparrow | Sea Sparrow | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/buckingham-supervolito | Buckingham SuperVolito | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/buckingham-police-maverick | Buckingham Police Maverick | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-stanier-le-police-cruiser | Vapid Stanier LE Police Cruiser | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/bravado-buffalo-police-cruiser | Bravado Buffalo Police Cruiser | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/bravado-buffalo-stx-pursuit | Bravado Buffalo STX Pursuit | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/bravado-gauntlet-interceptor | Bravado Gauntlet Interceptor | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/vapid-lowline-police-interceptor | Vapid Lowline Police Interceptor | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-montagne-police | Vapid Montagne Police | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/jobuilt-phantom | JoBuilt Phantom | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/vapid-speedo | Vapid Speedo | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/declasse-burrito | Declasse Burrito | confirmed | Trailer 1 (YouTube); Rockstar Newswire; GTABase; GamesRadar |
| vehicles/bravado-rumpo | Bravado Rumpo | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/dashound | Dashound | confirmed | Trailer 1 (YouTube); GTABase; GamesRadar |
| vehicles/vapid-tow-truck | Vapid Tow Truck | confirmed | Trailer 1 (YouTube); Rockstar Newswire; GTABase; GamesRadar |
| vehicles/maibatsu-mule | Maibatsu Mule | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/jobuilt-rubble | JoBuilt Rubble | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-stanier-taxi | Vapid Stanier Taxi | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/bravado-youga-classic | Bravado Youga Classic | confirmed | Trailer 1 (YouTube); GTABase |
| vehicles/vapid-aleutian | Vapid Aleutian | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/bravado-banshee | Bravado Banshee | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/bravado-bison | Bravado Bison | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar |
| vehicles/bravado-bison-1800 | Bravado Bison 1800 | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/vapid-caracara-4x4 | Vapid Caracara 4x4 | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar; PC Gamer |
| vehicles/pfister-growler | Pfister Growler | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar |
| vehicles/dundreary-landstalker-xl | Dundreary Landstalker XL | confirmed | Trailer 1 (YouTube); Trailer 2 (YouTube); GTABase; GamesRadar |
| vehicles/maibatsu-penumbra | Maibatsu Penumbra | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar |
| vehicles/imponte-phoenix | Imponte Phoenix | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar |
| vehicles/pfister-astron | Pfister Astron | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/invetero-coquette | Invetero Coquette | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/declasse-granger | Declasse Granger | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/vapid-montagne | Vapid Montagne | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/ubermacht-sentinel-xs | Ubermacht Sentinel XS | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/pegassi-tempesta | Pegassi Tempesta | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/emperor-vectre | Emperor Vectre | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/enus-windsor | Enus Windsor | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/albany-emperor | Albany Emperor | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar |
| vehicles/gallivanter-baller | Gallivanter Baller | confirmed | Trailer 2 (YouTube); GamesRadar |
| vehicles/declasse-rancher | Declasse Rancher | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar |
| vehicles/western-zombie-chopper | Western Zombie Chopper | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/nagasaki-dinghy | Nagasaki Dinghy | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/speedophile-seashark | Speedophile Seashark | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/nagasaki-buzzard-attack-chopper | Nagasaki Buzzard Attack Chopper | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/mammoth-streamer216 | Mammoth Streamer216 | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/vapid-stanier-le-police-ghost | Vapid Stanier LE Police Ghost | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/brute-police-riot | Brute Police Riot | confirmed | Trailer 2 (YouTube); GTABase; GamesRadar |
| vehicles/mtl-packer | MTL Packer | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/brute-rental-shuttle-bus | Brute Rental Shuttle Bus | confirmed | Trailer 2 (YouTube); GTABase |
| vehicles/pay-n-spray | Pay 'n' Spray | expected (GTA Vice City) | GTABase |

### Places (24)

| id | name | status | sources |
|---|---|---|---|
| places/ocean-beach | Ocean Beach | confirmed | rockstargames.com/VI/only-in-leonida; rockstargames.com/VI/editions |
| places/little-cuba | Little Cuba | confirmed | rockstargames.com/VI/only-in-leonida; GamesRadar |
| places/stockyard | Stockyard | confirmed | rockstargames.com/VI/editions; GamesRadar |
| places/washington-beach | Washington Beach | confirmed | rockstargames.com/VI/editions |
| places/southside | Southside Vice City | confirmed | rockstargames.com/VI/editions |
| places/watson-bay | Watson Bay | confirmed | rockstargames.com/VI/editions |
| places/kelly-county | Kelly County | confirmed | Trailer 1 (YouTube); GamesRadar |
| places/goose-key | Goose Key | confirmed | Rockstar Newswire; GameSpot |
| places/vc-port | VC Port | confirmed | rockstargames.com/VI/only-in-leonida; GamesRadar |
| places/the-city-airport | Vice City International Airport | confirmed | Trailer 1 (YouTube); GamesRadar; RockstarINTEL |
| places/tisha-wocka-flea-market | Tisha-Wocka Flea Market | confirmed | rockstargames.com/VI/only-in-leonida |
| places/the-lake | Lake Leonida | confirmed | rockstargames.com/VI/editions |
| places/gambit-bay | Gambit Bay | confirmed | rockstargames.com/VI/editions |
| places/paradise-garage | Paradise Garage | confirmed | rockstargames.com/VI/editions |
| places/allied-crystal-sugar-refinery | Allied Crystal Sugar Refinery | confirmed | rockstargames.com/VI/only-in-leonida; GamesRadar |
| places/the-rusty-anchor | The Rusty Anchor | confirmed | rockstargames.com/VI/only-in-leonida; GamesRadar |
| places/starlet-motel | Starlet Motel | confirmed | rockstargames.com/VI/only-in-leonida; GamesRadar |
| places/delights-cabaret | Delights Cabaret | confirmed | rockstargames.com/VI/only-in-leonida; GamesRadar |
| places/ptt-youngins-illegal-goods-store | PTT Youngin$ Illegal Goods Store | confirmed | rockstargames.com/VI/editions |
| places/rideout-customs-mod-shop | Rideout Customs Mod Shop | confirmed | rockstargames.com/VI/editions |
| places/saras-unisex-salon | Sara's Unisex Salon | confirmed | rockstargames.com/VI/editions |
| places/stock-305-clothing-store | Stock 305 Clothing Store | confirmed | rockstargames.com/VI/editions |
| places/electric-fang-tattoo-parlor | Electric Fang Tattoo Parlor | confirmed | rockstargames.com/VI/editions |
| places/one-eyed-willies-mod-shop | One-Eyed Willie's Mod Shop | confirmed | rockstargames.com/VI/editions |

### Collectibles (6)

| id | name | status | sources |
|---|---|---|---|
| collectibles/hidden-packages | Hidden Packages | expected (GTA Vice City) | GTABase |
| collectibles/sunken-treasure | Sunken Treasure | expected (GTA Online) | GameSpot; GTABase; GamesRadar |
| collectibles/base-jumps | Base Jumps | expected (GTA V) | RockstarINTEL; GamesRadar; GTABase |
| collectibles/street-races | Street Races | expected (GTA V) | GamesRadar; RockstarINTEL; GTABase |
| collectibles/off-road-races | Off-Road Races | expected (GTA V) | GamesRadar; RockstarINTEL; GTABase |
| collectibles/sea-races | Sea Races | expected (GTA V) | GTABase |

### Rejected this round

Full lists are in each research report. In short: vehicles whose GTABase page cites the 2022 leak
or the August 2026 leaked gameplay (most of GTABase's 16 October batch); vehicles known only by a
real-world model name; generic or scenery vehicles (ferry, freight train, blimp); places that trace
back to either leak or appear only on non-allowlisted sites; roads, radio stations and nicknames;
pets and game systems (animal study, Legendary animals) in wildlife; activities without a checklist
structure (hunting, fishing, golf) and physical merchandise in collectibles.

### Source check

A fresh agent that had not seen the research re-fetched a reproducible random sample of 27 new items
(12 vehicles, 8 places, all 6 collectibles and the ray). 26 were supported, and none was leak-derived.
Sea Races is the weakest: GTABase is its only GTA 6 source, so its description says press expects it
rather than that it is confirmed. One pattern to know: the Extended Look vehicles cite the Newswire
article as their official source, and that text never names a vehicle, so the identification rests
on GTABase. The gate only demands a press source when every official source is a YouTube video. Each
of these items has one anyway.
