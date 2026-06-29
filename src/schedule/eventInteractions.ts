// Adapters that turn the first-class, typed interaction callbacks (move / resize / create) into the
// raw Mantine handlers. Mantine hands back an event id and `YYYY-MM-DD HH:mm:ss` strings; these
// resolve the typed row and parse `Date`s, so consumers work with their own data, not the wire shape.

import type { ScheduleEventData } from "@mantine/schedule";
import dayjs from "dayjs";
import type { MouseEvent } from "react";
import type { UseDataViewReturn } from "../types/options";
import { findEventRow } from "./resolveEvents";

/** A start/end pair as `Date`s. */
export interface EventRange {
	start: Date;
	end: Date;
}

/** Context for a move/resize: the Mantine event and (resource views) the target resource. */
export interface EventMoveContext {
	event: ScheduleEventData;
	resourceId?: string | number;
}

/** Context for a slot/range interaction (resource views supply `resourceId`). */
export interface SlotContext {
	resourceId?: string | number;
}

export type EventMoveHandler<TData> = (
	row: TData,
	range: EventRange,
	ctx: EventMoveContext,
) => void;

export type RangeSelectHandler = (range: EventRange, ctx: SlotContext) => void;

export type SlotClickHandler = (
	range: EventRange,
	ctx: SlotContext & { nativeEvent: MouseEvent<HTMLButtonElement> },
) => void;

/** Parse a Mantine datetime string (`YYYY-MM-DD HH:mm:ss`) to a `Date`. */
const dt = (value: string): Date => dayjs(value).toDate();

interface DragResizeData {
	eventId: string | number;
	newStart: string;
	newEnd: string;
	event: ScheduleEventData;
	resourceId?: string | number;
}

/** Adapts `onEventDrop`/`onEventResize` (same shape) → `handler(row, range, ctx)`. */
export function makeMoveHandler<TData>(
	view: UseDataViewReturn<TData>,
	handler: EventMoveHandler<TData> | undefined,
) {
	if (!handler) return undefined;
	return (data: DragResizeData) => {
		const row = findEventRow(view, data.eventId);
		if (row === undefined) return;
		handler(
			row,
			{ start: dt(data.newStart), end: dt(data.newEnd) },
			{ event: data.event, resourceId: data.resourceId },
		);
	};
}

interface SlotClickData {
	slotStart: string;
	slotEnd: string;
	nativeEvent: MouseEvent<HTMLButtonElement>;
	resourceId?: string | number;
}

/** Adapts `onTimeSlotClick` (both components) → `handler(range, ctx)`. */
export function makeSlotClickHandler(handler: SlotClickHandler | undefined) {
	if (!handler) return undefined;
	return (data: SlotClickData) =>
		handler(
			{ start: dt(data.slotStart), end: dt(data.slotEnd) },
			{ resourceId: data.resourceId, nativeEvent: data.nativeEvent },
		);
}

/** Adapts `Schedule.onSlotDragEnd` (positional args) → `handler(range, ctx)`. */
export function makeScheduleSlotDragHandler(
	handler: RangeSelectHandler | undefined,
) {
	if (!handler) return undefined;
	return (rangeStart: string, rangeEnd: string) =>
		handler({ start: dt(rangeStart), end: dt(rangeEnd) }, {});
}

/** Adapts `ResourcesSchedule.onSlotDragEnd` (object arg with `resourceId`) → `handler(range, ctx)`. */
export function makeResourceSlotDragHandler(
	handler: RangeSelectHandler | undefined,
) {
	if (!handler) return undefined;
	return (data: {
		rangeStart: string;
		rangeEnd: string;
		resourceId?: string | number;
	}) =>
		handler(
			{ start: dt(data.rangeStart), end: dt(data.rangeEnd) },
			{ resourceId: data.resourceId },
		);
}
