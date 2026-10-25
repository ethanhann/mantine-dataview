import { describe, expect, it } from "vitest";
import {
	toTableColumnPinning,
	toTableRowSelection,
} from "./tableStateBoundary";

describe("toTableRowSelection", () => {
	it("keeps selected rows and drops entries that are false", () => {
		// Arrange
		const publicSelection = { a: true, b: false, c: true };

		// Act
		const tableSelection = toTableRowSelection(publicSelection);

		// Assert
		expect(tableSelection).toEqual({ a: true, c: true });
	});

	it("returns an empty selection for an empty input", () => {
		// Arrange / Act
		const tableSelection = toTableRowSelection({});

		// Assert
		expect(tableSelection).toEqual({});
	});
});

describe("toTableColumnPinning", () => {
	it("fills a missing end side with an empty list", () => {
		// Arrange
		const publicPinning = { start: ["name"] };

		// Act
		const tablePinning = toTableColumnPinning(publicPinning);

		// Assert
		expect(tablePinning).toEqual({ start: ["name"], end: [] });
	});

	it("fills a missing start side with an empty list", () => {
		// Arrange
		const publicPinning = { end: ["actions"] };

		// Act
		const tablePinning = toTableColumnPinning(publicPinning);

		// Assert
		expect(tablePinning).toEqual({ start: [], end: ["actions"] });
	});

	it("returns the same empty list for a missing side on every call", () => {
		// Arrange / Act
		const first = toTableColumnPinning({});
		const second = toTableColumnPinning({});

		// Assert
		expect(first.start).toBe(second.start);
		expect(first.end).toBe(second.end);
	});
});
