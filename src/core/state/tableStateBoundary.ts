import type {
	ColumnPinningState,
	RowSelectionState,
} from "@tanstack/react-table";
import type { DataViewColumnPinning, DataViewState } from "../../types/state";

/**
 * The table counts a row as selected only when its entry is `true`. The public selection state
 * also allows `false` entries, so they are dropped before the state reaches the table.
 */
export function toTableRowSelection(
	rowSelection: DataViewState["rowSelection"],
): RowSelectionState {
	const selected: RowSelectionState = {};
	for (const [id, isSelected] of Object.entries(rowSelection)) {
		if (isSelected) selected[id] = true;
	}
	return selected;
}

const NO_COLUMNS: string[] = [];

/** The table requires both pinning sides, while the public state lets either side be missing. */
export function toTableColumnPinning(
	columnPinning: DataViewColumnPinning,
): ColumnPinningState {
	return {
		start: columnPinning.start ?? NO_COLUMNS,
		end: columnPinning.end ?? NO_COLUMNS,
	};
}
