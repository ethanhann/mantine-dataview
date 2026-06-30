import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../../core/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import { DataTable } from "./DataTable";

interface User {
	id: string;
	name: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
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
}) {
	const view = useDataView<User>({
		columns,
		rows: ROWS,
		rowCount: ROWS.length,
		status: "success",
		getRowId: (u) => u.id,
	});
	return (
		<>
			<span data-testid="count">{view.selection.count}</span>
			<DataTable
				view={view}
				keyboardNavigation={props.keyboardNavigation}
				enableSelection={props.enableSelection}
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

	it("has no axe violations in the grid layout", async () => {
		// Arrange
		const { container } = renderTable();
		// Act
		const results = await axe(container);
		// Assert
		expect(results).toHaveNoViolations();
	});
});
