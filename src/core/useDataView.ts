// The headless core. It owns all feature state and wraps TanStack Table v8 with every `manual*`
// flag turned on. It emits a normalized `DataViewRequest` whenever the state the server cares
// about changes. The presentations and the toolbar are pure projections of what it returns.

import {
	type ColumnFiltersState,
	type ColumnPinningState,
	functionalUpdate,
	getCoreRowModel,
	type OnChangeFn,
	type PaginationState,
	type RowSelectionState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnFilterMeta, DataColumnDef } from "../types/column";
import type {
	DebounceOptions,
	UseDataViewOptions,
	UseDataViewReturn,
} from "../types/options";
import type { DataViewRequest } from "../types/request";
import type { DataViewState, ViewMode } from "../types/state";
import {
	hydrateFromUrl,
	resolveUrlConfig,
	useUrlSync,
} from "../url/useUrlSync";
import { exportCsv as exportCsvFn } from "./exportCsv";
import { resolveFormatter } from "./formatValue";
import { resolveDataViewStatus } from "./resolveStatus";
import { useForceCards } from "./useForceCards";

/** Default debounce in milliseconds for each field when emitting filter and search requests. */
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

interface ResolvedDebounce {
	globalFilter: number;
	columnFilters: number;
}

function resolveDebounce(
	debounce: DebounceOptions | undefined,
): ResolvedDebounce {
	if (debounce == null) {
		return {
			globalFilter: DEFAULT_DEBOUNCE_MS,
			columnFilters: DEFAULT_DEBOUNCE_MS,
		};
	}
	if (typeof debounce === "number") {
		return { globalFilter: debounce, columnFilters: debounce };
	}
	return {
		globalFilter: debounce.globalFilter ?? DEFAULT_DEBOUNCE_MS,
		columnFilters: debounce.columnFilters ?? DEFAULT_DEBOUNCE_MS,
	};
}

function resolveColumnId<TData>(col: DataColumnDef<TData>): string | undefined {
	if (col.id) return col.id;
	if ("accessorKey" in col && col.accessorKey != null) {
		return String(col.accessorKey);
	}
	return undefined;
}

/** Maps a column id to its filter meta so the URL serializer can pick the codec for each variant. */
function buildFilterMetaLookup<TData>(
	columns: DataColumnDef<TData>[],
): (id: string) => ColumnFilterMeta | undefined {
	const map = new Map<string, ColumnFilterMeta>();
	for (const col of columns) {
		const id = resolveColumnId(col);
		const filter = col.meta?.filter;
		if (id && filter) {
			if (
				map.has(id) &&
				typeof process !== "undefined" &&
				process.env.NODE_ENV !== "production"
			) {
				console.warn(
					`[mantine-dataview] duplicate column id "${id}"; its filter meta will shadow the earlier one.`,
				);
			}
			map.set(id, filter);
		}
	}
	return (id) => map.get(id);
}

/** The configured page-size choices, falling back to defaults when none (or an empty list) is given. */
function resolvePageSizeOptions<TData>(
	options: UseDataViewOptions<TData>,
): number[] {
	return options.pageSizeOptions?.length
		? options.pageSizeOptions
		: DEFAULT_PAGE_SIZES;
}

function buildDefaultState<TData>(
	options: UseDataViewOptions<TData>,
): DataViewState {
	const pageSize = resolvePageSizeOptions(options)[0] ?? DEFAULT_PAGE_SIZE;
	return {
		pagination: { pageIndex: 0, pageSize },
		sorting: [],
		columnFilters: [],
		globalFilter: "",
		rowSelection: {},
		columnVisibility: {},
		columnPinning: { left: [], right: [] },
		view: options.defaultView ?? "table",
		...options.initialState,
	};
}

