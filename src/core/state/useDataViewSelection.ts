import type { RowSelectionState } from "@tanstack/react-table";
import { useCallback, useMemo } from "react";
import type { UseDataViewReturn } from "../../types/options";
import type { DataViewState } from "../../types/state";
import type { RowData } from "../../types/table";

interface SelectionDeps<TData extends RowData> {
	/** False when only one row may be selected at a time. */
	isMultiSelect: boolean;
	rows: TData[];
	getRowId: (row: TData) => string;
	rowSelection: DataViewState["rowSelection"];
	applyPatch: (patch: Partial<DataViewState>) => void;
	/** Reads the state as of the latest synchronous update, ahead of the next render. */
	getLiveState: () => DataViewState;
}

/** The selection API returned as `view.selection`, spanning every page by row id. */
export function useDataViewSelection<TData extends RowData>({
	isMultiSelect,
	rows,
	getRowId,
	rowSelection,
	applyPatch,
	getLiveState,
}: SelectionDeps<TData>): UseDataViewReturn<TData>["selection"] {
	const clearSelection = useCallback(
		() => applyPatch({ rowSelection: {} }),
		[applyPatch],
	);
	// Id-based mutators, keyed by `getRowId` and spanning pages like `selection.ids`. They read the
	// live selection, not the render snapshot, so several calls in one tick compose instead of
	// overwriting each other. In single-select mode they keep only the last id. They skip the per-row
	// `enableRowSelection` predicate, because it cannot run for an id that is off the current page.
	// The caller must filter out rows that are not selectable.
	const liveRowSelection = useCallback(
		() => getLiveState().rowSelection,
		[getLiveState],
	);
	const selectIds = useCallback(
		(id: string | string[]) => {
			const ids = Array.isArray(id) ? id : [id];
			if (ids.length === 0) return;
			if (!isMultiSelect) {
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
			const next = isMultiSelect ? { ...current } : {};
			next[id] = true;
			applyPatch({ rowSelection: next });
		},
		[applyPatch, isMultiSelect, liveRowSelection],
	);
	const setSelection = useCallback(
		(ids: string[]) => {
			const list = isMultiSelect ? ids : ids.slice(-1);
			const next: RowSelectionState = {};
			for (const i of list) next[i] = true;
			applyPatch({ rowSelection: next });
		},
		[applyPatch, isMultiSelect],
	);
	const isSelected = useCallback(
		(id: string) => liveRowSelection()[id] === true,
		[liveRowSelection],
	);
	return useMemo(() => {
		const map = rowSelection;
		// Ids span every page because they are keyed by id. Rows are only the ones currently on
		// the page, taken straight from `rows`, since the core never holds data for other pages.
		const selectedIds = Object.keys(map).filter((k) => map[k]);
		const selectedRows = rows.filter((row) => map[getRowId(row)] === true);
		return {
			count: selectedIds.length,
			ids: selectedIds,
			pageRows: selectedRows,
			// Deprecated alias of `pageRows`.
			rows: selectedRows,
			clear: clearSelection,
			select: selectIds,
			deselect: deselectIds,
			toggle: toggleId,
			set: setSelection,
			isSelected,
		};
	}, [
		rowSelection,
		rows,
		getRowId,
		clearSelection,
		selectIds,
		deselectIds,
		toggleId,
		setSelection,
		isSelected,
	]);
}
