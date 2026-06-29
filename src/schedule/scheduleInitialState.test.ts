import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { computeWindow } from "./dateWindow";
import { scheduleInitialState } from "./scheduleInitialState";

const date = new Date("2026-06-15T12:00:00.000Z");

describe("scheduleInitialState", () => {
	it("seeds the schedule view and a window for the level", () => {
		const state = scheduleInitialState("month", date);
		expect(state.view).toBe("schedule");
		expect(state.window).toEqual(computeWindow(date, "month"));
	});

	it("defaults to the week level (Monday-aligned)", () => {
		const state = scheduleInitialState(undefined, date);
		expect(state.window?.level).toBe("week");
		expect(state.window).toEqual(computeWindow(date, "week"));
		expect(dayjs(state.window?.start).day()).toBe(1);
	});

	it("targets an explicit view", () => {
		expect(scheduleInitialState("week", date, "agenda").view).toBe("agenda");
		expect(scheduleInitialState("week", date, "resources").view).toBe(
			"resources",
		);
	});
});
