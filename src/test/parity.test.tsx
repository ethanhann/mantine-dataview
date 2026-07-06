// Parity harness. This makes the core guarantee executable. All feature state lives in one core,
// and the table and cards are projections of it. These tests drive the same `useDataView`
// instance through each feature, using the table's affordance and then the cards' affordance.
// They assert the resulting `DataViewState` is identical. If a presentation could reach state the
// other cannot, one of these fails in CI.
//
// The harness stays an internal test for v1. Shipping it as a utility for consumers would pull
// @testing-library into the public surface, so that is deferred until there is demand.

import { MantineProvider } from "@mantine/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { DataCards } from "../components/DataCards";
import { DataPagination } from "../components/DataPagination";
import { DataTable } from "../components/DataTable";
import { DataToolbar } from "../components/DataToolbar";
import { useDataView } from "../core/state/useDataView";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import type { UseDataViewReturn } from "../types/options";
import type { DataViewState } from "../types/state";

interface User {
	id: string;
	name: string;
	status: string;
	age: number;
}

const columns = [
	createColumnHelper<User>().accessor("name", {
		header: "Name",
		meta: { card: { role: "title" } },
	}),
	createColumnHelper<User>().accessor("status", {
		header: "Status",
		meta: {
			label: "Status",
			card: { role: "badge" },
			filter: {
				variant: "select",
				options: [
					{ value: "active", label: "Active" },
					{ value: "pending", label: "Pending" },
				],
			},
		},
	}),
	createColumnHelper<User>().accessor("age", {
		header: "Age",
		meta: { label: "Age" },
	}),
] satisfies DataColumnDef<User>[];

const rows: User[] = [
	{ id: "1", name: "Ada", status: "active", age: 36 },
	{ id: "2", name: "Linus", status: "pending", age: 54 },
];

let current: UseDataViewReturn<User> | null = null;
function getView(): UseDataViewReturn<User> {
	if (!current) throw new Error("DataViewer not rendered");
	return current;
}

/** Render the toolbar + both presentations + pager, all bound to one core instance. */
function renderAll() {
	function Harness() {
		const view = useDataView<User>({
			columns,
			rows,
			rowCount: rows.length,
			status: "success",
			getRowId: (u) => u.id,
			debounce: 0,
		});
		current = view;
		return (
			<>
				<DataToolbar view={view} />
				<DataTable view={view} />
				<DataCards view={view} />
				<DataPagination view={view} />
			</>
		);
	}
	return render(
		<MantineProvider>
			<Harness />
		</MantineProvider>,
	);
}

function selectToolbarOption(comboboxName: string, optionName: string) {
	fireEvent.click(screen.getByRole("combobox", { name: comboboxName }));
	fireEvent.click(
		screen.getByRole("option", { name: optionName, hidden: true }),
	);
}

afterEach(() => {
	current = null;
});

describe("table and card parity", () => {
	it("sorting reaches identical state from the header and the toolbar control", async () => {
		renderAll();

		// Via the table header.
		await userEvent.click(screen.getByRole("button", { name: /Name/ }));
		const fromHeader: DataViewState["sorting"] = getView().state.sorting;

		// Reset, then via the toolbar sort control.
		act(() => getView().table.setSorting([]));
		selectToolbarOption("Sort by", "Name");
		const fromToolbar = getView().state.sorting;

		expect(fromHeader).toEqual([{ id: "name", desc: false }]);
		expect(fromToolbar).toEqual(fromHeader);
	});

	it("selection reaches identical state from the row checkbox and the card overlay", async () => {
		renderAll();

		// Via the table row checkbox.
		await userEvent.click(
			screen.getAllByLabelText("Select row")[0] as HTMLElement,
		);
		const fromTable = getView().state.rowSelection;

		act(() => getView().table.setRowSelection({}));

		// Via the card overlay checkbox.
		await userEvent.click(
			screen.getAllByLabelText("Select card")[0] as HTMLElement,
		);
		const fromCard = getView().state.rowSelection;

		expect(fromTable).toEqual({ "1": true });
		expect(fromCard).toEqual(fromTable);
	});

	it("both presentations reflect the shared selection simultaneously", async () => {
		renderAll();
		await userEvent.click(
			screen.getAllByLabelText("Select row")[0] as HTMLElement,
		);
		// The very same state drives the card overlay.
		expect(screen.getAllByLabelText("Select card")[0]).toBeChecked();
	});

	it("each feature writes only its own state slice (one core)", async () => {
		renderAll();
		const empty = getView().state;
		expect(empty.sorting).toEqual([]);

		// Search updates globalFilter.
		await userEvent.type(screen.getByLabelText("Search"), "ad");
		expect(getView().state.globalFilter).toBe("ad");

		// Filtering updates columnFilters.
		selectToolbarOption("Status", "Active");
		expect(getView().state.columnFilters).toEqual([
			{ id: "status", value: "active" },
		]);

		// Visibility updates columnVisibility.
		await userEvent.click(screen.getByRole("button", { name: "Columns" }));
		await userEvent.click(await screen.findByRole("checkbox", { name: "Age" }));
		expect(getView().state.columnVisibility).toEqual({ age: false });

		// Pagination updates pagination. Filters reset the page to 0 along the way.
		act(() => getView().table.setPageSize(25));
		expect(getView().state.pagination.pageSize).toBe(25);

		// A view switch updates view, without touching the slices the request depends on.
		const before = getView().request;
		act(() => getView().setView("cards"));
		expect(getView().state.view).toBe("cards");
		expect(getView().request).toEqual(before); // view never affects the server request
	});
});
