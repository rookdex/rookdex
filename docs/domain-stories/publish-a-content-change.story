title: Rookdex: I publish a content change
scope: fine-grained, as-is, digitalized
info: How a seed or guide edit reaches rookdex.app. The facts, rumours and tracker items are hand-curated JSON until the phase 1c pipeline lands.
actors: Maintainer=Person, GitHub=System, Ward=System, Cloudflare=System, ServiceWorker=System, Player=Person
objects: Pull request=Document, Check result=Info, Preview build=Folder, Preview link=Info, Static build=Folder, Update notice=Info
1. Maintainer | opens | Pull request | in GitHub
2. GitHub | sends | Pull request | to Ward
3. Ward | reports | Check result | to Maintainer
4. GitHub | uploads | Preview build | to Cloudflare
5. GitHub | posts | Preview link | to Maintainer
6. Maintainer | merges | Pull request | in GitHub
7. GitHub | deploys | Static build | to Cloudflare
8. ServiceWorker | fetches | Static build | from Cloudflare
9. ServiceWorker | shows | Update notice | to Player
