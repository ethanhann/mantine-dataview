// Derives the renderer facing status from the raw fetch lifecycle plus the current page and
// filter state. Both presentations switch over this value. That keeps the four states (loading,
// empty, filtered empty, and error) rendering consistently. The logic lives here so both views
// share it.

import type { DataViewState, DataViewStatus, Status } from "../types/state";

/** True when a filter value actually narrows results (ignores empty strings/arrays/null). */
function hasActiveValue(value: unknown): boolean {
	if (value == null) return false;
	if (typeof value === "string") return value.trim() !== "";
	if (Array.isArray(value)) {
		// Covers both multiselect (`[]`) and range (`[null, null]`) cleared states.
		return value.some((v) => v != null && v !== "");
	}
	return true;
}

export function isFiltered(state: DataViewState): boolean {
	return (
		state.columnFilters.some((f) => hasActiveValue(f.value)) ||
		state.globalFilter.trim() !== ""
	);
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
