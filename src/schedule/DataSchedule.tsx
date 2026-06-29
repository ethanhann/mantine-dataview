// Schedule presentation. The calendar projection of the core state: each row becomes an event via
// the columns' declarative `meta.schedule` roles (or a `toEvent` override), and the date navigation
// drives the core's `window` slice so the consumer's fetcher loads the visible range.
//
// Click-to-select by default; opt into editing with the typed `onEventMove`/`onEventResize`/
// `onRangeSelect`/`onSlotClick` callbacks (which enable Mantine's interaction flags for you). This
// file imports `@mantine/schedule`, so it ships only from the optional `/schedule` subpath, never
// from the main entry.

import type { MantineColor } from "@mantine/core";
import {
	Schedule,
	type ScheduleEventData,
	type ScheduleProps,
} from "@mantine/schedule";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import type { DataViewSlots } from "../components/types";
import type { UseDataViewReturn } from "../types/options";
import type { ScheduleLevel } from "../types/state";
import { computeWindow } from "./dateWindow";
import {
	type EventMoveHandler,
	makeMoveHandler,
	makeScheduleSlotDragHandler,
	makeSlotClickHandler,
	type RangeSelectHandler,
	type SlotClickHandler,
} from "./eventInteractions";
import {
	type EventClickHandler,
	makeEventClickHandler,
	resolveEvents,
} from "./resolveEvents";
import { ScheduleShell } from "./ScheduleShell";
import { useWindowedView } from "./useWindowedView";

export interface DataScheduleProps<TData> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	/**
	 * Override the declarative `meta.schedule` mapping for every row. When provided it fully replaces
	 * role-based composition and must return a `@mantine/schedule` event directly.
	 */
	toEvent?: (row: TData) => ScheduleEventData;
	/** Fallback event length in minutes when only a start is resolvable. Default `60`. */
	defaultDuration?: number;
	/** Calendar level used until the window is set. Default `"week"`. */
	defaultLevel?: ScheduleLevel;
	/** Color for events whose `color` role resolves to nothing (Mantine requires a color). Default `"blue"`. */
	defaultColor?: MantineColor;
	/**
	 * Called when an event is clicked, with the typed original row. Replaces the default (which
	 * toggles the row's selection); call `toggleEventSelection(view, event.id)` inside if you also
	 * want selection.
	 */
	onEventClick?: EventClickHandler<TData>;
	/** Drag an event to a new time. Receives the typed row and the new `{ start, end }`. Enables
	 * Mantine's drag-and-drop automatically. Apply the change with `view.patchRow` after persisting. */
	onEventMove?: EventMoveHandler<TData>;
	/** Resize an event. Receives the typed row and the new `{ start, end }`. Enables resize automatically. */
	onEventResize?: EventMoveHandler<TData>;
	/** Drag-select a time range (to create). Receives the `{ start, end }`. Enables drag-select automatically. */
	onRangeSelect?: RangeSelectHandler;
	/** Click an empty time slot (to create). Receives the slot `{ start, end }`. */
	onSlotClick?: SlotClickHandler;
	/** Forwarded to Mantine's `<Schedule>` (e.g. `startTime`, `weekViewProps`). Raw handlers/flags
	 * here override the typed callbacks above. */
	scheduleProps?: Partial<ScheduleProps>;
	/** Reuses the shared empty/error slots so states match the table and card views. */
	slots?: Pick<DataViewSlots<TData>, "Empty" | "ErrorState">;
	/**
	 * Custom content at the start of a header row above the calendar — the schedule analog of the
	 * toolbar's `leftSection` (e.g. a title or `DataScheduleNav`). The header persists across the
	 * loading, error, and empty states.
	 */
	leftSection?: ReactNode;
	/** Custom content at the end of the header row above the calendar (e.g. action buttons). */
	rightSection?: ReactNode;
}

export function DataSchedule<TData>({
	view,
	toEvent,
	defaultDuration,
	defaultLevel = "week",
	defaultColor = "blue",
	onEventClick,
	onEventMove,
	onEventResize,
	onRangeSelect,
	onSlotClick,
	scheduleProps,
	slots,
	leftSection,
	rightSection,
}: DataScheduleProps<TData>) {
	const { level, date, firstDayOfWeek } = useWindowedView(
		view,
		"schedule",
		defaultLevel,
	);
	const events = resolveEvents(view, {
		toEvent,
		defaultDuration,
		defaultColor,
	});

	const calendar = (
		<Schedule
			events={events}
			date={date}
			view={level}
			onViewChange={(next) =>
				view.setWindow(computeWindow(date, next, firstDayOfWeek))
			}
			onDateChange={(next) =>
				view.setWindow(
					computeWindow(dayjs(next).toDate(), level, firstDayOfWeek),
				)
			}
			onEventClick={makeEventClickHandler(view, onEventClick)}
			// Editing: enable each Mantine interaction only when its typed handler is given.
			withEventsDragAndDrop={onEventMove != null}
			onEventDrop={makeMoveHandler(view, onEventMove)}
			withEventResize={onEventResize != null}
			onEventResize={makeMoveHandler(view, onEventResize)}
			withDragSlotSelect={onRangeSelect != null}
			onSlotDragEnd={makeScheduleSlotDragHandler(onRangeSelect)}
			onTimeSlotClick={makeSlotClickHandler(onSlotClick)}
			{...scheduleProps}
		/>
	);

	return (
		<ScheduleShell
			view={view}
			slots={slots}
			leftSection={leftSection}
			rightSection={rightSection}
			hasEvents={events.length > 0}
		>
			{calendar}
		</ScheduleShell>
	);
}
