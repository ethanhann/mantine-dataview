import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import dayjs from "dayjs";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { col } from "../core/colBuilder";
import { useDataView } from "../core/useDataView";
import type { DataViewWindow } from "../types/state";
import { DataScheduleNav } from "./DataScheduleNav";
import { computeWindow } from "./dateWindow";

interface Shift {
	id: string;
	name: string;
}
const columns = col<Shift>().text("name").build();

function NavHarness({ initialWindow }: { initialWindow?: DataViewWindow }) {
	const view = useDataView<Shift>({
		columns,
		rows: [],
		rowCount: 0,
		status: "success",
		getRowId: (r) => r.id,
		...(initialWindow ? { initialState: { window: initialWindow } } : {}),
	});
	return (
		<>
			<DataScheduleNav view={view} />
			<span data-testid="win">{JSON.stringify(view.state.window ?? null)}</span>
		</>
	);
}

function renderNav(
	wrapper: (children: ReactNode) => ReactNode = (c) => c,
	initialWindow?: DataViewWindow,
) {
	return render(
		<MantineProvider>
			{wrapper(<NavHarness initialWindow={initialWindow} />)}
		</MantineProvider>,
	);
}

function readWindow(): DataViewWindow | null {
	return JSON.parse(screen.getByTestId("win").textContent || "null");
}

describe("DataScheduleNav", () => {
	it("renders prev / today / next and a level selector", () => {
		renderNav();
		expect(
			screen.getByRole("button", { name: "Previous" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
		// Default level is week.
		expect(screen.getByRole("radio", { name: "Week" })).toBeChecked();
	});

	it("sets a window at the current week when 'Today' is clicked", async () => {
		const user = userEvent.setup();
		renderNav();
		expect(readWindow()).toBeNull();
		await user.click(screen.getByRole("button", { name: "Today" }));
		const w = readWindow();
		expect(w?.level).toBe("week");
		expect(dayjs(w?.start).day()).toBe(1); // Monday-aligned (Mantine default)
	});

	it("steps the window forward one week on Next", async () => {
		const user = userEvent.setup();
		renderNav();
		await user.click(screen.getByRole("button", { name: "Today" }));
		const before = readWindow();
		await user.click(screen.getByRole("button", { name: "Next" }));
		const after = readWindow();
		expect(after?.start).toBe(
			dayjs(before?.start).add(1, "week").toISOString(),
		);
	});

	it("changes the level via the selector", async () => {
		const user = userEvent.setup();
		renderNav();
		await user.click(screen.getByRole("radio", { name: "Month" }));
		const w = readWindow();
		expect(w?.level).toBe("month");
		// The month window is padded to whole Monday-weeks, so its start lands on a Monday.
		expect(dayjs(w?.start).day()).toBe(1);
	});

	it("anchors a level switch inside the logical period of a padded window", async () => {
		// Arrange: January 2027 at month level pads back into December 2026, so an
		// anchor on the window start would land the year switch on 2026.
		const user = userEvent.setup();
		renderNav(undefined, computeWindow(new Date(2027, 0, 15), "month"));
		expect(dayjs(readWindow()?.start).year()).toBe(2026); // sanity: padded start

		// Act
		await user.click(screen.getByRole("radio", { name: "Year" }));

		// Assert
		const w = readWindow();
		expect(w?.level).toBe("year");
		expect(dayjs(w?.start).year()).toBe(2027);
	});

	it("aligns the window to a Sunday DatesProvider firstDayOfWeek without a prop", async () => {
		// Arrange
		const user = userEvent.setup();
		renderNav((children) => (
			<DatesProvider settings={{ firstDayOfWeek: 0 }}>{children}</DatesProvider>
		));
		// Act
		await user.click(screen.getByRole("button", { name: "Today" }));
		// Assert
		expect(dayjs(readWindow()?.start).day()).toBe(0); // Sunday, matching the provider
	});
});
