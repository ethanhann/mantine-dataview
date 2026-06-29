import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/colBuilder";
import { useDataView } from "../core/useDataView";
import type { DataViewWindow, Status } from "../types/state";
import {
	DataResourceSchedule,
	type DataResourceScheduleProps,
} from "./DataResourceSchedule";

// Replace Mantine's ResourcesSchedule with a light double exposing the props we care about. It calls
// `renderResourceLabel` (when given) so the facet-count overlay is observable.
vi.mock("@mantine/schedule", () => ({
	ResourcesSchedule: (props: {
		resources: { id: string | number; label: string }[];
		view: string;
		events: { id: string | number; title: string }[];
		weekViewProps?: {
			groups?: { label: string }[];
			renderGroupLabel?: (g: { label: string }) => ReactNode;
		};
		renderResourceLabel?: (r: {
			id: string | number;
			label: string;
		}) => ReactNode;
		onEventClick?: (
			e: { id: string | number; title: string },
			ev: unknown,
		) => void;
		onEventDrop?: (data: {
			eventId: string;
			newStart: string;
			newEnd: string;
			event: { id: string };
			resourceId?: string;
		}) => void;
		onSlotDragEnd?: (data: {
			rangeStart: string;
			rangeEnd: string;
			resourceId?: string;
		}) => void;
		onViewChange?: (next: string) => void;
		onDateChange?: (next: string) => void;
	}) => (
		<div
			data-testid="resources"
			data-view={props.view}
			data-resource-count={props.resources.length}
		>
			<button
				type="button"
				data-testid="drop"
				onClick={() =>
					props.onEventDrop?.({
						eventId: "1",
						newStart: "2026-06-29 10:00:00",
						newEnd: "2026-06-29 11:00:00",
						event: { id: "1" },
						resourceId: "B",
					})
				}
			>
				drop
			</button>
			<button
				type="button"
				data-testid="rangeselect"
				onClick={() =>
					props.onSlotDragEnd?.({
						rangeStart: "2026-06-29 13:00:00",
						rangeEnd: "2026-06-29 14:00:00",
						resourceId: "A",
					})
				}
			>
				range
			</button>
			<button
				type="button"
				data-testid="viewchange"
				onClick={() => props.onViewChange?.("day")}
			>
				view
			</button>
			<button
				type="button"
				data-testid="datechange"
				onClick={() => props.onDateChange?.("2026-09-15")}
			>
				date
			</button>
			{props.weekViewProps?.groups?.map((g) => (
				<div key={g.label} data-testid="group">
					{props.weekViewProps?.renderGroupLabel
						? props.weekViewProps.renderGroupLabel(g)
						: g.label}
				</div>
			))}
			{props.resources.map((r) => (
				<span key={r.id} data-testid="resource">
					{props.renderResourceLabel ? props.renderResourceLabel(r) : r.label}
				</span>
			))}
			{props.events.map((e) => (
				<button
					type="button"
					key={e.id}
					data-testid="event"
					onClick={(ev) => props.onEventClick?.(e, ev)}
				>
					{e.title}
				</button>
			))}
		</div>
	),
}));

interface Shift {
	id: string;
	name: string;
	startsAt: string;
	room: string;
}

const columns = col<Shift>()
	.text("name", { schedule: "title" })
	.date("startsAt", { schedule: "start" })
	.select("room", {
		schedule: "resource",
		options: [
			{ value: "A", label: "Room A" },
			{ value: "B", label: "Room B" },
		],
	})
	.build();

// No `resource`-role column with options, so deriving yields nothing and the component warns.
const noResourceColumns = col<Shift>()
	.text("name", { schedule: "title" })
	.date("startsAt", { schedule: "start" })
	.build();

const ROWS: Shift[] = [
	{ id: "1", name: "Morning", startsAt: "2026-06-28T09:00:00.000Z", room: "A" },
];

const YEAR_WINDOW: DataViewWindow = {
	start: "2026-01-01T00:00:00.000Z",
	end: "2027-01-01T00:00:00.000Z",
	level: "year",
};

