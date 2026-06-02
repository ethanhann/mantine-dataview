// Subpath entry for @ethanhann/mantine-dataview/url.
// It exports windowHistoryAdapter and the serializer utilities.

import type { UrlStateAdapter } from "./types";

// Serializer utilities for consumers building custom adapters or param schemes.
export {
	defaultUrlSerializer,
	deserializeParams,
	resolveInclude,
	type SyncableKey,
	serializeState,
} from "./serializer";
export type { UrlSerializer, UrlStateAdapter } from "./types";

/** Default adapter built on the History API. It has no dependencies. */
export function windowHistoryAdapter(): UrlStateAdapter {
	return {
		read() {
			return Object.fromEntries(
				new URLSearchParams(window.location.search).entries(),
			);
		},
		write(next, opts) {
			const params = new URLSearchParams(next);
			const url = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
			if (opts?.replace) {
				window.history.replaceState(null, "", url);
			} else {
				window.history.pushState(null, "", url);
			}
		},
		subscribe(onChange) {
			window.addEventListener("popstate", onChange);
			return () => window.removeEventListener("popstate", onChange);
		},
	};
}
