import { isKnownViewMode, type ViewMode } from "../types/state";
import type {
	DataViewCellContext,
	DataViewHeaderContext,
	DataViewTable,
	RowData,
} from "../types/table";

/**
 * Get the current view mode from a cell context. Returns the active `ViewMode` — `"table"`,
 * `"cards"`, or a schedule-family id (`"schedule"`/`"agenda"`/`"resources"`) — falling back to
 * `"table"` when none is set.
 */
export function getViewMode<TData extends RowData>(
	ctx:
		| DataViewCellContext<TData, unknown>
		| DataViewHeaderContext<TData, unknown>
		| DataViewTable<TData>,
): ViewMode {
	const table = "table" in ctx ? ctx.table : ctx;
	const mode = table.options.meta?.viewMode;
	return isKnownViewMode(mode) ? mode : "table";
}
