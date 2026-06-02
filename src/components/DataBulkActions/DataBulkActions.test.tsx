import { Button, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { useDataView } from "../../core/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import { DataTable } from "../DataTable";
import { DataView } from "../DataView";
import type { DataViewSlots } from "../types";
import { DataBulkActions } from "./DataBulkActions";

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

const rows: User[] = [
	{ id: "1", name: "Ada" },
	{ id: "2", name: "Linus" },
];

function StandaloneHarness({ slots }: { slots?: DataViewSlots<User> }) {
	const view = useDataView<User>({
		columns,
		rows,
		rowCount: rows.length,
		status: "success",
		getRowId: (u) => u.id,
	});
	return (
		<>
			<DataBulkActions view={view} slots={slots} />
			<DataTable view={view} />
		</>
	);
}

const renderStandalone = (slots?: DataViewSlots<User>) =>
	render(
		<MantineProvider>
			<StandaloneHarness slots={slots} />
		</MantineProvider>,
	);

describe("DataBulkActions", () => {
	it("is hidden when nothing is selected", () => {
		renderStandalone();
		expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull();
	});

	it("appears with a count once rows are selected", async () => {
		renderStandalone();
		await userEvent.click(
			screen.getAllByLabelText("Select row")[0] as HTMLElement,
		);
		expect(screen.getByRole("region", { name: "Bulk actions" })).toBeVisible();
		expect(screen.getByText("1 selected")).toBeVisible();
	});

	it("clears the selection from the bar", async () => {
		renderStandalone();
		const checkbox = screen.getAllByLabelText("Select row")[0] as HTMLElement;
		await userEvent.click(checkbox);
		await userEvent.click(screen.getByRole("button", { name: "Clear" }));
		expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull();
		expect(checkbox).not.toBeChecked();
	});

	it("renders consumer actions with the selection (ids across pages)", async () => {
		renderStandalone({
			BulkActions: (selection) => (
				<Button onClick={selection.clear}>
					Delete {selection.ids.join(",")}
				</Button>
			),
		});
		await userEvent.click(
			screen.getByLabelText("Select all rows on this page"),
		);
		expect(screen.getByRole("button", { name: "Delete 1,2" })).toBeVisible();
	});
});

describe("bulk bar parity across views", () => {
	function OrchestratorHarness() {
		const view = useDataView<User>({
			columns,
			rows,
			rowCount: rows.length,
			status: "success",
			getRowId: (u) => u.id,
		});
		return <DataView view={view} />;
	}

	it("shows the same bar regardless of active view", async () => {
		render(
			<MantineProvider>
				<OrchestratorHarness />
			</MantineProvider>,
		);
		// Select in the table view.
		await userEvent.click(
			screen.getAllByLabelText("Select row")[0] as HTMLElement,
		);
		expect(screen.getByText("1 selected")).toBeVisible();

		// Switch to cards. The bar and its count persist because the selection state is shared.
		await userEvent.click(screen.getByRole("radio", { name: "Cards" }));
		expect(screen.getByText("1 selected")).toBeVisible();
		expect(screen.getAllByLabelText("Select card")[0]).toBeChecked();
	});
});
