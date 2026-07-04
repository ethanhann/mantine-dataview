import { MantineProvider } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { useDataView } from "../../core/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewState } from "../../types/state";
import { FilterControls } from "./FilterControls";

interface Item {
	id: string;
	name: string;
	city: string;
}

const helper = createColumnHelper<Item>();
const rows: Item[] = [
	{ id: "1", name: "Ann", city: "Austin" },
	{ id: "2", name: "Bob", city: "Boston" },
];

const cols: DataColumnDef<Item>[] = [
	helper.accessor("name", {
		meta: { label: "Name", filter: { variant: "text" } },
	}),
	helper.accessor("city", {
		meta: { label: "City", filter: { variant: "text" } },
	}),
];

function Harness({
	inlineThreshold,
	initialState,
}: {
	inlineThreshold: number;
	initialState?: Partial<DataViewState>;
}) {
	const view = useDataView<Item>({
		columns: cols,
		rows,
		rowCount: rows.length,
		status: "success",
		getRowId: (i) => i.id,
		debounce: 0,
		...(initialState ? { initialState } : {}),
	});
	return (
		<>
			<span data-testid="page">{view.state.pagination.pageIndex}</span>
			<span data-testid="filter-count">{view.state.columnFilters.length}</span>
			<FilterControls view={view} inlineThreshold={inlineThreshold} />
		</>
	);
}

function renderControls(props: Parameters<typeof Harness>[0]) {
	return render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);
}

const DEFAULT_MATCH_MEDIA = window.matchMedia;

function setMatchMedia(matches: boolean) {
	window.matchMedia = ((query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	})) as unknown as typeof window.matchMedia;
}

afterEach(() => {
	window.matchMedia = DEFAULT_MATCH_MEDIA;
});

describe("FilterControls", () => {
	it("renders each control inline when within the threshold (no Filters button)", () => {
		// Arrange / Act
		renderControls({ inlineThreshold: 5 });
		// Assert
		expect(screen.getByLabelText("Name")).toBeInTheDocument();
		expect(screen.getByLabelText("City")).toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /Filters/ })).toBeNull();
	});

	it("collapses into a popover past the threshold and reveals controls on open", async () => {
		// Arrange
		const user = userEvent.setup();
		renderControls({ inlineThreshold: 1 });
		const trigger = screen.getByRole("button", { name: "Filters" });
		expect(screen.queryByLabelText("Name")).toBeNull();
		// Act
		await user.click(trigger);
		// Assert
		expect(await screen.findByLabelText("Name")).toBeInTheDocument();
		expect(screen.getByLabelText("City")).toBeInTheDocument();
	});

	it("toggles the popover closed on a second trigger click", async () => {
		// Arrange
		const user = userEvent.setup();
		renderControls({ inlineThreshold: 1 });
		const trigger = screen.getByRole("button", { name: "Filters" });
		// Act
		await user.click(trigger);
		expect(await screen.findByLabelText("Name")).toBeInTheDocument();
		await user.click(trigger);
		// Assert: the dropdown content is unmounted again.
		await waitFor(() => expect(screen.queryByLabelText("Name")).toBeNull());
	});

	it("shows the active filter count in the collapsed trigger label", () => {
		// Arrange / Act
		renderControls({
			inlineThreshold: 1,
			initialState: { columnFilters: [{ id: "name", value: "an" }] },
		});
		// Assert
		expect(
			screen.getByRole("button", { name: "Filters (1)" }),
		).toBeInTheDocument();
	});

	it("offers a reset action inside the popover when a filter is active", async () => {
		// Arrange
		const user = userEvent.setup();
		renderControls({
			inlineThreshold: 1,
			initialState: { columnFilters: [{ id: "name", value: "an" }] },
		});
		// Act
		await user.click(screen.getByRole("button", { name: "Filters (1)" }));
		// Assert
		expect(
			await screen.findByRole("button", { name: "Reset filters" }),
		).toBeInTheDocument();
	});

	it("clears the filters and returns to the first page on reset", async () => {
		// Arrange: an active filter with the user several pages in.
		const user = userEvent.setup();
		renderControls({
			inlineThreshold: 1,
			initialState: {
				columnFilters: [{ id: "name", value: "an" }],
				pagination: { pageIndex: 9, pageSize: 10 },
			},
		});
		await user.click(screen.getByRole("button", { name: "Filters (1)" }));
		// Act
		await user.click(
			await screen.findByRole("button", { name: "Reset filters" }),
		);
		// Assert
		expect(screen.getByTestId("filter-count")).toHaveTextContent("0");
		expect(screen.getByTestId("page")).toHaveTextContent("0");
	});

	it("renders a bottom drawer of filters on a mobile viewport", async () => {
		// Arrange
		setMatchMedia(true);
		const user = userEvent.setup();
		renderControls({ inlineThreshold: 5 });
		const trigger = await screen.findByRole("button", { name: "Filters" });
		// Act
		await user.click(trigger);
		// Assert
		const drawer = await screen.findByRole("dialog", { name: "Filters" });
		expect(within(drawer).getByLabelText("Name")).toBeInTheDocument();
		expect(within(drawer).getByLabelText("City")).toBeInTheDocument();
	});
});
