# Store listing

Pasted into Play Console, Store listings, Edit default listing. English (en-US) is the default language. Norwegian is a translation: the Console offers only "Norwegian – no-NO", added from the language dropdown at the top of the editor, by hand (no AI or Google translation). The editor has two steps, Assets then Review; only Save on Review commits.

The icon and feature graphic fall back to en-US. The Norwegian listing needs its own `nb-*.png` screenshots, or it shows the English ones. On Review, the AI asset declaration is "Don't label assets": the icon and banner are hand-written SVG, the screenshots are captures of the real app.

Store settings (category and contact details) are a separate page. Phone stays blank and External marketing stays at its default (on).

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
Offline progress tracker, Dex, news and guides. No account needed.
```

**Full description** (4,000 characters at most):

```text
Rookdex is an unofficial fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.

Rookdex is a free, open-source companion for GTA VI. It counts down to launch at midnight in your own time zone, then helps you keep track of what you find.

What you get:
• A countdown to launch, then a dashboard with your progress, what to find next and your latest finds
• A tracker for collectibles, places, vehicles and wildlife, with search, a Hide found filter and progress per category
• A Dex to browse every animal, vehicle, place and collectible, with search
• News that keeps what Rockstar has confirmed apart from rumors in the press, each with its source
• Guides to what to sort out before launch night and to your first hour
• Several profiles on one device, with backup and restore
• A report button for items that are wrong or missing
• English and Norwegian

Private by design: no account, no ads, no analytics and no trackers. Your progress stays on your device, and the app works offline.

The app is the website rookdex.app in an app, so it also works in any browser. The code is open on GitHub under the MIT license.
```

## Norsk bokmål (nb-NO)

**Kort beskrivelse** (maks 80 tegn):

```text
Sjekkliste som virker uten nett, Dex, nyheter og guider. Ingen konto.
```

**Full beskrivelse** (maks 4000 tegn):

```text
Rookdex er et uoffisielt fanprosjekt. Det er ikke tilknyttet eller godkjent av Rockstar Games eller Take-Two Interactive.

Rookdex er en gratis følgesvenn med åpen kildekode for GTA VI. Den teller ned til lanseringen ved midnatt i din egen tidssone, og hjelper deg å holde oversikt over det du finner.

Dette får du:
• Nedtelling til lansering, deretter en oversikt med fremdriften din, hva du kan finne nå og de siste funnene dine
• Sjekkliste for samleobjekter, steder, kjøretøy og dyreliv, med søk, Skjul funnet og fremdrift per kategori
• En Dex der du kan bla gjennom alle dyr, kjøretøy, steder og samleobjekter, med søk
• Nyheter som holder det Rockstar har bekreftet adskilt fra rykter i pressen, hver sak med kilde
• Guider til hva du bør ordne før lanseringskvelden og til den første timen
• Flere profiler på én enhet, med sikkerhetskopi og gjenoppretting
• En knapp for å melde fra om feil eller manglende objekter
• Engelsk og norsk

Personvern først: ingen konto, ingen reklame, ingen analyse og ingen sporing. Fremgangen din blir på enheten din, og appen virker uten nett.

Appen er nettstedet rookdex.app i en app, så den virker også i alle nettlesere. Koden er åpen på GitHub under MIT-lisensen.
```

## Graphics

| Asset | File | Play's rule |
|---|---|---|
| App icon | `docs/android/icon-512.png` | 512 × 512, 32-bit PNG, full square (Play rounds it) |
| Feature graphic | `docs/android/feature-graphic.jpg` | 1024 × 500, JPEG or 24-bit PNG |
| Phone screenshots, English | `docs/android/screenshots/en-*.png` | 2 to 8, 1080 × 1920 |
| Phone screenshots, Norwegian | `docs/android/screenshots/nb-*.png` | 2 to 8, 1080 × 1920 |

Upload the screenshots in this order: hub, tracker, Dex, news, settings.

The name, icon and feature graphic carry no "GTA", "Rockstar" or game art. The full description names the game once, to say what Rookdex is for. The screenshots show the app as it is, so the hub names GTA VI and the news headlines say "GTA 6". That is plain text describing the content, with no logo or game art.
