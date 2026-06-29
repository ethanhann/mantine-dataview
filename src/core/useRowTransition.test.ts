import type { Row } from "@tanstack/react-table";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useRowTransition } from "./useRowTransition";

// The hook only reads `row.id`, so a minimal stand-in is enough.
const row = (id: string) => ({ id }) as Row<unknown>;
const rowsOf = (...ids: string[]) => ids.map(row);

function entering(result: { current: { entering: Set<string> } }): string[] {
	return Array.from(result.current.entering).sort();
}

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	warnSpy.mockRestore();
});

describe("useRowTransition", () => {
	it("passes rows straight through with no entering set when disabled", () => {
		// Arrange
		const { result, rerender } = renderHook(
			({ rows }) => useRowTransition(rows, false),
			{ initialProps: { rows: rowsOf("a", "b") } },
		);
		// Act
		rerender({ rows: rowsOf("a", "b", "c") });
		// Assert: disabled never animates, so no entering ids and a static generation.
		expect(result.current.rows).toHaveLength(3);
		expect(entering(result)).toEqual([]);
		expect(result.current.generation).toBe(0);
	});

	it("marks nothing as entering on first mount when enabled", () => {
		// Arrange / Act
		const { result } = renderHook(() =>
			useRowTransition(rowsOf("a", "b"), true),
		);
		// Assert: the first render is the baseline, not an enter animation.
		expect(entering(result)).toEqual([]);
		expect(result.current.generation).toBe(0);
	});

	it("marks only newly added ids as entering and bumps the generation", () => {
		// Arrange
		const { result, rerender } = renderHook(
			({ rows }) => useRowTransition(rows, true),
			{ initialProps: { rows: rowsOf("a", "b") } },
		);
		// Act
		rerender({ rows: rowsOf("a", "b", "c") });
		// Assert
		expect(entering(result)).toEqual(["c"]);
		expect(result.current.generation).toBe(1);
	});

	it("marks every id as entering when the same set is reordered", () => {
		// Arrange
		const { result, rerender } = renderHook(
			({ rows }) => useRowTransition(rows, true),
			{ initialProps: { rows: rowsOf("a", "b") } },
		);
		// Act
		rerender({ rows: rowsOf("b", "a") });
		// Assert: a pure reorder re-enters the whole set.
		expect(entering(result)).toEqual(["a", "b"]);
		expect(result.current.generation).toBe(1);
	});

	it("does not recompute when the row-id signature is unchanged", () => {
		// Arrange
		const { result, rerender } = renderHook(
			({ rows }) => useRowTransition(rows, true),
			{ initialProps: { rows: rowsOf("a", "b") } },
		);
		// Act: a re-render with the same ids (new Row objects) must reuse the cache.
		rerender({ rows: rowsOf("a", "b") });
		// Assert
		expect(entering(result)).toEqual([]);
		expect(result.current.generation).toBe(0);
	});

	it("warns once when animation is enabled but the keyframes are missing", () => {
		// Arrange / Act
		const { rerender } = renderHook(
			({ enabled }) => useRowTransition(rowsOf("a"), enabled),
			{ initialProps: { enabled: true } },
		);
		// Assert
		expect(warnSpy).toHaveBeenCalledTimes(1);
		expect(String(warnSpy.mock.calls[0]?.[0])).toContain("animateRows");
		// Act: toggling enable off then on must not warn again (guarded by a ref).
		rerender({ enabled: false });
		rerender({ enabled: true });
		// Assert
		expect(warnSpy).toHaveBeenCalledTimes(1);
	});
});
