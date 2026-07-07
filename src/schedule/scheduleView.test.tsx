import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { col } from "../core/columns/colBuilder";
import { useDataView } from "../core/state/useDataView";
import { scheduleView } from "./scheduleView";

vi.mock("@mantine/schedule", () => ({
	Schedule: () => <div data-testid="schedule" />,
}));

interface Shift {
	id: string;
	name: string;
	startsAt: string;
}
const columns = col<Shift>()
	.text("name", { schedule: "title" })
	.date("startsAt", { schedule: "start" })
	.build();

describe("scheduleView", () => {
	it("returns a schedule-id descriptor with a default label", () => {
		const descriptor = scheduleView<Shift>();
		expect(descriptor.id).toBe("schedule");
		expect(descriptor.label).toBe("Schedule");
		expect(typeof descriptor.render).toBe("function");
	});

	it("accepts a custom label", () => {
		expect(scheduleView<Shift>({ label: "Calendar" }).label).toBe("Calendar");
	});

	it("renders the schedule presentation from render(view)", () => {
		const descriptor = scheduleView<Shift>();
		function Harness() {
			const view = useDataView<Shift>({
				columns,
				rows: [{ id: "1", name: "A", startsAt: "2026-06-28T09:00:00.000Z" }],
				rowCount: 1,
				status: "success",
				getRowId: (r) => r.id,
			});
			return <>{descriptor.render(view)}</>;
		}
		render(
			<MantineProvider>
				<Harness />
			</MantineProvider>,
		);
		expect(screen.getByTestId("schedule")).toBeInTheDocument();
	});
});
