import { describe, expect, it, vi } from "vitest";
import type { DataColumnDef } from "../types/column";
import { buildResourceCounts, deriveResources } from "./deriveResources";

interface Booking {
	id: string;
	room: string;
}

describe("deriveResources", () => {
	it("maps the resource-role column's filter options to resources", () => {
		const columns: DataColumnDef<Booking>[] = [
			{
				accessorKey: "room",
				meta: {
					schedule: { role: "resource" },
					filter: {
						variant: "select",
						options: [
							{ value: "Aspen", label: "Aspen" },
							{ value: "Birch", label: "Birch" },
						],
					},
				},
			},
		];
		expect(deriveResources(columns)).toEqual([
			{ id: "Aspen", label: "Aspen" },
			{ id: "Birch", label: "Birch" },
		]);
	});

	it("returns [] silently when no resource-role column exists", () => {
		// Arrange
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const columns: DataColumnDef<Booking>[] = [
			{
				accessorKey: "room",
				meta: {
					filter: { variant: "select", options: [{ value: "A", label: "A" }] },
				},
			},
		];
		// Act
		const resources = deriveResources(columns);
		// Assert: pure, the dev warning is the caller's responsibility now.
		expect(resources).toEqual([]);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});

	it("returns [] silently when the resource column has no filter options", () => {
		// Arrange
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const columns: DataColumnDef<Booking>[] = [
			{ accessorKey: "room", meta: { schedule: { role: "resource" } } },
		];
		// Act
		const resources = deriveResources(columns);
		// Assert
		expect(resources).toEqual([]);
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe("buildResourceCounts", () => {
	it("maps a value facet to a value→count map", () => {
		const counts = buildResourceCounts({
			type: "values",
			values: [
				{ value: "A", count: 12 },
				{ value: "B", count: 3 },
			],
		});
		expect(counts?.get("A")).toBe(12);
		expect(counts?.get("B")).toBe(3);
	});

	it("returns null for a missing facet or a range facet", () => {
		expect(buildResourceCounts(undefined)).toBeNull();
		expect(buildResourceCounts({ type: "ranges", ranges: [] })).toBeNull();
	});
});
