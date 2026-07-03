import { MantineProvider } from "@mantine/core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDataView } from "../core/useDataView";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import type { DataViewRequest } from "../types/request";
import { windowHistoryAdapter } from "./index";

interface User {
	id: string;
	name: string;
	status: "active" | "pending";
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
	helper.accessor("status", {
		meta: { label: "Status", filter: { variant: "select" } },
	}),
] satisfies DataColumnDef<User>[];

// A single stable adapter, as consumers are expected to provide (memoized once).
const adapter = windowHistoryAdapter();
const urlSync = { adapter };

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

function render(onRequestChange = vi.fn<(r: DataViewRequest) => void>()) {
	const utils = renderHook(
		() =>
			useDataView({
				columns,
				rows: [],
				rowCount: 0,
				status: "success",
				getRowId: (u: User) => u.id,
				onRequestChange,
				urlSync,
			}),
		{ wrapper },
	);
	return { ...utils, onRequestChange };
}

beforeEach(() => {
	window.history.replaceState(null, "", "/");
});

describe("useDataView + URL sync", () => {
	it("hydrates initial state from the URL before the first request", () => {
		window.history.replaceState(
			null,
			"",
			"/?page=2&size=25&sort=name:desc&q=ada&view=cards&f.status=active",
		);
		const { result, onRequestChange } = render();

		expect(result.current.state.pagination).toEqual({
			pageIndex: 1,
			pageSize: 25,
		});
		expect(result.current.state.sorting).toEqual([{ id: "name", desc: true }]);
		expect(result.current.state.globalFilter).toBe("ada");
		expect(result.current.view).toBe("cards");
		expect(result.current.state.columnFilters).toEqual([
			{ id: "status", value: "active" },
		]);

		// The very first emitted request already carries the hydrated state.
		const first = onRequestChange.mock.calls[0]?.[0];
		expect(first?.pagination.pageIndex).toBe(1);
		expect(first?.globalFilter).toBe("ada");
	});

	it("writes state changes back to the URL", () => {
		const { result } = render();
		act(() => result.current.table.setPageIndex(2));
		const params = new URLSearchParams(window.location.search);
		expect(params.get("page")).toBe("3"); // 1-based
		// The default page size is omitted to keep the URL clean.
		expect(params.get("size")).toBeNull();
	});

	it("writes the page size only when it differs from the default", () => {
		const { result } = render();
		act(() => result.current.table.setPageSize(25));
		const params = new URLSearchParams(window.location.search);
		expect(params.get("size")).toBe("25");
	});

	it("removes a cleared filter from the URL", () => {
		const { result } = render();
		act(() =>
			result.current.table.setColumnFilters([
				{ id: "status", value: "active" },
			]),
		);
		expect(new URLSearchParams(window.location.search).get("f.status")).toBe(
			"active",
		);
		act(() => result.current.table.setColumnFilters([]));
		expect(window.location.search).not.toContain("f.status");
	});

	it("preserves unrelated query params", () => {
		window.history.replaceState(null, "", "/?ref=email");
		const { result } = render();
		act(() => result.current.table.setGlobalFilter("zed"));
		const params = new URLSearchParams(window.location.search);
		expect(params.get("ref")).toBe("email");
		expect(params.get("q")).toBe("zed");
	});

	it("syncs state on back/forward navigation (popstate)", () => {
		const { result } = render();
		expect(result.current.state.globalFilter).toBe("");

		act(() => {
			window.history.replaceState(null, "", "/?q=grace&view=cards");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		expect(result.current.state.globalFilter).toBe("grace");
		expect(result.current.view).toBe("cards");
	});

	it("does not write any params for the default state on mount", () => {
		// Arrange / Act: mounting with a clean URL and untouched state.
		render();

		// Assert: the URL stays clean; in push mode a mount write would also make
		// the first Back press appear dead.
		expect(window.location.search).toBe("");
	});

	it("writes the view only when it differs from the default", () => {
		// Arrange
		const { result } = render();

		// Act
		act(() => result.current.setView("cards"));

		// Assert
		expect(new URLSearchParams(window.location.search).get("view")).toBe(
			"cards",
		);
	});

	it("restores the defaults when size and view leave the URL on popstate", () => {
		// Arrange: the user changes the page size and view, then navigates back to
		// the clean entry that carried neither param.
		const { result } = render();
		act(() => result.current.table.setPageSize(50));
		act(() => result.current.setView("cards"));

		// Act
		act(() => {
			window.history.replaceState(null, "", "/");
			window.dispatchEvent(new PopStateEvent("popstate"));
		});

		// Assert: absent params mean the defaults, mirroring how they are written.
		expect(result.current.state.pagination.pageSize).toBe(10);
		expect(result.current.view).toBe("table");
	});
});

describe("useDataView + URL sync (push mode)", () => {
	const pushSync = { adapter, historyMode: "push" as const };

	function renderPush() {
		return renderHook(
			() =>
				useDataView({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					urlSync: pushSync,
				}),
			{ wrapper },
		);
	}

	afterEach(() => {
		vi.useRealTimers();
	});

	it("pushes a pagination change immediately", () => {
		// Arrange
		const { result } = renderPush();

		// Act
		act(() => result.current.table.setPageIndex(2));

		// Assert
		expect(new URLSearchParams(window.location.search).get("page")).toBe("3");
	});

	it("coalesces rapid search changes into one pushed history entry", () => {
		// Arrange: each keystroke updates state; pushing per keystroke would make
		// the back button replay the typing burst entry by entry.
		vi.useFakeTimers();
		const { result } = renderPush();
		const lengthBefore = window.history.length;

		// Act
		act(() => result.current.table.setGlobalFilter("g"));
		act(() => result.current.table.setGlobalFilter("gr"));
		act(() => result.current.table.setGlobalFilter("grace"));

		// Assert: nothing written until the burst settles, then a single entry.
		expect(new URLSearchParams(window.location.search).get("q")).toBeNull();
		act(() => vi.advanceTimersByTime(300));
		expect(new URLSearchParams(window.location.search).get("q")).toBe("grace");
		expect(window.history.length - lengthBefore).toBe(1);
	});
});

describe("useDataView + schedule window URL sync", () => {
	const WINDOW = {
		start: "2026-06-28T00:00:00.000Z",
		end: "2026-07-05T00:00:00.000Z",
		level: "week" as const,
	};
	const withWindow = {
		adapter,
		include: [
			"pagination",
			"sorting",
			"columnFilters",
			"globalFilter",
			"view",
			"window",
		] as Array<
			| "pagination"
			| "sorting"
			| "columnFilters"
			| "globalFilter"
			| "view"
			| "window"
		>,
	};

	function renderWith(urlSyncOpts: typeof urlSync | typeof withWindow) {
		return renderHook(
			() =>
				useDataView({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					urlSync: urlSyncOpts,
				}),
			{ wrapper },
		);
	}

	it("writes the window to the URL only when opted in", () => {
		const { result } = renderWith(withWindow);
		act(() => result.current.setView("schedule"));
		act(() => result.current.setWindow(WINDOW));
		const params = new URLSearchParams(window.location.search);
		expect(params.get("view")).toBe("schedule");
		expect(params.get("ws")).toBe(WINDOW.start);
		expect(params.get("we")).toBe(WINDOW.end);
		expect(params.get("wl")).toBe("week");
	});

	it("does not write the window under the default include", () => {
		const { result } = renderWith(urlSync);
		act(() => result.current.setWindow(WINDOW));
		expect(new URLSearchParams(window.location.search).get("ws")).toBeNull();
	});

	it("hydrates the window and schedule view from the URL", () => {
		const qs = new URLSearchParams({
			view: "schedule",
			ws: WINDOW.start,
			we: WINDOW.end,
			wl: "week",
		}).toString();
		window.history.replaceState(null, "", `/?${qs}`);
		const { result } = renderWith(withWindow);
		expect(result.current.view).toBe("schedule");
		expect(result.current.state.window).toEqual(WINDOW);
	});
});
