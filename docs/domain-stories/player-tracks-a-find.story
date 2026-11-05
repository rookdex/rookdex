title: Rookdex: a player tracks a find
scope: fine-grained, as-is, digitalized
info: The core loop. The player opens the site, ticks a find, and the progress stays in their own browser.
actors: Player=Person, Browser=System, Cloudflare=System, ServiceWorker=System, Tracker=System, IndexedDB=System, Hub=System
objects: Link=Info, Page=Document, Offline copy=Folder, Profile=Info, Find=Info, Progress=Document, Stats=Info, Profile file=Document
1. Player | opens | Link | in Browser
2. Browser | requests | Page | from Cloudflare
3. Cloudflare | serves | Page | to Browser
4. ServiceWorker | precaches | Offline copy
5. Player | picks | Profile | in Tracker
6. Player | ticks | Find | in Tracker
7. Tracker | saves | Progress | to IndexedDB
8. Hub | reads | Progress | from IndexedDB
9. Hub | shows | Stats | to Player
10. Player | exports | Profile file | from Tracker
