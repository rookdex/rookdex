# Rookdex

A companion site for GTA VI: track what you find, see what is confirmed, in English and Norwegian. Installable, works offline, no account needed.

Rookdex is an unofficial fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive.

## Stack

Astro 7 with React islands · TypeScript · Biome · Vitest · Cloudflare Workers (static assets)

## Run it

```bash
npm install
npm run dev
```

`npm run build` writes the site to `dist/`; `npm run preview` serves that folder the way Cloudflare does. `npm test` runs the unit tests, `npm run check` type-checks.

## Deploy

Pull requests get a preview URL (CI job summary). Merging to `main` deploys to https://rookdex.app through Cloudflare Workers static assets.

## Brand

Colours and type are tokens in `src/styles/tokens.css`; components read tokens and never write a colour of their own. The mark is `public/icon.svg` (the app icon) and `src/components/Mark.astro` (in-page, token-coloured); the social banner is rendered from `docs/brand/og.html` to `public/og.png`. The brand spec is `docs/superpowers/specs/2026-09-21-rookdex-brand-design.md`.

To rebuild the icons, run `npm run icons` for the PWA set and `npm run icons:favicon` for the favicon, which is generated separately from `assets/favicon-source.svg` — the same mark without the palm, which is noise at 16 px. To rebuild the banner, run `node docs/brand/serve.mjs`, open `http://localhost:4400/docs/brand/og.html` and call `render()` in the browser console; it posts the canvas back to the server, which writes `public/og.png`.

The Rookdex name, mark and banner are not under the MIT licence (`LICENSE` names the files). Use them to link to or talk about Rookdex, not to present another project as Rookdex.

## Licence

Code is MIT (see `LICENSE`; the brand files listed there are excluded). Guide text under `src/content/` is CC BY-SA 4.0.

Design spec and plans live in `docs/superpowers/`.
