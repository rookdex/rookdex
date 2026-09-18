// English is the source of truth: every other language file is typed as `Strings`,
// so a missing or extra key fails `npm run check`.
export const en = {
	siteName: "Rookdex",
	tagline: "A launch-night companion for GTA VI. Track what you find, see what is confirmed.",
	skipToContent: "Skip to content",
	languageSwitch: "Language",
	languageNames: { en: "English", no: "Norsk" },
	hub: {
		countdownHeading: "Launch countdown",
		daysToGo: "{n} days to go",
		oneDayToGo: "1 day to go",
		days: "days",
		hours: "hours",
		minutes: "minutes",
		seconds: "seconds",
		preload: "Preload opens 12 November.",
		buyHeading: "Buying in Norway",
		buyBody:
			"Digital editions unlock at midnight CET on 19 November on PlayStation 5 and Xbox Series X|S. The standard digital edition is 949 kr. There is no PC version at launch.",
		beforeYouStart: "Read this before you start",
		launched: "It is out.",
		daySince: "Day {n} since launch",
		statsSoon: "Your progress and stats land here in the next release.",
	},
	guides: {
		heading: "Guides",
		inEnglish: "This guide is only in English so far.",
		updated: "Updated {date}",
		sources: "Sources",
	},
	footer: {
		disclaimer:
			"Rookdex is an unofficial fan project. It is not affiliated with or endorsed by Rockstar Games or Take-Two Interactive. All trademarks belong to their owners.",
		contact: "Takedown or legal contact:",
		licence: "Code under MIT, guide text under CC BY-SA 4.0.",
		source: "Source on GitHub",
	},
	notFound: {
		title: "Page not found",
		body: "That address does not exist. Pick a language to start over.",
	},
	install: {
		title: "Install Rookdex",
		body: "Add it to your home screen so it opens like an app and works offline.",
		accept: "Install",
		dismiss: "Not now",
	},
	offline: {
		notice: "Offline, showing saved data",
	},
	// Category and group labels are keyed by seed id. The seed test checks every id has a label
	// in both languages, so the type stays open.
	category: {
		wildlife: "Wildlife",
		vehicles: "Vehicles",
		places: "Places",
		collectibles: "Collectibles",
	} as Record<string, string>,
	group: {} as Record<string, string>,
}

export type Strings = typeof en
