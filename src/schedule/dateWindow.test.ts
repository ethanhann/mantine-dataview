import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import type { DataViewWindow, ScheduleLevel } from "../types/state";
import { computeWindow, shiftWindow } from "./dateWindow";

// A Monday, so week/month alignment is easy to reason about.
const anchor = new Date("2026-06-15T12:30:00.000Z");

function brackets(date: Date, w: DataViewWindow): boolean {
	const t = dayjs(date).valueOf();
	return t >= dayjs(w.start).valueOf() && t < dayjs(w.end).valueOf();
}

describe("computeWindow", () => {
	it("day: midnight to next midnight around the anchor", () => {
		const w = computeWindow(anchor, "day");
		expect(w.level).toBe("day");
		expect(dayjs(w.start).isSame(dayjs(anchor).startOf("day"))).toBe(true);
		expect(w.end).toBe(dayjs(w.start).add(1, "day").toISOString());
		expect(brackets(anchor, w)).toBe(true);
	});

	it("week: a Monday-aligned 7-day window bracketing the anchor", () => {
		const w = computeWindow(anchor, "week");
		expect(dayjs(w.start).day()).toBe(1); // Monday (Mantine default), not dayjs's Sunday
		expect(w.end).toBe(dayjs(w.start).add(1, "week").toISOString());
		expect(brackets(anchor, w)).toBe(true);
	});

	it("month: padded to the whole Monday-weeks the month grid shows", () => {
		const w = computeWindow(anchor, "month");
		const monthStart = dayjs(anchor).startOf("month");
		const monthEnd = dayjs(anchor).endOf("month");
		expect(dayjs(w.start).day()).toBe(1); // starts on a Monday
		expect(dayjs(w.start).valueOf()).toBeLessThanOrEqual(monthStart.valueOf());
		expect(dayjs(w.end).valueOf()).toBeGreaterThan(monthEnd.valueOf());
		expect(brackets(anchor, w)).toBe(true);
	});

	it("year: Jan 1 to next Jan 1", () => {
		const w = computeWindow(anchor, "year");
		expect(dayjs(w.start).isSame(dayjs(anchor).startOf("year"))).toBe(true);
		expect(w.end).toBe(dayjs(w.start).add(1, "year").toISOString());
		expect(brackets(anchor, w)).toBe(true);
	});

	it("honors a Sunday firstDayOfWeek override", () => {
		const w = computeWindow(anchor, "week", 0);
		expect(dayjs(w.start).day()).toBe(0); // Sunday
	});
});

describe("shiftWindow", () => {
	it("steps a week forward by exactly one week", () => {
		const w = computeWindow(anchor, "week");
		const next = shiftWindow(w, 1);
		expect(next.level).toBe("week");
		expect(next.start).toBe(dayjs(w.start).add(1, "week").toISOString());
	});

	it("steps a month forward into the next month", () => {
		const w = computeWindow(anchor, "month"); // June
		const next = shiftWindow(w, 1);
		expect(brackets(dayjs("2026-07-15").toDate(), next)).toBe(true);
	});

	it("round-trips forward then back for day, week, and month", () => {
		for (const level of ["day", "week", "month"] as ScheduleLevel[]) {
			const w = computeWindow(anchor, level);
			expect(shiftWindow(shiftWindow(w, 1), -1)).toEqual(w);
		}
	});
});
