// Server data contract that is agnostic about the backend.
//
// The library defines the shape of what it needs, never how to obtain it. The consumer maps
// `DataViewRequest` onto their transport, whether that is offset and limit, a cursor, or GraphQL
// variables. They then map the result back into a `DataViewResponse`.

import type { DataViewFilter, DataViewPagination, DataViewSort } from "./state";

/** Emitted by the core whenever view state changes. The consumer turns it into a fetch. */
export interface DataViewRequest {
	pagination: DataViewPagination;
	sorting: DataViewSort[];
	/** Filters keyed by column. The `value` shape depends on the filter variant. */
	filters: DataViewFilter[];
	globalFilter: string;
}

/** What the consumer feeds back in for the current page. */
export interface DataViewResponse<TData> {
	rows: TData[];
	/** Total rows across all pages, used for page math. */
	rowCount: number;
}
