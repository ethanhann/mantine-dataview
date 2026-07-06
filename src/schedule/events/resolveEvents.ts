// Shared row→event resolution and the event-click→selection handler, used by every schedule-family
// presentation (calendar, agenda, resources) so they stay thin and behave identically.

import type { MantineColor } from "@mantine/core";
import type { ScheduleEventData } from "@mantine/schedule";
import type { MouseEvent } from "react";
import type { UseDataViewReturn } from "../../types/options";
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

/**
 * Finds the table row backing an event id. Mantine expands a recurring event into instances whose
 * id is `${event.id}::${recurrenceId}`, so when the exact id has no match, retry with the portion
 * before the last `::` — otherwise every interaction on a generated occurrence would miss its row.
 */
function findTableRow<TData>(view: UseDataViewReturn<TData>, eventId: string) {
	const rows = view.table.getRowModel().rows;
	const exact = rows.find((r) => r.id === eventId);
	if (exact) return exact;
	const suffix = eventId.lastIndexOf("::");
	if (suffix === -1) return undefined;
	const seriesId = eventId.slice(0, suffix);
	return rows.find((r) => r.id === seriesId);
}

/** The shared `onEventClick` handler: toggle selection for the row backing an event id. */
export function toggleEventSelection<TData>(
	view: UseDataViewReturn<TData>,
	eventId: string | number,
): void {
	findTableRow(view, String(eventId))?.toggleSelected();
}

/** The original row backing an event id, or `undefined` if it isn't on the current page. */
export function findEventRow<TData>(
	view: UseDataViewReturn<TData>,
	eventId: string | number,
): TData | undefined {
	return findTableRow(view, String(eventId))?.original;
}

/** A first-class event-click handler that receives the typed original row. */
export type EventClickHandler<TData> = (
	row: TData,
	event: ScheduleEventData,
	nativeEvent: MouseEvent<HTMLButtonElement>,
) => void;

/**
 * Builds the `onEventClick` passed to the Mantine component. When the consumer provides a handler it
 * is called with the resolved row; otherwise the default toggles row selection (feeding bulk
 * actions). A handler in `*Props` still overrides this entirely, since it is spread afterward.
 */
export function makeEventClickHandler<TData>(
	view: UseDataViewReturn<TData>,
	onEventClick: EventClickHandler<TData> | undefined,
) {
	return (
		event: ScheduleEventData,
		nativeEvent: MouseEvent<HTMLButtonElement>,
	) => {
		if (!onEventClick) {
			toggleEventSelection(view, event.id);
			return;
		}
		const row = findEventRow(view, event.id);
		if (row !== undefined) onEventClick(row, event, nativeEvent);
	};
}
