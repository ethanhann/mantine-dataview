// Seeds a `useDataView` so it opens directly on a windowed (schedule-family) view with its window
// already set. This matters because the presentation otherwise sets its window in a post-mount
// effect, after the core has already emitted its first (window-less) request — costing a second
// fetch. Spreading this into `initialState` puts the window in the very first request, so opening on
// the calendar/agenda/resources view is a single fetch.

import type { DataViewState, ScheduleLevel, ViewMode } from "../types/state";
import { computeWindow } from "./dateWindow";

/**
 * Initial state for opening on a windowed view (default `"schedule"`) at `level` (default `"week"`)
 * around `date` (default now). Sets both `view` and `window` so the first fetch is already windowed.
 * Pass `view: "agenda"` or `"resources"` to open on those presentations instead.
 *
 * ```tsx
 * const initialState = useMemo(() => scheduleInitialState("week"), []);
 * const view = useDataViewFetcher({ columns, getRowId, fetcher, initialState });
 * ```
 *
 * Memoize it (as above) so the anchor date is fixed to first render rather than recomputed.
 */
export function scheduleInitialState(
	level: ScheduleLevel = "week",
	date: Date = new Date(),
	view: ViewMode = "schedule",
): Pick<DataViewState, "view" | "window"> {
	return { view, window: computeWindow(date, level) };
}
