// Agenda presentation. The list projection of the same event data: a date-grouped flat list over the
// visible window. Unlike `Schedule`/`ResourcesSchedule`, Mantine's `AgendaView` has no built-in
// navigation, so this renders a `DataScheduleNav` header by default (`withNav`). Same row→event
// mapping, window model, and click-to-select as the calendar. Ships from the optional `/schedule`
// subpath only.

import type { MantineColor } from "@mantine/core";
import {
	AgendaView,
	type AgendaViewProps,
	type ScheduleEventData,
} from "@mantine/schedule";
import type { ReactNode } from "react";
import type { DataViewSlots } from "../components/types";
import type { UseDataViewReturn } from "../types/options";
import type { ScheduleLevel } from "../types/state";
import { DataAgendaNav } from "./DataAgendaNav";
import { computeWindow } from "./dateWindow";
import {
	type EventClickHandler,
	makeEventClickHandler,
	resolveEvents,
} from "./resolveEvents";
import { ScheduleShell } from "./ScheduleShell";
import { useWindowedView } from "./useWindowedView";

export interface DataAgendaProps<TData> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	/** Override the declarative `meta.schedule` mapping; returns a Mantine event directly. */
	toEvent?: (row: TData) => ScheduleEventData;
	/** Fallback event length in minutes when only a start is resolvable. Default `60`. */
	defaultDuration?: number;
	/** Range span used until the window is set. Default `"week"`. */
	defaultLevel?: ScheduleLevel;
	/** Color for events whose `color` role resolves to nothing. Default `"blue"`. */
	defaultColor?: MantineColor;
	/** Called when an event is clicked, with the typed original row. Replaces the default selection toggle. */
	onEventClick?: EventClickHandler<TData>;
	/** Forwarded to Mantine's `<AgendaView>` (e.g. `dateHeaderFormat`). A raw `onEventClick` here
	 * overrides the typed `onEventClick` above. */
	agendaProps?: Partial<AgendaViewProps>;
	/** Reuses the shared empty/error slots so states match the other views. */
	slots?: Pick<DataViewSlots<TData>, "Empty" | "ErrorState">;
	/**
	 * Render a `DataScheduleNav` (prev / today / next + level) in the header. `AgendaView` has no
	 * navigation of its own, so this is on by default; set `false` to supply your own via `leftSection`.
	 */
	withNav?: boolean;
	/** Custom content at the start of the header row (rendered after the nav when `withNav`). */
	leftSection?: ReactNode;
	/** Custom content at the end of the header row (e.g. action buttons). */
	rightSection?: ReactNode;
}

export function DataAgenda<TData>({
	view,
	toEvent,
	defaultDuration,
	defaultLevel = "week",
	defaultColor = "blue",
	onEventClick,
	agendaProps,
	slots,
	withNav = true,
	leftSection,
	rightSection,
}: DataAgendaProps<TData>) {
	const { level, date } = useWindowedView(view, "agenda", defaultLevel);
	const events = resolveEvents(view, {
		toEvent,
		defaultDuration,
		defaultColor,
	});
	// `computeWindow` reconstructs the visible range from the (possibly not-yet-stored) level/date,
	// so the agenda always has a valid range to render.
	const range = computeWindow(date, level);

	const agenda = (
		<AgendaView
			rangeStart={new Date(range.start)}
			rangeEnd={new Date(range.end)}
			events={events}
			onEventClick={makeEventClickHandler(view, onEventClick)}
			{...agendaProps}
		/>
	);

	// AgendaView has no built-in nav, so the nav leads the header by default.
	const header = withNav ? (
		<>
			<DataAgendaNav view={view} />
			{leftSection}
		</>
	) : (
		leftSection
	);

	return (
		<ScheduleShell
			view={view}
			slots={slots}
			leftSection={header}
			rightSection={rightSection}
			hasEvents={events.length > 0}
		>
			{agenda}
		</ScheduleShell>
	);
}
