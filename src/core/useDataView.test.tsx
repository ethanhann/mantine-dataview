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

	it("isRevalidating is always false on the base hook", () => {
		const { result } = setup();
		expect(result.current.isRevalidating).toBe(false);
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
