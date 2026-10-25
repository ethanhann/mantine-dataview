import { Button, MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, expectTypeOf, it } from "vitest";
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

const NO_TRANSITION_PROPS: FloatingBulkActionsProps = {
	transitionProps: { duration: 0 },
};

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
	actionBarProps = NO_TRANSITION_PROPS,
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

const selectFirstRowCheckbox = () =>
	userEvent.click(screen.getAllByLabelText("Select row")[0] as HTMLElement);

const findBulkActionsRegion = () =>
	screen.findByRole("region", { name: "Bulk actions" });

describe("DataBulkActions floating mode", () => {
	it("renders no region when nothing is selected", () => {
		// Arrange / Act
		renderInProvider(<StandaloneHarness />);

		// Assert
		expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull();
	});

	it("keeps the live region mounted before any selection", () => {
		// Arrange / Act
		const { baseElement } = renderInProvider(<StandaloneHarness />);

		// Assert
		expect(baseElement.querySelector('[aria-live="polite"]')).not.toBeNull();
	});

	it("shows the count and the consumer actions in a region once rows are selected", async () => {
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
		await selectFirstRowCheckbox();

		// Assert
		const bar = await findBulkActionsRegion();
		expect(within(bar).getByText("1 selected")).toBeVisible();
		expect(within(bar).getByRole("button", { name: "Delete 1" })).toBeVisible();
	});

	it("announces the count in the live region", async () => {
		// Arrange
		const { baseElement } = renderInProvider(<StandaloneHarness />);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		const live = baseElement.querySelector('[aria-live="polite"]');
		expect(live).toHaveTextContent("1 selected");
	});

	it("clears the selection and removes the region with the close button", async () => {
		// Arrange
		renderInProvider(<StandaloneHarness />);
		const checkbox = screen.getAllByLabelText("Select row")[0] as HTMLElement;
		await userEvent.click(checkbox);
		const bar = await findBulkActionsRegion();

		// Act
		await userEvent.click(within(bar).getByRole("button", { name: "Clear" }));

		// Assert
		await waitFor(() =>
			expect(screen.queryByRole("region", { name: "Bulk actions" })).toBeNull(),
		);
		expect(checkbox).not.toBeChecked();
	});

	it("keeps the last selection in the bar and makes it inert while the bar leaves", async () => {
		// Arrange
		renderInProvider(
			<StandaloneHarness
				actionBarProps={{ keepMounted: false }}
				slots={{
					BulkActions: (selection) => <Button>Delete {selection.count}</Button>,
				}}
			/>,
		);
		await selectFirstRowCheckbox();
		const bar = await findBulkActionsRegion();
		expect(bar).not.toHaveAttribute("inert");

		// Act
		await userEvent.click(within(bar).getByRole("button", { name: "Clear" }));

		// Assert
		expect(bar).toBeInTheDocument();
		expect(bar).toHaveAttribute("inert");
		expect(within(bar).getByText("1 selected")).toBeInTheDocument();
		expect(
			within(bar).getByRole("button", { name: "Delete 1" }),
		).toBeInTheDocument();
		expect(screen.queryByText("0 selected")).toBeNull();
	});

	it("passes actionBarProps to the bar", async () => {
		// Arrange
		renderInProvider(
			<StandaloneHarness
				actionBarProps={{ ...NO_TRANSITION_PROPS, id: "floating-bar" }}
			/>,
		);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		expect(await findBulkActionsRegion()).toHaveAttribute("id", "floating-bar");
	});

	it("clears the selection on Escape when closeOnEscape is set", async () => {
		// Arrange
		renderInProvider(
			<StandaloneHarness
				actionBarProps={{ ...NO_TRANSITION_PROPS, closeOnEscape: true }}
			/>,
		);
		const checkbox = screen.getAllByLabelText("Select row")[0] as HTMLElement;
		await userEvent.click(checkbox);
		await findBulkActionsRegion();

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
		await findBulkActionsRegion();

		// Act
		await userEvent.keyboard("{Escape}");

		// Assert
		expect(checkbox).toBeChecked();
	});

	it("has no accessibility violations with a selection", async () => {
		// Arrange
		renderInProvider(<StandaloneHarness />);
		await selectFirstRowCheckbox();
		await findBulkActionsRegion();

		// Act
		const results = await axe(document.body, {
			rules: { region: { enabled: false } },
		});

		// Assert
		expect(results).toHaveNoViolations();
	});

	it("does not accept the props the library controls", () => {
		// Arrange
		type Key = keyof FloatingBulkActionsProps;

		// Act
		const controlled = [
			"opened",
			"onClose",
			"children",
			"role",
			"aria-label",
			"aria-labelledby",
		] as const;

		// Assert
		expectTypeOf<
			Extract<Key, (typeof controlled)[number]>
		>().toEqualTypeOf<never>();
	});

	it("keeps the region role when the consumer passes a role at runtime", async () => {
		// Arrange
		const untyped = {
			...NO_TRANSITION_PROPS,
			role: "toolbar",
		} as FloatingBulkActionsProps;
		renderInProvider(<StandaloneHarness actionBarProps={untyped} />);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		expect(await findBulkActionsRegion()).toBeVisible();
		expect(screen.queryByRole("toolbar")).toBeNull();
	});

	it("applies className and style from the component props to the bar", async () => {
		// Arrange
		function Styled() {
			const view = useUsers();
			return (
				<>
					<DataBulkActions
						view={view}
						floating
						actionBarProps={NO_TRANSITION_PROPS}
						className="custom-bar"
						style={{ opacity: 0.9 }}
					/>
					<DataTable view={view} />
				</>
			);
		}
		renderInProvider(<Styled />);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		const bar = await findBulkActionsRegion();
		expect(bar).toHaveClass("custom-bar");
		expect(bar).toHaveStyle({ opacity: "0.9" });
	});
});

