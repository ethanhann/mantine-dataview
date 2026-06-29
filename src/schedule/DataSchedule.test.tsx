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
import { DataSchedule, type DataScheduleProps } from "./DataSchedule";

// Replace Mantine's calendar with a lightweight double so the tests assert OUR logic (event
// composition, click → selection, state gating) without depending on the scheduler's internals.
type DropData = {
	eventId: string;
	newStart: string;
	newEnd: string;
	event: { id: string };
};
vi.mock("@mantine/schedule", () => ({
	Schedule: (props: {
		events: { id: string | number; title: string }[];
		view: string;
		withEventsDragAndDrop?: boolean;
		withEventResize?: boolean;
		withDragSlotSelect?: boolean;
		onEventClick?: (
			e: { id: string | number; title: string },
			ev: unknown,
		) => void;
		onEventDrop?: (data: DropData) => void;
		onEventResize?: (data: DropData) => void;
		onSlotDragEnd?: (rangeStart: string, rangeEnd: string) => void;
		onTimeSlotClick?: (data: {
			slotStart: string;
			slotEnd: string;
			nativeEvent: unknown;
		}) => void;
		onViewChange?: (next: string) => void;
		onDateChange?: (next: string) => void;
	}) => (
		<div
			data-testid="schedule"
			data-view={props.view}
			data-dnd={String(!!props.withEventsDragAndDrop)}
			data-resize={String(!!props.withEventResize)}
			data-dragselect={String(!!props.withDragSlotSelect)}
		>
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
			<button
				type="button"
				data-testid="drop"
				onClick={() =>
					props.onEventDrop?.({
						eventId: "1",
						newStart: "2026-06-29 10:00:00",
						newEnd: "2026-06-29 11:00:00",
						event: { id: "1" },
					})
				}
			>
				drop
			</button>
			<button
				type="button"
				data-testid="resize"
				onClick={() =>
					props.onEventResize?.({
						eventId: "1",
						newStart: "2026-06-29 09:00:00",
						newEnd: "2026-06-29 12:00:00",
						event: { id: "1" },
					})
				}
			>
				resize
			</button>
			<button
				type="button"
				data-testid="rangeselect"
				onClick={() =>
					props.onSlotDragEnd?.("2026-06-29 13:00:00", "2026-06-29 14:00:00")
				}
			>
				range
			</button>
			<button
				type="button"
				data-testid="slotclick"
				onClick={(ev) =>
					props.onTimeSlotClick?.({
						slotStart: "2026-06-29 15:00:00",
						slotEnd: "2026-06-29 15:30:00",
						nativeEvent: ev,
					})
				}
			>
				slot
			</button>
			<button
				type="button"
				data-testid="viewchange"
				onClick={() => props.onViewChange?.("month")}
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
		</div>
	),
}));

interface Shift {
	id: string;
	name: string;
	startsAt: string;
	endsAt: string;
}

const columns = col<Shift>()
	.text("name", { schedule: "title" })
	.date("startsAt", { schedule: "start" })
	.date("endsAt", { schedule: "end" })
	.build();

const ROWS: Shift[] = [
	{
		id: "1",
		name: "Morning",
		startsAt: "2026-06-28T09:00:00.000Z",
		endsAt: "2026-06-28T11:00:00.000Z",
	},
	{
		id: "2",
		name: "Evening",
		startsAt: "2026-06-28T18:00:00.000Z",
		endsAt: "2026-06-28T20:00:00.000Z",
	},
];

