import { MantineProvider } from "@mantine/core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { col } from "../core/columns/colBuilder";
import { useDataView } from "../core/state/useDataView";
import { findEventRow, toggleEventSelection } from "./resolveEvents";

interface Shift {
	id: string;
	name: string;
}

const columns = col<Shift>().text("name").build();
const ROWS: Shift[] = [
	{ id: "s1", name: "Morning" },
	{ id: "s2", name: "Evening" },
];

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

function setup() {
	return renderHook(
		() =>
			useDataView<Shift>({
				columns,
				rows: ROWS,
				rowCount: ROWS.length,
				status: "success",
				getRowId: (s) => s.id,
			}),
		{ wrapper },
	);
}

describe("event row resolution", () => {
	it("resolves a plain event id to its backing row", () => {
		// Arrange
		const { result } = setup();

		// Act
		const row = findEventRow(result.current, "s1");

		// Assert
		expect(row).toEqual(ROWS[0]);
	});

	it("resolves a recurring instance id (id::recurrenceId) to its backing row", () => {
		// Arrange: Mantine expands a recurring event into instances whose id is
		// `${event.id}::${recurrenceId}` with a datetime-string recurrence key.
		const { result } = setup();

		// Act
		const row = findEventRow(result.current, "s1::2026-07-06 09:00:00");

		// Assert
		expect(row).toEqual(ROWS[0]);
	});

	it("toggles selection for a recurring instance id", () => {
		// Arrange
		const { result } = setup();

		// Act
		act(() => toggleEventSelection(result.current, "s2::2026-07-06 09:00:00"));

		// Assert
		expect(result.current.selection.ids).toEqual(["s2"]);
	});

	it("returns undefined for an unknown event id", () => {
		// Arrange
		const { result } = setup();

		// Act
		const row = findEventRow(result.current, "nope::2026-07-06 09:00:00");

		// Assert
		expect(row).toBeUndefined();
	});
});
