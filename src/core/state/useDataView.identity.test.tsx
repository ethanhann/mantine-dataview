import { MantineProvider } from "@mantine/core";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import { useDataView } from "./useDataView";

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
];

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

function renderView() {
	return renderHook(
		() =>
			useDataView<User>({
				columns,
				rows: ROWS,
				rowCount: ROWS.length,
				status: "success",
				getRowId: (user) => user.id,
			}),
		{ wrapper },
	);
}

describe("useDataView callback identity", () => {
	it("keeps the selection mutators stable across renders", () => {
		// Arrange
		const { result, rerender } = renderView();
		const before = result.current.selection;

		// Act
		rerender();

		// Assert
		const after = result.current.selection;
		expect(after.clear).toBe(before.clear);
		expect(after.select).toBe(before.select);
		expect(after.deselect).toBe(before.deselect);
		expect(after.toggle).toBe(before.toggle);
		expect(after.set).toBe(before.set);
		expect(after.isSelected).toBe(before.isSelected);
	});

	it("keeps the export and filter reset callbacks stable across renders", () => {
		// Arrange
		const { result, rerender } = renderView();
		const before = result.current;

		// Act
		rerender();

		// Assert
		const after = result.current;
		expect(after.exportCsv).toBe(before.exportCsv);
		expect(after.exportJson).toBe(before.exportJson);
		expect(after.resetFilter).toBe(before.resetFilter);
		expect(after.resetAllFilters).toBe(before.resetAllFilters);
	});
});
