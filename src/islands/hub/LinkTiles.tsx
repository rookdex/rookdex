import { MAP_LINK } from "../../config/map-link"
import type { Translate } from "../../i18n"
import { Chev, TileTitle } from "./Chev"
import { ExternalTile } from "./ExternalTile"

interface Props {
	/** MAP_LINK.url, passed from the page so the config stays the one place it lives. */
	mapLink: string
	guideHref: string
	/** The guide's own title, from its frontmatter. */
	guideTitle: string
	settingsHref: string
	t: Translate
}

/**
 * The column of three tiles: Rockstar's site, the guide, Settings (desktop dashboard spec §4.7).
 * The map card's copy comes from MAP_LINK, so a new official map changes that entry and nothing here.
 * A plain `div`, not a `nav`: three tiles are not site navigation, and a landmark would add noise.
 */
export function LinkTiles({ mapLink, guideHref, guideTitle, settingsHref, t }: Props) {
	return (
		<div className="link-tiles">
			<ExternalTile
				href={mapLink}
				label={t(MAP_LINK.label)}
				title={t(MAP_LINK.title)}
				body={t(MAP_LINK.body)}
				t={t}
			/>
			<a className="tile link-tile" href={guideHref}>
				<span className="tile-label" aria-hidden="true">
					{t("hub.guideLabel")}
				</span>
				<TileTitle text={guideTitle}>
					<Chev />
				</TileTitle>
				<span className="tile-body">{t("hub.guideBody")}</span>
			</a>
			<a className="tile link-tile" href={settingsHref}>
				<span className="tile-label" aria-hidden="true">
					{t("nav.settings")}
				</span>
				<TileTitle text={t("hub.settingsTitle")}>
					<Chev />
				</TileTitle>
				<span className="tile-body">{t("hub.settingsBody")}</span>
			</a>
		</div>
	)
}
