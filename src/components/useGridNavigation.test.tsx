import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGridNavigation } from "./useGridNavigation";

const selection = { toggle: () => {}, set: () => {} };

describe("useGridNavigation", () => {
	it("returns a stable ref callback per index across renders", () => {
		// Arrange
		const { result, rerender } = renderHook(() =>
			useGridNavigation({
				enabled: true,
				selectable: true,
				ids: ["a", "b", "c"],
				selection,
			}),
		);
		const first = result.current.getItemProps(1, false).ref;
		// Act
		rerender();
		const second = result.current.getItemProps(1, false).ref;
		// Assert: identity is stable, so React does not detach and reattach the item every render.
		expect(second).toBe(first);
	});
});
