// URL state contracts. These are agnostic about the router, and the library imports no router.

import type { ColumnFilterMeta } from "../types/column";

export interface UrlStateAdapter {
	/**
	 * Current query params as a flat record. This is a single-value-per-key model: an adapter that
	 * sees a repeated key (`?a=1&a=2`) must collapse it to one value, and repeated keys are not
	 * preserved across a write.
	 */
	read(): Record<string, string>;
	/** Write the next params. The `replace` flag chooses between a new history entry and a push. */
	write(next: Record<string, string>, opts?: { replace?: boolean }): void;
	/** Optional. Notifies on external navigation such as back or forward. Returns a cleanup. */
	subscribe?(onChange: () => void): () => void;
}

export interface UrlSerializer {
	page: string;
	size: string;
	sort: string;
	search: string;
	view: string;
	/** Prefix for column filters. For example `f.` produces `f.<columnId>=<encoded>`. */
	filterPrefix: string;
	/** The column's filter meta, its variant and options, selects the codec. */
	encodeFilter(
		columnId: string,
		value: unknown,
		meta?: ColumnFilterMeta,
	): string;
	decodeFilter(columnId: string, raw: string, meta?: ColumnFilterMeta): unknown;
}
