import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";
import { useDataView } from "../../core/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewState, Status } from "../../types/state";
import type { DataViewSlots } from "../types";
import { DataView } from "./DataView";

interface User {
	id: string;
	name: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", {
		header: "Name",
		meta: { card: { role: "title" } },
	}),
] satisfies DataColumnDef<User>[];

const sampleRows: User[] = [
	{ id: "1", name: "Ada" },
	{ id: "2", name: "Linus" },
];

interface HarnessProps {
	rows?: User[];
	status?: Status;
	initialState?: Partial<DataViewState>;
	slots?: DataViewSlots<User>;
	children?: ReactNode;
}

function Harness({ children, ...props }: HarnessProps) {
	const view = useDataView<User>({
		columns,
		rows: props.rows ?? sampleRows,
		rowCount: props.rows?.length ?? sampleRows.length,
		status: props.status ?? "success",
		getRowId: (u) => u.id,
		initialState: props.initialState,
	});
	return (
		<DataView view={view} slots={props.slots}>
			{children}
		</DataView>
	);
}

const renderView = (props: HarnessProps = {}) =>
	render(
		<MantineProvider>
			<Harness {...props} />
		</MantineProvider>,
	);

describe("DataView orchestrator", () => {
	it("renders the default layout: toolbar, body, and pagination", () => {
		renderView();
		expect(screen.getByLabelText("Search")).toBeVisible(); // toolbar
		expect(screen.getByText("Ada")).toBeVisible(); // body
		expect(screen.getByText(/of 2/)).toBeVisible(); // pagination range
	});

	it("switches the body between table and cards via the toolbar", async () => {
		renderView();
		expect(screen.getByRole("columnheader", { name: /Name/ })).toBeVisible();
		await userEvent.click(screen.getByRole("radio", { name: "Cards" }));
		// Cards have no column headers; the title still renders.
		expect(screen.queryByRole("columnheader", { name: /Name/ })).toBeNull();
		expect(screen.getByText("Ada")).toBeVisible();
	});

	it("supports explicit composition via the compound parts", () => {
		renderView({
			children: (
				<>
					<DataView.Pagination />
					<DataView.Body />
				</>
			),
		});
		expect(screen.getByText("Ada")).toBeVisible();
		expect(screen.getByText(/of 2/)).toBeVisible();
		// No toolbar in this composition.
		expect(screen.queryByLabelText("Search")).toBeNull();
	});

	it("threads slots through to the active presentation", () => {
		renderView({
			rows: [],
			status: "success",
			slots: { Empty: () => <div>Nothing here yet</div> },
		});
		expect(screen.getByText("Nothing here yet")).toBeVisible();
	});

	it("throws when a compound part is used outside the provider", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() =>
			render(
				<MantineProvider>
					<DataView.Body />
				</MantineProvider>,
			),
		).toThrow(/inside <DataView>/);
		spy.mockRestore();
	});

	it("has no accessibility violations", async () => {
		const { container } = renderView();
		expect(await axe(container)).toHaveNoViolations();
	});
});