const ROOM_FACET = {
	room: {
		type: "values" as const,
		values: [
			{ value: "A", count: 12 },
			{ value: "B", count: 3 },
		],
	},
};

function Harness({
	rows = ROWS,
	status = "success" as Status,
	resources,
	window,
	facets,
	showResourceCounts,
	onEventClick,
	groups,
	onEventMove,
	onRangeSelect,
}: {
	rows?: Shift[];
	status?: Status;
	resources?: { id: string; label: string }[];
	window?: DataViewWindow;
	facets?: typeof ROOM_FACET;
	showResourceCounts?: boolean;
	onEventClick?: (row: Shift) => void;
	groups?: { label: string; resourceIds: string[] }[];
	onEventMove?: DataResourceScheduleProps<Shift>["onEventMove"];
	onRangeSelect?: DataResourceScheduleProps<Shift>["onRangeSelect"];
}) {
	const view = useDataView<Shift>({
		columns,
		rows,
		rowCount: rows.length,
		status,
		getRowId: (r) => r.id,
		facets,
		...(window ? { initialState: { view: "resources", window } } : {}),
	});
	return (
		<>
			<span data-testid="selection">{view.selection.count}</span>
			<span data-testid="window">
				{JSON.stringify(view.state.window ?? null)}
			</span>
			<DataResourceSchedule
				view={view}
				resources={resources}
				showResourceCounts={showResourceCounts}
				onEventClick={onEventClick}
				groups={groups}
				onEventMove={onEventMove}
				onRangeSelect={onRangeSelect}
			/>
		</>
	);
}

function renderHarness(
	props: Parameters<typeof Harness>[0] = {},
	wrapper: (children: ReactNode) => ReactNode = (c) => c,
) {
	return render(
		<MantineProvider>{wrapper(<Harness {...props} />)}</MantineProvider>,
	);
}

function readWindow(): DataViewWindow | null {
	return JSON.parse(screen.getByTestId("window").textContent || "null");
}

