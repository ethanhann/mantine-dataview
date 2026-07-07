import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, type Mock, vi } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../../core/state/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewRequest } from "../../types/request";
import { DataTable } from "../DataTable";
import { DataToolbar, type DataToolbarProps } from "./DataToolbar";

interface User {
	id: string;
	name: string;
	email: string;
	status: string;
	city: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { header: "Name" }),
	helper.accessor("email", { header: "Email" }),
	helper.accessor("status", {
		header: "Status",
		meta: {
			label: "Status",
			filter: {
				variant: "select",
				options: [
					{ value: "active", label: "Active" },
					{ value: "pending", label: "Pending" },
				],
			},
		},
	}),
	helper.accessor("city", { header: "City" }),
] satisfies DataColumnDef<User>[];

const sampleRows: User[] = [
	{
		id: "1",
		name: "Ada",
		email: "ada@x.com",
		status: "active",
		city: "London",
	},
	{ id: "2", name: "Linus", email: "l@x.com", status: "pending", city: "Oslo" },
];

type ReqSpy = Mock<(request: DataViewRequest) => void>;
const reqSpy = () => vi.fn<(request: DataViewRequest) => void>();

function Harness({
	cols = columns,
	onRequestChange,
	toolbar,
	backgroundFetch,
}: {
	cols?: DataColumnDef<User>[];
	onRequestChange?: ReqSpy;
	toolbar?: Partial<DataToolbarProps<User>>;
	/** Simulate a background fetch (revalidation) while data is on screen. */
	backgroundFetch?: boolean;
}) {
	const base = useDataView<User>({
		columns: cols,
		rows: sampleRows,
		rowCount: sampleRows.length,
		status: "success",
		getRowId: (u) => u.id,
		onRequestChange,
		debounce: 0,
	});
	const view = backgroundFetch
		? { ...base, isFetching: true, isRevalidating: true }
		: base;
	return (
		<>
			<DataToolbar view={view} {...toolbar} />
			<div data-testid="view">{view.view}</div>
			<DataTable view={view} />
		</>
	);
}

const renderToolbar = (props: Parameters<typeof Harness>[0] = {}) =>
	render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);

const lastRequest = (spy: ReqSpy): DataViewRequest =>
	spy.mock.calls.at(-1)?.[0] as DataViewRequest;

// Mantine's Combobox dropdown doesn't expand under jsdom (no layout for floating-ui), but its
// options are mounted; selecting one via fireEvent triggers the real onChange path.
function selectOption(comboboxName: string, optionName: string) {
	fireEvent.click(screen.getByRole("combobox", { name: comboboxName }));
	fireEvent.click(
		screen.getByRole("option", { name: optionName, hidden: true }),
	);
}

