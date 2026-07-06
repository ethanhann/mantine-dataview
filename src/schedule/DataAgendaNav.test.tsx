import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import { describe, expect, it } from "vitest";
import { col } from "../core/columns/colBuilder";
import { useDataView } from "../core/state/useDataView";
import type { DataViewWindow } from "../types/state";
import { DataAgendaNav } from "./DataAgendaNav";

interface Shift {
	id: string;
	name: string;
}
const columns = col<Shift>().text("name").build();

function NavHarness() {
	const view = useDataView<Shift>({
		columns,
		rows: [],
		rowCount: 0,
		status: "success",
		getRowId: (r) => r.id,
	});
	return (
		<>
			<DataAgendaNav view={view} />
			<span data-testid="win">{JSON.stringify(view.state.window ?? null)}</span>
		</>
	);
}

function renderNav() {
	return render(
		<MantineProvider>
			<NavHarness />
		</MantineProvider>,
	);
}

function readWindow(): DataViewWindow | null {
	return JSON.parse(screen.getByTestId("win").textContent || "null");
}

describe("DataAgendaNav", () => {
	it("renders prev / today / next and a trimmed range selector (no year)", () => {
		renderNav();
		expect(
			screen.getByRole("button", { name: "Previous" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Day" })).toBeInTheDocument();
		expect(screen.getByRole("radio", { name: "Week" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "Month" })).toBeInTheDocument();
		// The "year" range is dropped for the agenda.
		expect(screen.queryByRole("radio", { name: "Year" })).toBeNull();
	});

	it("drives the window slice on navigation", async () => {
		const user = userEvent.setup();
		renderNav();
		await user.click(screen.getByRole("button", { name: "Today" }));
		const before = readWindow();
		expect(before?.level).toBe("week");
		await user.click(screen.getByRole("button", { name: "Next" }));
		expect(readWindow()?.start).toBe(
			dayjs(before?.start).add(1, "week").toISOString(),
		);
	});

	it("changes the range via the selector", async () => {
		const user = userEvent.setup();
		renderNav();
		await user.click(screen.getByRole("radio", { name: "Month" }));
		expect(readWindow()?.level).toBe("month");
	});
});
