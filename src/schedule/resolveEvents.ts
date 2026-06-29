// Shared row→event resolution and the event-click→selection handler, used by every schedule-family
// presentation (calendar, agenda, resources) so they stay thin and behave identically.

import type { MantineColor } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { UseDataViewReturn } from "../types/options";
import { composeEvent } from "./composeEvent";
import { composeScheduleEvent } from "./scheduleEvent";

export interface ResolveEventsOptions<TData> {
	/** Override declarative `meta.schedule` mapping; returns a Mantine event directly. */
	toEvent?: (row: TData) => ScheduleEventData;
	/** Fallback event length in minutes when only a start is resolvable. Default `60`. */
	defaultDuration?: number;
	/** Color for events whose `color` role resolves to nothing (Mantine requires a color). Default `"blue"`. */
	defaultColor?: MantineColor;
}

/**
 * Resolves the current page's rows into Mantine events: the `toEvent` override when given, otherwise
 * the declarative `meta.schedule` roles via `composeEvent` → `composeScheduleEvent`. Computed every
 * render over a single page of rows (cheap), matching how the core derives its other helpers.
 */
export function resolveEvents<TData>(
	view: UseDataViewReturn<TData>,
	{
		toEvent,
		defaultDuration,
		defaultColor = "blue",
	}: ResolveEventsOptions<TData>,
): ScheduleEventData[] {
	const rows = view.table.getRowModel().rows;
	const columns = view.table.getAllColumns().map((c) => c.columnDef);
	const events: ScheduleEventData[] = [];
	for (const row of rows) {
		if (toEvent) {
			events.push(toEvent(row.original));
			continue;
		}
		const composed = composeEvent(row.original, {
			columns,
			getRowId: () => row.id,
			defaultDuration,
		});
		if (composed) events.push(composeScheduleEvent(composed, defaultColor));
	}
	return events;
}

/** The shared `onEventClick` handler: toggle selection for the row backing an event id. */
export function toggleEventSelection<TData>(
	view: UseDataViewReturn<TData>,
	eventId: string | number,
): void {
	const row = view.table
		.getRowModel()
		.rows.find((r) => r.id === String(eventId));
	row?.toggleSelected();
}