describe("DataViewer floating bulk actions", () => {
	it("renders the floating region through bulkActionsProps on the default layout", async () => {
		// Arrange
		const { container } = renderInProvider(
			<ViewerHarness
				bulkActionsProps={{
					floating: true,
					actionBarProps: NO_TRANSITION_PROPS,
				}}
			/>,
		);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		const bar = await findBulkActionsRegion();
		expect(bar).toBeVisible();
		expect(container.contains(bar)).toBe(false);
	});

	it("renders the inline region on the default layout without bulkActionsProps", async () => {
		// Arrange
		const { container } = renderInProvider(<ViewerHarness />);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		const bar = screen.getByRole("region", { name: "Bulk actions" });
		expect(bar).toBeVisible();
		expect(container.contains(bar)).toBe(true);
	});

	it("renders the floating region through the compound part", async () => {
		// Arrange
		function Compound() {
			const view = useUsers();
			return (
				<DataViewer view={view}>
					<DataViewer.BulkActions
						floating
						actionBarProps={NO_TRANSITION_PROPS}
					/>
					<DataViewer.Body />
				</DataViewer>
			);
		}
		renderInProvider(<Compound />);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		expect(await findBulkActionsRegion()).toBeVisible();
	});

	it("lets the compound part turn floating on over the viewer setting", async () => {
		// Arrange
		function Compound() {
			const view = useUsers();
			return (
				<DataViewer view={view} bulkActionsProps={{ floating: false }}>
					<DataViewer.BulkActions
						floating
						actionBarProps={NO_TRANSITION_PROPS}
					/>
					<DataViewer.Body />
				</DataViewer>
			);
		}
		const { container } = renderInProvider(<Compound />);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		expect(container.contains(await findBulkActionsRegion())).toBe(false);
	});

	it("lets the compound part turn floating off over the viewer setting", async () => {
		// Arrange
		function Compound() {
			const view = useUsers();
			return (
				<DataViewer
					view={view}
					bulkActionsProps={{
						floating: true,
						actionBarProps: NO_TRANSITION_PROPS,
					}}
				>
					<DataViewer.BulkActions floating={false} />
					<DataViewer.Body />
				</DataViewer>
			);
		}
		const { container } = renderInProvider(<Compound />);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		expect(container.contains(await findBulkActionsRegion())).toBe(true);
	});

	it("replaces the viewer actionBarProps as a whole with the compound part actionBarProps", async () => {
		// Arrange
		function Compound() {
			const view = useUsers();
			return (
				<DataViewer
					view={view}
					bulkActionsProps={{
						floating: true,
						actionBarProps: { ...NO_TRANSITION_PROPS, id: "from-viewer" },
					}}
				>
					<DataViewer.BulkActions actionBarProps={NO_TRANSITION_PROPS} />
					<DataViewer.Body />
				</DataViewer>
			);
		}
		renderInProvider(<Compound />);

		// Act
		await selectFirstRowCheckbox();

		// Assert
		expect(await findBulkActionsRegion()).not.toHaveAttribute(
			"id",
			"from-viewer",
		);
	});
});
