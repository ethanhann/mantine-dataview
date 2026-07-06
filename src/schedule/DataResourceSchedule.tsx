// Resource presentation. Projects the same event data into a calendar with one row per resource.
// Events carry `resourceId` from the `resource` role (already produced by `composeScheduleEvent`);
// the resource rows come from an explicit `resources` prop or are derived from the resource-role
// column's filter options. `ResourcesSchedule` has only day/week/month levels (no year), so a `year`
// window is clamped to `month` for display. Ships from the optional `/schedule` subpath only.

import { type MantineColor, Text } from "@mantine/core";
import {
	ResourcesSchedule,
	type ResourcesScheduleProps,
	type ResourcesScheduleViewLevel,
	type ScheduleEventData,
	type ScheduleResourceData,
	type ScheduleResourceGroup,
} from "@mantine/schedule";
import dayjs from "dayjs";
import { type ReactNode, useEffect, useRef } from "react";
import type { DataViewSlots } from "../components/_shared/types";
import type { UseDataViewReturn } from "../types/options";
import { ScheduleShell } from "./_shared/ScheduleShell";
import { useWindowedView } from "./_shared/useWindowedView";
import { computeWindow } from "./dateWindow";
import { buildResourceCounts, deriveResources } from "./deriveResources";
import {
	type EventMoveHandler,
	makeMoveHandler,
	makeResourceSlotDragHandler,
	makeSlotClickHandler,
	type RangeSelectHandler,
	type SlotClickHandler,
} from "./events/eventInteractions";
import {
	type EventClickHandler,
	makeEventClickHandler,
	resolveEvents,
} from "./events/resolveEvents";

export interface DataResourceScheduleProps<TData> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	/**
	 * Resource rows. When omitted, derived from the `resource`-role column's filter options. Pass
	 * explicitly to control labels, colors, order, or payloads.
	 */
	resources?: ScheduleResourceData[];
	/**
	 * Resource groups (a rowspan column grouping several resources, e.g. "Building A" over rooms).
	 * Applied to all levels. Each `{ label, resourceIds }` references resource ids.
	 */
	groups?: ScheduleResourceGroup[];
	/** Custom render for a group label. Applied to all levels alongside `groups`. */
	renderGroupLabel?: (group: ScheduleResourceGroup) => ReactNode;
	/** Override the declarative `meta.schedule` mapping; returns a Mantine event directly. */
	toEvent?: (row: TData) => ScheduleEventData;
	/** Fallback event length in minutes when only a start is resolvable. Default `60`. */
	defaultDuration?: number;
	/** Level used until the window is set (no `year` for resources). Default `"week"`. */
	defaultLevel?: ResourcesScheduleViewLevel;
	/** Color for events whose `color` role resolves to nothing. Default `"blue"`. */
	defaultColor?: MantineColor;
	/** Called when an event is clicked, with the typed original row. Replaces the default selection toggle. */
	onEventClick?: EventClickHandler<TData>;
	/** Drag an event to a new time/resource. Receives the typed row, new `{ start, end }`, and
	 * `ctx.resourceId`. Enables drag-and-drop automatically. */
	onEventMove?: EventMoveHandler<TData>;
	/** Resize an event. Receives the typed row and the new `{ start, end }`. Enables resize automatically. */
	onEventResize?: EventMoveHandler<TData>;
	/** Drag-select a time range (to create); `ctx.resourceId` is the target row. Enables drag-select automatically. */
	onRangeSelect?: RangeSelectHandler;
	/** Click an empty slot (to create); `ctx.resourceId` is the target row. */
	onSlotClick?: SlotClickHandler;
	/** Forwarded to Mantine's `<ResourcesSchedule>` (e.g. `renderResourceLabel`). Raw handlers/flags
	 * here override the typed callbacks above. */
	resourcesProps?: Partial<ResourcesScheduleProps>;
	/**
	 * Show a per-resource count next to each row label when the `resource`-role column has a value
	 * facet in the response. Default `true`. A `renderResourceLabel` in `resourcesProps` overrides it.
	 */
	showResourceCounts?: boolean;
	/** Reuses the shared empty/error slots so states match the other views. */
	slots?: Pick<DataViewSlots<TData>, "Empty" | "ErrorState">;
	/** Custom content at the start of a header row above the calendar. */
	leftSection?: ReactNode;
	/** Custom content at the end of the header row (e.g. action buttons). */
	rightSection?: ReactNode;
}

