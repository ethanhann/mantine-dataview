import { Stack } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { DataViewer } from "../components/DataViewer";
import { useDataViewFetcher } from "../core/useDataViewFetcher";
import {
	DataSchedule,
	DataScheduleNav,
	type ScheduleEventData,
	scheduleView,
} from "../schedule";
import { type Booking, createEventFetcher, eventColumns } from "./eventData";
// The schedule presentation requires Mantine's schedule styles in addition to core/dates styles.
// @ts-expect-error CSS import has no type declarations
import "@mantine/schedule/styles.css";

/**
 * `DataSchedule` is the third projection of the same core state: each row becomes a calendar event.
 * It is read-only apart from click-to-select, and its date navigation drives the core's `window`
 * slice so the fetcher loads exactly the visible range. Ships from the optional
 * `@ethanhann/mantine-dataview/schedule` subpath.
 *
 * Events are mapped from columns declaratively via `meta.schedule` roles (`start`, `end`/`duration`,
 * `title`, `color`, `resource`), or with a `toEvent` override.
 */
const meta: Meta<typeof DataSchedule> = {
	title: "DataSchedule",
	component: DataSchedule,
	parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof DataSchedule>;

const getRowId = (b: Booking) => b.id;

/** Events mapped from declarative `meta.schedule` roles; colored by status via a `map`. */
export const Default: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			return <DataSchedule view={view} />;
		}
		return <Example />;
	},
};

/**
 * The standalone `DataScheduleNav` (prev / today / next + level) placed above the calendar. It
 * drives the same `window` slice as the calendar's built-in header.
 */
export const WithExternalNav: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			return (
				<Stack>
					<DataScheduleNav view={view} />
					<DataSchedule view={view} />
				</Stack>
			);
		}
		return <Example />;
	},
};

/**
 * The headline integration: one `DataViewer` driven by one fetcher, switchable between **table**,
 * **cards**, and **schedule** at runtime. Registering `scheduleView()` adds the Schedule chip to
 * the switcher; in schedule mode the toolbar drops the sort/column controls and the pager
 * disappears (the calendar fetches by date window instead). Search and filters apply across all
 * three views.
 */
export const IntegratedDataViewer: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			return <DataViewer view={view} views={[scheduleView<Booking>()]} />;
		}
		return <Example />;
	},
};

/** Opens on the month view by default. */
export const MonthView: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			return <DataSchedule view={view} defaultLevel="month" />;
		}
		return <Example />;
	},
};

/**
 * The `toEvent` escape hatch bypasses declarative roles entirely, returning a `@mantine/schedule`
 * event directly. Useful when the event shape is derived rather than column-backed.
 */
export const WithToEvent: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			const toEvent = (b: Booking): ScheduleEventData => ({
				id: b.id,
				title: `${b.title} · ${b.room}`,
				start: new Date(b.start),
				end: new Date(b.end),
				color: b.status === "cancelled" ? "gray" : "indigo",
			});
			return <DataSchedule view={view} toEvent={toEvent} />;
		}
		return <Example />;
	},
};
