import { MantineProvider } from "@mantine/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDataView } from "../../core/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { FacetData } from "../../types/facets";
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
}: {
	cols: DataColumnDef<Item>[];
	facets?: Record<string, FacetData>;
}) {
	const view = useDataView<Item>({
		columns: cols,
		rows,
		rowCount: rows.length,
		status: "success",
		getRowId: (i) => i.id,
		debounce: 0,
		facets,
	});
	return (
		<>
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
});
