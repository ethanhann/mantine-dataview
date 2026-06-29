import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/colBuilder";
import { useDataView } from "../core/useDataView";
import type { DataViewWindow, Status } from "../types/state";
import { DataResourceSchedule } from "./DataResourceSchedule";

// Replace Mantine's ResourcesSchedule with a light double exposing the props we care about. It calls
// `renderResourceLabel` (when given) so the facet-count overlay is observable.
vi.mock("@mantine/schedule", () => ({
	ResourcesSchedule: (props: {
		resources: { id: string | number; label: string }[];
		view: string;
		events: { id: string | number; title: string }[];
		renderResourceLabel?: (r: {
			id: string | number;
			label: string;
		}) => ReactNode;
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
}: {
	rows?: Shift[];
	status?: Status;
	resources?: { id: string; label: string }[];
	window?: DataViewWindow;
	facets?: typeof ROOM_FACET;
	showResourceCounts?: boolean;
	onEventClick?: (row: Shift) => void;
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
			<DataResourceSchedule
				view={view}
				resources={resources}
				showResourceCounts={showResourceCounts}
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
});
