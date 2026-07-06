import { describe, expect, it, vi } from "vitest";
import type { DataColumnDef } from "../../types/column";
import { composeEvent } from "./composeEvent";

interface Shift {
	id: string;
	name: string;
	startsAt: string;
	endsAt: string;
	mins: number;
	dur: string;
	status: string;
	room: string;
	whole: boolean;
}

const getRowId = (s: Shift) => s.id;

function cols(...defs: DataColumnDef<Shift>[]): DataColumnDef<Shift>[] {
	return defs;
}

const startCol: DataColumnDef<Shift> = {
	accessorKey: "startsAt",
	meta: { schedule: { role: "start" } },
};
const titleCol: DataColumnDef<Shift> = {
	accessorKey: "name",
	meta: { schedule: { role: "title" } },
};

const baseRow: Shift = {
	id: "s1",
	name: "Morning",
	startsAt: "2026-06-28T09:00:00.000Z",
	endsAt: "2026-06-28T11:00:00.000Z",
	mins: 90,
	dur: "PT1H30M",
	status: "open",
	room: "A",
	whole: false,
};

describe("composeEvent", () => {
	it("maps start + end + title", () => {
		const event = composeEvent(baseRow, {
			columns: cols(startCol, titleCol, {
				accessorKey: "endsAt",
				meta: { schedule: { role: "end" } },
			}),
			getRowId,
		});
		expect(event).not.toBeNull();
		expect(event?.id).toBe("s1");
		expect(event?.title).toBe("Morning");
		expect(event?.start.toISOString()).toBe("2026-06-28T09:00:00.000Z");
		expect(event?.end.toISOString()).toBe("2026-06-28T11:00:00.000Z");
		expect(event?.row).toBe(baseRow);
	});

	it("parses date-only start and end strings in local time (no off-by-one day)", () => {
		// Arrange: date-only strings are typical for all-day event data. Parsing
		// them as UTC midnight would shift them a day for users west of UTC.
		const row = { ...baseRow, startsAt: "2026-07-02", endsAt: "2026-07-03" };

		// Act
		const event = composeEvent(row, {
			columns: cols(startCol, {
				accessorKey: "endsAt",
				meta: { schedule: { role: "end" } },
			}),
			getRowId,
		});

		// Assert: local midnight of the named day, whatever the machine timezone.
		expect(event?.start.getTime()).toBe(new Date(2026, 6, 2).getTime());
		expect(event?.end.getTime()).toBe(new Date(2026, 6, 3).getTime());
	});

	it("derives end from a numeric (minutes) duration", () => {
		const event = composeEvent(baseRow, {
			columns: cols(startCol, {
				accessorKey: "mins",
				meta: { schedule: { role: "duration" } },
			}),
			getRowId,
		});
		// 09:00 + 90min = 10:30
		expect(event?.end.toISOString()).toBe("2026-06-28T10:30:00.000Z");
	});

	it("derives end from an ISO-8601 duration string", () => {
		const event = composeEvent(baseRow, {
			columns: cols(startCol, {
				accessorKey: "dur",
				meta: { schedule: { role: "duration" } },
			}),
			getRowId,
		});
		expect(event?.end.toISOString()).toBe("2026-06-28T10:30:00.000Z");
	});

	it("falls back to defaultDuration when only a start is given", () => {
		const event = composeEvent(baseRow, {
			columns: cols(startCol),
			getRowId,
			defaultDuration: 30,
		});
		expect(event?.end.toISOString()).toBe("2026-06-28T09:30:00.000Z");
	});

	it("defaults to 60 minutes when no duration and no default are given", () => {
		const event = composeEvent(baseRow, { columns: cols(startCol), getRowId });
		expect(event?.end.toISOString()).toBe("2026-06-28T10:00:00.000Z");
	});

	it("applies a map transform (status -> color)", () => {
		const event = composeEvent(baseRow, {
			columns: cols(startCol, {
				accessorKey: "status",
				meta: {
					schedule: {
						role: "color",
						map: (v) => (v === "open" ? "green" : "red"),
					},
				},
			}),
			getRowId,
		});
		expect(event?.color).toBe("green");
	});

	it("applies a map transform on start (epoch ms -> Date)", () => {
		const epoch = Date.UTC(2026, 5, 28, 8, 0, 0);
		const event = composeEvent(
			{ ...baseRow, startsAt: String(epoch) },
			{
				columns: cols({
					accessorKey: "startsAt",
					meta: {
						schedule: { role: "start", map: (v) => new Date(Number(v)) },
					},
				}),
				getRowId,
			},
		);
		expect(event?.start.toISOString()).toBe("2026-06-28T08:00:00.000Z");
	});

	it("coerces allDay and resource roles", () => {
		const event = composeEvent(
			{ ...baseRow, whole: true },
			{
				columns: cols(
					startCol,
					{ accessorKey: "whole", meta: { schedule: { role: "allDay" } } },
					{ accessorKey: "room", meta: { schedule: { role: "resource" } } },
				),
				getRowId,
			},
		);
		expect(event?.allDay).toBe(true);
		expect(event?.resourceId).toBe("A");
	});

	it("drops a row with no resolvable start", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const event = composeEvent(
			{ ...baseRow, startsAt: "" },
			{ columns: cols(startCol, titleCol), getRowId },
		);
		expect(event).toBeNull();
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it("throws in dev when both end and duration are tagged", () => {
		expect(() =>
			composeEvent(baseRow, {
				columns: cols(
					startCol,
					{ accessorKey: "endsAt", meta: { schedule: { role: "end" } } },
					{ accessorKey: "mins", meta: { schedule: { role: "duration" } } },
				),
				getRowId,
			}),
		).toThrow(/mutually exclusive/);
	});

	it("uses the first column when a role is declared twice", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const event = composeEvent(baseRow, {
			columns: cols(
				startCol,
				{
					accessorKey: "name",
					meta: { schedule: { role: "title" } },
				},
				{
					accessorKey: "room",
					meta: { schedule: { role: "title" } },
				},
			),
			getRowId,
		});
		expect(event?.title).toBe("Morning");
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});
});
