import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import type { ScheduleLevel } from "../types/state";
import { computeWindow, shiftWindow } from "./dateWindow";

const anchor = new Date("2026-06-15T12:30:00.000Z");
const levels: ScheduleLevel[] = ["day", "week", "month", "year"];

describe("computeWindow", () => {
	for (const level of levels) {
		it(`brackets the anchor for ${level}`, () => {
			const w = computeWindow(anchor, level);
			expect(w.level).toBe(level);
			// start is the start of the period, end is exactly one unit later.
			expect(dayjs(w.start).isSame(dayjs(w.start).startOf(level))).toBe(true);
			expect(w.end).toBe(dayjs(w.start).add(1, level).toISOString());
			// The anchor falls within [start, end).
			expect(dayjs(anchor).valueOf()).toBeGreaterThanOrEqual(
				dayjs(w.start).valueOf(),
			);
			expect(dayjs(anchor).valueOf()).toBeLessThan(dayjs(w.end).valueOf());
		});
	}
});

describe("shiftWindow", () => {
	it("steps forward one unit keeping the level", () => {
		const w = computeWindow(anchor, "week");
		const next = shiftWindow(w, 1);
		expect(next.level).toBe("week");
		expect(next.start).toBe(dayjs(w.start).add(1, "week").toISOString());
	});

	it("steps backward one unit", () => {
		const w = computeWindow(anchor, "month");
		const prev = shiftWindow(w, -1);
		expect(prev.start).toBe(dayjs(w.start).subtract(1, "month").toISOString());
	});

	it("round-trips forward then back to the same window", () => {
		const w = computeWindow(anchor, "day");
		expect(shiftWindow(shiftWindow(w, 1), -1)).toEqual(w);
	});
});
