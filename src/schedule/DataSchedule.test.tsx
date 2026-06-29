import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/colBuilder";
import { useDataView } from "../core/useDataView";
import type { Status } from "../types/state";
import { DataSchedule } from "./DataSchedule";

// Replace Mantine's calendar with a lightweight double so the tests assert OUR logic (event
// composition, click → selection, state gating) without depending on the scheduler's internals.
vi.mock("@mantine/schedule", () => ({
	Schedule: (props: {
		events: { id: string | number; title: string }[];
		view: string;
		onEventClick?: (
			e: { id: string | number; title: string },
			ev: unknown,
		) => void;
	}) => (
		<div data-testid="schedule" data-view={props.view}>
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
			<DataSchedule
				view={view}
				toEvent={toEvent}
				leftSection={leftSection}
				rightSection={rightSection}
				onEventClick={onEventClick}
			/>
		</>
	);
}

function renderHarness(props: Parameters<typeof Harness>[0] = {}) {
	return render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);
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
});