describe("DataResourceSchedule", () => {
	it("derives resource rows from the resource-role column's options", () => {
		renderHarness();
		expect(screen.getByTestId("resources")).toHaveAttribute(
			"data-resource-count",
			"2",
		);
		expect(screen.getByText("Room A")).toBeInTheDocument();
		expect(screen.getByText("Room B")).toBeInTheDocument();
	});

	it("uses an explicit resources prop over derivation", () => {
		renderHarness({ resources: [{ id: "solo", label: "Solo Room" }] });
		expect(screen.getByTestId("resources")).toHaveAttribute(
			"data-resource-count",
			"1",
		);
		expect(screen.getByText("Solo Room")).toBeInTheDocument();
	});

	it("clamps a year window down to month (resources has no year level)", () => {
		renderHarness({ window: YEAR_WINDOW });
		expect(screen.getByTestId("resources")).toHaveAttribute(
			"data-view",
			"month",
		);
	});

	it("toggles row selection on event click", async () => {
		const user = userEvent.setup();
		renderHarness();
		expect(screen.getByTestId("selection")).toHaveTextContent("0");
		await user.click(screen.getByTestId("event"));
		expect(screen.getByTestId("selection")).toHaveTextContent("1");
	});

	it("calls a first-class onEventClick with the typed row", async () => {
		const user = userEvent.setup();
		const onEventClick = vi.fn<(row: Shift) => void>();
		renderHarness({ onEventClick });
		await user.click(screen.getByTestId("event"));
		expect(onEventClick).toHaveBeenCalledTimes(1);
		expect(onEventClick.mock.calls[0]?.[0]).toEqual(ROWS[0]);
		expect(screen.getByTestId("selection")).toHaveTextContent("0");
	});

	it("fans the groups prop out to the per-view props", () => {
		renderHarness({
			groups: [{ label: "Building A", resourceIds: ["A", "B"] }],
		});
		expect(screen.getByTestId("group")).toHaveTextContent("Building A");
	});

	it("onEventMove includes the target resourceId in ctx", async () => {
		const user = userEvent.setup();
		const onEventMove = vi.fn<
			DataResourceScheduleProps<Shift>["onEventMove"] & object
		>();
		renderHarness({ onEventMove });
		await user.click(screen.getByTestId("drop"));
		const [row, range, ctx] = onEventMove.mock.calls[0]!;
		expect(row).toEqual(ROWS[0]);
		expect(range.start).toBeInstanceOf(Date);
		expect(ctx.resourceId).toBe("B");
	});

	it("onRangeSelect uses the resource object form and carries resourceId", async () => {
		const user = userEvent.setup();
		const onRangeSelect = vi.fn<
			DataResourceScheduleProps<Shift>["onRangeSelect"] & object
		>();
		renderHarness({ onRangeSelect });
		await user.click(screen.getByTestId("rangeselect"));
		const [range, ctx] = onRangeSelect.mock.calls[0]!;
		expect(range.start).toBeInstanceOf(Date);
		expect(ctx.resourceId).toBe("A");
	});

	it("overlays facet counts on the resource rows when a value facet is present", () => {
		renderHarness({ facets: ROOM_FACET });
		expect(screen.getByText("(12)")).toBeInTheDocument();
		expect(screen.getByText("(3)")).toBeInTheDocument();
		// The stable row labels are still present alongside the counts.
		expect(screen.getByText("Room A")).toBeInTheDocument();
	});

	it("omits counts when showResourceCounts is false", () => {
		renderHarness({ facets: ROOM_FACET, showResourceCounts: false });
		expect(screen.queryByText("(12)")).toBeNull();
		expect(screen.getByText("Room A")).toBeInTheDocument();
	});

	it("shows no counts when the response carries no facet", () => {
		renderHarness();
		expect(screen.queryByText("(12)")).toBeNull();
	});

	it("warns once when deriving finds no resource column, even across re-renders", () => {
		// Arrange
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		function WarnHarness() {
			const view = useDataView<Shift>({
				columns: noResourceColumns,
				rows: ROWS,
				rowCount: ROWS.length,
				status: "success",
				getRowId: (r) => r.id,
			});
			return <DataResourceSchedule view={view} />;
		}
		const tree = (
			<MantineProvider>
				<WarnHarness />
			</MantineProvider>
		);
		// Act
		const { rerender } = render(tree);
		rerender(tree);
		// Assert: the dev warning fired exactly once despite the second render.
		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn.mock.calls[0]?.[0]).toContain("resource view");
		warn.mockRestore();
	});

	it("changes the window level when the grid reports a view change", async () => {
		// Arrange
		const user = userEvent.setup();
		renderHarness();
		expect(readWindow()?.level).toBe("week"); // seeded on mount
		// Act
		await user.click(screen.getByTestId("viewchange"));
		// Assert
		expect(readWindow()?.level).toBe("day");
	});

	it("recenters the window on the picked date when the grid reports a date change", async () => {
		// Arrange
		const user = userEvent.setup();
		renderHarness();
		// Act
		await user.click(screen.getByTestId("datechange"));
		// Assert: the new window brackets 2026-09-15 at the current (week) level.
		const w = readWindow();
		const picked = dayjs("2026-09-15").valueOf();
		expect(w?.level).toBe("week");
		expect(picked).toBeGreaterThanOrEqual(dayjs(w?.start).valueOf());
		expect(picked).toBeLessThan(dayjs(w?.end).valueOf());
	});

	it("aligns the navigated window to a Sunday DatesProvider firstDayOfWeek", async () => {
		// Arrange
		const user = userEvent.setup();
		renderHarness({}, (children) => (
			<DatesProvider settings={{ firstDayOfWeek: 0 }}>{children}</DatesProvider>
		));
		// Act
		await user.click(screen.getByTestId("datechange"));
		// Assert
		const w = readWindow();
		const picked = dayjs("2026-09-15").valueOf();
		expect(dayjs(w?.start).day()).toBe(0);
		expect(picked).toBeGreaterThanOrEqual(dayjs(w?.start).valueOf());
		expect(picked).toBeLessThan(dayjs(w?.end).valueOf());
	});
});
