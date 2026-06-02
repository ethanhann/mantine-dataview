// Derives the renderer facing status from the raw fetch lifecycle plus the current page and
// filter state. Both presentations switch over this value. That keeps the four states (loading,
// empty, filtered empty, and error) rendering consistently. The logic lives here so both views
// share it.

import type { DataViewState, DataViewStatus, Status } from "../types/state";

export function isFiltered(state: DataViewState): boolean {
	return state.columnFilters.length > 0 || state.globalFilter.trim() !== "";
}

interface ResolveArgs {
	status: Status;
	error: unknown;
	/** Number of rows on the current page after a successful fetch. */
	pageRowCount: number;
	state: DataViewState;
}

export function resolveDataViewStatus({
	status,
	error,
	pageRowCount,
	state,
}: ResolveArgs): DataViewStatus {
	if (status === "error") return { phase: "error", error };
	// Before the first fetch the status is `idle`. It shows the same skeleton as `loading` because
	// a request is about to happen.
	if (status === "loading" || status === "idle") return { phase: "loading" };
	if (pageRowCount === 0) {
		return isFiltered(state) ? { phase: "empty-filtered" } : { phase: "empty" };
	}
	return { phase: "ready" };
}
