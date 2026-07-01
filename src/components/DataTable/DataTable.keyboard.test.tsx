import { MantineProvider, Table } from "@mantine/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../../core/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import { DataTable, type DataTableProps } from "./DataTable";

interface User {
	id: string;
	name: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
	helper.display({
		id: "action",
		header: "Action",
		cell: () => (
			<button type="button" onClick={(e) => e.stopPropagation()}>
				Open
			</button>
		),
	}),
] satisfies DataColumnDef<User>[];

const ROWS: User[] = [
	{ id: "1", name: "Ada" },
	{ id: "2", name: "Linus" },
	{ id: "3", name: "Grace" },
	{ id: "4", name: "Alan" },
];

function Harness(props: {
	keyboardNavigation?: boolean;
	enableSelection?: boolean;
	onRowActivate?: (row: User) => void;
	slots?: DataTableProps<User>["slots"];
	pinnedLeft?: string[];
}) {
	const view = useDataView<User>({
		columns,
		rows: ROWS,
		rowCount: ROWS.length,
		status: "success",
		getRowId: (u) => u.id,
		...(props.pinnedLeft
			? { initialState: { columnPinning: { left: props.pinnedLeft } } }
			: {}),
	});
	return (
		<>
			<span data-testid="count">{view.selection.count}</span>
			<DataTable
				view={view}
				keyboardNavigation={props.keyboardNavigation}
				enableSelection={props.enableSelection}
				onRowActivate={props.onRowActivate}
				slots={props.slots}
			/>
		</>
	);
}

function renderTable(props: Parameters<typeof Harness>[0] = {}) {
	return render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);
}

/** The data rows (role="row" matches the header row too, so keep only the ones inside tbody). */
function bodyRows(): HTMLElement[] {
	return screen.getAllByRole("row").filter((r) => r.closest("tbody"));
}

