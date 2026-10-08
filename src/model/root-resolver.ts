import { createHash } from "node:crypto"

/**
 * The root page's inline script (locale spec §6.4). A classic script in <head>, so it runs before
 * first paint; a bundled module is deferred and would flash the link page. It mirrors the i18n
 * library's resolveLang for one stored value plus navigator.languages, and root-resolver.test.ts runs
 * both on the same inputs. ES5 on purpose: it ships exactly as written. It jumps to a configured tag,
 * never to the stored string itself.
 */
export function rootScript(tags: readonly string[], fallback: string, key: string): string {
	return [
		"(function () {",
		`  var tags = ${JSON.stringify(tags)};`,
		'  var aliases = { no: "nb", nn: "nb" };',
		"  function pick(tag) {",
		'    if (typeof tag !== "string") return null;',
		'    var short = tag.toLowerCase().split("-")[0];',
		"    if (tags.indexOf(short) !== -1) return short;",
		"    var alias = aliases.hasOwnProperty(short) ? aliases[short] : null;",
		"    return alias && tags.indexOf(alias) !== -1 ? alias : null;",
		"  }",
		"  var lang = null;",
		"  try {",
		`    var stored = localStorage.getItem(${JSON.stringify(key)});`,
		"    if (stored !== null && tags.indexOf(stored) === -1) {",
		`      localStorage.removeItem(${JSON.stringify(key)});`,
		"    } else {",
		"      lang = stored;",
		"    }",
		"  } catch (e) {}",
		"  var wanted = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language];",
		"  for (var i = 0; !lang && i < wanted.length; i++) lang = pick(wanted[i]);",
		`  location.replace("/" + (lang || ${JSON.stringify(fallback)}) + "/");`,
		"})();",
	].join("\n")
}

/** The CSP source for an inline script: sha256 of its exact text, base64. */
export function scriptHash(source: string): `sha256-${string}` {
	return `sha256-${createHash("sha256").update(source, "utf8").digest("base64")}`
}
