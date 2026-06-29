import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/colBuilder";
import { useDataView } from "../core/useDataView";
import type { Status } from "../types/state";
import { DataAgenda } from "./DataAgenda";

// Replace Mantine's AgendaView with a light double so the tests assert OUR logic (event resolution,
// click → selection, nav, state gating) without the list internals.
vi.mock("@mantine/schedule", () => ({
	AgendaView: (props: {
		events: { id: string | number; title: string }[];
		onEventClick?: (
			e: { id: string | number; title: string },
			ev: unknown,
		) => void;
	}) => (
		<div data-testid="agenda">
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
		endsAt: "2026-06-28T10:00:00.000Z",
	},
];

function Harness({
	rows = ROWS,
	status = "success" as Status,
	withNav,
}: {
	rows?: Shift[];
	status?: Status;
	withNav?: boolean;
}) {
	const view = useDataView<Shift>({
		columns,
		rows,
		rowCount: rows.length,
		status,
		error: status === "error" ? new Error("boom") : undefined,
		getRowId: (r) => r.id,
	});
	return (
		<>
			<span data-testid="selection">{view.selection.count}</span>
			<DataAgenda view={view} withNav={withNav} />
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

describe("DataAgenda", () => {
	it("renders events from declarative roles in the list", () => {
		renderHarness();
		expect(screen.getByTestId("agenda")).toBeInTheDocument();
		expect(screen.getByText("Morning")).toBeInTheDocument();
	});

	it("toggles row selection on event click", async () => {
		const user = userEvent.setup();
		renderHarness();
		expect(screen.getByTestId("selection")).toHaveTextContent("0");
		await user.click(screen.getByTestId("event"));
		expect(screen.getByTestId("selection")).toHaveTextContent("1");
	});

	it("renders the agenda nav by default (AgendaView has none of its own)", () => {
		// Arrange / Act
		renderHarness();
		// Assert: the DataAgendaNav range selector, not the calendar's level selector. DataAgendaNav
		// offers Day/Week/Month and drops Year, which is what distinguishes it from DataScheduleNav.
		expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Day" })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Week" })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Month" })).toBeInTheDocument();
		expect(screen.queryByRole("radio", { name: "Year" })).toBeNull();
	});

	it("omits the nav when withNav is false", () => {
		renderHarness({ withNav: false });
		expect(screen.queryByRole("button", { name: "Today" })).toBeNull();
	});

	it("renders the error state with a retry action", () => {
		renderHarness({ rows: [], status: "error" });
		expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
		expect(screen.queryByTestId("agenda")).not.toBeInTheDocument();
	});
});