export function DataResourceSchedule<TData>({
	view,
	resources,
	groups,
	renderGroupLabel,
	toEvent,
	defaultDuration,
	defaultLevel = "week",
	defaultColor = "blue",
	onEventClick,
	onEventMove,
	onEventResize,
	onRangeSelect,
	onSlotClick,
	resourcesProps,
	showResourceCounts = true,
	slots,
	leftSection,
	rightSection,
}: DataResourceScheduleProps<TData>) {
	const { level, date, firstDayOfWeek } = useWindowedView(
		view,
		"resources",
		defaultLevel,
	);
	const events = resolveEvents(view, {
		toEvent,
		defaultDuration,
		defaultColor,
	});

	// ResourcesSchedule has no `year` level; clamp it down for display.
	const resourceLevel: ResourcesScheduleViewLevel =
		level === "year" ? "month" : level;

	const allColumns = view.table.getAllColumns();
	const columns = allColumns.map((c) => c.columnDef);
	const resolvedResources = resources ?? deriveResources(columns);

	// Dev-only: warn once per mount when deriving yields no rows (no `resource`-role column with filter
	// options, and no explicit `resources`). A ref keeps a re-render from repeating the message.
	const derivedEmpty = !resources && resolvedResources.length === 0;
	const warnedRef = useRef(false);
	useEffect(() => {
		if (!derivedEmpty || warnedRef.current) return;
		if (
			typeof process !== "undefined" &&
			process.env.NODE_ENV !== "production"
		) {
			console.warn(
				"[mantine-dataview] resource view: no `resource`-role column with filter options found to derive resources from. Pass an explicit `resources` prop.",
			);
		}
		warnedRef.current = true;
	}, [derivedEmpty]);

	// Overlay server counts onto the (stable) resource rows when the resource column has a value
	// facet. The rows themselves never change with filtering — only the counts do. A consumer
	// `renderResourceLabel` in `resourcesProps` wins (it is spread after this default).
	const resourceColumn = allColumns.find(
		(c) => c.columnDef.meta?.schedule?.role === "resource",
	);
	const counts =
		showResourceCounts && resourceColumn
			? buildResourceCounts(view.facets[resourceColumn.id])
			: null;
	const renderResourceLabel = counts
		? (resource: ScheduleResourceData) => {
				const count = counts.get(String(resource.id));
				if (count == null) return resource.label;
				return (
					<>
						{resource.label}{" "}
						<Text span size="sm" c="dimmed">
							({count})
						</Text>
					</>
				);
			}
		: undefined;

	// `groups`/`renderGroupLabel` live on each per-view props, not on ResourcesSchedule itself, so fan
	// them out to all three. Group-cell styling (padding, width) is left to Mantine and the consumer
	// (via `resourcesProps` / `groupLabelWidth`); injecting our own breaks the merged rowspan cell.
	// Consumer per-view props are merged on top and win.
	const withGroups = <T extends object>(
		viewProps: T | undefined,
	): T | undefined => {
		if (!groups) return viewProps;
		return {
			groups,
			...(renderGroupLabel ? { renderGroupLabel } : {}),
			...viewProps,
		} as T;
	};

	const calendar = (
		<ResourcesSchedule
			resources={resolvedResources}
			events={events}
			date={date}
			view={resourceLevel}
			renderResourceLabel={renderResourceLabel}
			onViewChange={(next) =>
				view.setWindow(computeWindow(date, next, firstDayOfWeek))
			}
			onDateChange={(next) =>
				view.setWindow(
					computeWindow(dayjs(next).toDate(), resourceLevel, firstDayOfWeek),
				)
			}
			onEventClick={makeEventClickHandler(view, onEventClick)}
			withEventsDragAndDrop={onEventMove != null}
			onEventDrop={makeMoveHandler(view, onEventMove)}
			withEventResize={onEventResize != null}
			onEventResize={makeMoveHandler(view, onEventResize)}
			withDragSlotSelect={onRangeSelect != null}
			onSlotDragEnd={makeResourceSlotDragHandler(onRangeSelect)}
			onTimeSlotClick={makeSlotClickHandler(onSlotClick)}
			{...resourcesProps}
			dayViewProps={withGroups(resourcesProps?.dayViewProps)}
			weekViewProps={withGroups(resourcesProps?.weekViewProps)}
			monthViewProps={withGroups(resourcesProps?.monthViewProps)}
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