function Harness({
	rows = ROWS,
	status = "success" as Status,
	toEvent,
	globalFilter,
	leftSection,
	rightSection,
	onEventClick,
	onEventMove,
	onEventResize,
	onRangeSelect,
	onSlotClick,
}: {
	rows?: Shift[];
	status?: Status;
	toEvent?: (row: Shift) => {
		id: string;
		title: string;
		start: Date;
		end: Date;
		color: string;
	};
	globalFilter?: string;
	leftSection?: ReactNode;
	rightSection?: ReactNode;
	onEventClick?: (row: Shift) => void;
	onEventMove?: DataScheduleProps<Shift>["onEventMove"];
	onEventResize?: DataScheduleProps<Shift>["onEventResize"];
	onRangeSelect?: DataScheduleProps<Shift>["onRangeSelect"];
	onSlotClick?: DataScheduleProps<Shift>["onSlotClick"];
}) {
	const view = useDataView<Shift>({
		columns,
		rows,
		rowCount: rows.length,
		status,
		error: status === "error" ? new Error("boom") : undefined,
		getRowId: (r) => r.id,
		...(globalFilter ? { initialState: { globalFilter } } : {}),
	});
	return (
		<>
			<span data-testid="selection">{view.selection.count}</span>
			<span data-testid="window">
				{JSON.stringify(view.state.window ?? null)}
			</span>
			<DataSchedule
				view={view}
				toEvent={toEvent}
				leftSection={leftSection}
				rightSection={rightSection}
				onEventClick={onEventClick}
				onEventMove={onEventMove}
				onEventResize={onEventResize}
				onRangeSelect={onRangeSelect}
				onSlotClick={onSlotClick}
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

describe("DataSchedule", () => {
	it("renders one event per row from declarative roles", () => {
		renderHarness();
		const events = screen.getAllByTestId("event");
		expect(events).toHaveLength(2);
		expect(screen.getByText("Morning")).toBeInTheDocument();
		expect(screen.getByText("Evening")).toBeInTheDocument();
	});

	it("uses toEvent override when provided", () => {
		renderHarness({
			toEvent: (r) => ({
				id: r.id,
				title: `Custom ${r.name}`,
				start: new Date(r.startsAt),
				end: new Date(r.endsAt),
				color: "grape",
			}),
		});
		expect(screen.getByText("Custom Morning")).toBeInTheDocument();
	});

	it("toggles row selection on event click", async () => {
		const user = userEvent.setup();
		renderHarness();
		expect(screen.getByTestId("selection")).toHaveTextContent("0");
		await user.click(screen.getAllByTestId("event")[0]!);
		expect(screen.getByTestId("selection")).toHaveTextContent("1");
	});

	it("calls a first-class onEventClick with the typed row instead of selecting", async () => {
		const user = userEvent.setup();
		const onEventClick = vi.fn<(row: Shift) => void>();
		renderHarness({ onEventClick });
		await user.click(screen.getByText("Morning"));
		expect(onEventClick).toHaveBeenCalledTimes(1);
		expect(onEventClick.mock.calls[0]?.[0]).toEqual(ROWS[0]);
		// The default selection toggle is replaced by the custom handler.
		expect(screen.getByTestId("selection")).toHaveTextContent("0");
	});

	it("shows a skeleton (not the calendar) on first load with no rows", () => {
		renderHarness({ rows: [], status: "loading" });
		expect(screen.queryByTestId("schedule")).not.toBeInTheDocument();
	});

	it("renders the error state with a retry action", () => {
		renderHarness({ rows: [], status: "error" });
		expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
	});

	it("renders an empty calendar (not a message) when unfiltered and empty", () => {
		renderHarness({ rows: [] });
		expect(screen.getByTestId("schedule")).toBeInTheDocument();
		expect(screen.queryAllByTestId("event")).toHaveLength(0);
	});

	it("shows the filtered-empty affordance when a filter is active and empty", () => {
		renderHarness({ rows: [], globalFilter: "zzz" });
		expect(screen.getByText("No matches.")).toBeInTheDocument();
	});

	it("renders header leftSection and rightSection above the calendar", () => {
		renderHarness({
			leftSection: <span>Team calendar</span>,
			rightSection: <button type="button">Refresh</button>,
		});
		expect(screen.getByText("Team calendar")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
		expect(screen.getByTestId("schedule")).toBeInTheDocument();
	});

	it("keeps the header sections visible across the error state", () => {
		renderHarness({
			rows: [],
			status: "error",
			leftSection: <span>Team calendar</span>,
		});
		// Header persists even though the calendar body is replaced by the error state.
		expect(screen.getByText("Team calendar")).toBeInTheDocument();
		expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
		expect(screen.queryByTestId("schedule")).not.toBeInTheDocument();
	});

	it("enables interaction flags only when the matching handler is given", () => {
		renderHarness();
		const grid = screen.getByTestId("schedule");
		expect(grid).toHaveAttribute("data-dnd", "false");
		expect(grid).toHaveAttribute("data-resize", "false");
		expect(grid).toHaveAttribute("data-dragselect", "false");

		renderHarness({
			onEventMove: () => {},
			onEventResize: () => {},
			onRangeSelect: () => {},
		});
		const grids = screen.getAllByTestId("schedule");
		const enabled = grids[grids.length - 1]!;
		expect(enabled).toHaveAttribute("data-dnd", "true");
		expect(enabled).toHaveAttribute("data-resize", "true");
		expect(enabled).toHaveAttribute("data-dragselect", "true");
	});

	it("onEventMove receives the typed row and a Date range", async () => {
		const user = userEvent.setup();
		const onEventMove = vi.fn<
			DataScheduleProps<Shift>["onEventMove"] & object
		>();
		renderHarness({ onEventMove });
		await user.click(screen.getByTestId("drop"));
		expect(onEventMove).toHaveBeenCalledTimes(1);
		const [row, range] = onEventMove.mock.calls[0]!;
		expect(row).toEqual(ROWS[0]);
		expect(range.start).toBeInstanceOf(Date);
		expect(range.end).toBeInstanceOf(Date);
		expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
	});

	it("onEventResize receives the typed row and a Date range", async () => {
		const user = userEvent.setup();
		const onEventResize = vi.fn<
			DataScheduleProps<Shift>["onEventResize"] & object
		>();
		renderHarness({ onEventResize });
		await user.click(screen.getByTestId("resize"));
		expect(onEventResize.mock.calls[0]?.[0]).toEqual(ROWS[0]);
	});

	it("onRangeSelect and onSlotClick receive a Date range", async () => {
		const user = userEvent.setup();
		const onRangeSelect = vi.fn<
			DataScheduleProps<Shift>["onRangeSelect"] & object
		>();
		const onSlotClick = vi.fn<
			DataScheduleProps<Shift>["onSlotClick"] & object
		>();
		renderHarness({ onRangeSelect, onSlotClick });
		await user.click(screen.getByTestId("rangeselect"));
		await user.click(screen.getByTestId("slotclick"));
		expect(onRangeSelect.mock.calls[0]?.[0].start).toBeInstanceOf(Date);
		expect(onSlotClick.mock.calls[0]?.[0].start).toBeInstanceOf(Date);
	});

	it("changes the window level when the calendar reports a view change", async () => {
		// Arrange
		const user = userEvent.setup();
		renderHarness();
		expect(readWindow()?.level).toBe("week"); // seeded on mount
		// Act
		await user.click(screen.getByTestId("viewchange"));
		// Assert
		expect(readWindow()?.level).toBe("month");
	});

	it("recenters the window on the picked date, keeping the level, on a date change", async () => {
		// Arrange
		const user = userEvent.setup();
		renderHarness();
		// Act
		await user.click(screen.getByTestId("datechange"));
		// Assert: the new window is the week bracketing 2026-09-15 (a Monday-aligned default week).
		const w = readWindow();
		const picked = dayjs("2026-09-15").valueOf();
		expect(w?.level).toBe("week");
		expect(dayjs(w?.start).day()).toBe(1);
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
		// Assert: the date-change path threads firstDayOfWeek, so the week starts on Sunday.
		const w = readWindow();
		const picked = dayjs("2026-09-15").valueOf();
		expect(dayjs(w?.start).day()).toBe(0);
		expect(picked).toBeGreaterThanOrEqual(dayjs(w?.start).valueOf());
		expect(picked).toBeLessThan(dayjs(w?.end).valueOf());
	});
});
