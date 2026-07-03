import { MantineProvider, Text } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../../core/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewRequest } from "../../types/request";
import type { DataViewState, Status } from "../../types/state";
import { DataTable } from "../DataTable";
import type { DataViewSlots } from "../types";
import { DataCards } from "./DataCards";

interface User {
	id: string;
	name: string;
	email: string;
	status: string;
	age: number;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", {
		header: "Name",
		meta: { card: { role: "title" } },
	}),
	helper.accessor("email", {
		header: "Email",
		meta: { label: "Email", card: { role: "subtitle" } },
	}),
	helper.accessor("status", {
		header: "Status",
		meta: { label: "Status", card: { role: "badge" } },
	}),
	helper.accessor("age", { header: "Age", meta: { label: "Age" } }),
] satisfies DataColumnDef<User>[];

const sampleRows: User[] = [
	{ id: "1", name: "Ada", email: "ada@x.com", status: "active", age: 36 },
	{ id: "2", name: "Linus", email: "linus@x.com", status: "pending", age: 54 },
];

interface HarnessProps {
	rows?: User[];
	status?: Status;
	initialState?: Partial<DataViewState>;
	onRequestChange?: (request: DataViewRequest) => void;
	slots?: DataViewSlots<User>;
	renderCard?: React.ComponentProps<typeof DataCards<User>>["renderCard"];
}

function Harness(props: HarnessProps) {
	const view = useDataView<User>({
		columns,
		rows: props.rows ?? sampleRows,
		rowCount: props.rows?.length ?? sampleRows.length,
		status: props.status ?? "success",
		getRowId: (u) => u.id,
		onRequestChange: props.onRequestChange,
		initialState: props.initialState,
		debounce: 0,
	});
	return (
		<DataCards view={view} slots={props.slots} renderCard={props.renderCard} />
	);
}

const renderCards = (props: HarnessProps = {}) =>
	render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);

describe("DataCards", () => {
	it("gives the keyboard grid a default accessible name", () => {
		// Arrange / Act
		renderCards();

		// Assert
		expect(screen.getByRole("grid", { name: "Data grid" })).toBeInTheDocument();
	});

	it("composes cards from card roles", () => {
		renderCards();
		expect(screen.getByText("Ada")).toBeVisible(); // title
		expect(screen.getByText("ada@x.com")).toBeVisible(); // subtitle
		expect(screen.getByText("active")).toBeVisible(); // badge
		expect(screen.getAllByText("Age").length).toBeGreaterThan(0); // meta label
		expect(screen.getByText("36")).toBeVisible(); // meta value
	});

	it("mirrors columnVisibility so a hidden column drops its card field", () => {
		renderCards({ initialState: { columnVisibility: { age: false } } });
		expect(screen.queryByText("Age")).toBeNull();
		expect(screen.queryByText("36")).toBeNull();
	});

	it("uses the renderCard escape hatch when provided", () => {
		renderCards({
			renderCard: ({ data }) => <Text>Custom {data.name}</Text>,
		});
		expect(screen.getByText("Custom Ada")).toBeVisible();
		// Default composition (the badge) is bypassed.
		expect(screen.queryByText("active")).toBeNull();
	});

	it("wraps default content with the Card slot", () => {
		renderCards({
			slots: {
				Card: ({ children, row }) => (
					<div data-card-wrap={row.id}>{children}</div>
				),
			},
		});
		const wrapper = document.querySelector('[data-card-wrap="1"]');
		expect(wrapper).not.toBeNull();
		expect(wrapper?.textContent).toContain("Ada");
	});

	it("selects a card via its checkbox", async () => {
		renderCards();
		const checkbox = screen.getAllByLabelText("Select card")[0] as HTMLElement;
		expect(checkbox).not.toBeChecked();
		await userEvent.click(checkbox);
		expect(checkbox).toBeChecked();
	});

	it("renders skeleton cards while loading", () => {
		const { container } = renderCards({ status: "loading" });
		expect(
			container.querySelectorAll(".mantine-Skeleton-root").length,
		).toBeGreaterThan(0);
		expect(screen.queryByText("Ada")).toBeNull();
	});

	it("shows the empty and filtered-empty states", async () => {
		const { unmount } = renderCards({ rows: [], status: "success" });
		expect(screen.getByText("No results.")).toBeVisible();
		unmount();

		renderCards({
			rows: [],
			status: "success",
			initialState: { globalFilter: "zz" },
		});
		expect(screen.getByText("No matches.")).toBeVisible();
		await userEvent.click(
			screen.getByRole("button", { name: /Clear filters/ }),
		);
		expect(screen.getByText("No results.")).toBeVisible();
	});

	it("shows the error state and retries", async () => {
		const onRequestChange = vi.fn();
		renderCards({ status: "error", onRequestChange });
		const before = onRequestChange.mock.calls.length;
		expect(screen.getByText("Something went wrong.")).toBeVisible();
		await userEvent.click(screen.getByRole("button", { name: /Retry/ }));
		expect(onRequestChange.mock.calls.length).toBe(before + 1);
	});

	it("has no accessibility violations", async () => {
		const { container } = renderCards();
		expect(await axe(container)).toHaveNoViolations();
	});
});

describe("table and card parity", () => {
	function DualHarness() {
		const view = useDataView<User>({
			columns,
			rows: sampleRows,
			rowCount: sampleRows.length,
			getRowId: (u) => u.id,
			status: "success",
		});
		return (
			<>
				<DataTable view={view} />
				<DataCards view={view} />
			</>
		);
	}

	it("shares selection state across both presentations", async () => {
		render(
			<MantineProvider>
				<DualHarness />
			</MantineProvider>,
		);
		// Select the first row via the card overlay...
		await userEvent.click(
			screen.getAllByLabelText("Select card")[0] as HTMLElement,
		);
		// ...and the table's matching row checkbox reflects it (same core state).
		expect(screen.getAllByLabelText("Select row")[0]).toBeChecked();
	});
});
