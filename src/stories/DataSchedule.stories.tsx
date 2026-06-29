import { Button, Group, Stack, Text } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { DataViewer } from "../components/DataViewer";
import { useDataViewFetcher } from "../core/useDataViewFetcher";
import {
	agendaView,
	DataAgenda,
	DataResourceSchedule,
	DataSchedule,
	DataScheduleNav,
	resourcesView,
	type ScheduleEventData,
	scheduleInitialState,
	scheduleView,
} from "../schedule";
import { windowHistoryAdapter } from "../url";
import { type Booking, createEventFetcher, eventColumns } from "./eventData";
import { UrlReadout } from "./UrlReadout";
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
 * Schedule as the **only** view — the analog of forcing cards. There is no responsive
 * `forceScheduleBelow` (that fallback is cards-specific), but you can lock a `DataViewer` to the
 * calendar: register the schedule view, open on it via `scheduleInitialState()` (which seeds both
 * the view and the window so the first fetch is already windowed — no double fetch), and hide the
 * switcher (here via a manual composition with `showViewSwitcher={false}`). The toolbar's search and
 * filters still apply across the calendar; there is no table/cards toggle and no pager.
 */
export const ScheduleOnly: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const initialState = useMemo(() => scheduleInitialState("week"), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
				initialState,
			});
			return (
				<DataViewer view={view} views={[scheduleView<Booking>()]}>
					<DataViewer.Toolbar showViewSwitcher={false} />
					<DataViewer.BulkActions />
					<DataViewer.Body />
					<DataViewer.Pagination />
				</DataViewer>
			);
		}
		return <Example />;
	},
};

/**
 * `leftSection` / `rightSection` slot custom controls into a header row above the calendar — the
 * schedule analog of the toolbar's sections. The header persists across the loading, error, and
 * empty states. These also flow through `scheduleView({ leftSection, rightSection })`.
 */
export const WithHeaderSections: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			return (
				<DataSchedule
					view={view}
					leftSection={<Text fw={600}>Team calendar</Text>}
					rightSection={
						<Group gap="xs">
							<Button
								size="xs"
								variant="default"
								onClick={() => view.refetch()}
							>
								Refresh
							</Button>
							<Button size="xs">New event</Button>
						</Group>
					}
				/>
			);
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

/**
 * Agenda — the same events as a date-grouped list. `AgendaView` has no navigation of its own, so
 * `DataAgenda` renders a `DataScheduleNav` header by default.
 */
export const AgendaOnly: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			return <DataAgenda view={view} />;
		}
		return <Example />;
	},
};

/**
 * Resources — one row per resource. The rows are derived from the `room` column's filter options
 * (its `meta.schedule.role` is `"resource"`); pass an explicit `resources` prop to control labels,
 * colors, or order.
 */
export const ResourcesOnly: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			return <DataResourceSchedule view={view} />;
		}
		return <Example />;
	},
};

/**
 * The full switcher: one `DataViewer` registering all three schedule-family views, switchable
 * between **Table / Cards / Calendar / Agenda / Resources** at runtime on the same event data and
 * date window. Switching among the windowed views reuses the loaded window (no refetch).
 */
export const FullSwitcher: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
			});
			return (
				<DataViewer
					view={view}
					views={[
						scheduleView<Booking>(),
						agendaView<Booking>(),
						resourcesView<Booking>(),
					]}
				/>
			);
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
 * URL-synced: the active view and the schedule's visible window round-trip through the query
 * string (`?view=schedule&ws=…&we=…&wl=week`). Window sync is opt-in — list `"window"` in
 * `urlSync.include`. Switch to Schedule and navigate the calendar; the live readout below shows the
 * query string updating (Storybook's iframe URL isn't visible in the address bar).
 */
export const UrlSynced: Story = {
	render: () => {
		function Example() {
			const fetcher = useMemo(() => createEventFetcher(), []);
			const adapter = useMemo(() => windowHistoryAdapter(), []);
			const view = useDataViewFetcher<Booking>({
				columns: eventColumns,
				getRowId,
				fetcher,
				urlSync: {
					adapter,
					include: [
						"pagination",
						"sorting",
						"columnFilters",
						"globalFilter",
						"view",
						"window",
					],
				},
			});
			return (
				<Stack gap="xs">
					<DataViewer view={view} views={[scheduleView<Booking>()]} />
					<UrlReadout />
				</Stack>
			);
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
