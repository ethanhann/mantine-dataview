import type { CellContext, HeaderContext, Table } from "@tanstack/react-table";
import type { ViewMode } from "../types/state";

/** Get the current view mode from a cell context. */
export function getViewMode<TData>(
	ctx:
		| CellContext<TData, unknown>
		| HeaderContext<TData, unknown>
		| Table<TData>,
): ViewMode {
	const table = "table" in ctx ? ctx.table : ctx;
	return (table.options.meta?.viewMode as ViewMode) ?? "table";
}
