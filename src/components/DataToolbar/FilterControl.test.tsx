import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useDataView } from "../../core/state/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { FacetData } from "../../types/facets";
import type { DataViewState } from "../../types/state";
import { DataTable } from "../DataTable";
import { FilterControl } from "./FilterControl";

interface Item {
	id: string;
	name: string;
	active: boolean;
	score: number;
	date: string;
}

const helper = createColumnHelper<Item>();
const rows: Item[] = [
	{ id: "1", name: "A", active: true, score: 50, date: "2026-01-01" },
	{ id: "2", name: "B", active: false, score: 80, date: "2026-06-01" },
];

function Harness({
	cols,
	facets,
	initialState,
}: {
	cols: DataColumnDef<Item>[];
	facets?: Record<string, FacetData>;
	initialState?: Partial<DataViewState>;
}) {
	const view = useDataView<Item>({
		columns: cols,
		rows,
		rowCount: rows.length,
		status: "success",
		getRowId: (i) => i.id,
		debounce: 0,
		facets,
		...(initialState ? { initialState } : {}),
	});
	return (
		<>
			<span data-testid="filters">
				{JSON.stringify(view.state.columnFilters)}
			</span>
			{view.filterableColumns.map((col) => (
				<FilterControl key={col.id} column={col} facet={view.facets[col.id]} />
			))}
			<DataTable view={view} />
		</>
	);
}

const renderFilter = (props: Parameters<typeof Harness>[0]) =>
	render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);

function readFilters(): { id: string; value: unknown }[] {
	return JSON.parse(screen.getByTestId("filters").textContent || "[]");
}

function filterValue(id: string): unknown {
	return readFilters().find((f) => f.id === id)?.value;
}

