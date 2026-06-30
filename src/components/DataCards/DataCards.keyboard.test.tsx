import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../../core/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import { DataCards } from "./DataCards";

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
			<DataCards
				view={view}
				keyboardNavigation={props.keyboardNavigation}
				enableSelection={props.enableSelection}
			/>
		</>
	);
}

function renderCards(props: Parameters<typeof Harness>[0] = {}) {
	return render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);
}

/** Each card is a logical grid row. */
function cards(): HTMLElement[] {
	return screen.getAllByRole("row");
}

/** Replaces each card's geometry with a `cols`-wide uniform grid so 2D movement can be exercised. */
function mockGrid(elements: HTMLElement[], cols: number) {
	elements.forEach((el, i) => {
		el.getBoundingClientRect = (() => ({
			top: Math.floor(i / cols) * 100,
			left: (i % cols) * 100,
			width: 100,
			height: 100,
			right: 0,
			bottom: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
		})) as () => DOMRect;
	});
}

describe("DataCards keyboard navigation", () => {
	it("exposes a multiselectable grid with a single tabbable card", () => {
		// Arrange / Act
		renderCards();
		// Assert
		const grid = screen.getByRole("grid");
		expect(grid).toHaveAttribute("aria-multiselectable", "true");
		expect(cards()).toHaveLength(4);
		expect(cards()[0]).toHaveAttribute("tabindex", "0");
		expect(cards()[1]).toHaveAttribute("tabindex", "-1");
	});

	it("moves in reading order with ArrowRight and ArrowLeft", async () => {
		// Arrange
		const user = userEvent.setup();
		renderCards();
		cards()[0]?.focus();
		// Act
		await user.keyboard("{ArrowRight}");
		// Assert
		expect(cards()[1]).toHaveFocus();
		// Act
		await user.keyboard("{ArrowLeft}");
		// Assert
		expect(cards()[0]).toHaveFocus();
	});

	it("clamps vertical movement when geometry collapses to one row", async () => {
		// Arrange: jsdom reports zero-size rects, so all cards share a row.
		const user = userEvent.setup();
		renderCards();
		cards()[0]?.focus();
		// Act
		await user.keyboard("{ArrowDown}");
		// Assert: no second row to move into.
		expect(cards()[0]).toHaveFocus();
	});

	it("toggles selection on the active card with Space", async () => {
		// Arrange
		const user = userEvent.setup();
		renderCards();
		cards()[0]?.focus();
		// Act
		await user.keyboard(" ");
		// Assert
		expect(screen.getByTestId("count")).toHaveTextContent("1");
		expect(cards()[0]).toHaveAttribute("aria-selected", "true");
	});

	it("extends a contiguous range with Shift and ArrowRight", async () => {
		// Arrange
		const user = userEvent.setup();
		renderCards();
		cards()[0]?.focus();
		// Act
		await user.keyboard("{Shift>}{ArrowRight}{ArrowRight}{/Shift}");
		// Assert: cards 0, 1, 2 selected.
		expect(screen.getByTestId("count")).toHaveTextContent("3");
		expect(cards()[3]).toHaveAttribute("aria-selected", "false");
	});

	it("moves to the adjacent row with ArrowDown using real geometry", async () => {
		// Arrange: a two-column layout, so card 0 sits above card 2.
		const user = userEvent.setup();
		renderCards();
		mockGrid(cards(), 2);
		cards()[0]?.focus();
		// Act
		await user.keyboard("{ArrowDown}");
		// Assert: down from column 0 lands on the next row's column 0.
		expect(cards()[2]).toHaveFocus();
		// Act
		await user.keyboard("{ArrowUp}");
		// Assert
		expect(cards()[0]).toHaveFocus();
	});

	it("adds no grid roles or tabstops when disabled", () => {
		// Arrange / Act
		renderCards({ keyboardNavigation: false });
		// Assert
		expect(screen.queryByRole("grid")).toBeNull();
		expect(screen.queryAllByRole("row")).toHaveLength(0); // no role="row" without nav
	});

	it("navigates but does not select when selection is disabled", async () => {
		// Arrange
		const user = userEvent.setup();
		renderCards({ enableSelection: false });
		expect(screen.getByRole("grid")).not.toHaveAttribute(
			"aria-multiselectable",
		);
		cards()[0]?.focus();
		// Act
		await user.keyboard("{ArrowRight}");
		// Assert
		expect(cards()[1]).toHaveFocus();
		// Act
		await user.keyboard(" ");
		// Assert
		expect(screen.getByTestId("count")).toHaveTextContent("0");
	});

	it("has no axe violations in the card grid layout", async () => {
		// Arrange
		const { container } = renderCards();
		// Act
		const results = await axe(container);
		// Assert
		expect(results).toHaveNoViolations();
	});
});
