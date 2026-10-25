import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDataView } from "../../core/state/useDataView";
import { createColumnHelper } from "../../index";
import type { DataColumnDef } from "../../types/column";
import type { DataViewColumnPinning } from "../../types/state";
import { DataTable } from "./DataTable";

interface User {
	id: string;
	name: string;
	email: string;
}

const helper = createColumnHelper<User>();
const columns = [
	helper.accessor("name", { meta: { label: "Name" } }),
	helper.accessor("email", { meta: { label: "Email" } }),
] satisfies DataColumnDef<User>[];

const ROWS: User[] = [{ id: "1", name: "Ada", email: "ada@example.com" }];

function Harness({
	pinning,
	columnSizing,
}: {
	pinning: DataViewColumnPinning;
	columnSizing?: Record<string, number>;
}) {
	const view = useDataView<User>({
		columns,
		rows: ROWS,
		rowCount: ROWS.length,
		status: "success",
		getRowId: (u) => u.id,
		initialState: { columnPinning: pinning, columnSizing },
	});
	return <DataTable view={view} />;
}

function cellOf(text: string): HTMLElement {
	return screen.getByText(text).closest("td") as HTMLElement;
}

describe("DataTable column pinning", () => {
	it("sticks a column pinned to the start at the inline start edge", () => {
		// Arrange
		const pinning = { start: ["name"] };

		// Act
		render(
			<MantineProvider>
				<Harness pinning={pinning} />
			</MantineProvider>,
		);

		// Assert
		const style = cellOf("Ada").style;
		expect(style.position).toBe("sticky");
		expect(style.insetInlineStart).toBe("0px");
		expect(style.insetInlineEnd).toBe("");
	});

	it("sticks a column pinned to the end at the inline end edge", () => {
		// Arrange
		const pinning = { end: ["email"] };

		// Act
		render(
			<MantineProvider>
				<Harness pinning={pinning} />
			</MantineProvider>,
		);

		// Assert
		const style = cellOf("ada@example.com").style;
		expect(style.position).toBe("sticky");
		expect(style.insetInlineEnd).toBe("0px");
		expect(style.insetInlineStart).toBe("");
	});

	it("leaves an unpinned column without sticky positioning", () => {
		// Arrange
		const pinning = { start: ["name"] };

		// Act
		render(
			<MantineProvider>
				<Harness pinning={pinning} />
			</MantineProvider>,
		);

		// Assert
		expect(cellOf("ada@example.com").style.position).toBe("");
	});

	it("offsets a second start pinned column by the width of the first", () => {
		// Arrange
		const pinning = { start: ["name", "email"] };

		// Act
		render(
			<MantineProvider>
				<Harness pinning={pinning} columnSizing={{ name: 200 }} />
			</MantineProvider>,
		);

		// Assert
		expect(cellOf("Ada").style.insetInlineStart).toBe("0px");
		expect(cellOf("ada@example.com").style.insetInlineStart).toBe("200px");
	});

	it("offsets a first end pinned column by the width of the second", () => {
		// Arrange
		const pinning = { end: ["name", "email"] };

		// Act
		render(
			<MantineProvider>
				<Harness pinning={pinning} columnSizing={{ email: 120 }} />
			</MantineProvider>,
		);

		// Assert
		expect(cellOf("Ada").style.insetInlineEnd).toBe("120px");
		expect(cellOf("ada@example.com").style.insetInlineEnd).toBe("0px");
	});
});
