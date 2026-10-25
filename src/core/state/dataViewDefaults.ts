import type { ColumnFilterMeta, DataColumnDef } from "../../types/column";
import type { DebounceOptions, UseDataViewOptions } from "../../types/options";
import type { DataViewState } from "../../types/state";
import type { RowData } from "../../types/table";

/** Default debounce in milliseconds for each field when emitting filter and search requests. */
const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

export interface ResolvedDebounce {
	globalFilter: number;
	columnFilters: number;
}

export function resolveDebounce(
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

function findColumnId<TData extends RowData>(
	col: DataColumnDef<TData>,
): string | undefined {
	if (col.id) return col.id;
	if ("accessorKey" in col && col.accessorKey != null) {
		return String(col.accessorKey);
	}
	return undefined;
}

/** Maps a column id to its filter meta so the URL serializer can pick the codec for each variant. */
export function buildFilterMetaLookup<TData extends RowData>(
	columns: DataColumnDef<TData>[],
): (id: string) => ColumnFilterMeta | undefined {
	const map = new Map<string, ColumnFilterMeta>();
	for (const col of columns) {
		const id = findColumnId(col);
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
export function resolvePageSizeOptions<TData extends RowData>(
	options: UseDataViewOptions<TData>,
): number[] {
	return options.pageSizeOptions?.length
		? options.pageSizeOptions
		: DEFAULT_PAGE_SIZES;
}

export function buildDefaultState<TData extends RowData>(
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
		columnPinning: { start: [], end: [] },
		columnSizing: {},
		columnOrder: [],
		view: options.defaultView ?? "table",
		...options.initialState,
	};
}
