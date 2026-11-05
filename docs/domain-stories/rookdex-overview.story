title: Rookdex: every feature at a glance
scope: coarse-grained overview, as-is, digitalized
info: One sentence per feature. The detail stories zoom in on tracking a find and on publishing a change.
actors: Maintainer=Person, Player=Person, GitHub=System, Cloudflare=System, Browser=System, Site=System, ServiceWorker=System, Hub=System, Tracker=System, IndexedDB=System, PlayStore=System
objects: Seed and guides=Folder, Static build=Folder, Android app=Document, Page=Document, Language=Info, Offline copy=Folder, Countdown and checklist=Info, Find=Info, Progress=Document, Search and filters=Info, Profile=Info, Profile file=Document, Facts and rumours=Document, Guides=Document, Dex pages=Document, Item sources=Document, Launch build=Folder, Dashboard=Info, Settings=Info
1. Maintainer | updates | Seed and guides | in GitHub
2. GitHub | deploys | Static build | to Cloudflare
3. Player | installs | Android app | from PlayStore
4. Browser | requests | Page | from Cloudflare
5. Site | picks | Language | for Player
6. ServiceWorker | precaches | Offline copy
7. Hub | shows | Countdown and checklist | to Player
8. Player | ticks | Find | in Tracker
9. Tracker | saves | Progress | to IndexedDB
10. Player | uses | Search and filters | in Tracker
11. Player | switches | Profile | in Tracker
12. Player | exports | Profile file | from Tracker
13. Player | reads | Facts and rumours | on Site
14. Player | reads | Guides | on Site
15. Player | browses | Dex pages | on Site
16. Player | checks | Item sources | on Site
17. GitHub | rebuilds | Launch build | for Cloudflare
18. Hub | reads | Progress | from IndexedDB
19. Hub | shows | Dashboard | to Player
20. Player | changes | Settings | on Site
