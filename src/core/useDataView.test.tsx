import { MantineProvider } from "@mantine/core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, type Mock, vi } from "vitest";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import type { DataViewRequest } from "../types/request";
import type { DataViewState, Status } from "../types/state";
import { useDataView } from "./useDataView";

type RequestFn = (request: DataViewRequest) => void;
type StateFn = (state: DataViewState) => void;
const requestSpy = () => vi.fn<RequestFn>();

function lastRequest(spy: Mock<RequestFn>): DataViewRequest {
	const call = spy.mock.calls.at(-1);
	if (!call) throw new Error("onRequestChange was never called");
	return call[0];
}

interface User {
	id: string;
	name: string;
	status: "active" | "pending";
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
	helper.accessor("status", {
		meta: {
			label: "Status",
			filter: {
				variant: "select",
				options: [
					{ label: "Active", value: "active" },
					{ label: "Pending", value: "pending" },
				],
			},
		},
	}),
	helper.display({ id: "actions", header: "Actions" }),
] satisfies DataColumnDef<User>[];

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

interface SetupOverrides {
	rows?: User[];
	rowCount?: number;
	status?: Status;
	onRequestChange?: Mock<RequestFn>;
	params?: Record<string, string>;
}

function setup(overrides: SetupOverrides = {}) {
	const onRequestChange = overrides.onRequestChange ?? requestSpy();
	const initialProps = {
		columns,
		rows: overrides.rows ?? [
			{ id: "1", name: "Ada", status: "active" as const },
			{ id: "2", name: "Linus", status: "pending" as const },
		],
		rowCount: overrides.rowCount ?? 42,
		status: overrides.status ?? ("success" as Status),
		getRowId: (u: User) => u.id,
		onRequestChange,
		params: overrides.params,
	};
	const utils = renderHook((props) => useDataView(props), {
		initialProps,
		wrapper,
	});
	return { ...utils, onRequestChange, initialProps };
}

afterEach(() => {
	vi.useRealTimers();
});

