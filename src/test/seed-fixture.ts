// The valid seed every seedBuild case starts from (category model spec §10). A case changes one
// thing and expects its error, so each check is proven to fire on its own.
import type { Allowlist } from "../model/schema"

export const fixtureAllowlist: Allowlist = {
	official: ["rockstargames.com"],
	press: ["ign.com", "gamesradar.com"],
	blocklist: ["leaksite.example"],
}
export const official = { url: "https://www.rockstargames.com/VI", title: "GTA VI site" }
export const ign = { url: "https://www.ign.com/gta-6/1", title: "IGN guide" }
export const ignNordic = { url: "https://nordic.ign.com/gta-6/2", title: "IGN Nordic" }
export const radar = { url: "https://www.gamesradar.com/gta-6/1", title: "GamesRadar guide" }
export const game = { kind: "game", screen: ["Progress", "Vehicles", "Cars"] }

export type ItemJson = Record<string, unknown>
export interface GroupJson {
	group: string
	order: number
	total?: number
	sort: string
	counts?: boolean
	spoiler?: string
	sets?: { id: string; total?: number }[]
	sources?: unknown[]
	items: ItemJson[]
}
export interface FixtureInput {
	categories: { categories: { id: string; spoiler?: string }[] }
	groups: Record<string, GroupJson>
	shipped: string
	allowlist: Allowlist
}

/** Two categories with files, Story listed without one, a set, a retired item at the total, a
 *  file-sorted group whose items take the header's sources, and an uncounted group. */
export function validInput(): FixtureInput {
	const groups: Record<string, GroupJson> = {
		"vehicles/cars.json": {
			group: "cars",
			order: 1,
			total: 3,
			sort: "name",
			sets: [{ id: "coupes", total: 2 }],
			items: [
				{
					id: "vehicles/zeta",
					set: "coupes",
					name: "Zeta",
					status: "confirmed",
					sources: [official],
				},
				{
					id: "vehicles/alpha",
					set: "coupes",
					name: "'70 Alpha",
					status: "confirmed",
					sources: [game],
					specs: { style: "Classic", era: "1970s" },
				},
				{ id: "vehicles/hoop-10", name: "Hoop 10", status: "confirmed", sources: [ign, radar] },
				{
					id: "vehicles/hoop-9",
					name: "Hoop 9",
					status: "confirmed",
					sources: [official],
					retired: true,
				},
			],
		},
		"vehicles/bikes.json": {
			group: "bikes",
			order: 2,
			sort: "file",
			sources: [official],
			items: [
				{ id: "vehicles/second", name: "Second", status: "confirmed", sources: [] },
				{ id: "vehicles/first", name: "First", status: "confirmed", sources: [] },
			],
		},
		"animals/birds.json": {
			group: "birds",
			order: 1,
			total: 5,
			sort: "name",
			items: [
				{
					id: "animals/pelican",
					name: "Pelican",
					status: "expected",
					precedent: "GTA V",
					sources: [ign],
					tips: [{ text: "Look along the piers at dawn.", sources: [ign] }],
					locations: [{ area: "Ocean Beach piers", kind: "find", link: radar }],
				},
				{
					id: "animals/heron",
					name: "Heron",
					status: "confirmed",
					sources: [official],
					edition: "ultimate",
					aliases: ["Great blue heron"],
				},
			],
		},
		"animals/mammals.json": {
			group: "mammals",
			order: 2,
			sort: "name",
			counts: false,
			items: [{ id: "animals/cougar", name: "Cougar", status: "confirmed", sources: [official] }],
		},
	}
	const ids = Object.values(groups).flatMap((g) => g.items.map((i) => String(i.id)))
	return {
		categories: {
			categories: [{ id: "vehicles" }, { id: "animals" }, { id: "story", spoiler: "story" }],
		},
		groups,
		shipped: `# shipped ids\n${ids.join("\n")}\n`,
		allowlist: fixtureAllowlist,
	}
}
