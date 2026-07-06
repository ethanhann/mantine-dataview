// State presentation parity. Both presentations read the core's `renderStatus`, so the four
// states must render consistently no matter which view is active. These tests drive one
// `useDataView` through each status and assert the table and the cards show the matching state
// together.

import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, type Mock, vi } from "vitest";
import { useDataView } from "../core/state/useDataView";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import type { DataViewRequest } from "../types/request";
import type { DataViewState, Status } from "../types/state";
import { DataCards } from "./DataCards";
import { DataTable } from "./DataTable";

interface User {
	id: string;
	name: string;
}

const columns = [
	createColumnHelper<User>().accessor("name", {
		header: "Name",
		meta: { card: { role: "title" } },
	}),
] satisfies DataColumnDef<User>[];

type ReqSpy = Mock<(request: DataViewRequest) => void>;

function Both({
	rows = [],
	status = "success",
	initialState,
	onRequestChange,
}: {
	rows?: User[];
	status?: Status;
	initialState?: Partial<DataViewState>;
	onRequestChange?: ReqSpy;
}) {
	const view = useDataView<User>({
		columns,
		rows,
		rowCount: rows.length,
		status,
		getRowId: (u) => u.id,
		initialState,
		onRequestChange,
	});
	return (
		<>
			<div data-testid="table">
				<DataTable view={view} />
			</div>
			<div data-testid="cards">
				<DataCards view={view} />
			</div>
		</>
	);
}

const renderBoth = (props: Parameters<typeof Both>[0] = {}) =>
	render(
		<MantineProvider>
			<Both {...props} />
		</MantineProvider>,
	);

const skeletonCount = (testid: string) =>
	screen.getByTestId(testid).querySelectorAll(".mantine-Skeleton-root").length;

describe("state presentation parity", () => {
	it("loading: both views show skeletons, neither shows data", () => {
		renderBoth({ rows: [{ id: "1", name: "Ada" }], status: "loading" });
		expect(skeletonCount("table")).toBeGreaterThan(0);
		expect(skeletonCount("cards")).toBeGreaterThan(0);
		expect(screen.queryByText("Ada")).toBeNull();
	});

	it("empty: both views show the same empty state", () => {
		renderBoth({ rows: [], status: "success" });
		expect(screen.getAllByText("No results.")).toHaveLength(2);
	});

	it("filtered-empty: both views show 'No matches' with a clear action", () => {
		renderBoth({
			rows: [],
			status: "success",
			initialState: { globalFilter: "zzz" },
		});
		expect(screen.getAllByText("No matches.")).toHaveLength(2);
		expect(
			screen.getAllByRole("button", { name: /Clear filters/ }),
		).toHaveLength(2);
	});

	it("error: both views show the error state with a retry", () => {
		renderBoth({ status: "error" });
		expect(screen.getAllByText("Something went wrong.")).toHaveLength(2);
		expect(screen.getAllByRole("button", { name: /Retry/ })).toHaveLength(2);
	});

	it("retry re-emits the current request", async () => {
		const onRequestChange = vi.fn<(request: DataViewRequest) => void>();
		renderBoth({
			status: "error",
			initialState: { pagination: { pageIndex: 2, pageSize: 10 } },
			onRequestChange,
		});
		const before = onRequestChange.mock.calls.length;
		// Retry from the cards view. It emits the current request again, still on page 3.
		await userEvent.click(
			screen.getAllByRole("button", { name: /Retry/ })[1] as HTMLElement,
		);
		expect(onRequestChange.mock.calls.length).toBe(before + 1);
		expect(onRequestChange.mock.calls.at(-1)?.[0].pagination.pageIndex).toBe(2);
	});

	it("ready: both views show the data", () => {
		renderBoth({ rows: [{ id: "1", name: "Ada" }], status: "success" });
		// Title in the card + cell in the table.
		expect(screen.getAllByText("Ada").length).toBeGreaterThanOrEqual(2);
	});
});