describe("DataToolbar", () => {
	it("shows a sync indicator during a background fetch", () => {
		// Arrange / Act
		renderToolbar({ backgroundFetch: true });

		// Assert
		expect(screen.getByLabelText("Refreshing")).toBeInTheDocument();
	});

	it("shows no sync indicator when idle", () => {
		// Arrange / Act
		renderToolbar();

		// Assert
		expect(screen.queryByLabelText("Refreshing")).toBeNull();
	});

	it("can opt out of the sync indicator", () => {
		// Arrange / Act
		renderToolbar({
			backgroundFetch: true,
			toolbar: { showSyncIndicator: false },
		});

		// Assert
		expect(screen.queryByLabelText("Refreshing")).toBeNull();
	});

	it("reorders columns with the move buttons in the Columns popover", async () => {
		// Arrange
		renderToolbar();
		const headerIds = () =>
			screen
				.getAllByRole("columnheader")
				.map((h) => h.textContent)
				.filter(Boolean);
		expect(headerIds()).toEqual(["Name", "Email", "Status", "City"]);
		await userEvent.click(screen.getByRole("button", { name: "Columns" }));

		// Act
		await userEvent.click(
			await screen.findByRole("button", {
				name: "Move Email up",
				hidden: true,
			}),
		);

		// Assert
		expect(headerIds()).toEqual(["Email", "Name", "Status", "City"]);
		// The first row's up button is disabled; the last row's down button too.
		expect(
			screen.getByRole("button", { name: "Move Email up", hidden: true }),
		).toBeDisabled();
		expect(
			screen.getByRole("button", { name: "Move City down", hidden: true }),
		).toBeDisabled();
	});

	it("exposes the columns dropdown as a labeled group, not an ARIA menu", async () => {
		// Arrange: a role="menu" may only contain menu items; a checkbox list needs
		// a labeled group inside a dialog instead.
		renderToolbar();
		const trigger = screen.getByRole("button", { name: "Columns" });
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		// Act
		await userEvent.click(trigger);

		// Assert. `hidden: true` because jsdom never settles Mantine's mount transition,
		// so the (really visible) dropdown reports as display: none after the open.
		expect(trigger).toHaveAttribute("aria-expanded", "true");
		expect(screen.queryByRole("menu", { hidden: true })).toBeNull();
		const checkbox = await screen.findByRole("checkbox", {
			name: "Name",
			hidden: true,
		});
		const group = checkbox.closest('[role="group"]');
		expect(group).not.toBeNull();
		expect(group).toHaveAccessibleName("Columns");
	});

	it("drives global search", async () => {
		const onRequestChange = reqSpy();
		renderToolbar({ onRequestChange });
		await userEvent.type(screen.getByLabelText("Search"), "ada");
		expect(lastRequest(onRequestChange).globalFilter).toBe("ada");
	});

	it("applies a select filter through the shared column", async () => {
		const onRequestChange = reqSpy();
		renderToolbar({ onRequestChange });
		selectOption("Status", "Active");
		expect(lastRequest(onRequestChange).filters).toEqual([
			{ id: "status", value: "active" },
		]);
	});

	it("shows a clear filters button when a filter is active", async () => {
		const onRequestChange = reqSpy();
		renderToolbar({ onRequestChange });
		expect(screen.queryByRole("button", { name: /Reset filters/ })).toBeNull();
		selectOption("Status", "Active");
		expect(screen.getByRole("button", { name: /Reset filters/ })).toBeVisible();
		await userEvent.click(
			screen.getByRole("button", { name: /Reset filters/ }),
		);
		expect(lastRequest(onRequestChange).filters).toEqual([]);
	});

	it("drives sorting and toggles direction", async () => {
		renderToolbar();
		selectOption("Sort by", "Name");
		expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
			"aria-sort",
			"ascending",
		);
		await userEvent.click(
			screen.getByRole("button", { name: "Toggle sort direction" }),
		);
		expect(screen.getByRole("columnheader", { name: /Name/ })).toHaveAttribute(
			"aria-sort",
			"descending",
		);
	});

	it("toggles column visibility, affecting the table", async () => {
		renderToolbar();
		expect(screen.getByRole("columnheader", { name: /Email/ })).toBeVisible();
		await userEvent.click(screen.getByRole("button", { name: "Columns" }));
		await userEvent.click(
			await screen.findByRole("checkbox", { name: "Email" }),
		);
		expect(screen.queryByRole("columnheader", { name: /Email/ })).toBeNull();
	});

	it("switches the view via the segmented control", async () => {
		renderToolbar();
		expect(screen.getByTestId("view")).toHaveTextContent("table");
		await userEvent.click(screen.getByRole("radio", { name: "Cards" }));
		expect(screen.getByTestId("view")).toHaveTextContent("cards");
	});

	it("collapses filters into a popover beyond the inline threshold", () => {
		const manyFilters = [
			helper.accessor("name", { meta: { filter: { variant: "text" } } }),
			helper.accessor("email", { meta: { filter: { variant: "text" } } }),
			helper.accessor("status", { meta: { filter: { variant: "text" } } }),
			helper.accessor("city", { meta: { filter: { variant: "text" } } }),
		] satisfies DataColumnDef<User>[];
		renderToolbar({ cols: manyFilters });
		expect(screen.getByRole("button", { name: /Filters/ })).toBeVisible();
	});

	it("hides the switcher controls that are turned off", () => {
		renderToolbar({ toolbar: { showSort: false, showViewSwitcher: false } });
		expect(screen.queryByLabelText("Sort by")).toBeNull();
		expect(screen.queryByRole("radio", { name: "Cards" })).toBeNull();
	});

	it("renders a custom filter component and drives filter state", async () => {
		const onRequestChange = reqSpy();
		const CustomFilter = ({
			value,
			onChange,
		}: {
			value: unknown;
			onChange: (v: unknown) => void;
		}) => (
			<select
				aria-label="Custom Status"
				value={(value as string) ?? ""}
				onChange={(e) => onChange(e.target.value || undefined)}
			>
				<option value="">All</option>
				<option value="active">Active</option>
				<option value="pending">Pending</option>
			</select>
		);
		const customCols = [
			helper.accessor("name", { header: "Name" }),
			helper.accessor("status", {
				header: "Status",
				meta: { label: "Status", filter: { component: CustomFilter } },
			}),
		] satisfies DataColumnDef<User>[];
		renderToolbar({ cols: customCols, onRequestChange });
		const select = screen.getByLabelText("Custom Status");
		expect(select).toBeVisible();
		await userEvent.selectOptions(select, "active");
		expect(lastRequest(onRequestChange).filters).toEqual([
			{ id: "status", value: "active" },
		]);
	});

	it("has no accessibility violations", async () => {
		const { container } = renderToolbar();
		expect(await axe(container)).toHaveNoViolations();
	});
});
