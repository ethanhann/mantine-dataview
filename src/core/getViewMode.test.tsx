import { MantineProvider } from "@mantine/core";
import type { CellContext, HeaderContext, Table } from "@tanstack/react-table";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import type { ViewMode } from "../types/state";
import { getViewMode } from "./getViewMode";
import { useDataView } from "./state/useDataView";

interface User {
	id: string;
	name: string;
}

const columns = [
	createColumnHelper<User>().accessor("name", { header: "Name" }),
] satisfies DataColumnDef<User>[];

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

/** Builds a real TanStack table (via the core hook) pinned to a given view mode. */
function renderTable(defaultView: ViewMode): Table<User> {
	const { result } = renderHook(
		() =>
			useDataView<User>({
				columns,
				rows: [{ id: "1", name: "Ada" }],
				rowCount: 1,
				status: "success",
				getRowId: (u) => u.id,
				defaultView,
			}),
		{ wrapper },
	);
	return result.current.table;
}

/** Pulls a real CellContext off the first cell of the first row. */
function firstCellContext(table: Table<User>): CellContext<User, unknown> {
	const row = table.getRowModel().rows[0];
	if (!row) throw new Error("expected the fixture table to have a row");
	const cell = row.getAllCells()[0];
	if (!cell) throw new Error("expected the row to have a cell");
	return cell.getContext();
}

/** Pulls a real HeaderContext off the first header of the first header group. */
function firstHeaderContext(table: Table<User>): HeaderContext<User, unknown> {
	const header = table.getHeaderGroups()[0]?.headers[0];
	if (!header) throw new Error("expected the fixture table to have a header");
	return header.getContext();
}

/** A minimal table-shaped stub carrying only the `options.meta` the function reads. */
function stubTable(meta: unknown): Table<User> {
	return { options: { meta } } as unknown as Table<User>;
}

describe("getViewMode", () => {
	describe("reads the active view mode from every accepted input shape", () => {
		it("returns the mode from a Table instance", () => {
			// Arrange
			const table = renderTable("cards");

			// Act
			const mode = getViewMode(table);

			// Assert
			expect(mode).toBe("cards");
		});

		it("returns the mode from a CellContext via its table", () => {
			// Arrange
			const cellContext = firstCellContext(renderTable("cards"));

			// Act
			const mode = getViewMode(cellContext);

			// Assert
			expect(mode).toBe("cards");
		});

		it("returns the mode from a HeaderContext via its table", () => {
			// Arrange
			const headerContext = firstHeaderContext(renderTable("cards"));

			// Act
			const mode = getViewMode(headerContext);

			// Assert
			expect(mode).toBe("cards");
		});

		it("reports a schedule-family mode rather than collapsing it to table", () => {
			expect(getViewMode(renderTable("schedule"))).toBe("schedule");
			expect(getViewMode(renderTable("agenda"))).toBe("agenda");
		});

		it("resolves the same table mode from all three shapes", () => {
			// Arrange
			const table = renderTable("table");
			const cellContext = firstCellContext(table);
			const headerContext = firstHeaderContext(table);

			// Act
			const modes = [
				getViewMode(table),
				getViewMode(cellContext),
				getViewMode(headerContext),
			];

			// Assert
			expect(modes).toEqual(["table", "table", "table"]);
		});
	});

	describe('falls back to "table" for missing or invalid metadata', () => {
		it('returns "table" when meta carries no viewMode', () => {
			// Arrange
			const table = stubTable({});

			// Act
			const mode = getViewMode(table);

			// Assert
			expect(mode).toBe("table");
		});

		it('returns "table" when meta is absent entirely', () => {
			// Arrange
			const table = stubTable(undefined);

			// Act
			const mode = getViewMode(table);

			// Assert
			expect(mode).toBe("table");
		});

		it('rejects an unrecognized viewMode string and falls back to "table"', () => {
			// Arrange
			const table = stubTable({ viewMode: "grid" });

			// Act
			const mode = getViewMode(table);

			// Assert
			expect(mode).toBe("table");
		});

		it('rejects a non-string viewMode and falls back to "table"', () => {
			// Arrange
			const table = stubTable({ viewMode: 42 });

			// Act
			const mode = getViewMode(table);

			// Assert
			expect(mode).toBe("table");
		});
	});
});
