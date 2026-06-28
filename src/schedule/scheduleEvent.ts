// Adapts the library-neutral `DataViewEvent` produced by `composeEvent` into the concrete
// `@mantine/schedule` event shape. Kept separate from `composeEvent` so that the role-resolution
// logic stays Mantine-free and unit-testable; this thin adapter is the only place the two shapes
// meet.

import type { MantineColor } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { DataViewEvent } from "../types/schedule";

/**
 * Maps a {@link DataViewEvent} to a Mantine `ScheduleEventData`. Mantine accepts `Date` start/end
 * directly, so no string formatting is needed. `color` is required by Mantine, so the resolved
 * color falls back to `defaultColor`. The originating row (and any `allDay` flag, which Mantine has
 * no first-class field for) is preserved on `payload` for custom renderers and click handlers.
 */
export function composeScheduleEvent<TData>(
	event: DataViewEvent<TData>,
	defaultColor: MantineColor,
): ScheduleEventData {
	return {
		id: event.id,
		title: event.title,
		start: event.start,
		end: event.end,
		color: event.color ?? defaultColor,
		...(event.resourceId != null ? { resourceId: event.resourceId } : {}),
		payload: {
			row: event.row,
			...(event.allDay != null ? { allDay: event.allDay } : {}),
		},
	};
}
