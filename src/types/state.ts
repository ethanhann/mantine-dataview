// Core state shapes and the derived presentation status.
//
// The small shapes below are structurally identical to TanStack Table v8's PaginationState,
// SortingState, ColumnFiltersState, RowSelectionState, and VisibilityState. That lets
// `DataViewState` go straight into `useReactTable` without conversion. They are declared here
// rather than pulled in from the table core. That keeps the public surface easy to read and
// stable if the table core changes in a future major version.

/**
 * Always-available presentations. These are the views the core renders without any opt-in.
 * Additional views (e.g. `"schedule"`) are registered by the consumer through a separate entry
 * point and are valid `ViewMode` strings, but they are not part of this built-in set.
 */
export const VIEW_MODES = ["table", "cards"] as const;

/**
 * Views that fetch by a date `window` instead of a page. While one is active the pager is suppressed
 * and the sort/column controls are hidden. All ship from the optional
 * `@ethanhann/mantine-dataview/schedule` subpath; naming them here is bare string literals and pulls
 * in no scheduler dependency.
 */
export const WINDOWED_VIEWS = ["schedule", "agenda", "resources"] as const;

/**
 * A presentation a core state instance can project into: the built-ins plus the opt-in schedule
 * family ({@link WINDOWED_VIEWS}).
 */
export type ViewMode =
	| (typeof VIEW_MODES)[number]
	| (typeof WINDOWED_VIEWS)[number];

/**
 * Runtime guard for a *built-in* `ViewMode`. The schedule-family views are intentionally excluded:
 * they are only selectable once the consumer registers them, so an external string (e.g. a stale
 * `?view=schedule` URL) should not hydrate as a view the host app never opted into.
 */
export function isViewMode(
	value: unknown,
): value is (typeof VIEW_MODES)[number] {
	return (
		typeof value === "string" &&
		(VIEW_MODES as readonly string[]).includes(value)
	);
}

/** True for a view that fetches by date window (the schedule family) rather than by page. */
export function isWindowedView(value: ViewMode): boolean {
	return (WINDOWED_VIEWS as readonly string[]).includes(value);
}

/** Every known view id, including the opt-in schedule family. Used to validate a view from the URL. */
export const KNOWN_VIEW_MODES = [...VIEW_MODES, ...WINDOWED_VIEWS] as const;

/**
 * Guard for any known `ViewMode`, including the schedule family. Unlike {@link isViewMode}, this
 * accepts the opt-in ids so a `?view=schedule` (or `agenda`/`resources`) URL can be restored; an
 * unregistered such view then degrades to the table in `DataViewer`'s body rather than erroring.
 */
export function isKnownViewMode(value: unknown): value is ViewMode {
	return (
		typeof value === "string" &&
		(KNOWN_VIEW_MODES as readonly string[]).includes(value)
	);
}

/** Calendar zoom level for the schedule presentation. */
export type ScheduleLevel = "day" | "week" | "month" | "year";

/**
 * The visible date range a schedule presentation fetches. Present on state and request only while
 * a schedule view is active; table and cards never set it.
 */
export interface DataViewWindow {
	/** Inclusive start of the visible range, as an ISO string. */
	start: string;
	/** Exclusive end of the visible range, as an ISO string. */
	end: string;
	level: ScheduleLevel;
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
	/** Visible date range. Set only while a schedule presentation is mounted; otherwise absent. */
	window?: DataViewWindow;
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
