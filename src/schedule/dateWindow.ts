// Date-range math for the schedule presentation. Computes the visible `DataViewWindow` for a given
// anchor date and zoom level, and steps it forward/backward one unit at a time. Uses dayjs, which
// the scheduler already depends on; this file lives in the `/schedule` subpath so the dependency
// stays out of the core.

import dayjs from "dayjs";
import type { DataViewWindow, ScheduleLevel } from "../types/state";

/**
 * The visible range for `level` containing `date`: `[start, end)` where `start` is the start of the
 * period and `end` is the exclusive start of the next one. Bounds are ISO strings, matching
 * `DataViewWindow`.
 */
export function computeWindow(
	date: Date,
	level: ScheduleLevel,
): DataViewWindow {
	const start = dayjs(date).startOf(level);
	const end = start.add(1, level);
	return { start: start.toISOString(), end: end.toISOString(), level };
}

/** Steps the window one level-unit earlier (`-1`) or later (`1`), keeping the same level. */
export function shiftWindow(
	window: DataViewWindow,
	direction: -1 | 1,
): DataViewWindow {
	const next = dayjs(window.start).add(direction, window.level).toDate();
	return computeWindow(next, window.level);
}
