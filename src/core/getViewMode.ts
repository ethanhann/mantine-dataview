import type { CellContext, HeaderContext, Table } from "@tanstack/react-table";
import { isKnownViewMode, type ViewMode } from "../types/state";

/**
 * Get the current view mode from a cell context. Returns the active `ViewMode` — `"table"`,
 * `"cards"`, or a schedule-family id (`"schedule"`/`"agenda"`/`"resources"`) — falling back to
 * `"table"` when none is set.
 */
export function getViewMode<TData>(
	ctx:
		| CellContext<TData, unknown>
		| HeaderContext<TData, unknown>
		| Table<TData>,
): ViewMode {
	const table = "table" in ctx ? ctx.table : ctx;
	const mode = table.options.meta?.viewMode;
	return isKnownViewMode(mode) ? mode : "table";
}
