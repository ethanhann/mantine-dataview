import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
	onCardActivate?: (row: User) => void;
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
				onCardActivate={props.onCardActivate}
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

	it("keeps roving focus when the page shrinks and leaves stale card refs", async () => {
		// Arrange: render a full page, then shrink it so the unmounted cards leave null refs behind.
		const user = userEvent.setup();
		function ShrinkHarness({ rows }: { rows: User[] }) {
			const view = useDataView<User>({
				columns,
				rows,
				rowCount: rows.length,
				status: "success",
				getRowId: (u) => u.id,
			});
			return <DataCards view={view} />;
		}
		const { rerender } = render(
			<MantineProvider>
				<ShrinkHarness rows={ROWS} />
			</MantineProvider>,
		);
		rerender(
			<MantineProvider>
				<ShrinkHarness rows={ROWS.slice(0, 2)} />
			</MantineProvider>,
		);
		cards()[0]?.focus();
		// Act: move onto the last real card, then try to move past it into the stale ref slots.
		await user.keyboard("{ArrowRight}{ArrowRight}");
		// Assert: movement clamps to the last card and the roving tabstop stays on it.
		expect(cards()).toHaveLength(2);
		expect(cards()[1]).toHaveAttribute("tabindex", "0");
		expect(cards()[0]).toHaveAttribute("tabindex", "-1");
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

	it("activates the focused card on Enter with the typed row", async () => {
		// Arrange
		const user = userEvent.setup();
		const onCardActivate = vi.fn<(row: User) => void>();
		renderCards({ onCardActivate });
		cards()[1]?.focus();
		// Act
		await user.keyboard("{Enter}");
		// Assert
		expect(onCardActivate).toHaveBeenCalledTimes(1);
		expect(onCardActivate.mock.calls[0]?.[0]).toEqual(ROWS[1]);
	});

	it("activates a card on a single click of its body", async () => {
		// Arrange
		const user = userEvent.setup();
		const onCardActivate = vi.fn<(row: User) => void>();
		renderCards({ onCardActivate });
		// Act
		await user.click(within(cards()[0] as HTMLElement).getByText("Ada"));
		// Assert
		expect(onCardActivate).toHaveBeenCalledTimes(1);
		expect(onCardActivate.mock.calls[0]?.[0]).toEqual(ROWS[0]);
	});

	it("does not activate when the card checkbox is clicked", async () => {
		// Arrange
		const user = userEvent.setup();
		const onCardActivate = vi.fn<(row: User) => void>();
		renderCards({ onCardActivate });
		// Act
		await user.click(within(cards()[0] as HTMLElement).getByRole("checkbox"));
		// Assert: the click selects the card instead of activating it.
		expect(onCardActivate).not.toHaveBeenCalled();
		expect(screen.getByTestId("count")).toHaveTextContent("1");
	});

	it("marks cards for selection and focus styling", async () => {
		// Arrange
		const user = userEvent.setup();
		renderCards();
		// Assert: the styling class the stylesheet targets is present on every card.
		expect(cards()[0]).toHaveClass("dataviewItem");
		// Act: selecting the card flags it for the selected style.
		cards()[0]?.focus();
		await user.keyboard(" ");
		// Assert
		expect(cards()[0]).toHaveAttribute("data-selected", "true");
		expect(cards()[1]).not.toHaveAttribute("data-selected");
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
