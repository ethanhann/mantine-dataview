// Accessibility sweep over the grid layout in its various states: selected items, selection off,
// single-select, keyboard navigation off, and custom slots. Each case renders the real component and
// runs axe, with a few targeted role assertions where state changes the ARIA.

import { Card, Checkbox, MantineProvider, Table } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../core/state/useDataView";
import { createColumnHelper } from "../index";
import type { DataColumnDef } from "../types/column";
import { DataCards } from "./DataCards";
import { DataTable } from "./DataTable";

interface User {
	id: string;
	name: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
] satisfies DataColumnDef<User>[];

const ROWS: User[] = [
	{ id: "1", name: "Ada" },
	{ id: "2", name: "Linus" },
	{ id: "3", name: "Grace" },
];

interface Config {
	enableSelection?: boolean;
	keyboardNavigation?: boolean;
	multi?: boolean;
	selectedId?: string;
	custom?: boolean;
}

function useConfiguredView(p: Config) {
	return useDataView<User>({
		columns,
		rows: ROWS,
		rowCount: ROWS.length,
		status: "success",
		getRowId: (u) => u.id,
		enableMultiRowSelection: p.multi,
		...(p.selectedId
			? { initialState: { rowSelection: { [p.selectedId]: true } } }
			: {}),
	});
}

function TableHarness(p: Config) {
	const view = useConfiguredView(p);
	return (
		<DataTable
			view={view}
			enableSelection={p.enableSelection}
			keyboardNavigation={p.keyboardNavigation}
			slots={
				p.custom
					? {
							Row: ({ cells, rowProps }) => (
								<Table.Tr {...rowProps}>{cells}</Table.Tr>
							),
						}
					: undefined
			}
		/>
	);
}

function CardsHarness(p: Config) {
	const view = useConfiguredView(p);
	return (
		<DataCards
			view={view}
			enableSelection={p.enableSelection}
			keyboardNavigation={p.keyboardNavigation}
			renderCard={
				p.custom
					? ({ data, selected, toggleSelected }) => (
							<Card withBorder pos="relative">
								<Checkbox
									aria-label="Select card"
									checked={selected}
									onChange={toggleSelected}
								/>
								{data.name}
							</Card>
						)
					: undefined
			}
		/>
	);
}

async function expectClean(ui: ReactNode) {
	const { container } = render(<MantineProvider>{ui}</MantineProvider>);
	expect(await axe(container)).toHaveNoViolations();
}

describe("DataTable accessibility", () => {
	it("is clean as a default grid", async () => {
		await expectClean(<TableHarness />);
	});

	it("is clean with a selected row", async () => {
		await expectClean(<TableHarness selectedId="1" />);
		expect(
			screen.getAllByRole("row").filter((r) => r.closest("tbody"))[0],
		).toHaveAttribute("aria-selected", "true");
	});

	it("is clean with selection disabled and drops aria-multiselectable", async () => {
		await expectClean(<TableHarness enableSelection={false} />);
		expect(screen.getByRole("grid")).not.toHaveAttribute(
			"aria-multiselectable",
		);
	});

	it("is clean as a plain table when keyboard navigation is off", async () => {
		await expectClean(<TableHarness keyboardNavigation={false} />);
		expect(screen.queryByRole("grid")).toBeNull();
	});

	it("is clean in single-select and is not multiselectable", async () => {
		await expectClean(<TableHarness multi={false} />);
		expect(screen.getByRole("grid")).not.toHaveAttribute(
			"aria-multiselectable",
		);
	});

	it("is clean with a custom row slot", async () => {
		await expectClean(<TableHarness custom />);
	});
});

describe("DataCards accessibility", () => {
	it("is clean as a default grid", async () => {
		await expectClean(<CardsHarness />);
	});

	it("is clean with a selected card", async () => {
		await expectClean(<CardsHarness selectedId="1" />);
		expect(screen.getAllByRole("row")[0]).toHaveAttribute(
			"aria-selected",
			"true",
		);
	});

	it("is clean with selection disabled and drops aria-multiselectable", async () => {
		await expectClean(<CardsHarness enableSelection={false} />);
		expect(screen.getByRole("grid")).not.toHaveAttribute(
			"aria-multiselectable",
		);
	});

	it("is clean as plain cards when keyboard navigation is off", async () => {
		await expectClean(<CardsHarness keyboardNavigation={false} />);
		expect(screen.queryByRole("grid")).toBeNull();
	});

	it("is clean in single-select and is not multiselectable", async () => {
		await expectClean(<CardsHarness multi={false} />);
		expect(screen.getByRole("grid")).not.toHaveAttribute(
			"aria-multiselectable",
		);
	});

	it("is clean with a custom renderCard", async () => {
		await expectClean(<CardsHarness custom />);
	});
});
