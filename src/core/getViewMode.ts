import type { CellContext, HeaderContext, Table } from "@tanstack/react-table";
import { isViewMode, type ViewMode } from "../types/state";

/** Get the current view mode from a cell context. */
export function getViewMode<TData>(
	ctx:
		| CellContext<TData, unknown>
		| HeaderContext<TData, unknown>
		| Table<TData>,
): ViewMode {
	const table = "table" in ctx ? ctx.table : ctx;
	const mode = table.options.meta?.viewMode;
	return isViewMode(mode) ? mode : "table";
}
