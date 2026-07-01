import { describe, expect, it } from "vitest";
import { type CardRect, nextCardIndex } from "./nextCardIndex";

/** A uniform `cols`-wide grid of `n` cards: index i at row floor(i/cols), column i%cols. */
function grid(n: number, cols: number): CardRect[] {
	return Array.from({ length: n }, (_, i) => ({
		top: Math.floor(i / cols) * 100,
		left: (i % cols) * 100,
	}));
}

describe("nextCardIndex", () => {
	it("steps Right in reading order and clamps at the last card", () => {
		// Arrange
		const rects = grid(7, 3);
		// Act / Assert
		expect(nextCardIndex("right", 0, rects)).toBe(1);
		expect(nextCardIndex("right", 2, rects)).toBe(3); // wraps to the next row in reading order
		expect(nextCardIndex("right", 6, rects)).toBe(6); // clamp at the end
	});

	it("steps Left in reading order and clamps at the first card", () => {
		// Arrange
		const rects = grid(7, 3);
		// Act / Assert
		expect(nextCardIndex("left", 4, rects)).toBe(3);
		expect(nextCardIndex("left", 3, rects)).toBe(2); // wraps to the previous row
		expect(nextCardIndex("left", 0, rects)).toBe(0); // clamp at the start
	});

	it("moves Down one row, preserving the column", () => {
		// Arrange
		const rects = grid(6, 3);
		// Act / Assert
		expect(nextCardIndex("down", 0, rects)).toBe(3);
		expect(nextCardIndex("down", 1, rects)).toBe(4);
		expect(nextCardIndex("down", 2, rects)).toBe(5);
	});

	it("moves Up one row, preserving the column", () => {
		// Arrange
		const rects = grid(6, 3);
		// Act / Assert
		expect(nextCardIndex("up", 3, rects)).toBe(0);
		expect(nextCardIndex("up", 4, rects)).toBe(1);
		expect(nextCardIndex("up", 5, rects)).toBe(2);
	});

	it("clamps Down into a shorter last row by nearest column", () => {
		// Arrange: 7 cards over 3 columns leaves a single card (index 6, column 0) in the last row.
		const rects = grid(7, 3);
		// Act / Assert: every card in row 1 lands on the one card in row 2.
		expect(nextCardIndex("down", 3, rects)).toBe(6);
		expect(nextCardIndex("down", 4, rects)).toBe(6);
		expect(nextCardIndex("down", 5, rects)).toBe(6);
	});

	it("returns the active index at the top and bottom edges", () => {
		// Arrange
		const rects = grid(6, 3);
		// Act / Assert
		expect(nextCardIndex("up", 1, rects)).toBe(1); // already in the top row
		expect(nextCardIndex("down", 4, rects)).toBe(4); // already in the bottom row
	});

	it("round-trips Down then Up to the same card", () => {
		// Arrange
		const rects = grid(6, 3);
		// Act
		const down = nextCardIndex("down", 1, rects);
		const back = nextCardIndex("up", down, rects);
		// Assert
		expect(back).toBe(1);
	});

	it("collapses to one row when all cards share a top (1D floor)", () => {
		// Arrange: jsdom-style zero geometry, everything on one visual row.
		const rects: CardRect[] = Array.from({ length: 4 }, () => ({
			top: 0,
			left: 0,
		}));
		// Act / Assert: Left and Right traverse, Up and Down find no other row.
		expect(nextCardIndex("right", 0, rects)).toBe(1);
		expect(nextCardIndex("down", 0, rects)).toBe(0);
		expect(nextCardIndex("up", 2, rects)).toBe(2);
	});

	it("returns the active index for an empty grid or an out-of-range index", () => {
		// Act / Assert
		expect(nextCardIndex("right", 0, [])).toBe(0);
		expect(nextCardIndex("down", 5, grid(3, 3))).toBe(5);
		expect(nextCardIndex("left", -1, grid(3, 3))).toBe(-1);
	});
});
