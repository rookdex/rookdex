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

## Licence

Code is MIT (see `LICENSE`). Guide text under `src/content/` is CC BY-SA 4.0.

Design spec and plans live in `docs/superpowers/`.