describe("FilterControl", () => {
	it("renders a boolean filter as a segmented control", () => {
		renderFilter({
			cols: [
				helper.accessor("active", {
					meta: { label: "Active", filter: { variant: "boolean" } },
				}),
			],
		});
		expect(screen.getByRole("radio", { name: "All" })).toBeVisible();
		expect(screen.getByRole("radio", { name: "Yes" })).toBeVisible();
		expect(screen.getByRole("radio", { name: "No" })).toBeVisible();
	});

	it("boolean filter with facet counts shows counts in labels", () => {
		renderFilter({
			cols: [
				helper.accessor("active", {
					meta: { label: "Active", filter: { variant: "boolean" } },
				}),
			],
			facets: {
				active: {
					type: "values",
					values: [
						{ value: "true", label: "Yes", count: 5 },
						{ value: "false", label: "No", count: 3 },
					],
				},
			},
		});
		expect(screen.getByRole("radio", { name: "Yes (5)" })).toBeVisible();
		expect(screen.getByRole("radio", { name: "No (3)" })).toBeVisible();
	});

	it("renders a number range with two inputs when no bounds", () => {
		renderFilter({
			cols: [
				helper.accessor("score", {
					meta: { label: "Score", filter: { variant: "numberRange" } },
				}),
			],
		});
		expect(screen.getByLabelText("Score minimum")).toBeVisible();
		expect(screen.getByLabelText("Score maximum")).toBeVisible();
	});

	it("renders a range slider when min and max are set", () => {
		renderFilter({
			cols: [
				helper.accessor("score", {
					meta: {
						label: "Score",
						filter: { variant: "numberRange", min: 0, max: 100 },
					},
				}),
			],
		});
		// RangeSlider renders as a div with role, not role="slider" in jsdom.
		// Verify the number inputs are NOT rendered (slider path instead).
		expect(screen.queryByLabelText("Score minimum")).toBeNull();
		expect(screen.queryByLabelText("Score maximum")).toBeNull();
	});

	it("renders text filter with label", () => {
		renderFilter({
			cols: [
				helper.accessor("name", {
					meta: { label: "Name", filter: { variant: "text" } },
				}),
			],
		});
		expect(screen.getByLabelText("Name")).toBeVisible();
	});

	it("renders select filter with facet counts", () => {
		renderFilter({
			cols: [
				helper.accessor("name", {
					meta: {
						label: "Name",
						filter: {
							variant: "select",
							options: [
								{ value: "A", label: "A" },
								{ value: "B", label: "B" },
							],
						},
					},
				}),
			],
			facets: {
				name: {
					type: "values",
					values: [
						{ value: "A", label: "A", count: 10 },
						{ value: "B", label: "B", count: 0 },
					],
				},
			},
		});
		fireEvent.click(screen.getByRole("combobox", { name: "Name" }));
		expect(
			screen.getByRole("option", { name: "A (10)", hidden: true }),
		).toBeTruthy();
	});

	it("renders a date picker for date variant", () => {
		renderFilter({
			cols: [
				helper.accessor("date", {
					meta: { label: "Date", filter: { variant: "date" } },
				}),
			],
		});
		expect(screen.getByLabelText("Date")).toBeVisible();
	});

	it("renders a custom filter component", () => {
		const Custom = ({
			value,
			onChange,
		}: {
			value: unknown;
			onChange: (v: unknown) => void;
		}) => (
			<button type="button" onClick={() => onChange("custom")}>
				Custom: {String(value ?? "none")}
			</button>
		);
		renderFilter({
			cols: [
				helper.accessor("name", {
					meta: { label: "Name", filter: { component: Custom } },
				}),
			],
		});
		expect(screen.getByText("Custom: none")).toBeVisible();
	});

	it("renders facet buckets for number range with range facet", () => {
		renderFilter({
			cols: [
				helper.accessor("score", {
					meta: { label: "Score", filter: { variant: "numberRange" } },
				}),
			],
			facets: {
				score: {
					type: "ranges",
					ranges: [
						{ label: "Low", from: 0, to: 50, count: 5 },
						{ label: "High", from: 50, to: 100, count: 8 },
					],
					min: 0,
					max: 100,
				},
			},
		});
		expect(screen.getByText("Low")).toBeVisible();
		expect(screen.getByText("High")).toBeVisible();
	});

	it("writes the typed text through, and clears the filter on empty", async () => {
		// Arrange
		const user = userEvent.setup();
		renderFilter({
			cols: [
				helper.accessor("name", {
					meta: { label: "Name", filter: { variant: "text" } },
				}),
			],
		});
		// Act
		await user.type(screen.getByLabelText("Name"), "Ab");
		// Assert
		expect(filterValue("name")).toBe("Ab");
		// Act
		await user.clear(screen.getByLabelText("Name"));
		// Assert: an empty string removes the column filter entirely.
		expect(readFilters()).toEqual([]);
	});

	it("writes true, false, then undefined as the boolean control changes", async () => {
		// Arrange
		const user = userEvent.setup();
		renderFilter({
			cols: [
				helper.accessor("active", {
					filterFn: () => true,
					meta: { label: "Active", filter: { variant: "boolean" } },
				}),
			],
		});
		// Act
		await user.click(screen.getByRole("radio", { name: "Yes" }));
		// Assert
		expect(filterValue("active")).toBe(true);
		// Act
		await user.click(screen.getByRole("radio", { name: "No" }));
		// Assert
		expect(filterValue("active")).toBe(false);
		// Act
		await user.click(screen.getByRole("radio", { name: "All" }));
		// Assert
		expect(readFilters()).toEqual([]);
	});

	it("writes the chosen option through for a select filter", () => {
		// Arrange
		renderFilter({
			cols: [
				helper.accessor("name", {
					meta: {
						label: "Name",
						filter: {
							variant: "select",
							options: [
								{ value: "A", label: "Apple" },
								{ value: "B", label: "Banana" },
							],
						},
					},
				}),
			],
		});
		// Act: open the dropdown, then pick an option (kept in the a11y tree as hidden).
		fireEvent.click(screen.getByRole("combobox", { name: "Name" }));
		fireEvent.click(
			screen.getByRole("option", { name: "Banana", hidden: true }),
		);
		// Assert
		expect(filterValue("name")).toBe("B");
	});

	it("writes the selected values through for a multiselect filter", () => {
		// Arrange
		renderFilter({
			cols: [
				helper.accessor("name", {
					filterFn: () => true,
					meta: {
						label: "Tags",
						filter: {
							variant: "multiselect",
							options: [
								{ value: "A", label: "Apple" },
								{ value: "B", label: "Banana" },
							],
						},
					},
				}),
			],
		});
		// Act
		fireEvent.click(screen.getByRole("combobox", { name: "Tags" }));
		fireEvent.click(
			screen.getByRole("option", { name: "Apple", hidden: true }),
		);
		// Assert
		expect(filterValue("name")).toEqual(["A"]);
	});

	it("writes a [min, max] range through the number inputs and clears when both empty", async () => {
		// Arrange
		const user = userEvent.setup();
		renderFilter({
			cols: [
				helper.accessor("score", {
					filterFn: () => true,
					meta: { label: "Score", filter: { variant: "numberRange" } },
				}),
			],
		});
		// Act
		await user.type(screen.getByLabelText("Score minimum"), "10");
		// Assert
		expect(filterValue("score")).toEqual([10, null]);
		// Act
		await user.type(screen.getByLabelText("Score maximum"), "90");
		// Assert
		expect(filterValue("score")).toEqual([10, 90]);
		// Act
		await user.clear(screen.getByLabelText("Score minimum"));
		await user.clear(screen.getByLabelText("Score maximum"));
		// Assert: emptying both bounds removes the filter.
		expect(readFilters()).toEqual([]);
	});

	it("shows a clear affordance for a bounded range with a value and clears it", async () => {
		// Arrange
		const user = userEvent.setup();
		renderFilter({
			cols: [
				helper.accessor("score", {
					filterFn: () => true,
					meta: {
						label: "Score",
						filter: { variant: "numberRange", min: 0, max: 100 },
					},
				}),
			],
			initialState: { columnFilters: [{ id: "score", value: [20, 80] }] },
		});
		expect(filterValue("score")).toEqual([20, 80]);
		// Act
		await user.click(screen.getByRole("button", { name: "clear" }));
		// Assert
		expect(readFilters()).toEqual([]);
	});

	it("renders only facet buckets when a range facet has no slider bounds", () => {
		// Arrange / Act
		renderFilter({
			cols: [
				helper.accessor("score", {
					filterFn: () => true,
					meta: { label: "Score", filter: { variant: "numberRange" } },
				}),
			],
			facets: {
				score: {
					type: "ranges",
					ranges: [
						{ label: "Low", from: 0, to: 50, count: 5 },
						{ label: "High", from: 50, to: 100, count: 8 },
					],
				},
			},
		});
		// Assert: buckets render, but no slider and no min/max inputs.
		expect(screen.getByText("Low")).toBeVisible();
		expect(screen.queryByLabelText("Score minimum")).toBeNull();
		expect(screen.queryByLabelText("Score maximum")).toBeNull();
	});

	it("parses and renders a seeded date value", () => {
		// Arrange / Act
		renderFilter({
			cols: [
				helper.accessor("date", {
					filterFn: () => true,
					meta: { label: "Date", filter: { variant: "date" } },
				}),
			],
			initialState: { columnFilters: [{ id: "date", value: "2026-03-15" }] },
		});
		// Assert: the seeded value parsed without error (parseLocalDate) and is preserved.
		expect(filterValue("date")).toBe("2026-03-15");
		expect(screen.getByLabelText("Date")).toBeInTheDocument();
	});

	it("renders a seeded date range with a clear affordance and clears it", async () => {
		// Arrange
		const user = userEvent.setup();
		renderFilter({
			cols: [
				helper.accessor("date", {
					filterFn: () => true,
					meta: { label: "Window", filter: { variant: "dateRange" } },
				}),
			],
			initialState: {
				columnFilters: [{ id: "date", value: ["2026-01-01", "2026-02-01"] }],
			},
		});
		expect(filterValue("date")).toEqual(["2026-01-01", "2026-02-01"]);
		// Act
		await user.click(screen.getByRole("button", { name: "clear" }));
		// Assert
		expect(readFilters()).toEqual([]);
	});
});

