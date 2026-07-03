// Schedule presentation column model. A column declares its role in a calendar event the same way
// it declares a card role: through `meta.schedule`. The schedule presentation (shipped from the
// optional `/schedule` subpath) reads these to project each row into a calendar event. This file
// is type-only and imports nothing from `@mantine/schedule`, so the main bundle stays free of the
// scheduler dependency.

/**
 * The part of a calendar event a column supplies.
 *
 * - `start`    (required) — event start. Value may be a `Date`, an ISO string, or epoch ms.
 * - `end`      — event end. Mutually exclusive with `duration`.
 * - `duration` — event length, as minutes (number) or an ISO-8601 duration string (e.g. `"PT1H30M"`).
 *                Derives the end from the start. Mutually exclusive with `end`.
 * - `title`    — event label.
 * - `color`    — a Mantine theme color or CSS color.
 * - `resource` — resource/group id, used by the resources view to place events in rows.
 * - `allDay`   — boolean flag marking an all-day event.
 */
export type ScheduleRole =
	| "start"
	| "end"
	| "duration"
	| "title"
	| "color"
	| "resource"
	| "allDay";

/** Declarative mapping from a column to a calendar event field. */
export interface ScheduleFieldMeta {
	role: ScheduleRole;
	/**
	 * Transform the raw cell value into what the role expects. Covers the cases where the stored
	 * value is not the event value directly, e.g. a status string mapped to a color, or an epoch
	 * number mapped to a `Date`. Receives the raw value and the full row.
	 */
	map?: (value: unknown, row: unknown) => unknown;
}

/**
 * The library-neutral event a row composes into. The schedule presentation adapts this to the
 * concrete `@mantine/schedule` event shape (formatting dates, mapping the resource id, etc.).
 * Keeping the intermediate shape free of any Mantine import is what lets `composeEvent` stay pure
 * and unit-testable without the optional dependency.
 */
export interface DataViewEvent<TData = unknown> {
	/** Stable id, from the core's `getRowId`. */
	id: string;
	title: string;
	start: Date;
	end: Date;
	color?: string;
	allDay?: boolean;
	/** Resource/group id, matching a row of the resources view. */
	resourceId?: string;
	/** The originating row, for custom renderers and interaction handlers. */
	row: TData;
}
