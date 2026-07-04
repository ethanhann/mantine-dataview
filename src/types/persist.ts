// Preference persistence. A storage adapter saves the user's layout choices (column visibility,
// pinning, sizing, and page size) across sessions, mirroring how `UrlStateAdapter` abstracts the
// URL. Unlike the URL, storage holds structured JSON, so there is no serializer layer. Ephemeral
// slices (page index, sort, filters, search, selection) are deliberately not persisted: the URL
// is their share-and-restore mechanism.

/** The stored shape. `pageSize` is flat because the page index is never persisted. */
export interface PersistedState {
	columnVisibility?: Record<string, boolean>;
	columnPinning?: { left?: string[]; right?: string[] };
	columnSizing?: Record<string, number>;
	columnOrder?: string[];
	pageSize?: number;
}

export type PersistableKey = keyof PersistedState;

/**
 * Storage abstraction for persisted preferences. `localStorageAdapter(key)` is the built-in
 * implementation; supply your own to store per-user preferences on a server.
 */
export interface StateStorageAdapter {
	/** The stored preferences, or `null` when nothing (valid) is stored. */
	read: () => PersistedState | null;
	/** Replace the stored preferences. Called debounced, with the full persisted shape. */
	write: (next: PersistedState) => void;
	/**
	 * Optional: notify when the stored value changes externally (e.g. another tab). Returns an
	 * unsubscribe function.
	 */
	subscribe?: (onChange: () => void) => () => void;
}

export interface PersistOptions {
	adapter: StateStorageAdapter;
	/** Restrict which preferences persist. Default: all of them. */
	include?: PersistableKey[];
}
