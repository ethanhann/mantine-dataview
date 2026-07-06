import { MantineProvider } from "@mantine/core";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDataView } from "../core/state/useDataView";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import type { DataViewLabels } from "../types/labels";
import { DataViewer } from "./DataViewer";

interface User {
	id: string;
	name: string;
	active: boolean;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
	helper.accessor("active", {
		meta: { label: "Active", filter: { variant: "boolean" } },
	}),
] satisfies DataColumnDef<User>[];

const rows: User[] = [
	{ id: "1", name: "Ada", active: true },
	{ id: "2", name: "Linus", active: false },
];

const LABELS: Partial<DataViewLabels> = {
	searchPlaceholder: "Suchen…",
	search: "Suche",
	columns: "Spalten",
	sortBy: "Sortieren nach",
	filterYes: "Ja",
	filterNo: "Nein",
	filterAll: "Alle",
	selectRow: "Zeile auswählen",
	selectAllRows: "Alle Zeilen auswählen",
	selectedCount: (count) => `${count} ausgewählt`,
	clearSelection: "Aufheben",
	paginationRange: (start, end, total) => `${start} bis ${end} von ${total}`,
	rowsPerPage: "Zeilen pro Seite",
	noResults: "Keine Ergebnisse.",
};

function Harness({
	labels,
	empty,
	selected,
}: {
	labels?: Partial<DataViewLabels>;
	empty?: boolean;
	selected?: boolean;
}) {
	const view = useDataView<User>({
		columns,
		rows: empty ? [] : rows,
		rowCount: empty ? 0 : rows.length,
		status: "success",
		getRowId: (u) => u.id,
		labels,
		...(selected ? { initialState: { rowSelection: { "1": true } } } : {}),
	});
	return <DataViewer view={view} />;
}

function renderView(props: Parameters<typeof Harness>[0] = {}) {
	return render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);
}

describe("labels dictionary", () => {
	it("renders English defaults when no labels are given", () => {
		// Arrange / Act
		renderView({ selected: true });

		// Assert: a sample across the component families.
		expect(screen.getByPlaceholderText("Search…")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Columns" })).toBeInTheDocument();
		expect(
			within(screen.getByRole("region", { name: "Bulk actions" })).getByText(
				"1 selected",
			),
		).toBeInTheDocument();
		expect(screen.getByText(/1–2 of 2/)).toBeInTheDocument();
	});

	it("applies overridden labels across toolbar, table, bulk bar, and pagination", () => {
		// Arrange / Act
		renderView({ labels: LABELS, selected: true });

		// Assert
		expect(screen.getByPlaceholderText("Suchen…")).toBeInTheDocument();
		expect(screen.getByLabelText("Suche")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Spalten" })).toBeInTheDocument();
		expect(screen.getAllByLabelText("Sortieren nach").length).toBeGreaterThan(
			0,
		);
		expect(
			screen.getByRole("checkbox", { name: "Alle Zeilen auswählen" }),
		).toBeInTheDocument();
		expect(
			screen.getAllByRole("checkbox", { name: "Zeile auswählen" }).length,
		).toBeGreaterThan(0);
		expect(
			within(screen.getByRole("region", { name: "Bulk actions" })).getByText(
				"1 ausgewählt",
			),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Aufheben" }),
		).toBeInTheDocument();
		expect(screen.getByText(/1 bis 2 von 2/)).toBeInTheDocument();
		expect(screen.getAllByLabelText("Zeilen pro Seite").length).toBeGreaterThan(
			0,
		);
	});

	it("applies overridden labels to the boolean filter control", () => {
		// Arrange / Act
		renderView({ labels: LABELS });

		// Assert
		expect(screen.getByRole("radio", { name: "Alle" })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Ja" })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Nein" })).toBeInTheDocument();
	});

	it("applies overridden labels to the empty state", () => {
		// Arrange / Act
		renderView({ labels: LABELS, empty: true });

		// Assert
		expect(screen.getByText("Keine Ergebnisse.")).toBeInTheDocument();
	});

	it("keeps explicit component props above the dictionary", () => {
		// Arrange: a consumer-level searchPlaceholder must beat the dictionary.
		function Composed() {
			const view = useDataView<User>({
				columns,
				rows,
				rowCount: rows.length,
				status: "success",
				getRowId: (u) => u.id,
				labels: LABELS,
			});
			return (
				<DataViewer view={view}>
					<DataViewer.Toolbar searchPlaceholder="Find people" />
				</DataViewer>
			);
		}

		// Act
		render(
			<MantineProvider>
				<Composed />
			</MantineProvider>,
		);

		// Assert
		expect(screen.getByPlaceholderText("Find people")).toBeInTheDocument();
	});
});
