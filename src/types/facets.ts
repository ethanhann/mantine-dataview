/** A single value with its count in a value facet. */
export interface ValueFacetEntry {
	value: string;
	label?: string;
	count: number;
}

/** Discrete values with counts. Used for select, multiselect, and boolean filters. */
export interface ValueFacet {
	type: "values";
	values: ValueFacetEntry[];
}

/** A single range bucket in a range facet. */
export interface RangeFacetEntry {
	label: string;
	from: number | string;
	to: number | string;
	count: number;
}

/** Bucketed numeric or date ranges with counts. Used for numberRange and dateRange filters. */
export interface RangeFacet {
	type: "ranges";
	/**
	 * Whether the bounds are numbers or ISO date strings. Lets consumers interpret `from`/`to`/`min`/
	 * `max` without guessing. Optional for back-compat; defaults to numeric handling when omitted.
	 */
	kind?: "number" | "date";
	ranges: RangeFacetEntry[];
	min?: number | string;
	max?: number | string;
}

/** Facet aggregation data for a single column. */
export type FacetData = ValueFacet | RangeFacet;
