// Schedule presentation. The calendar projection of the core state: each row becomes an event via
// the columns' declarative `meta.schedule` roles (or a `toEvent` override), and the date navigation
// drives the core's `window` slice so the consumer's fetcher loads the visible range.
//
// Read-only apart from click-to-select: events are clickable (toggling row selection, which feeds
// bulk actions) but not draggable or resizable. Mantine's drag/resize hooks can be opted into through
// `scheduleProps`. This file imports `@mantine/schedule`, so it ships only from the optional
// `/schedule` subpath, never from the main entry.

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
	/** Forwarded to Mantine's `<Schedule>` (e.g. `startTime`, `weekViewProps`). A raw `onEventClick`
	 * here overrides the typed `onEventClick` above. */
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
	scheduleProps,
	slots,
	leftSection,
	rightSection,
}: DataScheduleProps<TData>) {
	const { level, date } = useWindowedView(view, "schedule", defaultLevel);
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
			onViewChange={(next) => view.setWindow(computeWindow(date, next))}
			onDateChange={(next) =>
				view.setWindow(computeWindow(dayjs(next).toDate(), level))
			}
			onEventClick={makeEventClickHandler(view, onEventClick)}
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
