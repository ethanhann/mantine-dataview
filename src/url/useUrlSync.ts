// The loop between the URL and state. Hydration runs synchronously in the state initializer of
// `useDataView`, so the first request already reflects the URL. This hook owns the rest. It
// writes on every change and subscribes to back and forward navigation.

import { useEffect, useRef } from "react";
import type { ColumnFilterMeta } from "../types/column";
import type { UrlSyncOptions } from "../types/options";
import type { DataViewState } from "../types/state";
import {
	defaultUrlSerializer,
	deserializeParams,
	resolveInclude,
	type SyncableKey,
	serializeState,
	stripManagedParams,
} from "./serializer";
import type { UrlSerializer, UrlStateAdapter } from "./types";

type FilterMetaLookup = (id: string) => ColumnFilterMeta | undefined;

export interface ResolvedUrlConfig {
	adapter: UrlStateAdapter;
	serializer: UrlSerializer;
	include: SyncableKey[];
	replace: boolean;
}

/** Merges the consumer's `urlSync` options with defaults, or returns `null` when sync is off. */
export function resolveUrlConfig(
	urlSync: UrlSyncOptions | undefined,
): ResolvedUrlConfig | null {
	if (!urlSync) return null;
	const serializer = { ...defaultUrlSerializer, ...urlSync.serialize };
	validateSerializer(serializer);
	return {
		adapter: urlSync.adapter,
		serializer,
		include: resolveInclude(urlSync.include),
		replace: urlSync.historyMode !== "push",
	};
}

/** Guards against a serializer whose param names collide or whose filter prefix is empty. */
function validateSerializer(serializer: UrlSerializer): void {
	if (!serializer.filterPrefix) {
		throw new Error(
			"[mantine-dataview] urlSync.serialize.filterPrefix must be a non-empty string.",
		);
	}
	const names = [
		serializer.page,
		serializer.size,
		serializer.sort,
		serializer.search,
		serializer.view,
	];
	if (new Set(names).size !== names.length) {
		throw new Error(
			`[mantine-dataview] urlSync param names must be distinct, got: ${names.join(", ")}.`,
		);
	}
}

/** Reads the URL once and produces the initial state patch. It is safe to call during render. */
export function hydrateFromUrl(
	config: ResolvedUrlConfig | null,
	current: DataViewState,
	getFilterMeta: FilterMetaLookup,
): Partial<DataViewState> {
	if (!config) return {};
	try {
		return deserializeParams(config.adapter.read(), {
			serializer: config.serializer,
			include: config.include,
			getFilterMeta,
			current,
			defaultPageSize: current.pagination.pageSize,
		});
	} catch (err) {
		// An adapter that touches `window` on the server or first render must not crash this. SSR
		// (no `window`) is expected and silent; surface anything else in development so real codec or
		// adapter bugs aren't swallowed.
		if (
			!(err instanceof ReferenceError) &&
			typeof process !== "undefined" &&
			process.env.NODE_ENV !== "production"
		) {
			console.warn("[mantine-dataview] failed to hydrate state from URL", err);
		}
		return {};
	}
}

interface UseUrlSyncArgs {
	config: ResolvedUrlConfig | null;
	state: DataViewState;
	applyPatch: (patch: Partial<DataViewState>) => void;
	getFilterMeta: FilterMetaLookup;
	/** The default page size, so an untouched size is omitted from the URL. */
	defaultPageSize: number;
}

export function useUrlSync({
	config,
	state,
	applyPatch,
	getFilterMeta,
	defaultPageSize,
}: UseUrlSyncArgs): void {
	// Keep the latest closures in refs so the effects do not bind again on every render. This
	// matters because a consumer may pass a freshly built adapter or urlSync object each render.
	const stateRef = useRef(state);
	stateRef.current = state;
	const applyPatchRef = useRef(applyPatch);
	applyPatchRef.current = applyPatch;
	const getFilterMetaRef = useRef(getFilterMeta);
	getFilterMetaRef.current = getFilterMeta;
	const configRef = useRef(config);
	configRef.current = config;

	// Write managed params on change. Merge them over any unrelated params already in the URL and
	// drop managed params that no longer apply, such as a cleared filter. The `replace` flag keeps
	// the history clean, and back and forward still restore entries created by real navigation.
	const params = config
		? serializeState(state, {
				serializer: config.serializer,
				include: config.include,
				getFilterMeta,
				defaultPageSize,
			})
		: null;
	// `paramsKey` is the only trigger. Writes happen only when the managed params actually change,
	// no matter how often `config` or `params` are created again. Sort the entries so a different
	// insertion order (e.g. reordered column filters) with the same logical params doesn't churn.
	const paramsKey = params ? stableParamsKey(params) : "";

	// biome-ignore lint/correctness/useExhaustiveDependencies: paramsKey is the intended trigger; params/config are read via closure/ref
	useEffect(() => {
		const cfg = configRef.current;
		if (!cfg || !params) return;
		const current = cfg.adapter.read();
		const preserved = stripManagedParams(current, cfg.serializer, cfg.include);
		const next = { ...preserved, ...params };
		// Skip the write when the URL already encodes this state. Without this, a back/forward
		// navigation that applies a patch would trigger a write that rewrites the current history
		// entry — corrupting it whenever serialization isn't a perfect inverse of the read.
		if (sameParams(current, next)) return;
		cfg.adapter.write(next, { replace: cfg.replace });
	}, [paramsKey]);

	// On back, forward, or any external navigation, read the URL again and apply it. Subscribe only
	// when sync toggles on/off and read the adapter through `configRef`, so a consumer passing a
	// freshly built adapter/urlSync object each render does not tear down and re-add the listener
	// every render (which would drop any navigation firing in the gap).
	const enabled = config != null;
	useEffect(() => {
		if (!enabled) return;
		const cfg = configRef.current;
		if (!cfg) return;
		return cfg.adapter.subscribe?.(() => {
			const live = configRef.current;
			if (!live) return;
			const patch = deserializeParams(live.adapter.read(), {
				serializer: live.serializer,
				include: live.include,
				getFilterMeta: getFilterMetaRef.current,
				current: stateRef.current,
			});
			applyPatchRef.current(patch);
		});
	}, [enabled]);
}

/** Order-independent key for a flat param map, so logically-equal params produce one key. */
function stableParamsKey(params: Record<string, string>): string {
	return JSON.stringify(
		Object.entries(params).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
	);
}

/** Shallow equality for the flat param maps produced by the serializer. */
function sameParams(
	a: Record<string, string>,
	b: Record<string, string>,
): boolean {
	const aKeys = Object.keys(a);
	const bKeys = Object.keys(b);
	if (aKeys.length !== bKeys.length) return false;
	for (const key of aKeys) {
		if (a[key] !== b[key]) return false;
	}
	return true;
}