describe("DataTable keyboard navigation", () => {
	it("exposes a multiselectable grid with a single tabbable row", () => {
		// Arrange / Act
		renderTable();
		// Assert
		const grid = screen.getByRole("grid");
		expect(grid).toHaveAttribute("aria-multiselectable", "true");
		const rows = bodyRows();
		expect(rows).toHaveLength(4);
		expect(rows[0]).toHaveAttribute("tabindex", "0");
		expect(rows[1]).toHaveAttribute("tabindex", "-1");
	});

	it("leaves Left/Right arrows unclaimed so the container can scroll", () => {
		// Arrange: the table navigates row by row, so horizontal arrows do not move.
		renderTable();
		const row = bodyRows()[0] as HTMLElement;
		row.focus();
		// Act
		const notCancelled = fireEvent.keyDown(row, { key: "ArrowRight" });
		// Assert: the event is not cancelled, and a moving arrow still is.
		expect(notCancelled).toBe(true);
		expect(fireEvent.keyDown(row, { key: "ArrowDown" })).toBe(false);
	});

	it("moves the active row with ArrowDown and ArrowUp", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable();
		bodyRows()[0]?.focus();
		// Act
		await user.keyboard("{ArrowDown}");
		// Assert
		expect(bodyRows()[1]).toHaveFocus();
		expect(bodyRows()[1]).toHaveAttribute("tabindex", "0");
		expect(bodyRows()[0]).toHaveAttribute("tabindex", "-1");
		// Act
		await user.keyboard("{ArrowUp}");
		// Assert
		expect(bodyRows()[0]).toHaveFocus();
	});

	it("jumps to the ends with Home and End and clamps at the edges", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable();
		bodyRows()[0]?.focus();
		// Act
		await user.keyboard("{End}");
		// Assert
		expect(bodyRows()[3]).toHaveFocus();
		// Act: ArrowDown at the bottom is a no-op.
		await user.keyboard("{ArrowDown}");
		// Assert
		expect(bodyRows()[3]).toHaveFocus();
		// Act
		await user.keyboard("{Home}");
		// Assert
		expect(bodyRows()[0]).toHaveFocus();
	});

	it("toggles selection on the active row with Space", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable();
		bodyRows()[0]?.focus();
		// Act
		await user.keyboard(" ");
		// Assert
		expect(screen.getByTestId("count")).toHaveTextContent("1");
		expect(bodyRows()[0]).toHaveAttribute("aria-selected", "true");
		// Act
		await user.keyboard(" ");
		// Assert
		expect(screen.getByTestId("count")).toHaveTextContent("0");
	});

	it("builds a non-contiguous selection with Space across moves", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable();
		bodyRows()[0]?.focus();
		// Act
		await user.keyboard(" {ArrowDown}{ArrowDown} ");
		// Assert: rows 0 and 2 selected, row 1 not.
		expect(screen.getByTestId("count")).toHaveTextContent("2");
		expect(bodyRows()[0]).toHaveAttribute("aria-selected", "true");
		expect(bodyRows()[1]).toHaveAttribute("aria-selected", "false");
		expect(bodyRows()[2]).toHaveAttribute("aria-selected", "true");
	});

	it("extends a contiguous range with Shift and ArrowDown", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable();
		bodyRows()[0]?.focus();
		// Act: from the anchor at row 0, extend down two rows.
		await user.keyboard("{Shift>}{ArrowDown}{ArrowDown}{/Shift}");
		// Assert: rows 0, 1, 2 selected.
		expect(screen.getByTestId("count")).toHaveTextContent("3");
		expect(bodyRows()[3]).toHaveAttribute("aria-selected", "false");
	});

	it("adds no grid roles or tabstops when disabled", () => {
		// Arrange / Act
		renderTable({ keyboardNavigation: false });
		// Assert
		expect(screen.queryByRole("grid")).toBeNull();
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(bodyRows()[0]).not.toHaveAttribute("tabindex");
	});

	it("navigates but does not select when selection is disabled", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable({ enableSelection: false });
		const grid = screen.getByRole("grid");
		expect(grid).not.toHaveAttribute("aria-multiselectable");
		bodyRows()[0]?.focus();
		// Act
		await user.keyboard("{ArrowDown}");
		// Assert: focus moves...
		expect(bodyRows()[1]).toHaveFocus();
		// Act
		await user.keyboard(" ");
		// Assert: ...but Space selects nothing.
		expect(screen.getByTestId("count")).toHaveTextContent("0");
	});

	it("activates the focused row on Enter with the typed row", async () => {
		// Arrange
		const user = userEvent.setup();
		const onRowActivate = vi.fn<(row: User) => void>();
		renderTable({ onRowActivate });
		bodyRows()[1]?.focus();
		// Act
		await user.keyboard("{Enter}");
		// Assert
		expect(onRowActivate).toHaveBeenCalledTimes(1);
		expect(onRowActivate.mock.calls[0]?.[0]).toEqual(ROWS[1]);
	});

	it("activates a row on a single click of its body", async () => {
		// Arrange
		const user = userEvent.setup();
		const onRowActivate = vi.fn<(row: User) => void>();
		renderTable({ onRowActivate });
		// Act
		await user.click(within(bodyRows()[0] as HTMLElement).getByText("Ada"));
		// Assert
		expect(onRowActivate).toHaveBeenCalledTimes(1);
		expect(onRowActivate.mock.calls[0]?.[0]).toEqual(ROWS[0]);
	});

	it("does not activate when the selection checkbox is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const onRowActivate = vi.fn<(row: User) => void>();
		renderTable({ onRowActivate });
		// Act
		await user.click(
			within(bodyRows()[0] as HTMLElement).getByRole("checkbox"),
		);
		// Assert: the click selects the row instead of activating it.
		expect(onRowActivate).not.toHaveBeenCalled();
		expect(screen.getByTestId("count")).toHaveTextContent("1");
	});

	it("does not activate when an interactive cell control is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const onRowActivate = vi.fn<(row: User) => void>();
		renderTable({ onRowActivate });
		// Act
		await user.click(
			within(bodyRows()[0] as HTMLElement).getByRole("button", {
				name: "Open",
			}),
		);
		// Assert
		expect(onRowActivate).not.toHaveBeenCalled();
	});

	it("leaves rows non-clickable without an onRowActivate handler", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable();
		// Act
		await user.click(within(bodyRows()[0] as HTMLElement).getByText("Ada"));
		// Assert: a body click neither activates nor selects.
		expect(screen.getByTestId("count")).toHaveTextContent("0");
	});

	it("wires a custom slots.Row into the grid through rowProps", async () => {
		// Arrange: a custom row that spreads the provided rowProps onto its element.
		const user = userEvent.setup();
		renderTable({
			slots: {
				Row: ({ cells, rowProps }) => (
					<Table.Tr data-testid="custom-row" {...rowProps}>
						{cells}
					</Table.Tr>
				),
			},
		});
		expect(screen.getAllByTestId("custom-row")).toHaveLength(4);
		expect(bodyRows()[0]).toHaveAttribute("tabindex", "0");
		bodyRows()[0]?.focus();
		// Act
		await user.keyboard("{ArrowDown}");
		// Assert: the custom row participates in roving focus.
		expect(bodyRows()[1]).toHaveFocus();
		// Act
		await user.keyboard(" ");
		// Assert: and in selection.
		expect(screen.getByTestId("count")).toHaveTextContent("1");
		expect(bodyRows()[1]).toHaveAttribute("aria-selected", "true");
	});

	it("marks rows for selection and focus styling", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable();
		const rows = bodyRows();
		// Assert: the styling class the stylesheet targets is present on every row.
		expect(rows[0]).toHaveClass("dataviewItem");
		// Act: selecting the row flags it for the selected style.
		rows[0]?.focus();
		await user.keyboard(" ");
		// Assert
		expect(bodyRows()[0]).toHaveAttribute("data-selected", "true");
		expect(bodyRows()[1]).not.toHaveAttribute("data-selected");
	});

	it("keeps the selection tint on a pinned cell of a selected row", async () => {
		// Arrange
		const user = userEvent.setup();
		renderTable({ pinnedLeft: ["name"] });
		const pinnedCell = () =>
			within(bodyRows()[0] as HTMLElement)
				.getByText("Ada")
				.closest("td") as HTMLElement;
		expect(pinnedCell().style.position).toBe("sticky"); // the cell is pinned
		expect(pinnedCell().style.backgroundImage).toBe(""); // no tint before selecting
		// Act
		bodyRows()[0]?.focus();
		await user.keyboard(" ");
		// Assert: the pinned cell carries the selection tint over its opaque background, not just the
		// plain body color that would otherwise hide the selected state.
		expect(pinnedCell().style.backgroundImage).toContain("linear-gradient");
	});

	it("has no axe violations in the grid layout", async () => {
		// Arrange
		const { container } = renderTable();
		// Act
		const results = await axe(container);
		// Assert
		expect(results).toHaveNoViolations();
	});
});
