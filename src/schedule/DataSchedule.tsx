// Schedule presentation. The third projection of the same core state: each row becomes a calendar
// event via the columns' declarative `meta.schedule` roles (or a `toEvent` override), and the date
// navigation drives the core's `window` slice so the consumer's fetcher loads the visible range.
//
// v1 is read-only apart from click-to-select: events are clickable (toggling row selection, which
// feeds bulk actions) but not draggable or resizable. Mantine's drag/resize hooks can be opted into
// through `scheduleProps`. This file imports `@mantine/schedule`, so it ships only from the optional
// `/schedule` subpath, never from the main entry.

import { Center, type MantineColor, Skeleton } from "@mantine/core";
import {
	Schedule,
	type ScheduleEventData,
	type ScheduleProps,
} from "@mantine/schedule";
import dayjs from "dayjs";
import { useEffect } from "react";
import { EmptyContent, ErrorContent } from "../components/StateMessage";
import type { DataViewSlots } from "../components/types";
import type { UseDataViewReturn } from "../types/options";
import type { ScheduleLevel } from "../types/state";
import { composeEvent } from "./composeEvent";
import { computeWindow } from "./dateWindow";
import { composeScheduleEvent } from "./scheduleEvent";

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
	/** Forwarded to Mantine's `<Schedule>` (e.g. `startTime`, `weekViewProps`, custom `onEventClick`). */
	scheduleProps?: Partial<ScheduleProps>;
	/** Reuses the shared empty/error slots so states match the table and card views. */
	slots?: Pick<DataViewSlots<TData>, "Empty" | "ErrorState">;
}

export function DataSchedule<TData>({
	view,
	toEvent,
	defaultDuration,
	defaultLevel = "week",
	defaultColor = "blue",
	scheduleProps,
	slots,
}: DataScheduleProps<TData>) {
	const { table, renderStatus } = view;
	const window = view.state.window;

	// On mount, make the core reflect that the schedule view is active and seed the visible window.
	// Marking the view is what lets the window drive the request even when this component is rendered
	// standalone (outside `DataViewer`'s switcher) — the core only sends `window` while the schedule
	// view is active. Both are guarded so a view/window restored from `initialState` or the URL wins,
	// and so opening via `scheduleInitialState` is a single fetch.
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount-only; setView/setWindow are stable
	useEffect(() => {
		if (view.view !== "schedule") view.setView("schedule");
		if (!view.state.window)
			view.setWindow(computeWindow(new Date(), defaultLevel));
	}, []);

	const level: ScheduleLevel = window?.level ?? defaultLevel;
	const date = window ? new Date(window.start) : new Date();

	const rows = table.getRowModel().rows;
	// Computed every render over a single page of rows (cheap), matching how the core derives its
	// other helpers. `columnDefs` carries the `meta.schedule` roles `composeEvent` reads.
	const columnDefs = table.getAllColumns().map((c) => c.columnDef);
	const events: ScheduleEventData[] = [];
	for (const row of rows) {
		if (toEvent) {
			events.push(toEvent(row.original));
			continue;
		}
		const composed = composeEvent(row.original, {
			columns: columnDefs,
			getRowId: () => row.id,
			defaultDuration,
		});
		if (composed) events.push(composeScheduleEvent(composed, defaultColor));
	}

	const handleViewChange = (next: ScheduleLevel) =>
		view.setWindow(computeWindow(date, next));
	const handleDateChange = (next: string) =>
		view.setWindow(computeWindow(dayjs(next).toDate(), level));
	const handleEventClick = (event: ScheduleEventData) => {
		const row = rows.find((r) => r.id === String(event.id));
		row?.toggleSelected();
	};

	if (renderStatus.phase === "error") {
		return (
			<Center p="xl">
				<ErrorContent view={view} slots={slots} />
			</Center>
		);
	}

	// First load with nothing to show yet: a skeleton. Once events exist, keep the calendar mounted
	// across window changes so navigation never flashes a skeleton over the grid.
	if (renderStatus.phase === "loading" && events.length === 0) {
		return <Skeleton height={480} radius="sm" />;
	}

	// A populated calendar with zero events IS the empty state — render the grid rather than a
	// "no results" message. Surface the filtered-empty affordance only when filters are active.
	if (renderStatus.phase === "empty-filtered" && events.length === 0) {
		return (
			<Center p="xl">
				<EmptyContent view={view} slots={slots} />
			</Center>
		);
	}

	return (
		<Schedule
			events={events}
			date={date}
			view={level}
			onViewChange={handleViewChange}
			onDateChange={handleDateChange}
			onEventClick={handleEventClick}
			{...scheduleProps}
		/>
	);
}
