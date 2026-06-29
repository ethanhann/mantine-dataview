import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/colBuilder";
import { useDataView } from "../core/useDataView";
import type { DataViewWindow, Status } from "../types/state";
import { DataResourceSchedule } from "./DataResourceSchedule";

// Replace Mantine's ResourcesSchedule with a light double exposing the props we care about.
vi.mock("@mantine/schedule", () => ({
	ResourcesSchedule: (props: {
		resources: { id: string | number; label: string }[];
		view: string;
		events: { id: string | number; title: string }[];
		onEventClick?: (
			e: { id: string | number; title: string },
			ev: unknown,
		) => void;
	}) => (
		<div
			data-testid="resources"
			data-view={props.view}
			data-resource-count={props.resources.length}
		>
			{props.resources.map((r) => (
				<span key={r.id} data-testid="resource">
					{r.label}
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

const ROWS: Shift[] = [
	{ id: "1", name: "Morning", startsAt: "2026-06-28T09:00:00.000Z", room: "A" },
];

const YEAR_WINDOW: DataViewWindow = {
	start: "2026-01-01T00:00:00.000Z",
	end: "2027-01-01T00:00:00.000Z",
	level: "year",
};

function Harness({
	rows = ROWS,
	status = "success" as Status,
	resources,
	window,
}: {
	rows?: Shift[];
	status?: Status;
	resources?: { id: string; label: string }[];
	window?: DataViewWindow;
}) {
	const view = useDataView<Shift>({
		columns,
		rows,
		rowCount: rows.length,
		status,
		getRowId: (r) => r.id,
		...(window ? { initialState: { view: "resources", window } } : {}),
	});
	return (
		<>
			<span data-testid="selection">{view.selection.count}</span>
			<DataResourceSchedule view={view} resources={resources} />
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
});
