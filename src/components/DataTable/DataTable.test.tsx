import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../../core/state/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewRequest } from "../../types/request";
import type { DataViewState, Status } from "../../types/state";
import type { DataViewSlots } from "../_shared/types";
import { DataTable } from "./DataTable";

interface User {
	id: string;
	name: string;
	email: string;
	age: number;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { header: "Name" }),
	helper.accessor("email", { header: "Email", enableSorting: false }),
	helper.accessor("age", { header: "Age", meta: { align: "right" } }),
] satisfies DataColumnDef<User>[];

const sampleRows: User[] = [
	{ id: "1", name: "Ada", email: "ada@x.com", age: 36 },
	{ id: "2", name: "Linus", email: "linus@x.com", age: 54 },
];

interface HarnessProps {
	rows?: User[];
	status?: Status;
	initialState?: Partial<DataViewState>;
	onRequestChange?: (request: DataViewRequest) => void;
	slots?: DataViewSlots<User>;
	enableSelection?: boolean;
	enableColumnResizing?: boolean;
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
		enableColumnResizing: props.enableColumnResizing,
		debounce: 0,
	});
	return (
		<>
			<span data-testid="sizing">
				{JSON.stringify(view.state.columnSizing)}
			</span>
			<DataTable
				view={view}
				slots={props.slots}
				enableSelection={props.enableSelection}
				data-testid="dt"
			/>
		</>
	);
}

const renderTable = (props: HarnessProps = {}) =>
	render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);

describe("DataTable", () => {
	it("renders headers and data rows", () => {
		renderTable();
		expect(screen.getByRole("columnheader", { name: /Name/ })).toBeVisible();
		expect(screen.getByText("Ada")).toBeVisible();
		expect(screen.getByText("linus@x.com")).toBeVisible();
	});

	it("toggles sorting from a sortable header and exposes aria-sort", async () => {
		const onRequestChange = vi.fn();
		renderTable({ onRequestChange });
		await userEvent.click(screen.getByRole("button", { name: /Name/ }));
		expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
			"aria-sort",
			"ascending",
		);
		expect(onRequestChange).toHaveBeenCalled();
	});

	it("does not make non-sortable headers interactive", () => {
		renderTable();
		expect(screen.queryByRole("button", { name: /Email/ })).toBeNull();
	});

	it("selects a row via its checkbox", async () => {
		renderTable();
		const rowCheckbox = screen.getAllByLabelText("Select row")[0];
		expect(rowCheckbox).not.toBeChecked();
		await userEvent.click(rowCheckbox as HTMLElement);
		expect(rowCheckbox).toBeChecked();
	});

	it("select-all toggles every row on the page", async () => {
		renderTable();
		await userEvent.click(
			screen.getByLabelText("Select all rows on this page"),
		);
		for (const cb of screen.getAllByLabelText("Select row")) {
			expect(cb).toBeChecked();
		}
	});

	it("respects column visibility from state", () => {
		renderTable({ initialState: { columnVisibility: { email: false } } });
		expect(screen.queryByRole("columnheader", { name: /Email/ })).toBeNull();
		expect(screen.queryByText("ada@x.com")).toBeNull();
	});

	it("applies meta.align to cells", () => {
		renderTable();
		expect(screen.getByText("36")).toHaveStyle({ textAlign: "right" });
	});

	it("renders skeleton rows while loading", () => {
		const { container } = renderTable({ status: "loading" });
		expect(
			container.querySelectorAll(".mantine-Skeleton-root").length,
		).toBeGreaterThan(0);
		expect(screen.queryByText("Ada")).toBeNull();
	});

	it("shows the empty state on a successful empty result", () => {
		renderTable({ rows: [], status: "success" });
		expect(screen.getByText("No results.")).toBeVisible();
	});

	it("shows a distinct filtered-empty state that can clear filters", async () => {
		renderTable({
			rows: [],
			status: "success",
			initialState: { globalFilter: "zzz" },
		});
		expect(screen.getByText("No matches.")).toBeVisible();
		await userEvent.click(
			screen.getByRole("button", { name: /Clear filters/ }),
		);
		// Filters are cleared, so it is still empty but now shows the plain empty state.
		expect(screen.getByText("No results.")).toBeVisible();
	});

	it("shows the error state and retries", async () => {
		const onRequestChange = vi.fn();
		renderTable({ status: "error", onRequestChange });
		const callsBefore = onRequestChange.mock.calls.length;
		expect(screen.getByText("Something went wrong.")).toBeVisible();
		await userEvent.click(screen.getByRole("button", { name: /Retry/ }));
		expect(onRequestChange.mock.calls.length).toBe(callsBefore + 1);
	});

	it("renders a custom Row slot", () => {
		renderTable({
			slots: {
				Row: ({ row, cells }) => (
					<tr data-row-id={row.id} data-custom="yes">
						{cells}
					</tr>
				),
			},
		});
		expect(document.querySelector('[data-custom="yes"]')).not.toBeNull();
	});

	it("forwards extra props to the Mantine table", () => {
		renderTable();
		expect(screen.getByTestId("dt").tagName).toBe("TABLE");
	});

	it("renders a summary footer with values formatted by column data type", () => {
		// Arrange: server-computed aggregates keyed by column id.
		function SummaryHarness() {
			const view = useDataView<User>({
				columns: [
					helper.accessor("name", { header: "Name" }),
					helper.accessor("age", {
						header: "Age",
						meta: { dataType: "currency", align: "right" },
					}),
				],
				rows: sampleRows,
				rowCount: sampleRows.length,
				status: "success",
				getRowId: (u) => u.id,
				summary: { age: 1234.5 },
			});
			return <DataTable view={view} />;
		}

		// Act
		render(
			<MantineProvider>
				<SummaryHarness />
			</MantineProvider>,
		);

		// Assert: the footer formats the raw value like a cell would.
		const footer = document.querySelector("tfoot");
		expect(footer).not.toBeNull();
		expect(footer).toHaveTextContent("$1,234.50");
	});

	it("renders no footer without summary data", () => {
		// Arrange / Act
		renderTable();

		// Assert
		expect(document.querySelector("tfoot")).toBeNull();
	});

	it("gives the keyboard grid a default accessible name", () => {
		// Arrange / Act
		renderTable();

		// Assert
		expect(screen.getByRole("grid", { name: "Data grid" })).toBeInTheDocument();
	});

	it("renders no resize handles by default", () => {
		// Arrange / Act
		renderTable();

		// Assert
		expect(screen.queryByLabelText(/Resize/)).toBeNull();
	});

	it("resizes a column by dragging its handle", () => {
		// Arrange
		renderTable({ enableColumnResizing: true });
		const handle = screen.getByLabelText("Resize Name");

		// Act: drag the handle 50px to the right from the default 150px width.
		fireEvent.mouseDown(handle, { clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 150 });
		fireEvent.mouseUp(document);

		// Assert
		expect(screen.getByTestId("sizing")).toHaveTextContent('{"name":200}');
		const header = screen.getByRole("columnheader", { name: /Name/ });
		expect(header.style.width).toBe("200px");
	});

	it("resets a column to its default size on handle double-click", () => {
		// Arrange
		renderTable({
			enableColumnResizing: true,
			initialState: { columnSizing: { name: 300 } },
		});
		const handle = screen.getByLabelText("Resize Name");

		// Act
		fireEvent.doubleClick(handle);

		// Assert
		expect(screen.getByTestId("sizing")).toHaveTextContent("{}");
	});

	it("has no accessibility violations in the ready state", async () => {
		const { container } = renderTable();
		expect(await axe(container)).toHaveNoViolations();
	});
});
