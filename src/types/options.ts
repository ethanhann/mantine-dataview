// Public hook surface. These are the `useDataView` options and its return value.

import type { MantineBreakpoint } from "@mantine/core";
import type { Column, Table } from "@tanstack/react-table";
import type { ExportCsvOptions } from "../core/exportCsv";
// Import URL *types* from the types module (not the `../url` barrel) so a type-only consumer of
// these options never drags the runtime adapter code into its module graph.
import type { UrlSerializer, UrlStateAdapter } from "../url/types";
import type {
	ColumnDataType,
	ColumnFormatOption,
	DataColumnDef,
} from "./column";
import type { FacetData } from "./facets";
import type { DataViewRequest, FilterParam } from "./request";
import type { DataViewState, DataViewStatus, Status, ViewMode } from "./state";

/** Force cards at or below a Mantine breakpoint. Cards are the preferred view on small screens. */
export interface ResponsiveOptions {
	forceCardsBelow?: MantineBreakpoint;
	lockSwitcherOnMobile?: boolean;
}

/** URL state sync that is agnostic about the router. */
export interface UrlSyncOptions {
	adapter: UrlStateAdapter;
	/** Override param names or codecs. */
	serialize?: Partial<UrlSerializer>;
	/** Which slices of state to sync. The default is all of them. */
	include?: Array<keyof DataViewState>;
	/**
	 * How managed writes affect browser history. `"replace"` (default) keeps a clean history so the
	 * back button never replays individual filter/sort/page changes; `"push"` creates a new entry
	 * per change so back/forward steps through them.
	 */
	historyMode?: "replace" | "push";
}

/**
 * Debounce in milliseconds for request emission on filter and search changes. A single number
 * applies to both. An object sets a separate timing for each field.
 */
export type DebounceOptions =
	| number
	| { globalFilter?: number; columnFilters?: number };

export interface UseDataViewOptions<TData> {
	columns: DataColumnDef<TData>[];

	// Data for the current page, supplied by the server. The core is controlled.
	rows: TData[];
	/** Total rows across all pages, for page math. */
	rowCount: number;
	status: Status;
	error?: unknown;

	/**
	 * Stable identity. It is required for selection that survives paging. It is wrapped in
	 * `NoInfer` so `TData` is pinned by `rows` and `columns`, not by this callback.
	 */
	getRowId: (row: NoInfer<TData>) => string;

	/** Fired whenever view state changes. Turn it into a fetch and feed `rows` back in. */
	onRequestChange?: (request: DataViewRequest) => void;

	// Initial state and escape hatches for fully controlled state.
	initialState?: Partial<DataViewState>;
	state?: Partial<DataViewState>;
	onStateChange?: (state: DataViewState) => void;

	// Behavior.
	/** Default `'table'`. */
	defaultView?: ViewMode;
	/** Default `[10, 25, 50, 100]`. */
	pageSizeOptions?: number[];
	enableRowSelection?: boolean | ((row: NoInfer<TData>) => boolean);
	enableGlobalFilter?: boolean;
	debounce?: DebounceOptions;

	responsive?: ResponsiveOptions;
	urlSync?: UrlSyncOptions;
	/** Table-level format defaults keyed by data type. Column-level `format` overrides these. */
	formatDefaults?: Partial<Record<ColumnDataType, ColumnFormatOption>>;
	/** Facet aggregation data from the server, keyed by column ID. */
	facets?: Record<string, FacetData>;
	/** External parameters included in every request. Changes trigger a refetch and reset pagination. */
	params?: Record<string, FilterParam>;
}

/** Current selection, derived from `rowSelection` keyed by `getRowId`. */
export interface DataViewSelection<TData> {
	count: number;
	/** Ids of every selected row across all pages. This is the stable basis for bulk actions. */
	ids: string[];
	/**
	 * Selected rows that are materialized on the current page. The core holds no data for other
	 * pages, so this can be a strict subset of `ids`/`count` — iterate `ids` (not `pageRows`) for a
	 * bulk action that must cover every selected row.
	 */
	pageRows: TData[];
	/**
	 * @deprecated Renamed to `pageRows` to make the page-only scope explicit. This alias holds the
	 * same value and will be removed in a future major release.
	 */
	rows: TData[];
	clear: () => void;
}

export interface UseDataViewReturn<TData> {
	/** The underlying v8 instance, offered as an escape hatch. */
	table: Table<TData>;
	/** Current normalized request. */
	request: DataViewRequest;
	state: DataViewState;
	view: ViewMode;
	setView: (v: ViewMode) => void;
	/** True when the responsive rule forces cards. */
	isMobileForced: boolean;
	// The echoed inputs plus a derived render status let presentations stay thin projections.
	status: Status;
	error: unknown;
	/** Renderer facing state. One of loading, empty, filtered empty, error, or ready. */
	renderStatus: DataViewStatus;
	/** Emit the current request again. The error state retry uses this. */
	refetch: () => void;
	/** Resolved page size choices for the pager. The default is `[10, 25, 50, 100]`. */
	pageSizeOptions: number[];
	// Derived helpers used by the toolbar and presentations.
	sortableColumns: Column<TData>[];
	filterableColumns: Column<TData>[];
	selection: DataViewSelection<TData>;
	/** Export visible columns and current page rows as a CSV file download. */
	exportCsv: (options?: ExportCsvOptions) => void;
	/** Latest facet data from the server response, keyed by column ID. */
	facets: Record<string, FacetData>;
	/** Clear the filter on a single column by ID. */
	resetFilter: (columnId: string) => void;
	/** Clear all column filters. */
	resetAllFilters: () => void;

	// Optimistic reconciliation primitives. These allow a sibling library (e.g. a detail panel)
	// to apply in-place mutations for instant UX, with a background revalidate for correctness.

	/**
	 * Replace an existing row in the current page by identity (`getRowId`). If the row is not on
	 * the current page, this is a no-op. A background revalidate follows to reconcile sort
	 * position, filter membership, and facet counts with server truth.
	 */
	patchRow: (record: TData) => void;
	/**
	 * Optimistically insert a newly-created row at the top of the current page. `rowCount` is
	 * incremented. A background revalidate follows to reconcile membership and position.
	 */
	insertRow: (record: TData) => void;
	/**
	 * Optimistically remove a row by ID from the current page. `rowCount` is decremented and
	 * selection for that ID is cleared. A background revalidate follows.
	 */
	removeRow: (id: string) => void;
	/**
	 * True while a background revalidation fetch is in flight after an optimistic mutation.
	 * The UI can show a subtle sync indicator without replacing content with skeletons.
	 */
	isRevalidating: boolean;
}
