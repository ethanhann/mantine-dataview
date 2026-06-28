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

	it("defaults to the week level", () => {
		const state = scheduleInitialState(undefined, date);
		expect(state.window?.level).toBe("week");
		expect(dayjs(state.window?.start).isSame(dayjs(date).startOf("week"))).toBe(
			true,
		);
	});
});
