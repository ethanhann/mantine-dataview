import { MantineProvider } from "@mantine/core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
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
	{ id: "3", name: "Grace" },
	{ id: "4", name: "Alan" },
];

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

function setup(opts: { enableMultiRowSelection?: boolean } = {}) {
	return renderHook(
		() =>
			useDataView<User>({
				columns,
				rows: ROWS,
				rowCount: ROWS.length,
				status: "success",
				getRowId: (u) => u.id,
				enableMultiRowSelection: opts.enableMultiRowSelection,
			}),
		{ wrapper },
	).result;
}

describe("useDataView selection API", () => {
	it("selects a single id and reflects it in ids, count, and isSelected", () => {
		// Arrange
		const result = setup();
		// Act
		act(() => result.current.selection.select("2"));
		// Assert
		expect(result.current.selection.ids).toEqual(["2"]);
		expect(result.current.selection.count).toBe(1);
		expect(result.current.selection.isSelected("2")).toBe(true);
		expect(result.current.selection.isSelected("1")).toBe(false);
	});

	it("selects an array of ids and is idempotent for already-selected ids", () => {
		// Arrange
		const result = setup();
		act(() => result.current.selection.select(["1", "3"]));
		// Act
		act(() => result.current.selection.select(["3", "4"]));
		// Assert: 3 stays once, 4 is added.
		expect(result.current.selection.ids.sort()).toEqual(["1", "3", "4"]);
		expect(result.current.selection.count).toBe(3);
	});

	it("deselects a subset and leaves the rest", () => {
		// Arrange
		const result = setup();
		act(() => result.current.selection.select(["1", "2", "3"]));
		// Act
		act(() => result.current.selection.deselect(["2"]));
		// Assert
		expect(result.current.selection.ids.sort()).toEqual(["1", "3"]);
		expect(result.current.selection.isSelected("2")).toBe(false);
	});

	it("toggle flips a single id on then off", () => {
		// Arrange
		const result = setup();
		// Act
		act(() => result.current.selection.toggle("4"));
		// Assert
		expect(result.current.selection.isSelected("4")).toBe(true);
		// Act
		act(() => result.current.selection.toggle("4"));
		// Assert
		expect(result.current.selection.isSelected("4")).toBe(false);
		expect(result.current.selection.count).toBe(0);
	});

	it("set replaces the entire selection, including down to empty", () => {
		// Arrange
		const result = setup();
		act(() => result.current.selection.select(["1", "2"]));
		// Act
		act(() => result.current.selection.set(["3"]));
		// Assert
		expect(result.current.selection.ids).toEqual(["3"]);
		// Act
		act(() => result.current.selection.set([]));
		// Assert
		expect(result.current.selection.ids).toEqual([]);
		expect(result.current.selection.count).toBe(0);
	});

	it("exposes pageRows for selected rows on the current page", () => {
		// Arrange
		const result = setup();
		// Act
		act(() => result.current.selection.select(["1", "3"]));
		// Assert
		expect(result.current.selection.pageRows).toEqual([
			{ id: "1", name: "Ada" },
			{ id: "3", name: "Grace" },
		]);
	});

	it("collapses to a single id in single-select mode", () => {
		// Arrange
		const result = setup({ enableMultiRowSelection: false });
		// Act
		act(() => result.current.selection.select("1"));
		act(() => result.current.selection.select("2"));
		// Assert: the second select replaces the first.
		expect(result.current.selection.ids).toEqual(["2"]);
		expect(result.current.selection.count).toBe(1);
	});

	it("set keeps only the last id in single-select mode", () => {
		// Arrange
		const result = setup({ enableMultiRowSelection: false });
		// Act
		act(() => result.current.selection.set(["1", "2", "3"]));
		// Assert
		expect(result.current.selection.ids).toEqual(["3"]);
	});

	it("clear empties a prior selection", () => {
		// Arrange
		const result = setup();
		act(() => result.current.selection.select(["1", "2", "3"]));
		// Act
		act(() => result.current.selection.clear());
		// Assert
		expect(result.current.selection.ids).toEqual([]);
		expect(result.current.selection.count).toBe(0);
	});
});
