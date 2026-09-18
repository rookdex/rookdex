// The one place that talks to IndexedDB. Promise wrappers over requests and transactions;
// no library. Learned here: a transaction stays alive only while requests from it are pending,
// so callbacks must await `request()` and nothing else.

export const DB_NAME = "rookdex"
export const DB_VERSION = 1
export type StoreName = "profiles" | "progress"

export function request<T>(req: IDBRequest<T>): Promise<T> {
	return new Promise((resolve, reject) => {
		req.onsuccess = () => resolve(req.result)
		req.onerror = () => reject(req.error)
	})
}

export interface Store {
	get<T>(name: StoreName, key: IDBValidKey): Promise<T | undefined>
	getAll<T>(name: StoreName, index?: string, query?: IDBValidKey): Promise<T[]>
	put(name: StoreName, value: unknown): Promise<void>
	delete(name: StoreName, key: IDBValidKey): Promise<void>
	transaction<T>(
		names: StoreName[],
		mode: IDBTransactionMode,
		fn: (tx: IDBTransaction) => Promise<T>
	): Promise<T>
	/**
	 * Called once, before the first readwrite transaction that follows registration. The tracker
	 * registers it after its own init writes, so the persistence request follows a player's write.
	 */
	onFirstWrite(callback: () => void): void
	close(): void
}

function upgrade(db: IDBDatabase): void {
	db.createObjectStore("profiles", { keyPath: "id" })
	const progress = db.createObjectStore("progress", { keyPath: ["profile_id", "item_id"] })
	progress.createIndex("profile_id", "profile_id")
}

export function openStore(factory: IDBFactory, name = DB_NAME): Promise<Store> {
	return new Promise((resolve, reject) => {
		const open = factory.open(name, DB_VERSION)
		open.onupgradeneeded = () => upgrade(open.result)
		open.onerror = () => reject(open.error)
		open.onsuccess = () => resolve(wrap(open.result))
	})
}

function wrap(db: IDBDatabase): Store {
	let firstWrite: (() => void) | undefined
	let written = false

	function transaction<T>(
		names: StoreName[],
		mode: IDBTransactionMode,
		fn: (tx: IDBTransaction) => Promise<T>
	): Promise<T> {
		if (mode === "readwrite" && !written) {
			written = true
			firstWrite?.()
		}
		return new Promise<T>((resolve, reject) => {
			const tx = db.transaction(names, mode)
			let result: T
			tx.oncomplete = () => resolve(result)
			tx.onerror = () => reject(tx.error)
			tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"))
			fn(tx).then(
				(value) => {
					result = value
				},
				(error: unknown) => {
					reject(error)
					try {
						tx.abort()
					} catch {
						// Already finished; the rejection above is what the caller sees.
					}
				}
			)
		})
	}

	return {
		get: (name, key) =>
			transaction([name], "readonly", (tx) => request(tx.objectStore(name).get(key))),
		getAll: (name, index, query) =>
			transaction([name], "readonly", (tx) => {
				const os = tx.objectStore(name)
				return request(index ? os.index(index).getAll(query) : os.getAll(query))
			}),
		put: (name, value) =>
			transaction([name], "readwrite", async (tx) => {
				await request(tx.objectStore(name).put(value))
			}),
		delete: (name, key) =>
			transaction([name], "readwrite", async (tx) => {
				await request(tx.objectStore(name).delete(key))
			}),
		transaction,
		onFirstWrite: (callback) => {
			firstWrite = callback
			written = false
		},
		close: () => db.close(),
	}
}
