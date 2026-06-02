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
}

/** Merges the consumer's `urlSync` options with defaults, or returns `null` when sync is off. */
export function resolveUrlConfig(
	urlSync: UrlSyncOptions | undefined,
): ResolvedUrlConfig | null {
	if (!urlSync) return null;
	return {
		adapter: urlSync.adapter,
		serializer: { ...defaultUrlSerializer, ...urlSync.serialize },
		include: resolveInclude(urlSync.include),
	};
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
		});
	} catch {
		// An adapter that touches `window` on the server or first render must not crash this.
		return {};
	}
}

interface UseUrlSyncArgs {
	config: ResolvedUrlConfig | null;
	state: DataViewState;
	applyPatch: (patch: Partial<DataViewState>) => void;
	getFilterMeta: FilterMetaLookup;
}

export function useUrlSync({
	config,
	state,
	applyPatch,
	getFilterMeta,
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
			})
		: null;
	// `paramsKey` is the only trigger. Writes happen only when the managed params actually change,
	// no matter how often `config` or `params` are created again.
	const paramsKey = params ? JSON.stringify(params) : "";

	// biome-ignore lint/correctness/useExhaustiveDependencies: paramsKey is the intended trigger; params/config are read via closure/ref
	useEffect(() => {
		const cfg = configRef.current;
		if (!cfg || !params) return;
		const current = cfg.adapter.read();
		const preserved = stripManagedParams(current, cfg.serializer, cfg.include);
		cfg.adapter.write({ ...preserved, ...params }, { replace: true });
	}, [paramsKey]);

	// On back, forward, or any external navigation, read the URL again and apply it.
	useEffect(() => {
		if (!config) return;
		const { adapter, serializer, include } = config;
		return adapter.subscribe?.(() => {
			const patch = deserializeParams(adapter.read(), {
				serializer,
				include,
				getFilterMeta: getFilterMetaRef.current,
				current: stateRef.current,
			});
			applyPatchRef.current(patch);
		});
	}, [config]);
}
