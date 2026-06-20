// Core state shapes and the derived presentation status.
//
// The small shapes below are structurally identical to TanStack Table v8's PaginationState,
// SortingState, ColumnFiltersState, RowSelectionState, and VisibilityState. That lets
// `DataViewState` go straight into `useReactTable` without conversion. They are declared here
// rather than pulled in from the table core. That keeps the public surface easy to read and
// stable if the table core changes in a future major version.

/** The presentations that one core state instance can be projected into. */
export const VIEW_MODES = ["table", "cards"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

/** Runtime guard for a `ViewMode`, derived from the single `VIEW_MODES` source of truth. */
export function isViewMode(value: unknown): value is ViewMode {
	return (
		typeof value === "string" &&
		(VIEW_MODES as readonly string[]).includes(value)
	);
}

/** Raw fetch lifecycle reported by the consumer. */
export type Status = "idle" | "loading" | "success" | "error";

export interface DataViewPagination {
	pageIndex: number;
	pageSize: number;
}

export interface DataViewSort {
	id: string;
	desc: boolean;
}

export interface DataViewFilter {
	/** Column id the filter is keyed by. */
	id: string;
	/** Value shape depends on the column's filter variant. */
	value: unknown;
}

/**
 * The single source of truth for every feature. All affordances such as table headers, card
 * overlays, and toolbar controls are projections of this object, keyed by column id.
 */
/** Columns pinned to the left or right edge of the table. */
export interface DataViewColumnPinning {
	left?: string[];
	right?: string[];
}

export interface DataViewState {
	pagination: DataViewPagination;
	sorting: DataViewSort[];
	columnFilters: DataViewFilter[];
	globalFilter: string;
	/** Keyed by `getRowId`, so selection survives paging and refetches. */
	rowSelection: Record<string, boolean>;
	columnVisibility: Record<string, boolean>;
	columnPinning: DataViewColumnPinning;
	view: ViewMode;
}

/**
 * Derived renderer facing status as a discriminated union. Both presentations switch over it
 * exhaustively so the four states stay consistent across views. Those states are loading, empty,
 * filtered empty, and error. There are also idle and the populated `ready` state.
 */
export type DataViewStatus =
	| { phase: "idle" }
	| { phase: "loading" }
	| { phase: "ready" }
	| { phase: "empty" }
	| { phase: "empty-filtered" }
	| { phase: "error"; error: unknown };