describe("useDataView", () => {
	it("emits an initial request on mount", () => {
		const { onRequestChange } = setup();
		expect(onRequestChange).toHaveBeenCalledTimes(1);
		expect(onRequestChange.mock.calls[0]?.[0]).toEqual({
			pagination: { pageIndex: 0, pageSize: 10 },
			sorting: [],
			filters: [],
			globalFilter: "",
			params: {},
		});
	});

	it("emits immediately on pagination change", () => {
		const { result, onRequestChange } = setup();
		act(() => result.current.table.setPageIndex(2));
		expect(onRequestChange).toHaveBeenCalledTimes(2);
		expect(onRequestChange.mock.calls[1]?.[0].pagination.pageIndex).toBe(2);
	});

	it("emits immediately on sorting change and resets to the first page", () => {
		const { result, onRequestChange } = setup();
		act(() => result.current.table.setPageIndex(3));
		act(() => result.current.table.setSorting([{ id: "name", desc: true }]));
		const last = lastRequest(onRequestChange);
		expect(last.sorting).toEqual([{ id: "name", desc: true }]);
		expect(last.pagination.pageIndex).toBe(0);
	});

	it("debounces global search and resets to the first page", () => {
		vi.useFakeTimers();
		const { result, onRequestChange } = setup();
		expect(onRequestChange).toHaveBeenCalledTimes(1); // initial

		act(() => result.current.table.setGlobalFilter("ada"));
		// Not emitted yet because it is debounced.
		expect(onRequestChange).toHaveBeenCalledTimes(1);

		act(() => vi.advanceTimersByTime(300));
		expect(onRequestChange).toHaveBeenCalledTimes(2);
		const last = lastRequest(onRequestChange);
		expect(last.globalFilter).toBe("ada");
		expect(last.pagination.pageIndex).toBe(0);
	});

	it("emits a pagination change immediately even while a search debounce is pending", () => {
		vi.useFakeTimers();
		const { result, onRequestChange } = setup();
		expect(onRequestChange).toHaveBeenCalledTimes(1); // initial

		// Start typing: this change is debounced and not emitted yet.
		act(() => result.current.table.setGlobalFilter("ada"));
		expect(onRequestChange).toHaveBeenCalledTimes(1);

		// Paginate before the debounce fires: this must emit immediately and carry the
		// in-progress search value, rather than being delayed by the pending search timer.
		act(() => result.current.table.setPageIndex(2));
		expect(onRequestChange).toHaveBeenCalledTimes(2);
		const immediate = lastRequest(onRequestChange);
		expect(immediate.pagination.pageIndex).toBe(2);
		expect(immediate.globalFilter).toBe("ada");

		// The pending search timer was cleared by the immediate emit, so nothing fires later.
		act(() => vi.advanceTimersByTime(300));
		expect(onRequestChange).toHaveBeenCalledTimes(2);
	});

	it("emits exactly once, already reset to the first page, when params change", () => {
		// Arrange: the user is several pages in when an external param changes.
		const onRequestChange = requestSpy();
		const { result, rerender, initialProps } = setup({ onRequestChange });
		act(() => result.current.table.setPageIndex(5));
		const callsBefore = onRequestChange.mock.calls.length;

		// Act
		rerender({ ...initialProps, params: { tenant: "acme" } });

		// Assert: no transient request for page 5 of the new result set.
		expect(onRequestChange.mock.calls.length).toBe(callsBefore + 1);
		const last = lastRequest(onRequestChange);
		expect(last.params).toEqual({ tenant: "acme" });
		expect(last.pagination.pageIndex).toBe(0);
	});

	it("emits exactly once when params change on the first page", () => {
		// Arrange
		const onRequestChange = requestSpy();
		const { rerender, initialProps } = setup({ onRequestChange });
		const callsBefore = onRequestChange.mock.calls.length;

		// Act
		rerender({ ...initialProps, params: { tenant: "acme" } });

		// Assert: the reset render must not re-emit an identical request.
		expect(onRequestChange.mock.calls.length).toBe(callsBefore + 1);
		expect(lastRequest(onRequestChange).params).toEqual({ tenant: "acme" });
	});

	it("debounces column filter changes", () => {
		vi.useFakeTimers();
		const { result, onRequestChange } = setup();
		act(() =>
			result.current.table.setColumnFilters([
				{ id: "status", value: "active" },
			]),
		);
		expect(onRequestChange).toHaveBeenCalledTimes(1);
		act(() => vi.advanceTimersByTime(300));
		expect(onRequestChange.mock.calls.at(-1)?.[0].filters).toEqual([
			{ id: "status", value: "active" },
		]);
	});

	it("respects a configurable debounce of 0 (emits immediately)", () => {
		const onRequestChange = requestSpy();
		const { result } = renderHook(
			() =>
				useDataView({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					onRequestChange,
					debounce: 0,
				}),
			{ wrapper },
		);
		act(() => result.current.table.setGlobalFilter("x"));
		expect(onRequestChange.mock.calls.at(-1)?.[0].globalFilter).toBe("x");
	});

	it("does NOT refetch when view, selection, or visibility change", () => {
		const { result, onRequestChange } = setup();
		expect(onRequestChange).toHaveBeenCalledTimes(1);
		act(() => result.current.setView("cards"));
		act(() => result.current.table.setRowSelection({ "1": true }));
		act(() => result.current.table.setColumnVisibility({ name: false }));
		expect(onRequestChange).toHaveBeenCalledTimes(1);
	});

	it("toggles view via setView", () => {
		const { result } = setup();
		expect(result.current.view).toBe("table");
		act(() => result.current.setView("cards"));
		expect(result.current.view).toBe("cards");
	});

	const WINDOW = {
		start: "2026-06-28T00:00:00.000Z",
		end: "2026-07-05T00:00:00.000Z",
		level: "week" as const,
	};

	describe("schedule window", () => {
		it("omits window from the request for table/cards", () => {
			const { onRequestChange } = setup();
			expect("window" in lastRequest(onRequestChange)).toBe(false);
		});

		it("does not include the window while the view is not schedule", () => {
			vi.useFakeTimers();
			const { result, onRequestChange } = setup(); // default view: table
			act(() => result.current.setWindow(WINDOW));
			act(() => vi.advanceTimersByTime(300));
			// A window set in table mode is held in state but never sent — and triggers no fetch.
			expect(onRequestChange).toHaveBeenCalledTimes(1);
			expect("window" in lastRequest(onRequestChange)).toBe(false);
		});

		it("emits the window on the request (debounced) once the schedule view is active", () => {
			vi.useFakeTimers();
			const { result, onRequestChange } = setup();
			expect(onRequestChange).toHaveBeenCalledTimes(1); // initial

			// Switching to schedule with no window yet does not refetch.
			act(() => result.current.setView("schedule"));
			expect(onRequestChange).toHaveBeenCalledTimes(1);

			act(() => result.current.setWindow(WINDOW));
			// Debounced like a filter change — not emitted yet.
			expect(onRequestChange).toHaveBeenCalledTimes(1);

			act(() => vi.advanceTimersByTime(300));
			expect(onRequestChange).toHaveBeenCalledTimes(2);
			expect(lastRequest(onRequestChange).window).toEqual(WINDOW);
		});

		it("drops the window from the request when leaving the schedule view", () => {
			vi.useFakeTimers();
			const { result, onRequestChange } = setup();
			act(() => result.current.setView("schedule"));
			act(() => result.current.setWindow(WINDOW));
			act(() => vi.advanceTimersByTime(300));
			expect(lastRequest(onRequestChange).window).toEqual(WINDOW);

			// Back to the table: the request drops the window so the list fetch isn't polluted.
			act(() => result.current.setView("table"));
			act(() => vi.advanceTimersByTime(300));
			expect("window" in lastRequest(onRequestChange)).toBe(false);
		});

		it("includes the window for every windowed view (agenda, resources)", () => {
			for (const windowed of ["agenda", "resources"] as const) {
				vi.useFakeTimers();
				const { result, onRequestChange } = setup();
				act(() => result.current.setView(windowed));
				act(() => result.current.setWindow(WINDOW));
				act(() => vi.advanceTimersByTime(300));
				expect(lastRequest(onRequestChange).window).toEqual(WINDOW);
				vi.useRealTimers();
			}
		});

		it("coalesces rapid window changes into one request", () => {
			vi.useFakeTimers();
			const { result, onRequestChange } = setup();
			act(() => result.current.setView("schedule"));
			act(() => result.current.setWindow(WINDOW));
			act(() =>
				result.current.setWindow({
					...WINDOW,
					level: "day",
					end: WINDOW.start,
				}),
			);
			act(() => vi.advanceTimersByTime(300));
			// Initial + a single coalesced emit.
			expect(onRequestChange).toHaveBeenCalledTimes(2);
			expect(lastRequest(onRequestChange).window?.level).toBe("day");
		});

		it("does not reset pagination when the window changes", () => {
			vi.useFakeTimers();
			const { result, onRequestChange } = setup();
			act(() => result.current.setView("schedule"));
			act(() => result.current.table.setPageIndex(3));
			act(() => result.current.setWindow(WINDOW));
			act(() => vi.advanceTimersByTime(300));
			expect(lastRequest(onRequestChange).pagination.pageIndex).toBe(3);
		});

		it("seeds the window into the first request via initialState (no double fetch)", () => {
			const onRequestChange = requestSpy();
			renderHook(
				() =>
					useDataView({
						columns,
						rows: [],
						rowCount: 0,
						status: "success",
						getRowId: (u: User) => u.id,
						onRequestChange,
						initialState: { view: "schedule", window: WINDOW },
					}),
				{ wrapper },
			);
			// Exactly one fetch on mount, already carrying the window.
			expect(onRequestChange).toHaveBeenCalledTimes(1);
			expect(lastRequest(onRequestChange).window).toEqual(WINDOW);
		});

		it("suppresses a pagination-only refetch while a window is active", () => {
			vi.useFakeTimers();
			const { result, onRequestChange } = setup();
			act(() => result.current.setView("schedule"));
			act(() => result.current.setWindow(WINDOW));
			act(() => vi.advanceTimersByTime(300));
			const countAfterWindow = onRequestChange.mock.calls.length;

			// The pager is inert in schedule mode: this must not emit a new request.
			act(() => result.current.table.setPageIndex(2));
			expect(onRequestChange).toHaveBeenCalledTimes(countAfterWindow);
		});
	});

	it("keeps selection across pages, keyed by getRowId", () => {
		const { result, rerender, initialProps } = setup();
		act(() => result.current.table.setRowSelection({ "1": true }));
		expect(result.current.selection.count).toBe(1);
		expect(result.current.selection.rows.map((r) => r.id)).toEqual(["1"]);

		// Simulate paging to a fresh server page: different rows, same selection state.
		act(() => result.current.table.setPageIndex(1));
		rerender({
			...initialProps,
			rows: [
				{ id: "3", name: "Grace", status: "active" },
				{ id: "4", name: "Edsger", status: "pending" },
			],
		});

		expect(result.current.state.rowSelection).toEqual({ "1": true });
		expect(result.current.selection.count).toBe(1);
		// Row "1" is off the page now, so it is not in the available `rows`.
		expect(result.current.selection.rows).toHaveLength(0);
	});

	it("clears selection", () => {
		const { result } = setup();
		act(() => result.current.table.setRowSelection({ "1": true, "2": true }));
		expect(result.current.selection.count).toBe(2);
		act(() => result.current.selection.clear());
		expect(result.current.selection.count).toBe(0);
	});

	it("derives sortable and filterable columns from the defs", () => {
		const { result } = setup();
		expect(result.current.sortableColumns.map((c) => c.id)).toEqual([
			"name",
			"status",
		]);
		expect(result.current.filterableColumns.map((c) => c.id)).toEqual([
			"status",
		]);
	});

	it("fallback patchRow calls refetch", () => {
		const onRequestChange = requestSpy();
		const { result } = setup({ onRequestChange });
		const callsBefore = onRequestChange.mock.calls.length;
		act(() =>
			result.current.patchRow({ id: "1", name: "Updated", status: "active" }),
		);
		expect(onRequestChange.mock.calls.length).toBe(callsBefore + 1);
	});

	it("fallback insertRow calls refetch", () => {
		const onRequestChange = requestSpy();
		const { result } = setup({ onRequestChange });
		const callsBefore = onRequestChange.mock.calls.length;
		act(() =>
			result.current.insertRow({ id: "99", name: "New", status: "active" }),
		);
		expect(onRequestChange.mock.calls.length).toBe(callsBefore + 1);
	});

	it("fallback removeRow calls refetch", () => {
		const onRequestChange = requestSpy();
		const { result } = setup({ onRequestChange });
		const callsBefore = onRequestChange.mock.calls.length;
		act(() => result.current.removeRow("1"));
		expect(onRequestChange.mock.calls.length).toBe(callsBefore + 1);
	});

	it("clears the removed row's selection on the base hook", () => {
		// Arrange
		const { result } = setup();
		act(() => result.current.selection.select("1"));
		expect(result.current.selection.count).toBe(1);

		// Act
		act(() => result.current.removeRow("1"));

		// Assert
		expect(result.current.selection.count).toBe(0);
	});

	it("isRevalidating is always false on the base hook", () => {
		const { result } = setup();
		expect(result.current.isRevalidating).toBe(false);
	});

	it("notifies onStateChange with the proposed value for a controlled slice", () => {
		// Arrange
		const onStateChange = vi.fn<StateFn>();
		const { result } = renderHook(
			() =>
				useDataView({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					state: { pagination: { pageIndex: 0, pageSize: 10 } },
					onStateChange,
				}),
			{ wrapper },
		);

		// Act
		act(() => result.current.table.setPageIndex(2));

		// Assert
		expect(onStateChange).toHaveBeenCalled();
		expect(onStateChange.mock.calls.at(-1)?.[0].pagination.pageIndex).toBe(2);
	});

	it("keeps other controlled slices authoritative in the onStateChange snapshot", () => {
		// Arrange
		const onStateChange = vi.fn<StateFn>();
		const { result } = renderHook(
			() =>
				useDataView({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					state: {
						pagination: { pageIndex: 4, pageSize: 25 },
						globalFilter: "ada",
					},
					onStateChange,
				}),
			{ wrapper },
		);

		// Act
		act(() => result.current.table.setPageIndex(2));

		// Assert
		const snapshot = onStateChange.mock.calls.at(-1)?.[0];
		expect(snapshot?.pagination).toEqual({ pageIndex: 2, pageSize: 25 });
		expect(snapshot?.globalFilter).toBe("ada");
	});

	it("honors initialState and controlled state", () => {
		const onStateChange = vi.fn<StateFn>();
		const { result } = renderHook(
			() =>
				useDataView({
					columns,
					rows: [],
					rowCount: 0,
					status: "success",
					getRowId: (u: User) => u.id,
					initialState: { pagination: { pageIndex: 5, pageSize: 25 } },
					onStateChange,
				}),
			{ wrapper },
		);
		expect(result.current.state.pagination).toEqual({
			pageIndex: 5,
			pageSize: 25,
		});
		act(() => result.current.table.setPageIndex(6));
		expect(onStateChange).toHaveBeenCalled();
		expect(onStateChange.mock.calls.at(-1)?.[0].pagination.pageIndex).toBe(6);
	});
});
