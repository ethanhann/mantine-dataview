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
} from "@mantine/schedule";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import type { DataViewSlots } from "../components/types";
import type { UseDataViewReturn } from "../types/options";
import { computeWindow } from "./dateWindow";
import { buildResourceCounts, deriveResources } from "./deriveResources";
import { resolveEvents, toggleEventSelection } from "./resolveEvents";
import { ScheduleShell } from "./ScheduleShell";
import { useWindowedView } from "./useWindowedView";

export interface DataResourceScheduleProps<TData> {
	/** The `useDataView` instance to project. */
	view: UseDataViewReturn<TData>;
	/**
	 * Resource rows. When omitted, derived from the `resource`-role column's filter options. Pass
	 * explicitly to control labels, colors, order, or payloads.
	 */
	resources?: ScheduleResourceData[];
	/** Override the declarative `meta.schedule` mapping; returns a Mantine event directly. */
	toEvent?: (row: TData) => ScheduleEventData;
	/** Fallback event length in minutes when only a start is resolvable. Default `60`. */
	defaultDuration?: number;
	/** Level used until the window is set (no `year` for resources). Default `"week"`. */
	defaultLevel?: ResourcesScheduleViewLevel;
	/** Color for events whose `color` role resolves to nothing. Default `"blue"`. */
	defaultColor?: MantineColor;
	/** Forwarded to Mantine's `<ResourcesSchedule>` (e.g. `renderResourceLabel`). */
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
	toEvent,
	defaultDuration,
	defaultLevel = "week",
	defaultColor = "blue",
	resourcesProps,
	showResourceCounts = true,
	slots,
	leftSection,
	rightSection,
}: DataResourceScheduleProps<TData>) {
	const { level, date } = useWindowedView(view, "resources", defaultLevel);
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
				return count == null ? (
					<>{resource.label}</>
				) : (
					<>
						{resource.label}{" "}
						<Text span size="sm" c="dimmed">
							({count})
						</Text>
					</>
				);
			}
		: undefined;

	const calendar = (
		<ResourcesSchedule
			resources={resolvedResources}
			events={events}
			date={date}
			view={resourceLevel}
			renderResourceLabel={renderResourceLabel}
			onViewChange={(next) => view.setWindow(computeWindow(date, next))}
			onDateChange={(next) =>
				view.setWindow(computeWindow(dayjs(next).toDate(), resourceLevel))
			}
			onEventClick={(event) => toggleEventSelection(view, event.id)}
			{...resourcesProps}
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
