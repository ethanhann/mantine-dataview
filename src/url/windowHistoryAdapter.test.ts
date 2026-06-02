import { beforeEach, describe, expect, it } from "vitest";
import { windowHistoryAdapter } from "./index";

describe("windowHistoryAdapter", () => {
	beforeEach(() => {
		window.history.replaceState(null, "", "/");
	});

	it("reads current query params as a flat record", () => {
		window.history.replaceState(null, "", "/?page=2&q=ada");
		expect(windowHistoryAdapter().read()).toEqual({ page: "2", q: "ada" });
	});

	it("pushes a new history entry by default", () => {
		const before = window.history.length;
		windowHistoryAdapter().write({ page: "3" });
		expect(new URLSearchParams(window.location.search).get("page")).toBe("3");
		expect(window.history.length).toBe(before + 1);
	});

	it("replaces the entry when replace is set", () => {
		const before = window.history.length;
		windowHistoryAdapter().write({ view: "cards" }, { replace: true });
		expect(new URLSearchParams(window.location.search).get("view")).toBe(
			"cards",
		);
		expect(window.history.length).toBe(before);
	});
});
