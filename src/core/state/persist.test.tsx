import { MantineProvider } from "@mantine/core";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { PersistedState, StateStorageAdapter } from "../../types/persist";
import { localStorageAdapter } from "./persist";
import { useDataView } from "./useDataView";

interface User {
	id: string;
	name: string;
	email: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
	helper.accessor("email", { meta: { label: "Email" } }),
] satisfies DataColumnDef<User>[];

const wrapper = ({ children }: { children: ReactNode }) => (
	<MantineProvider>{children}</MantineProvider>
);

function memoryAdapter(initial: PersistedState | null = null) {
	let stored: PersistedState | null = initial;
	const adapter: StateStorageAdapter = {
		read: () => stored,
		write: vi.fn((next: PersistedState) => {
			stored = next;
		}),
	};
	return {
		adapter,
		get stored() {
			return stored;
		},
	};
}

function setup(adapter: StateStorageAdapter) {
	return renderHook(
		() =>
			useDataView<User>({
				columns,
				rows: [],
				rowCount: 0,
				status: "success",
				getRowId: (u) => u.id,
				persist: { adapter },
			}),
		{ wrapper },
	);
}

afterEach(() => {
	vi.useRealTimers();
});

describe("state persistence", () => {
	it("hydrates visibility, pinning, sizing, and page size from storage", () => {
		// Arrange
		const { adapter } = memoryAdapter({
			columnVisibility: { email: false },
			columnPinning: { left: ["name"], right: [] },
			columnSizing: { name: 240 },
			pageSize: 25,
		});

		// Act
		const { result } = setup(adapter);

		// Assert
		expect(result.current.state.columnVisibility).toEqual({ email: false });
		expect(result.current.state.columnPinning).toEqual({
			left: ["name"],
			right: [],
		});
		expect(result.current.state.columnSizing).toEqual({ name: 240 });
		expect(result.current.state.pagination).toEqual({
			pageIndex: 0,
			pageSize: 25,
		});
	});

	it("writes changed slices to storage, debounced", () => {
		// Arrange
		vi.useFakeTimers();
		const { adapter, stored } = memoryAdapter();
		const { result } = setup(adapter);
		expect(stored).toBeNull();

		// Act
		act(() => {
			result.current.table.getColumn("email")?.toggleVisibility(false);
		});
		expect(adapter.write).not.toHaveBeenCalled();
		act(() => vi.advanceTimersByTime(300));

		// Assert
		expect(adapter.write).toHaveBeenCalledTimes(1);
		expect(adapter.write).toHaveBeenCalledWith(
			expect.objectContaining({
				columnVisibility: { email: false },
				pageSize: 10,
			}),
		);
	});

	it("flushes a pending write on unmount instead of dropping it", () => {
		// Arrange: a preference change whose debounce has not elapsed yet.
		vi.useFakeTimers();
		const { adapter } = memoryAdapter();
		const { result, unmount } = setup(adapter);
		act(() => {
			result.current.table.getColumn("email")?.toggleVisibility(false);
		});
		expect(adapter.write).not.toHaveBeenCalled();

		// Act
		unmount();

		// Assert: navigating away must not lose the user's last change.
		expect(adapter.write).toHaveBeenCalledTimes(1);
		expect(adapter.write).toHaveBeenCalledWith(
			expect.objectContaining({ columnVisibility: { email: false } }),
		);
	});

	it("does not persist the page index", () => {
		// Arrange
		vi.useFakeTimers();
		const { adapter } = memoryAdapter();
		const { result } = setup(adapter);

		// Act
		act(() => result.current.table.setPageIndex(3));
		act(() => vi.advanceTimersByTime(300));

		// Assert: a pagination move alone changes nothing persisted.
		expect(adapter.write).not.toHaveBeenCalled();
	});

	it("ignores malformed stored values", () => {
		// Arrange: garbage in storage must not corrupt the state shape.
		const { adapter } = memoryAdapter({
			columnVisibility: "nope",
			pageSize: -5,
		} as unknown as PersistedState);

		// Act
		const { result } = setup(adapter);

		// Assert
		expect(result.current.state.columnVisibility).toEqual({});
		expect(result.current.state.pagination.pageSize).toBe(10);
	});
});

describe("localStorageAdapter", () => {
	// This environment's jsdom ships a non-functional localStorage, so back it
	// with a Map that implements the two methods the adapter uses.
	beforeEach(() => {
		const store = new Map<string, string>();
		vi.stubGlobal("localStorage", {
			getItem: (k: string) => store.get(k) ?? null,
			setItem: (k: string, v: string) => store.set(k, v),
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("round-trips persisted state as JSON under the given key", () => {
		// Arrange
		const adapter = localStorageAdapter("dv-test");

		// Act
		adapter.write({ columnSizing: { name: 200 }, pageSize: 50 });

		// Assert
		expect(adapter.read()).toEqual({
			columnSizing: { name: 200 },
			pageSize: 50,
		});
		expect(window.localStorage.getItem("dv-test")).toContain('"pageSize":50');
	});

	it("returns null for a missing or unparseable key", () => {
		// Arrange
		const adapter = localStorageAdapter("dv-missing");
		expect(adapter.read()).toBeNull();
		window.localStorage.setItem("dv-missing", "{not json");

		// Act / Assert
		expect(adapter.read()).toBeNull();
	});
});
