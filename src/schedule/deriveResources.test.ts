import { describe, expect, it, vi } from "vitest";
import type { DataColumnDef } from "../types/column";
import { deriveResources } from "./deriveResources";

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

	it("returns [] and warns when no resource-role column exists", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const columns: DataColumnDef<Booking>[] = [
			{
				accessorKey: "room",
				meta: {
					filter: { variant: "select", options: [{ value: "A", label: "A" }] },
				},
			},
		];
		expect(deriveResources(columns)).toEqual([]);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it("returns [] and warns when the resource column has no filter options", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const columns: DataColumnDef<Booking>[] = [
			{ accessorKey: "room", meta: { schedule: { role: "resource" } } },
		];
		expect(deriveResources(columns)).toEqual([]);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
