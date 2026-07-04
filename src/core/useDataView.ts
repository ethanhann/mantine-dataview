// The headless core. It owns all feature state and wraps TanStack Table v8 with every `manual*`
// flag turned on. It emits a normalized `DataViewRequest` whenever the state the server cares
// about changes. The presentations and the toolbar are pure projections of what it returns.

import {
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnPinningState,
	type ColumnSizingState,
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
import { resolveLabels } from "../types/labels";
import type {
	DebounceOptions,
	UseDataViewOptions,
	UseDataViewReturn,
} from "../types/options";
import type { DataViewRequest } from "../types/request";
import {
	type DataViewState,
	type DataViewWindow,
	isWindowedView,
	type ViewMode,
} from "../types/state";
import {
	hydrateFromUrl,
	resolveUrlConfig,
	useUrlSync,
} from "../url/useUrlSync";
import {
	exportCsv as exportCsvFn,
	exportJson as exportJsonFn,
} from "./exportCsv";
import { resolveFormatter } from "./formatValue";
import { extractPersisted, hydrateFromStorage } from "./persist";
import { resolveDataViewStatus } from "./resolveStatus";
import { useForceCards } from "./useForceCards";

/** Default debounce in milliseconds for each field when emitting filter and search requests. */
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;
const PERSIST_WRITE_DEBOUNCE_MS = 250;

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
		columnSizing: {},
		columnOrder: [],
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
		enableMultiRowSelection,
		enableGlobalFilter = true,
		enableColumnResizing = false,
		debounce,
		responsive,
		formatDefaults,
		facets: facetsInput,
		summary: summaryInput,
		params: paramsInput,
		labels: labelsInput,
		persist,
	} = options;

	const labels = useMemo(() => resolveLabels(labelsInput), [labelsInput]);
	const facets = facetsInput ?? {};
	const summary = summaryInput ?? {};
	const paramsKey = paramsInput ? JSON.stringify(paramsInput) : "";
	// Keep `params` reference-stable while its content is unchanged. Without this it would be a fresh
	// object every render, so the request's `params` slice would look "changed" on a pagination-only
	// update — which the schedule pager-suppression check relies on being able to distinguish.
	// biome-ignore lint/correctness/useExhaustiveDependencies: paramsKey is the value-identity of paramsInput
	const params = useMemo(() => paramsInput ?? {}, [paramsKey]);

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
	// first render it also hydrates from persisted preferences and then the URL (the URL wins,
	// since it represents an explicit navigation). The storage patch is kept for the URL layer's
	// defaults: a stored page size is the effective default, so it stays out of clean URLs.
	const storagePatchRef = useRef<Partial<DataViewState>>({});
	const [internalState, setInternalState] = useState<DataViewState>(() => {
		const base = buildDefaultState(options);
		const stored = hydrateFromStorage(persist, base);
		storagePatchRef.current = stored;
		const seeded = { ...base, ...stored };
		return { ...seeded, ...hydrateFromUrl(urlConfig, seeded, getFilterMeta) };
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
			// The notification reports the proposed next state: controlled slices stay
			// authoritative for everything they own, except the slice this patch changes.
			// The patch must compose last or a controlled consumer never sees the change
			// it is being asked to commit.
			onStateChange?.({
				...nextInternal,
				...controlledStateRef.current,
				...patch,
			});
		},
		[onStateChange],
	);

	// Ongoing URL writes plus the back and forward subscription. Hydration already happened above.
	// The defaults honor `initialState`, so an app defaulting to e.g. 25 rows or the cards view
	// keeps those out of every URL.
	useUrlSync({
		config: urlConfig,
		state: resolvedState,
		applyPatch,
		getFilterMeta,
		defaultPageSize:
			storagePatchRef.current.pagination?.pageSize ??
			options.initialState?.pagination?.pageSize ??
			resolvePageSizeOptions(options)[0] ??
			DEFAULT_PAGE_SIZE,
		defaultView: options.initialState?.view ?? options.defaultView ?? "table",
	});

	// Persist preference changes, debounced: a resize drag patches state per mousemove, and the
	// storage write should land once per gesture, not per pixel. The first run is skipped since it
	// would only write back what hydration just read.
	const persistRef = useRef(persist);
	persistRef.current = persist;
	const persisted = persist
		? extractPersisted(resolvedState, persist.include)
		: null;
	const persistedKey = persisted ? JSON.stringify(persisted) : "";
	const prevPersistedKeyRef = useRef<string | null>(null);
	useEffect(() => {
		if (!persistedKey) return;
		if (prevPersistedKeyRef.current === null) {
			prevPersistedKeyRef.current = persistedKey;
			return;
		}
		if (prevPersistedKeyRef.current === persistedKey) return;
		prevPersistedKeyRef.current = persistedKey;
		const timer = setTimeout(() => {
			const cfg = persistRef.current;
			if (!cfg) return;
			cfg.adapter.write(
				extractPersisted(resolvedStateRef.current, cfg.include),
			);
		}, PERSIST_WRITE_DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [persistedKey]);

	// External storage changes (e.g. another tab) patch the live state when the adapter can
	// signal them. Mirrors the URL subscribe effect.
	const persistEnabled = persist != null;
	useEffect(() => {
		if (!persistEnabled) return;
		const cfg = persistRef.current;
		if (!cfg?.adapter.subscribe) return;
		return cfg.adapter.subscribe(() => {
			const live = persistRef.current;
			if (!live) return;
			applyPatch(hydrateFromStorage(live, resolvedStateRef.current));
		});
	}, [persistEnabled, applyPatch]);

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

	const onColumnSizingChange = useCallback<OnChangeFn<ColumnSizingState>>(
		(updater) => {
			applyPatch({
				columnSizing: functionalUpdate(
					updater,
					resolvedStateRef.current.columnSizing,
				),
			});
		},
		[applyPatch],
	);

	const onColumnOrderChange = useCallback<OnChangeFn<ColumnOrderState>>(
		(updater) => {
			applyPatch({
				columnOrder: functionalUpdate(
					updater,
					resolvedStateRef.current.columnOrder,
				),
			});
		},
		[applyPatch],
	);

	const isMobileForced = useForceCards(responsive);
	const view: ViewMode = isMobileForced ? "cards" : resolvedState.view;

	// The window only drives the request while a windowed (schedule-family) view is active. Persisting
	// it in state (rather than clearing it on a view switch) means returning to a windowed view
	// restores the same range, while table and cards fetches never carry a stale window. Deriving it
	// here — instead of reading `resolvedState.window` directly in the request — also keeps a
	// table↔cards switch from churning the request: `activeWindow` stays `undefined` for both, so the
	// memo doesn't recompute.
	const activeWindow = isWindowedView(view) ? resolvedState.window : undefined;

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
		enableMultiRowSelection: enableMultiRowSelection ?? true,
		enableGlobalFilter,
		// TanStack defaults column resizability to true; this library gates it behind an explicit
		// opt-in so the presentation only renders handles (and per-column widths) when asked.
		enableColumnResizing,
		columnResizeMode: "onChange",
		state: {
			pagination: resolvedState.pagination,
			sorting: resolvedState.sorting,
			columnFilters: resolvedState.columnFilters,
			globalFilter: resolvedState.globalFilter,
			rowSelection: resolvedState.rowSelection,
			columnVisibility: resolvedState.columnVisibility,
			columnPinning: resolvedState.columnPinning,
			columnSizing: resolvedState.columnSizing,
			columnOrder: resolvedState.columnOrder,
		},
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange,
		onGlobalFilterChange,
		onRowSelectionChange,
		onColumnVisibilityChange,
		onColumnPinningChange,
		onColumnSizingChange,
		onColumnOrderChange,
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
			// Omit `window` entirely unless a schedule view is active, so table/cards fetchers see no
			// new key and never receive a stale range.
			...(activeWindow ? { window: activeWindow } : {}),
		}),
		[
			resolvedState.pagination,
			resolvedState.sorting,
			resolvedState.columnFilters,
			resolvedState.globalFilter,
			activeWindow,
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
		const windowChanged = !!prev && prev.window !== request.window;
		// Pagination compares by value: the params-reset effect rebuilds the pagination object even
		// when it already sits on the first page, and that identity change alone is not a new request.
		const paginationChanged =
			!!prev &&
			(prev.pagination.pageIndex !== request.pagination.pageIndex ||
				prev.pagination.pageSize !== request.pagination.pageSize);
		const paramsChanged = !!prev && prev.params !== request.params;
		const sortingChanged = !!prev && prev.sorting !== request.sorting;
		const windowActive = request.window != null;
		prevRequestRef.current = request;

		const emit = () => {
			onRequestChangeRef.current?.(request);
		};

		let delay = 0;
		if (searchChanged)
			delay = Math.max(delay, debounceRef.current.globalFilter);
		if (filtersChanged)
			delay = Math.max(delay, debounceRef.current.columnFilters);
		// Date navigation coalesces like filtering — rapid prev/next steps emit one request.
		if (windowChanged)
			delay = Math.max(delay, debounceRef.current.columnFilters);
		// Only debounce when the *sole* change is search/filter/window. If anything else changed (e.g.
		// the user paginated or sorted), emit immediately — clearing any pending timer also flushes the
		// in-progress debounced value along with the new change, so nothing is lost.
		const shouldDebounce =
			!isFirst &&
			(searchChanged || filtersChanged || windowChanged) &&
			delay > 0;

		// While a schedule window is active the pager is inert: the calendar renders its whole window,
		// not a page. A pagination-only change must not refetch. Any change beyond pagination falls
		// through to normal emission.
		const onlyPaginationChanged =
			paginationChanged &&
			!searchChanged &&
			!filtersChanged &&
			!windowChanged &&
			!!prev &&
			prev.sorting === request.sorting &&
			prev.params === request.params;
		const suppressed = !isFirst && windowActive && onlyPaginationChanged;

		// A params change resets to the first page via an effect that has already run in this same
		// flush. Emitting the in-between request would send the new params with the old page (possibly
		// out of range) and then again with page 0. Skip it; the reset render emits.
		const awaitingParamsReset =
			paramsChanged && request.pagination.pageIndex !== 0;

		// The request object is rebuilt whenever a slice's identity changes, but an identity change
		// with equal values (the params-reset effect rebuilding an already-reset pagination) is not a
		// new request. Without this guard that render would re-emit a duplicate fetch.
		const nothingChanged =
			!isFirst &&
			!searchChanged &&
			!filtersChanged &&
			!windowChanged &&
			!paginationChanged &&
			!paramsChanged &&
			!sortingChanged;

		clearTimeout(timerRef.current);
		if (suppressed || awaitingParamsReset || nothingChanged) {
			// Intentionally emit nothing.
		} else if (shouldDebounce) {
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

	// Date navigation for the schedule view. Deliberately does not reset pagination: the window and
	// the pager are independent, and the pager is inert while a window is active.
	const setWindow = useCallback(
		(next: DataViewWindow) => applyPatch({ window: next }),
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
	// Id-based mutators, keyed by `getRowId` and spanning pages like `selection.ids`. They read the
	// live selection from the synchronously-advanced refs (not the render snapshot) so several calls in
	// one tick compose instead of overwriting each other. Single-select mode
	// (`enableMultiRowSelection: false`) collapses to a single id. They do not consult the per-row
	// `enableRowSelection` predicate, which cannot be evaluated for an id off the current page; gating
	// non-selectable rows is the caller's job.
	const liveRowSelection = useCallback(
		(): RowSelectionState =>
			({ ...internalStateRef.current, ...controlledStateRef.current })
				.rowSelection,
		[],
	);
	const isMultiSelect = useCallback(
		() => table.options.enableMultiRowSelection !== false,
		[table],
	);
	const selectIds = useCallback(
		(id: string | string[]) => {
			const ids = Array.isArray(id) ? id : [id];
			if (ids.length === 0) return;
			if (!isMultiSelect()) {
				applyPatch({ rowSelection: { [ids[ids.length - 1] as string]: true } });
				return;
			}
			const next = { ...liveRowSelection() };
			for (const i of ids) next[i] = true;
			applyPatch({ rowSelection: next });
		},
		[applyPatch, isMultiSelect, liveRowSelection],
	);
	const deselectIds = useCallback(
		(id: string | string[]) => {
			const ids = Array.isArray(id) ? id : [id];
			if (ids.length === 0) return;
			const next = { ...liveRowSelection() };
			for (const i of ids) delete next[i];
			applyPatch({ rowSelection: next });
		},
		[applyPatch, liveRowSelection],
	);
	const toggleId = useCallback(
		(id: string) => {
			const current = liveRowSelection();
			if (current[id]) {
				const next = { ...current };
				delete next[id];
				applyPatch({ rowSelection: next });
				return;
			}
			const next = isMultiSelect() ? { ...current } : {};
			next[id] = true;
			applyPatch({ rowSelection: next });
		},
		[applyPatch, isMultiSelect, liveRowSelection],
	);
	const setSelection = useCallback(
		(ids: string[]) => {
			const list = isMultiSelect() ? ids : ids.slice(-1);
			const next: RowSelectionState = {};
			for (const i of list) next[i] = true;
			applyPatch({ rowSelection: next });
		},
		[applyPatch, isMultiSelect],
	);
	const isSelected = useCallback(
		(id: string) => resolvedStateRef.current.rowSelection[id] === true,
		[],
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
			select: selectIds,
			deselect: deselectIds,
			toggle: toggleId,
			set: setSelection,
			isSelected,
		};
	}, [
		resolvedState.rowSelection,
		rows,
		getRowId,
		clearSelection,
		selectIds,
		deselectIds,
		toggleId,
		setSelection,
		isSelected,
	]);

	const exportCsv = useCallback(
		(opts?: Parameters<typeof exportCsvFn>[1]) => exportCsvFn(table, opts),
		[table],
	);
	const exportJson = useCallback(
		(opts?: Parameters<typeof exportJsonFn>[1]) => exportJsonFn(table, opts),
		[table],
	);
	// Everything the server needs to reproduce the full result set, minus the page: hand it to a
	// backend export endpoint for export-all-pages.
	const exportRequest = useMemo(() => {
		const { pagination: _pagination, ...rest } = request;
		return rest;
	}, [request]);

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
		(id: string) => {
			// A removed row must not linger in the id-keyed selection, where a bulk
			// action would still submit it.
			deselectIds(id);
			refetch();
		},
		[deselectIds, refetch],
	);

	return {
		table,
		request,
		state: resolvedState,
		view,
		setView,
		setWindow,
		isMobileForced,
		labels,
		status,
		error,
		renderStatus,
		refetch,
		pageSizeOptions,
		sortableColumns,
		filterableColumns,
		selection,
		exportCsv,
		exportJson,
		exportRequest,
		facets,
		summary,
		resetFilter,
		resetAllFilters,
		patchRow,
		insertRow,
		removeRow,
		isRevalidating: false,
		isFetching: status === "loading",
	};
}