export function useDataView<TData>(
	options: UseDataViewOptions<TData>,
): UseDataViewReturn<TData> {
	const {
		columns: rawColumns,
		rows,
		rowCount,
		status,
		error,
		getRowId,
		onRequestChange,
		state: controlledState,
		onStateChange,
		enableRowSelection,
		enableGlobalFilter = true,
		debounce,
		responsive,
		formatDefaults,
		facets: facetsInput,
		params: paramsInput,
	} = options;

	const facets = facetsInput ?? {};
	const paramsKey = paramsInput ? JSON.stringify(paramsInput) : "";
	const params = paramsInput ?? {};

	const columns = useMemo(
		() =>
			rawColumns.map((col) => {
				const dataType = col.meta?.dataType;
				if (!dataType || col.cell) return col;
				const formatter = resolveFormatter(
					dataType,
					col.meta?.format,
					formatDefaults,
				);
				return {
					...col,
					cell: (ctx: { getValue: () => unknown }) => formatter(ctx.getValue()),
				};
			}),
		[rawColumns, formatDefaults],
	);

	// URL sync setup. Both pieces must exist before the state initializer runs. That way the
	// first render already reflects the URL, and so does the first request it emits.
	const getFilterMeta = useMemo(
		() => buildFilterMetaLookup(columns),
		[columns],
	);
	const urlConfig = useMemo(
		() => resolveUrlConfig(options.urlSync),
		[options.urlSync],
	);

	// State ownership. The hook keeps internal state that controlled slices can override. On the
	// first render it also hydrates that state from the URL when sync is enabled.
	const [internalState, setInternalState] = useState<DataViewState>(() => {
		const base = buildDefaultState(options);
		return { ...base, ...hydrateFromUrl(urlConfig, base, getFilterMeta) };
	});

	const resolvedState = useMemo<DataViewState>(
		() => ({ ...internalState, ...controlledState }),
		[internalState, controlledState],
	);

	// A patch updates internal state and notifies the controlled consumer with the next full
	// state. `resolvedStateRef` keeps the latest snapshot for the change handlers.
	const resolvedStateRef = useRef(resolvedState);
	resolvedStateRef.current = resolvedState;

	// Track the internal and controlled slices separately in refs that update synchronously, so
	// several `applyPatch` calls batched in one tick each notify with a progressively-correct
	// snapshot instead of all reading the same pre-batch value.
	const internalStateRef = useRef(internalState);
	internalStateRef.current = internalState;
	const controlledStateRef = useRef(controlledState);
	controlledStateRef.current = controlledState;

	const applyPatch = useCallback(
		(patch: Partial<DataViewState>) => {
			const nextInternal = { ...internalStateRef.current, ...patch };
			internalStateRef.current = nextInternal;
			setInternalState(nextInternal);
			// Controlled slices always win over internal ones, so the emitted snapshot mirrors how
			// `resolvedState` is composed.
			onStateChange?.({ ...nextInternal, ...controlledStateRef.current });
		},
		[onStateChange],
	);

	// Ongoing URL writes plus the back and forward subscription. Hydration already happened above.
	useUrlSync({
		config: urlConfig,
		state: resolvedState,
		applyPatch,
		getFilterMeta,
		defaultPageSize: resolvePageSizeOptions(options)[0] ?? DEFAULT_PAGE_SIZE,
	});

	// Changing what the server sees (sort, filter, or search) resets to the first page. This
	// keeps a filtered result set from stranding the user on a page that is now empty.
	const resetPagination = useCallback(
		(): PaginationState => ({
			...resolvedStateRef.current.pagination,
			pageIndex: 0,
		}),
		[],
	);

	const prevParamsKeyRef = useRef(paramsKey);
	// biome-ignore lint/correctness/useExhaustiveDependencies: applyPatch/resetPagination are stable; the ref guard skips the mount run
	useEffect(() => {
		if (prevParamsKeyRef.current === paramsKey) return;
		prevParamsKeyRef.current = paramsKey;
		applyPatch({ pagination: resetPagination() });
	}, [paramsKey]);

	const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
		(updater) => {
			applyPatch({
				pagination: functionalUpdate(
					updater,
					resolvedStateRef.current.pagination,
				),
			});
		},
		[applyPatch],
	);

	const onSortingChange = useCallback<OnChangeFn<SortingState>>(
		(updater) => {
			applyPatch({
				sorting: functionalUpdate(updater, resolvedStateRef.current.sorting),
				pagination: resetPagination(),
			});
		},
		[applyPatch, resetPagination],
	);

	const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
		(updater) => {
			applyPatch({
				columnFilters: functionalUpdate(
					updater,
					resolvedStateRef.current.columnFilters,
				),
				pagination: resetPagination(),
			});
		},
		[applyPatch, resetPagination],
	);

	const onGlobalFilterChange = useCallback<OnChangeFn<string>>(
		(updater) => {
			applyPatch({
				globalFilter: functionalUpdate(
					updater,
					resolvedStateRef.current.globalFilter,
				),
				pagination: resetPagination(),
			});
		},
		[applyPatch, resetPagination],
	);

	const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
		(updater) => {
			applyPatch({
				rowSelection: functionalUpdate(
					updater,
					resolvedStateRef.current.rowSelection,
				),
			});
		},
		[applyPatch],
	);

	const onColumnVisibilityChange = useCallback<OnChangeFn<VisibilityState>>(
		(updater) => {
			applyPatch({
				columnVisibility: functionalUpdate(
					updater,
					resolvedStateRef.current.columnVisibility,
				),
			});
		},
		[applyPatch],
	);

	const onColumnPinningChange = useCallback<OnChangeFn<ColumnPinningState>>(
		(updater) => {
			applyPatch({
				columnPinning: functionalUpdate(
					updater,
					resolvedStateRef.current.columnPinning,
				),
			});
		},
		[applyPatch],
	);

	const isMobileForced = useForceCards(responsive);
	const view: ViewMode = isMobileForced ? "cards" : resolvedState.view;

	const table = useReactTable<TData>({
		data: rows,
		meta: { viewMode: view },
		columns,
		getCoreRowModel: getCoreRowModel(),
		// The server owns sorting, filtering, and pagination. The core never processes data.
		manualPagination: true,
		manualSorting: true,
		manualFiltering: true,
		autoResetPageIndex: false,
		rowCount,
		getRowId: (originalRow) => getRowId(originalRow),
		enableRowSelection:
			typeof enableRowSelection === "function"
				? (row) => enableRowSelection(row.original)
				: (enableRowSelection ?? true),
		enableGlobalFilter,
		state: {
			pagination: resolvedState.pagination,
			sorting: resolvedState.sorting,
			columnFilters: resolvedState.columnFilters,
			globalFilter: resolvedState.globalFilter,
			rowSelection: resolvedState.rowSelection,
			columnVisibility: resolvedState.columnVisibility,
			columnPinning: resolvedState.columnPinning,
		},
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange,
		onGlobalFilterChange,
		onRowSelectionChange,
		onColumnVisibilityChange,
		onColumnPinningChange,
	});

	// The normalized request holds only the slices the server cares about. View, selection, and
	// column visibility deliberately stay out of it, so toggling them never triggers a refetch.
	// biome-ignore lint/correctness/useExhaustiveDependencies: params is stable when paramsKey is stable
	const request = useMemo<DataViewRequest>(
		() => ({
			pagination: resolvedState.pagination,
			sorting: resolvedState.sorting,
			filters: resolvedState.columnFilters,
			globalFilter: resolvedState.globalFilter,
			params,
		}),
		[
			resolvedState.pagination,
			resolvedState.sorting,
			resolvedState.columnFilters,
			resolvedState.globalFilter,
			paramsKey,
		],
	);

	// Emit `onRequestChange` immediately for pagination, sorting, and the initial mount. Search
	// and filter changes are debounced instead. Reference equality on the memoized slices tells
	// us which part changed without serializing values.
	const onRequestChangeRef = useRef(onRequestChange);
	onRequestChangeRef.current = onRequestChange;
	const debounceRef = useRef<ResolvedDebounce>(resolveDebounce(debounce));
	debounceRef.current = resolveDebounce(debounce);
	// The request from the previous render that changed it. Comparing against this (rather than the
	// last *emitted* request) is what lets a pagination/sort change emit immediately even while a
	// search/filter debounce is still pending.
	const prevRequestRef = useRef<DataViewRequest | null>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => {
		const prev = prevRequestRef.current;
		const isFirst = prev === null;
		const searchChanged = !!prev && prev.globalFilter !== request.globalFilter;
		const filtersChanged = !!prev && prev.filters !== request.filters;
		prevRequestRef.current = request;

		const emit = () => {
			onRequestChangeRef.current?.(request);
		};

		let delay = 0;
		if (searchChanged)
			delay = Math.max(delay, debounceRef.current.globalFilter);
		if (filtersChanged)
			delay = Math.max(delay, debounceRef.current.columnFilters);
		// Only debounce when the *sole* change is search/filter. If anything else changed (e.g. the
		// user paginated or sorted), emit immediately — clearing any pending search timer also flushes
		// the in-progress search value along with the new pagination, so nothing is lost.
		const shouldDebounce =
			!isFirst && (searchChanged || filtersChanged) && delay > 0;

		clearTimeout(timerRef.current);
		if (shouldDebounce) {
			timerRef.current = setTimeout(emit, delay);
		} else {
			emit();
		}
		return () => clearTimeout(timerRef.current);
	}, [request]);

	// Emit the current request again right away and skip the debounce. This drives the error retry.
	const requestRef = useRef(request);
	requestRef.current = request;
	const refetch = useCallback(() => {
		onRequestChangeRef.current?.(requestRef.current);
	}, []);

	// Renderer facing status for both presentations.
	const renderStatus = useMemo(
		() =>
			resolveDataViewStatus({
				status,
				error,
				pageRowCount: rows.length,
				state: resolvedState,
			}),
		[status, error, rows.length, resolvedState],
	);

	const setView = useCallback(
		(next: ViewMode) => applyPatch({ view: next }),
		[applyPatch],
	);

	const pageSizeOptions = resolvePageSizeOptions(options);

	// Derived helpers for the toolbar and presentations. The TanStack `table` is a stable
	// reference that mutates internally. These are computed every render (cheap over a small
	// column set) instead of memoized on `table`, which would never notice column changes.
	const allColumns = table.getAllColumns();
	const sortableColumns = allColumns.filter((c) => c.getCanSort());
	const filterableColumns = allColumns.filter(
		(c) => c.columnDef.meta?.filter != null,
	);

	const clearSelection = useCallback(
		() => applyPatch({ rowSelection: {} }),
		[applyPatch],
	);
	const selection = useMemo(() => {
		const map = resolvedState.rowSelection;
		// Ids span every page because they are keyed by id. Rows are only the ones currently on
		// the page, taken straight from `rows`, since the core never holds data for other pages.
		const selectedIds = Object.keys(map).filter((k) => map[k]);
		const selectedRows = rows.filter((row) => map[getRowId(row)] === true);
		return {
			count: selectedIds.length,
			ids: selectedIds,
			pageRows: selectedRows,
			// Deprecated alias of `pageRows`; kept for back-compat.
			rows: selectedRows,
			clear: clearSelection,
		};
	}, [resolvedState.rowSelection, rows, getRowId, clearSelection]);

	const exportCsv = useCallback(
		(opts?: Parameters<typeof exportCsvFn>[1]) => exportCsvFn(table, opts),
		[table],
	);

	const resetFilter = useCallback(
		(columnId: string) => table.getColumn(columnId)?.setFilterValue(undefined),
		[table],
	);

	const resetAllFilters = useCallback(
		() => table.resetColumnFilters(),
		[table],
	);

	// In the bare (fully controlled) hook there is no owned cache to mutate, so the optimistic
	// methods degrade to a plain refetch and ignore their argument. `useDataViewFetcher` overrides
	// them with real optimistic reconciliation. Consumers wanting optimistic updates should use the
	// fetcher (or drive `rows` themselves).
	const patchRow = useCallback(
		(_record: TData) => {
			refetch();
		},
		[refetch],
	);
	const insertRow = useCallback(
		(_record: TData) => {
			refetch();
		},
		[refetch],
	);
	const removeRow = useCallback(
		(_id: string) => {
			refetch();
		},
		[refetch],
	);

	return {
		table,
		request,
		state: resolvedState,
		view,
		setView,
		isMobileForced,
		status,
		error,
		renderStatus,
		refetch,
		pageSizeOptions,
		sortableColumns,
		filterableColumns,
		selection,
		exportCsv,
		facets,
		resetFilter,
		resetAllFilters,
		patchRow,
		insertRow,
		removeRow,
		isRevalidating: false,
	};
}
