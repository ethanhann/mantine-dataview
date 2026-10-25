import { Button, MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../../core/state/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewSlots } from "../_shared/types";
import { DataTable } from "../DataTable";
import { DataViewer, type DataViewerProps } from "../DataViewer";
import {
	DataBulkActions,
	type FloatingBulkActionsProps,
} from "./DataBulkActions";

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

const INSTANT: FloatingBulkActionsProps = { transitionProps: { duration: 0 } };

function useUsers() {
	return useDataView<User>({
		columns,
		rows,
		rowCount: rows.length,
		status: "success",
		getRowId: (u) => u.id,
	});
}

function StandaloneHarness({
	slots,
	actionBarProps = INSTANT,
}: {
	slots?: DataViewSlots<User>;
	actionBarProps?: FloatingBulkActionsProps;
}) {
	const view = useUsers();
	return (
		<>
			<DataBulkActions
				view={view}
				slots={slots}
				floating
				actionBarProps={actionBarProps}
			/>
			<DataTable view={view} />
		</>
	);
}

function ViewerHarness({
	bulkActionsProps,
}: {
	bulkActionsProps?: DataViewerProps<User>["bulkActionsProps"];
}) {
	const view = useUsers();
	return <DataViewer view={view} bulkActionsProps={bulkActionsProps} />;
}

const renderInProvider = (ui: React.ReactNode) =>
	render(<MantineProvider>{ui}</MantineProvider>);

const selectFirstRow = () =>
	userEvent.click(screen.getAllByLabelText("Select row")[0] as HTMLElement);

const getBar = () => screen.findByRole("group", { name: "Bulk actions" });

describe("DataBulkActions floating mode", () => {
	it("renders no group and no inline region when nothing is selected", () => {
		// Arrange / Act
		renderInProvider(<StandaloneHarness />);

		// Assert
		expect(screen.queryByRole("group", { name: "Bulk actions" })).toBeNull();
		expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull();
	});

	it("keeps the live region mounted before any selection", () => {
		// Arrange / Act
		const { baseElement } = renderInProvider(<StandaloneHarness />);

		// Assert
		expect(baseElement.querySelector('[aria-live="polite"]')).not.toBeNull();
	});

	it("shows the count and the consumer actions in a group once rows are selected", async () => {
		// Arrange
		renderInProvider(
			<StandaloneHarness
				slots={{
					BulkActions: (selection) => (
						<Button>Delete {selection.ids.join(",")}</Button>
					),
				}}
			/>,
		);

		// Act
		await selectFirstRow();

		// Assert
		const bar = await getBar();
		expect(within(bar).getByText("1 selected")).toBeVisible();
		expect(within(bar).getByRole("button", { name: "Delete 1" })).toBeVisible();
	});

	it("announces the count in the live region", async () => {
		// Arrange
		const { baseElement } = renderInProvider(<StandaloneHarness />);

		// Act
		await selectFirstRow();

		// Assert
		const live = baseElement.querySelector('[aria-live="polite"]');
		expect(live).toHaveTextContent("1 selected");
	});

	it("clears the selection and removes the group with the close button", async () => {
		// Arrange
		renderInProvider(<StandaloneHarness />);
		const checkbox = screen.getAllByLabelText("Select row")[0] as HTMLElement;
		await userEvent.click(checkbox);
		const bar = await getBar();

		// Act
		await userEvent.click(within(bar).getByRole("button", { name: "Clear" }));

		// Assert
		await waitFor(() =>
			expect(screen.queryByRole("group", { name: "Bulk actions" })).toBeNull(),
		);
		expect(checkbox).not.toBeChecked();
	});

	it("keeps the last count visible while the bar leaves", async () => {
		// Arrange
		renderInProvider(
			<StandaloneHarness actionBarProps={{ keepMounted: false }} />,
		);
		await selectFirstRow();
		const bar = await getBar();

		// Act
		await userEvent.click(within(bar).getByRole("button", { name: "Clear" }));

		// Assert
		expect(screen.queryByText("0 selected")).toBeNull();
		expect(within(bar).getByText("1 selected")).toBeInTheDocument();
	});

	it("passes actionBarProps to the bar", async () => {
		// Arrange
		renderInProvider(
			<StandaloneHarness actionBarProps={{ ...INSTANT, id: "floating-bar" }} />,
		);

		// Act
		await selectFirstRow();

		// Assert
		expect(await getBar()).toHaveAttribute("id", "floating-bar");
	});

	it("clears the selection on Escape when closeOnEscape is set", async () => {
		// Arrange
		renderInProvider(
			<StandaloneHarness
				actionBarProps={{ ...INSTANT, closeOnEscape: true }}
			/>,
		);
		const checkbox = screen.getAllByLabelText("Select row")[0] as HTMLElement;
		await userEvent.click(checkbox);
		await getBar();

		// Act
		await userEvent.keyboard("{Escape}");

		// Assert
		await waitFor(() => expect(checkbox).not.toBeChecked());
	});

	it("keeps the selection on Escape by default", async () => {
		// Arrange
		renderInProvider(<StandaloneHarness />);
		const checkbox = screen.getAllByLabelText("Select row")[0] as HTMLElement;
		await userEvent.click(checkbox);
		await getBar();

		// Act
		await userEvent.keyboard("{Escape}");

		// Assert
		expect(checkbox).toBeChecked();
	});

	it("has no accessibility violations with a selection", async () => {
		// Arrange
		renderInProvider(<StandaloneHarness />);
		await selectFirstRow();
		await getBar();

		// Act
		const results = await axe(document.body, {
			rules: { region: { enabled: false } },
		});

		// Assert
		expect(results).toHaveNoViolations();
	});

	it("rejects the props the library controls", () => {
		// Arrange / Act
		// @ts-expect-error onClose is set by the library
		const withOnClose: FloatingBulkActionsProps = { onClose: () => {} };
		// @ts-expect-error aria-label is set by the library
		const withLabel: FloatingBulkActionsProps = { "aria-label": "x" };

		// Assert
		expect([withOnClose, withLabel]).toHaveLength(2);
	});
});

describe("DataViewer floating bulk actions", () => {
	it("renders the floating group through bulkActionsProps on the default layout", async () => {
		// Arrange
		renderInProvider(
			<ViewerHarness
				bulkActionsProps={{ floating: true, actionBarProps: INSTANT }}
			/>,
		);

		// Act
		await selectFirstRow();

		// Assert
		expect(await getBar()).toBeVisible();
		expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull();
	});

	it("renders the inline region on the default layout without bulkActionsProps", async () => {
		// Arrange
		renderInProvider(<ViewerHarness />);

		// Act
		await selectFirstRow();

		// Assert
		expect(screen.getByRole("region", { name: "Bulk actions" })).toBeVisible();
		expect(screen.queryByRole("group", { name: "Bulk actions" })).toBeNull();
	});

	it("renders the floating group through the compound part", async () => {
		// Arrange
		function Compound() {
			const view = useUsers();
			return (
				<DataViewer view={view}>
					<DataViewer.BulkActions floating actionBarProps={INSTANT} />
					<DataViewer.Body />
				</DataViewer>
			);
		}
		renderInProvider(<Compound />);

		// Act
		await selectFirstRow();

		// Assert
		expect(await getBar()).toBeVisible();
	});
});