describe("async filter options", () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	const CITY_OPTIONS = [
		{ value: "L", label: "London" },
		{ value: "B", label: "Berlin" },
	];

	function cityColumn(
		loadOptions: (q: string) => Promise<typeof CITY_OPTIONS>,
	) {
		return helper.accessor("name", {
			meta: { label: "City", filter: { variant: "select", loadOptions } },
		});
	}

	it("loads select options asynchronously on mount", async () => {
		// Arrange
		const loadOptions = vi.fn(async (_q: string) => CITY_OPTIONS);

		// Act
		renderFilter({ cols: [cityColumn(loadOptions)] });

		// Assert: loaded with the empty query, options usable once resolved.
		expect(loadOptions).toHaveBeenCalledWith("");
		fireEvent.click(screen.getByRole("combobox", { name: "City" }));
		expect(
			await screen.findByRole("option", { name: "London", hidden: true }),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getByRole("option", { name: "Berlin", hidden: true }),
		);
		expect(filterValue("name")).toBe("B");
	});

	it("reloads options with the debounced search query", async () => {
		// Arrange
		vi.useFakeTimers();
		const loadOptions = vi.fn(async (_q: string) => CITY_OPTIONS);
		renderFilter({ cols: [cityColumn(loadOptions)] });
		expect(loadOptions).toHaveBeenCalledTimes(1);

		// Act: type into the searchable select; each keystroke resets the debounce.
		const input = screen.getByRole("combobox", { name: "City" });
		fireEvent.change(input, { target: { value: "lo" } });
		fireEvent.change(input, { target: { value: "lon" } });
		expect(loadOptions).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(300);

		// Assert: one reload with the settled query.
		expect(loadOptions).toHaveBeenCalledTimes(2);
		expect(loadOptions).toHaveBeenLastCalledWith("lon");
	});
});
