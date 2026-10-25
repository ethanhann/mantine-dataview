import {
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnPinningState,
	type ColumnSizingState,
	type ColumnVisibilityState,
	functionalUpdate,
	type OnChangeFn,
	type PaginationState,
	type RowSelectionState,
	type SortingState,
} from "@tanstack/react-table";
import { useCallback } from "react";
import type { DataViewState } from "../../types/state";
import {
	toTableColumnPinning,
	toTableRowSelection,
} from "./tableStateBoundary";

interface TableStateHandlersDeps {
	applyPatch: (patch: Partial<DataViewState>) => void;
	getLiveState: () => DataViewState;
	paginationAtFirstPage: () => PaginationState;
}

/**
 * The change handlers the table calls when one of its state slices changes. Each handler turns the
 * table's update into a patch on the library state, which stays the single source of truth.
 */
export function useTableStateHandlers({
	applyPatch,
	getLiveState,
	paginationAtFirstPage,
}: TableStateHandlersDeps) {
	const onPaginationChange = useCallback<OnChangeFn<PaginationState>>(
		(updater) => {
			applyPatch({
				pagination: functionalUpdate(updater, getLiveState().pagination),
			});
		},
		[applyPatch, getLiveState],
	);

	const onSortingChange = useCallback<OnChangeFn<SortingState>>(
		(updater) => {
			applyPatch({
				sorting: functionalUpdate(updater, getLiveState().sorting),
				pagination: paginationAtFirstPage(),
			});
		},
		[applyPatch, paginationAtFirstPage, getLiveState],
	);

	const onColumnFiltersChange = useCallback<OnChangeFn<ColumnFiltersState>>(
		(updater) => {
			applyPatch({
				columnFilters: functionalUpdate(updater, getLiveState().columnFilters),
				pagination: paginationAtFirstPage(),
			});
		},
		[applyPatch, paginationAtFirstPage, getLiveState],
	);

	const onGlobalFilterChange = useCallback<OnChangeFn<string>>(
		(updater) => {
			applyPatch({
				globalFilter: functionalUpdate(updater, getLiveState().globalFilter),
				pagination: paginationAtFirstPage(),
			});
		},
		[applyPatch, paginationAtFirstPage, getLiveState],
	);

	const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
		(updater) => {
			applyPatch({
				rowSelection: functionalUpdate(
					updater,
					toTableRowSelection(getLiveState().rowSelection),
				),
			});
		},
		[applyPatch, getLiveState],
	);

	const onColumnVisibilityChange = useCallback<
		OnChangeFn<ColumnVisibilityState>
	>(
		(updater) => {
			applyPatch({
				columnVisibility: functionalUpdate(
					updater,
					getLiveState().columnVisibility,
				),
			});
		},
		[applyPatch, getLiveState],
	);

	const onColumnPinningChange = useCallback<OnChangeFn<ColumnPinningState>>(
		(updater) => {
			applyPatch({
				columnPinning: functionalUpdate(
					updater,
					toTableColumnPinning(getLiveState().columnPinning),
				),
			});
		},
		[applyPatch, getLiveState],
	);

	const onColumnSizingChange = useCallback<OnChangeFn<ColumnSizingState>>(
		(updater) => {
			applyPatch({
				columnSizing: functionalUpdate(updater, getLiveState().columnSizing),
			});
		},
		[applyPatch, getLiveState],
	);

	const onColumnOrderChange = useCallback<OnChangeFn<ColumnOrderState>>(
		(updater) => {
			applyPatch({
				columnOrder: functionalUpdate(updater, getLiveState().columnOrder),
			});
		},
		[applyPatch, getLiveState],
	);

	return {
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange,
		onGlobalFilterChange,
		onRowSelectionChange,
		onColumnVisibilityChange,
		onColumnPinningChange,
		onColumnSizingChange,
		onColumnOrderChange,
	};
}
