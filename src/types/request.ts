// Server data contract that is agnostic about the backend.
//
// The library defines the shape of what it needs, never how to obtain it. The consumer maps
// `DataViewRequest` onto their transport, whether that is offset and limit or GraphQL variables.
// They then map the result back into a `DataViewResponse`. Pagination is index-based, and a
// cursor-paged backend cannot be mapped statelessly onto `pageIndex`/`pageSize` today. A cursor
// slice on this contract is planned (see data/roadmap-decisions.md).

import type { FilterVariant } from "./column";
import type { FacetData } from "./facets";
import type {
	DataViewFilter,
	DataViewPagination,
	DataViewSort,
	DataViewWindow,
} from "./state";

export interface DataViewRequestFilter extends DataViewFilter {
	variant?: FilterVariant;
}

/** Allowed value types for external filter parameters. */
export type FilterParam =
	| string
	| number
	| boolean
	| null
	| undefined
	| Date
	| string[]
	| number[]
	| Array<string | number>;

/** Emitted by the core whenever view state changes. The consumer turns it into a fetch. */
export interface DataViewRequest {
	pagination: DataViewPagination;
	sorting: DataViewSort[];
	/** Filters keyed by column, enriched with the column's declared filter variant. */
	filters: DataViewRequestFilter[];
	globalFilter: string;
	/** External parameters passed through from the consumer. A value of `undefined` means "omit". */
	params: Record<string, FilterParam>;
	/**
	 * Visible date range when projecting into a schedule view. Absent for table/cards, so existing
	 * fetchers are unaffected. The consumer maps this onto their backend the same way they map
	 * pagination — it is the schedule equivalent of "which page".
	 */
	window?: DataViewWindow;
}

/** What the consumer feeds back in for the current page. */
export interface DataViewResponse<TData> {
	rows: TData[];
	/** Total rows across all pages, used for page math. */
	rowCount: number;
	/** Optional facet aggregation data, keyed by column ID. */
	facets?: Record<string, FacetData>;
	/**
	 * Optional server-computed aggregates (sums, averages, counts) keyed by column ID. Raw values,
	 * formatted for display by the column's `dataType` like any cell. The table renders them as a
	 * footer row and the card grid as a summary block.
	 */
	summary?: Record<string, unknown>;
}
