// URL serializer. It maps the syncable slices of `DataViewState` to and from a flat record of
// query params. The values here are logical strings that are not encoded. The `UrlStateAdapter`
// handles encoding and decoding on the wire, for example through `URLSearchParams`. That keeps
// this layer neutral about the transport.
//
// Example shape:
//   ?page=2&size=25&sort=name:asc,createdAt:desc&q=ada&view=cards&f.status=active,pending
//
// Selection and column visibility are intentionally left out of the URL. There is no canonical
// representation for them, and selection is ephemeral. Only the slices below participate.

import type { ColumnFilterMeta } from "../types/column";
import type { DataViewState, ViewMode } from "../types/state";
import type { UrlSerializer } from "./types";

export type SyncableKey =
	| "pagination"
	| "sorting"
	| "columnFilters"
	| "globalFilter"
	| "view";

export const SYNCABLE_KEYS: readonly SyncableKey[] = [
	"pagination",
	"sorting",
	"columnFilters",
	"globalFilter",
	"view",
];

type FilterMetaLookup = (id: string) => ColumnFilterMeta | undefined;

/** Default param names and a filter codec for each variant. Every field can be overridden. */
export const defaultUrlSerializer: UrlSerializer = {
	page: "page",
	size: "size",
	sort: "sort",
	search: "q",
	view: "view",
	filterPrefix: "f.",

	encodeFilter(_id, value, meta) {
		switch (meta?.variant) {
			case "multiselect":
				return Array.isArray(value) ? value.map(String).join(",") : "";
			case "numberRange":
			case "dateRange": {
				const [a, b] = Array.isArray(value) ? value : [];
				const left = a == null ? "" : encodeScalar(a);
				const right = b == null ? "" : encodeScalar(b);
				return left === "" && right === "" ? "" : `${left}..${right}`;
			}
			case "boolean":
				return value == null || value === "" ? "" : value ? "true" : "false";
			case "date":
				return value == null ? "" : encodeScalar(value);
			default:
				// text, select
				return value == null ? "" : String(value);
		}
	},

	decodeFilter(_id, raw, meta) {
		switch (meta?.variant) {
			case "multiselect":
				return raw === "" ? [] : raw.split(",");
			case "numberRange": {
				const [a, b] = raw.split("..");
				return [a ? Number(a) : null, b ? Number(b) : null];
			}
			case "dateRange": {
				const [a, b] = raw.split("..");
				return [a || null, b || null];
			}
			case "boolean":
				return raw === "true";
			default:
				// text, select, date (kept as an ISO string)
				return raw;
		}
	},
};

function encodeScalar(value: unknown): string {
	return value instanceof Date ? value.toISOString() : String(value);
}

/** Resolves the `include` option to the supported, syncable subset. The default is all of them. */
export function resolveInclude(
	include?: Array<keyof DataViewState>,
): SyncableKey[] {
	if (!include) return [...SYNCABLE_KEYS];
	return SYNCABLE_KEYS.filter((k) => include.includes(k));
}

function encodeSort(sorting: DataViewState["sorting"]): string {
	return sorting.map((s) => `${s.id}:${s.desc ? "desc" : "asc"}`).join(",");
}

function decodeSort(raw: string): DataViewState["sorting"] {
	if (raw === "") return [];
	const result: DataViewState["sorting"] = [];
	for (const token of raw.split(",")) {
		const [id, dir] = token.split(":");
		if (id) result.push({ id, desc: dir === "desc" });
	}
	return result;
}

function isViewMode(value: string): value is ViewMode {
	return value === "table" || value === "cards";
}

export interface SerializeContext {
	serializer: UrlSerializer;
	include: SyncableKey[];
	getFilterMeta?: FilterMetaLookup;
}

/**
 * Serializes the included slices to query params. Empty or default values are omitted to keep
 * the URL clean. The page is emitted only past the first page, counting from one. Empty search,
 * sort, and filter values drop out entirely.
 */
export function serializeState(
	state: DataViewState,
	{ serializer, include, getFilterMeta }: SerializeContext,
): Record<string, string> {
	const params: Record<string, string> = {};

	if (include.includes("pagination")) {
		if (state.pagination.pageIndex > 0) {
			params[serializer.page] = String(state.pagination.pageIndex + 1);
		}
		params[serializer.size] = String(state.pagination.pageSize);
	}
	if (include.includes("sorting")) {
		const sort = encodeSort(state.sorting);
		if (sort) params[serializer.sort] = sort;
	}
	if (include.includes("globalFilter") && state.globalFilter) {
		params[serializer.search] = state.globalFilter;
	}
	if (include.includes("view")) {
		params[serializer.view] = state.view;
	}
	if (include.includes("columnFilters")) {
		for (const { id, value } of state.columnFilters) {
			const encoded = serializer.encodeFilter(id, value, getFilterMeta?.(id));
			if (encoded !== "") params[`${serializer.filterPrefix}${id}`] = encoded;
		}
	}
	return params;
}

export interface DeserializeContext extends SerializeContext {
	/** Fallback for slices not present in the URL (defaults on hydrate, current on popstate). */
	current: DataViewState;
}

/**
 * Parses query params into a state patch. The URL is authoritative for every included slice. An
 * absent sort, search, or filter means none, and an absent page means the first page.
 */
export function deserializeParams(
	params: Record<string, string>,
	{ serializer, include, getFilterMeta, current }: DeserializeContext,
): Partial<DataViewState> {
	const patch: Partial<DataViewState> = {};

	if (include.includes("pagination")) {
		const rawPage = params[serializer.page];
		const rawSize = params[serializer.size];
		const pageNumber = rawPage ? Number(rawPage) : 1;
		const pageIndex = Number.isFinite(pageNumber)
			? Math.max(0, Math.trunc(pageNumber) - 1)
			: 0;
		const pageSize =
			rawSize && Number.isFinite(Number(rawSize))
				? Number(rawSize)
				: current.pagination.pageSize;
		patch.pagination = { pageIndex, pageSize };
	}
	if (include.includes("sorting")) {
		patch.sorting = decodeSort(params[serializer.sort] ?? "");
	}
	if (include.includes("globalFilter")) {
		patch.globalFilter = params[serializer.search] ?? "";
	}
	if (include.includes("view")) {
		const rawView = params[serializer.view];
		patch.view = rawView && isViewMode(rawView) ? rawView : current.view;
	}
	if (include.includes("columnFilters")) {
		const filters: DataViewState["columnFilters"] = [];
		for (const [key, raw] of Object.entries(params)) {
			if (!key.startsWith(serializer.filterPrefix)) continue;
			const id = key.slice(serializer.filterPrefix.length);
			filters.push({
				id,
				value: serializer.decodeFilter(id, raw, getFilterMeta?.(id)),
			});
		}
		patch.columnFilters = filters;
	}
	return patch;
}

/** Remove the params this serializer manages (for the included slices), preserving the rest. */
export function stripManagedParams(
	params: Record<string, string>,
	serializer: UrlSerializer,
	include: SyncableKey[],
): Record<string, string> {
	const managed = new Set<string>();
	if (include.includes("pagination")) {
		managed.add(serializer.page);
		managed.add(serializer.size);
	}
	if (include.includes("sorting")) managed.add(serializer.sort);
	if (include.includes("globalFilter")) managed.add(serializer.search);
	if (include.includes("view")) managed.add(serializer.view);

	const stripFilters = include.includes("columnFilters");
	const result: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		if (managed.has(key)) continue;
		if (stripFilters && key.startsWith(serializer.filterPrefix)) continue;
		result[key] = value;
	}
	return result;
}
