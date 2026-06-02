import { MantineProvider } from "@mantine/core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
		expect(params.get("size")).toBe("10");
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
});
