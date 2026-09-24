// Chromium-only event; not in lib.dom. Declared here so the island type-checks.
interface BeforeInstallPromptEvent extends Event {
	prompt(): Promise<void>
	readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

interface WindowEventMap {
	beforeinstallprompt: BeforeInstallPromptEvent
}

// iOS Safari's home-screen flag; not in lib.dom, needed so `window` satisfies StandaloneWindow.
interface Navigator {
	standalone?: boolean
}
