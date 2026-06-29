// Date-range math for the schedule presentations. Computes the visible `DataViewWindow` for an
// anchor date and zoom level, and steps it forward/backward. The window must match what Mantine's
// calendar actually displays, so the fetched range (and its facet counts) line up with the grid:
//   - weeks align to `firstDayOfWeek` (Mantine defaults to Monday, not dayjs's Sunday);
//   - months pad out to the whole weeks the month grid shows.
// Uses dayjs, which the scheduler already depends on; lives in the `/schedule` subpath so the core
// stays dayjs-free.

import dayjs from "dayjs";
import type { DataViewWindow, ScheduleLevel } from "../types/state";

/** Mantine's calendars default to Monday-start weeks (`firstDayOfWeek = 1`). Match that. */
const DEFAULT_FIRST_DAY = 1;

/** Start of the week containing `d`, honoring `firstDayOfWeek` (0 = Sunday … 6 = Saturday). */
function startOfWeek(d: dayjs.Dayjs, firstDayOfWeek: number): dayjs.Dayjs {
	const diff = (d.day() - firstDayOfWeek + 7) % 7;
	return d.subtract(diff, "day").startOf("day");
}

function toWindow(
	start: dayjs.Dayjs,
	end: dayjs.Dayjs,
	level: ScheduleLevel,
): DataViewWindow {
	return { start: start.toISOString(), end: end.toISOString(), level };
}

/**
 * The visible range for `level` around `date`, as `[start, end)` ISO strings, aligned to what the
 * calendar renders. `firstDayOfWeek` defaults to Monday to match Mantine; pass a different value if
 * your `DatesProvider` overrides it.
 */
export function computeWindow(
	date: Date,
	level: ScheduleLevel,
	firstDayOfWeek: number = DEFAULT_FIRST_DAY,
): DataViewWindow {
	const d = dayjs(date);
	if (level === "week") {
		const start = startOfWeek(d, firstDayOfWeek);
		return toWindow(start, start.add(1, "week"), level);
	}
	if (level === "month") {
		// The month grid shows whole weeks, so pad to the weeks overlapping the month.
		const start = startOfWeek(d.startOf("month"), firstDayOfWeek);
		const end = startOfWeek(d.endOf("month"), firstDayOfWeek).add(1, "week");
		return toWindow(start, end, level);
	}
	// day, year: the calendar's boundaries match dayjs's.
	const start = d.startOf(level);
	return toWindow(start, start.add(1, level), level);
}

/**
 * Steps the window one level-unit earlier (`-1`) or later (`1`), keeping the same level. Steps from
 * the window's midpoint so a padded month/week lands squarely in the next period.
 */
export function shiftWindow(
	window: DataViewWindow,
	direction: -1 | 1,
): DataViewWindow {
	const start = dayjs(window.start);
	const mid = start.add(dayjs(window.end).diff(start) / 2, "millisecond");
	return computeWindow(mid.add(direction, window.level).toDate(), window.level);
}
