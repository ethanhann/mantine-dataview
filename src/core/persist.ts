// Runtime half of preference persistence: validation of untrusted stored values, conversion
// between the stored shape and `DataViewState`, and the built-in localStorage adapter.

import type {
	PersistableKey,
	PersistedState,
	PersistOptions,
	StateStorageAdapter,
} from "../types/persist";
import type { DataViewState } from "../types/state";

export const PERSISTABLE_KEYS: readonly PersistableKey[] = [
	"columnVisibility",
	"columnPinning",
	"columnSizing",
	"columnOrder",
	"pageSize",
];

function isRecordOf(
	value: unknown,
	check: (v: unknown) => boolean,
): value is Record<string, never> {
	return (
		typeof value === "object" &&
		value !== null &&
		!Array.isArray(value) &&
		Object.values(value).every(check)
	);
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((v) => typeof v === "string");
}

/**
 * Validates an untrusted stored value field by field, dropping anything malformed. Storage can
 * be edited by hand or written by an older release, so a bad field must degrade to the default
 * rather than corrupt the state shape.
 */
export function sanitizePersisted(raw: PersistedState | null): PersistedState {
	if (typeof raw !== "object" || raw === null) return {};
	const out: PersistedState = {};
	if (isRecordOf(raw.columnVisibility, (v) => typeof v === "boolean")) {
		out.columnVisibility = raw.columnVisibility;
	}
	const pinning = raw.columnPinning;
	if (
		typeof pinning === "object" &&
		pinning !== null &&
		(pinning.left === undefined || isStringArray(pinning.left)) &&
		(pinning.right === undefined || isStringArray(pinning.right))
	) {
		out.columnPinning = pinning;
	}
	if (
		isRecordOf(
			raw.columnSizing,
			(v) => typeof v === "number" && Number.isFinite(v) && (v as number) > 0,
		)
	) {
		out.columnSizing = raw.columnSizing;
	}
	if (isStringArray(raw.columnOrder)) {
		out.columnOrder = raw.columnOrder;
	}
	if (
		typeof raw.pageSize === "number" &&
		Number.isInteger(raw.pageSize) &&
		raw.pageSize > 0
	) {
		out.pageSize = raw.pageSize;
	}
	return out;
}

/** Reads the adapter and produces a state patch, composing `pageSize` into `pagination`. */
export function hydrateFromStorage(
	persist: PersistOptions | undefined,
	base: DataViewState,
): Partial<DataViewState> {
	if (!persist) return {};
	let raw: PersistedState | null = null;
	try {
		raw = persist.adapter.read();
	} catch {
		return {};
	}
	const stored = sanitizePersisted(raw);
	const include = persist.include ?? PERSISTABLE_KEYS;
	const patch: Partial<DataViewState> = {};
	if (include.includes("columnVisibility") && stored.columnVisibility) {
		patch.columnVisibility = stored.columnVisibility;
	}
	if (include.includes("columnPinning") && stored.columnPinning) {
		patch.columnPinning = {
			left: stored.columnPinning.left ?? [],
			right: stored.columnPinning.right ?? [],
		};
	}
	if (include.includes("columnSizing") && stored.columnSizing) {
		patch.columnSizing = stored.columnSizing;
	}
	if (include.includes("columnOrder") && stored.columnOrder) {
		patch.columnOrder = stored.columnOrder;
	}
	if (include.includes("pageSize") && stored.pageSize != null) {
		patch.pagination = { ...base.pagination, pageSize: stored.pageSize };
	}
	return patch;
}

/** Projects the persisted subset out of the live state, for writing. */
export function extractPersisted(
	state: DataViewState,
	include: PersistableKey[] = [...PERSISTABLE_KEYS],
): PersistedState {
	const out: PersistedState = {};
	if (include.includes("columnVisibility")) {
		out.columnVisibility = state.columnVisibility;
	}
	if (include.includes("columnPinning")) {
		out.columnPinning = state.columnPinning;
	}
	if (include.includes("columnSizing")) out.columnSizing = state.columnSizing;
	if (include.includes("columnOrder")) out.columnOrder = state.columnOrder;
	if (include.includes("pageSize")) out.pageSize = state.pagination.pageSize;
	return out;
}

/**
 * The built-in adapter: JSON under one localStorage key. Returns `null` reads on the server, for
 * a missing key, or for unparseable content. Bump the key (e.g. `"users-table.v2"`) when your
 * column set changes incompatibly.
 */
export function localStorageAdapter(key: string): StateStorageAdapter {
	return {
		read: () => {
			if (typeof window === "undefined") return null;
			const raw = window.localStorage.getItem(key);
			if (raw == null) return null;
			try {
				return JSON.parse(raw) as PersistedState;
			} catch {
				return null;
			}
		},
		write: (next) => {
			if (typeof window === "undefined") return;
			try {
				window.localStorage.setItem(key, JSON.stringify(next));
			} catch {
				// Quota exceeded or storage disabled: persisting preferences is best-effort.
			}
		},
		subscribe: (onChange) => {
			if (typeof window === "undefined") return () => {};
			const handler = (event: StorageEvent) => {
				if (event.key === key) onChange();
			};
			window.addEventListener("storage", handler);
			return () => window.removeEventListener("storage", handler);
		},
	};
}
